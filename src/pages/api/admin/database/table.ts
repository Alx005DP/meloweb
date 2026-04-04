import type { APIRoute } from "astro"
import { db } from "../../../../lib/db"
import {
    ADMIN_DB_TABLES,
    listExistingTables,
    recordAdminDatabaseActivity,
    requireAdmin,
} from "../../../../lib/admin-database"

type ColumnMeta = {
    name: string
    type: string
    nullable: boolean
    key: string
    defaultValue: unknown
    extra: string
    editable: boolean
}

const normalizeTableName = (value: string | null) => (value || "").trim()

const isAllowedTable = (tableName: string) => ADMIN_DB_TABLES.includes(tableName as (typeof ADMIN_DB_TABLES)[number])

const isEditableColumn = (columnName: string, columnType: string, extra: string) => {
    const lowerType = columnType.toLowerCase()
    const lowerName = columnName.toLowerCase()
    if (extra.toLowerCase().includes("auto_increment")) return false
    if (lowerType.includes("blob") || lowerType.includes("binary")) return false
    if (lowerName === "password" || lowerName === "avatar") return false
    return true
}

const formatRowValue = (value: unknown) => {
    if (value === null || value === undefined) return null
    if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`
    if (value instanceof Date) return value.toISOString()
    return value
}

const coerceValue = (rawValue: unknown, column: ColumnMeta) => {
    if (rawValue === "" || rawValue === undefined) {
        return column.nullable ? null : ""
    }

    if (rawValue === null) return null

    const type = column.type.toLowerCase()
    if (type.includes("tinyint(1)")) {
        if (rawValue === true || rawValue === "1" || rawValue === 1 || rawValue === "true") return 1
        if (rawValue === false || rawValue === "0" || rawValue === 0 || rawValue === "false") return 0
        return Number(rawValue) || 0
    }

    if (type.includes("int") || type.includes("decimal") || type.includes("float") || type.includes("double")) {
        const num = Number(rawValue)
        return Number.isFinite(num) ? num : column.nullable ? null : 0
    }

    return String(rawValue)
}

const getColumns = async (tableName: string) => {
    const [rows]: any = await db.query(`SHOW COLUMNS FROM \`${tableName}\``)
    return rows.map((row: any) => ({
        name: row.Field,
        type: row.Type,
        nullable: row.Null === "YES",
        key: row.Key || "",
        defaultValue: row.Default,
        extra: row.Extra || "",
        editable: isEditableColumn(row.Field, row.Type, row.Extra || ""),
    })) as ColumnMeta[]
}

const buildWhereClause = (columns: ColumnMeta[], originalValues: Record<string, unknown>) => {
    const primaryKeys = columns.filter((column) => column.key === "PRI")
    const matchColumns = primaryKeys.length ? primaryKeys : columns

    const clauses: string[] = []
    const params: unknown[] = []

    matchColumns.forEach((column) => {
        const value = originalValues[column.name]
        if (value === null || value === undefined) {
            clauses.push(`\`${column.name}\` IS NULL`)
            return
        }
        clauses.push(`\`${column.name}\` = ?`)
        params.push(coerceValue(value, column))
    })

    return { clause: clauses.join(" AND "), params }
}

export const GET: APIRoute = async ({ cookies, url }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    const tableName = normalizeTableName(url.searchParams.get("name"))
    if (!tableName || !isAllowedTable(tableName)) {
        return new Response(JSON.stringify({ error: "invalid_table" }), { status: 400 })
    }

    const existingTables = await listExistingTables([tableName])
    if (!existingTables.includes(tableName)) {
        return new Response(JSON.stringify({ error: "table_not_found" }), { status: 404 })
    }

    try {
        const columns = await getColumns(tableName)
        const [rows]: any = await db.query(`SELECT * FROM \`${tableName}\` LIMIT 100`)

        return new Response(JSON.stringify({
            tableName,
            columns,
            rows: rows.map((row: Record<string, unknown>) => {
                const formatted: Record<string, unknown> = {}
                Object.entries(row).forEach(([key, value]) => {
                    formatted[key] = formatRowValue(value)
                })
                return formatted
            }),
        }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({
            error: "table_load_error",
            message: err.message || "No se pudo cargar la tabla.",
        }), { status: 500 })
    }
}

export const POST: APIRoute = async ({ cookies, request }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    const {
        tableName,
        originalValues,
        updatedValues,
    } = await request.json().catch(() => ({
        tableName: "",
        originalValues: {},
        updatedValues: {},
    }))

    if (!tableName || !isAllowedTable(tableName)) {
        return new Response(JSON.stringify({ error: "invalid_table" }), { status: 400 })
    }

    const existingTables = await listExistingTables([tableName])
    if (!existingTables.includes(tableName)) {
        return new Response(JSON.stringify({ error: "table_not_found" }), { status: 404 })
    }

    try {
        const columns = await getColumns(tableName)
        const editableColumns = columns.filter((column) => column.editable)
        const updates = editableColumns
            .filter((column) => Object.prototype.hasOwnProperty.call(updatedValues || {}, column.name))
            .map((column) => ({
                column,
                value: coerceValue(updatedValues[column.name], column),
            }))

        if (!updates.length) {
            return new Response(JSON.stringify({
                error: "no_changes",
                message: "No hay cambios para guardar.",
            }), { status: 400 })
        }

        const setClause = updates.map(({ column }) => `\`${column.name}\` = ?`).join(", ")
        const setParams = updates.map(({ value }) => value)
        const where = buildWhereClause(columns, originalValues || {})

        if (!where.clause) {
            return new Response(JSON.stringify({
                error: "missing_identifier",
                message: "No se pudo identificar la fila a editar.",
            }), { status: 400 })
        }

        const [result]: any = await db.execute(
            `UPDATE \`${tableName}\` SET ${setClause} WHERE ${where.clause} LIMIT 1`,
            [...setParams, ...where.params]
        )

        if (!result?.affectedRows) {
            return new Response(JSON.stringify({
                error: "row_not_found",
                message: "No se encontró la fila a actualizar.",
            }), { status: 404 })
        }

        await recordAdminDatabaseActivity({
            action_key: "table_edit",
            status: "success",
            title: `Fila actualizada en ${tableName}`,
            detail: `Se modificaron ${updates.length} campos desde el panel de admin.`,
        }, auth.currentUser.id)

        return new Response(JSON.stringify({ success: true }), { status: 200 })
    } catch (err: any) {
        await recordAdminDatabaseActivity({
            action_key: "table_edit",
            status: "error",
            title: `Error al editar ${tableName}`,
            detail: err.message || "No se pudo actualizar la fila.",
        }, auth.currentUser.id)

        return new Response(JSON.stringify({
            error: "table_update_error",
            message: err.message || "No se pudo actualizar la fila.",
        }), { status: 500 })
    }
}

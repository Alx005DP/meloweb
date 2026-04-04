import type { APIRoute } from "astro"
import { promises as fs } from "node:fs"
import path from "node:path"
import { db } from "../../../../lib/db"
import {
    ADMIN_DB_TABLES,
    ensureBackupsDirectory,
    formatBytes,
    getRecentAdminDatabaseActivity,
    listExistingTables,
    recordAdminDatabaseActivity,
    requireAdmin,
} from "../../../../lib/admin-database"

const sanitizeDateSegment = (value: string) => value.replace(/[:.]/g, "-")

const escapeSqlString = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")

const formatSqlValue = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL"
    if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`
    if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL"
    if (typeof value === "boolean") return value ? "1" : "0"
    if (typeof value === "object") return `'${escapeSqlString(JSON.stringify(value))}'`
    return `'${escapeSqlString(String(value))}'`
}

const buildInsertStatements = (tableName: string, rows: Array<Record<string, unknown>>) => {
    if (!rows.length) return ""

    const columns = Object.keys(rows[0])
    const columnSql = columns.map((column) => `\`${column}\``).join(", ")
    const valuesSql = rows
        .map((row) => `(${columns.map((column) => formatSqlValue(row[column])).join(", ")})`)
        .join(",\n")

    return `INSERT INTO \`${tableName}\` (${columnSql}) VALUES\n${valuesSql};\n`
}

export const POST: APIRoute = async ({ cookies, request }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    const { action } = await request.json().catch(() => ({ action: null }))
    if (!action || !["backup", "cleanup_logs", "reindex"].includes(action)) {
        return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400 })
    }

    try {
        if (action === "backup") {
            const existingTables = await listExistingTables(ADMIN_DB_TABLES)
            const sqlParts: string[] = [
                `-- Backup generado el ${new Date().toISOString()}`,
                `-- Usuario: ${auth.currentUser.username || auth.currentUser.email}`,
                "SET FOREIGN_KEY_CHECKS=0;",
                "",
            ]

            for (const tableName of existingTables) {
                const [createRows]: any = await db.query(`SHOW CREATE TABLE \`${tableName}\``)
                const [rows]: any = await db.query(`SELECT * FROM \`${tableName}\``)
                const createSql = createRows[0]?.["Create Table"]

                sqlParts.push(`-- Tabla: ${tableName}`)
                sqlParts.push(`DROP TABLE IF EXISTS \`${tableName}\`;`)
                sqlParts.push(`${createSql};`)
                sqlParts.push("")

                const insertSql = buildInsertStatements(tableName, rows)
                if (insertSql) {
                    sqlParts.push(insertSql)
                }
            }

            sqlParts.push("SET FOREIGN_KEY_CHECKS=1;")

            const dir = await ensureBackupsDirectory()
            const filename = `backup-${sanitizeDateSegment(new Date().toISOString())}.sql`
            const filePath = path.join(dir, filename)
            const content = sqlParts.join("\n")
            await fs.writeFile(filePath, content, "utf8")

            const stats = await fs.stat(filePath)

            await recordAdminDatabaseActivity({
                action_key: "backup",
                status: "success",
                title: "Backup manual completado",
                detail: `Archivo guardado en storage/backups/${filename} (${formatBytes(stats.size)}).`,
            }, auth.currentUser.id)

            return new Response(JSON.stringify({
                success: true,
                message: "Backup manual generado correctamente.",
                file: {
                    name: filename,
                    path: `storage/backups/${filename}`,
                    sizeBytes: stats.size,
                    sizeLabel: formatBytes(stats.size),
                },
            }), { status: 200 })
        }

        if (action === "cleanup_logs") {
            let removedActivity = 0
            let removedRateLimit = 0

            try {
                const [result]: any = await db.execute(
                    "DELETE FROM admin_db_activity WHERE created_at < (NOW() - INTERVAL 30 DAY)"
                )
                removedActivity = Number(result?.affectedRows || 0)
            } catch {
                removedActivity = 0
            }

            try {
                const [result]: any = await db.execute(
                    "DELETE FROM rate_limit_ip WHERE fecha IS NOT NULL AND fecha < (CURDATE() - INTERVAL 30 DAY)"
                )
                removedRateLimit = Number(result?.affectedRows || 0)
            } catch {
                removedRateLimit = 0
            }

            await recordAdminDatabaseActivity({
                action_key: "cleanup_logs",
                status: "success",
                title: "Limpieza completada",
                detail: `Se eliminaron ${removedActivity} registros de actividad y ${removedRateLimit} filas antiguas de rate limit.`,
            }, auth.currentUser.id)

            return new Response(JSON.stringify({
                success: true,
                message: "Limpieza completada correctamente.",
                removedActivity,
                removedRateLimit,
            }), { status: 200 })
        }

        const existingTables = await listExistingTables(ADMIN_DB_TABLES)
        const processed: string[] = []

        for (const tableName of existingTables) {
            try {
                await db.query(`ANALYZE TABLE \`${tableName}\``)
                processed.push(tableName)
            } catch {
                // Skip tables that cannot be analyzed on the current engine.
            }
        }

        await recordAdminDatabaseActivity({
            action_key: "reindex",
            status: "success",
            title: "Revision de tablas completada",
            detail: `Se analizaron ${processed.length} tablas: ${processed.join(", ") || "ninguna"}.`,
        }, auth.currentUser.id)

        return new Response(JSON.stringify({
            success: true,
            message: "Revision de tablas completada correctamente.",
            processed,
        }), { status: 200 })
    } catch (err: any) {
        await recordAdminDatabaseActivity({
            action_key: action,
            status: "error",
            title: "Error en herramienta de base de datos",
            detail: err.message || "No se pudo completar la accion solicitada.",
        }, auth.currentUser.id)

        return new Response(JSON.stringify({
            error: "database_action_error",
            message: err.message || "No se pudo completar la acción.",
        }), { status: 500 })
    }
}

export const GET: APIRoute = async ({ cookies }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    try {
        const activity = await getRecentAdminDatabaseActivity(20)
        return new Response(JSON.stringify({ activity }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({
            error: "database_history_error",
            message: err.message || "No se pudo cargar el historial.",
        }), { status: 500 })
    }
}

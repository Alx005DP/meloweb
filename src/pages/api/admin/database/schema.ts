import type { APIRoute } from "astro"
import { db } from "../../../../lib/db"
import {
    ADMIN_DB_TABLES,
    getCurrentDatabaseName,
    listExistingTables,
    requireAdmin,
} from "../../../../lib/admin-database"

export const GET: APIRoute = async ({ cookies }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    try {
        const dbName = await getCurrentDatabaseName()
        const existingTables = await listExistingTables(ADMIN_DB_TABLES)

        if (!existingTables.length) {
            return new Response(JSON.stringify({ schema: [] }), { status: 200 })
        }

        const placeholders = existingTables.map(() => "?").join(", ")
        const [rows]: any = await db.execute(
            `SELECT
                TABLE_NAME AS tableName,
                COLUMN_NAME AS columnName,
                COLUMN_TYPE AS columnType,
                IS_NULLABLE AS isNullable,
                COLUMN_KEY AS columnKey,
                COLUMN_DEFAULT AS columnDefault,
                EXTRA AS extra
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME IN (${placeholders})
             ORDER BY FIELD(TABLE_NAME, ${placeholders}), ORDINAL_POSITION`,
            [dbName, ...existingTables, ...existingTables]
        )

        const grouped = existingTables.map((tableName) => ({
            tableName,
            columns: rows
                .filter((row: any) => row.tableName === tableName)
                .map((row: any) => ({
                    name: row.columnName,
                    type: row.columnType,
                    nullable: row.isNullable === "YES",
                    key: row.columnKey || "",
                    defaultValue: row.columnDefault,
                    extra: row.extra || "",
                })),
        }))

        return new Response(JSON.stringify({ schema: grouped }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({
            error: "schema_error",
            message: err.message || "No se pudo cargar el esquema.",
        }), { status: 500 })
    }
}

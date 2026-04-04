import type { APIRoute } from "astro"
import { db } from "../../../../lib/db"
import {
    ADMIN_DB_TABLES,
    ensureAdminDatabaseActivityTable,
    formatBytes,
    getLatestBackupFile,
    getRecentAdminDatabaseActivity,
    getCurrentDatabaseName,
    requireAdmin,
} from "../../../../lib/admin-database"

export const GET: APIRoute = async ({ cookies }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    try {
        await ensureAdminDatabaseActivityTable()
        const dbName = await getCurrentDatabaseName()

        const [usersRows]: any = await db.execute("SELECT COUNT(*) AS total FROM usuarios")
        const [citasRows]: any = await db.execute(
            `SELECT COUNT(*) AS total
             FROM citas
             WHERE YEAR(start) = YEAR(CURDATE()) AND MONTH(start) = MONTH(CURDATE())`
        )

        let qrActive = 0
        try {
            const [qrRows]: any = await db.execute(
                "SELECT COUNT(*) AS total FROM qr_codes WHERE activo = 1"
            )
            qrActive = Number(qrRows[0]?.total || 0)
        } catch {
            qrActive = 0
        }

        const placeholders = ADMIN_DB_TABLES.map(() => "?").join(", ")
        const [tableRows]: any = await db.execute(
            `SELECT
                TABLE_NAME AS name,
                ENGINE AS engine,
                COALESCE(TABLE_ROWS, 0) AS rowCount,
                COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0) AS totalBytes,
                UPDATE_TIME AS updateTime
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME IN (${placeholders})
             ORDER BY FIELD(TABLE_NAME, ${placeholders})`,
            [dbName, ...ADMIN_DB_TABLES, ...ADMIN_DB_TABLES]
        )

        const tables = ADMIN_DB_TABLES.map((tableName) => {
            const row = tableRows.find((item: any) => item.name === tableName)

            if (!row) {
                return {
                    name: tableName,
                    exists: false,
                    status: "No creada",
                    rowCount: 0,
                    sizeBytes: 0,
                    sizeLabel: "0 B",
                    engine: null,
                    updateTime: null,
                }
            }

            return {
                name: row.name,
                exists: true,
                status: row.engine ? "Activa" : "Revisar",
                rowCount: Number(row.rowCount || 0),
                sizeBytes: Number(row.totalBytes || 0),
                sizeLabel: formatBytes(Number(row.totalBytes || 0)),
                engine: row.engine || null,
                updateTime: row.updateTime ? new Date(row.updateTime).toISOString() : null,
            }
        })

        const latestBackup = await getLatestBackupFile()
        const activity = await getRecentAdminDatabaseActivity(8)

        return new Response(JSON.stringify({
            stats: {
                usersTotal: Number(usersRows[0]?.total || 0),
                citasMonth: Number(citasRows[0]?.total || 0),
                qrActive,
                latestBackup: latestBackup
                    ? {
                        name: latestBackup.name,
                        path: `storage/backups/${latestBackup.name}`,
                        sizeBytes: latestBackup.size,
                        sizeLabel: formatBytes(latestBackup.size),
                        modifiedAt: latestBackup.modifiedAt.toISOString(),
                    }
                    : null,
            },
            tables,
            activity,
        }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({
            error: "db_overview_error",
            message: err.message || "No se pudo cargar la gestión de base de datos.",
        }), { status: 500 })
    }
}

import jwt from "jsonwebtoken"
import { promises as fs } from "node:fs"
import path from "node:path"
import { db } from "./db"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

const ACTIVITY_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS admin_db_activity (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        action_key VARCHAR(60) NOT NULL,
        status ENUM('success', 'error', 'info') NOT NULL DEFAULT 'info',
        title VARCHAR(160) NOT NULL,
        detail TEXT NULL,
        created_by VARCHAR(36) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_db_activity_created_at (created_at),
        INDEX idx_admin_db_activity_action_key (action_key)
    )
`

export const ADMIN_DB_TABLES = [
    "usuarios",
    "citas",
    "qr_codes",
    "qr_usos",
    "user_security_flags",
    "verify_cita",
    "rate_limit_ip",
    "admin_db_activity",
] as const

export type AdminDbActivity = {
    id?: number
    action_key: string
    status: "success" | "error" | "info"
    title: string
    detail: string | null
    created_at?: string
}

export const requireAdmin = async (cookies: any) => {
    const token = cookies.get("auth_token")?.value
    if (!token) {
        return { error: new Response(JSON.stringify({ error: "no_session" }), { status: 401 }) }
    }

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return { error: new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 }) }
    }

    const [sessionRows]: any = await db.execute(
        "SELECT id, rol, username, email FROM usuarios WHERE id = ? LIMIT 1",
        [payload.id]
    )

    const currentUser = sessionRows[0]
    if (!currentUser || !["admin", "dueno"].includes(currentUser.rol)) {
        return { error: new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }) }
    }

    return { currentUser }
}

export const ensureAdminDatabaseActivityTable = async () => {
    await db.execute(ACTIVITY_TABLE_SQL)
}

export const recordAdminDatabaseActivity = async (activity: AdminDbActivity, createdBy?: string | null) => {
    await ensureAdminDatabaseActivityTable()

    await db.execute(
        `INSERT INTO admin_db_activity (action_key, status, title, detail, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
            activity.action_key,
            activity.status,
            activity.title,
            activity.detail || null,
            createdBy || null,
        ]
    )
}

export const getRecentAdminDatabaseActivity = async (limit = 8) => {
    await ensureAdminDatabaseActivityTable()

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 20) : 8
    const [rows]: any = await db.query(
        `SELECT id, action_key, status, title, detail, created_at
         FROM admin_db_activity
         ORDER BY created_at DESC, id DESC
         LIMIT ${safeLimit}`
    )

    return rows as Array<{
        id: number
        action_key: string
        status: "success" | "error" | "info"
        title: string
        detail: string | null
        created_at: string
    }>
}

export const getCurrentDatabaseName = async () => {
    const [rows]: any = await db.execute("SELECT DATABASE() AS dbName")
    return rows[0]?.dbName || ""
}

export const tableExists = async (tableName: string) => {
    const dbName = await getCurrentDatabaseName()
    const [rows]: any = await db.execute(
        `SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         LIMIT 1`,
        [dbName, tableName]
    )

    return rows.length > 0
}

export const listExistingTables = async (tableNames: readonly string[]) => {
    const dbName = await getCurrentDatabaseName()
    if (!tableNames.length) return []

    const placeholders = tableNames.map(() => "?").join(", ")
    const [rows]: any = await db.execute(
        `SELECT TABLE_NAME AS tableName
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})`,
        [dbName, ...tableNames]
    )

    return rows.map((row: any) => String(row.tableName))
}

export const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex += 1
    }

    const decimals = value >= 10 || unitIndex === 0 ? 0 : 1
    return `${value.toFixed(decimals)} ${units[unitIndex]}`
}

export const backupsDirectory = () => path.join(process.cwd(), "storage", "backups")

export const ensureBackupsDirectory = async () => {
    const dir = backupsDirectory()
    await fs.mkdir(dir, { recursive: true })
    return dir
}

export const getLatestBackupFile = async () => {
    const dir = backupsDirectory()

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        const files = await Promise.all(
            entries
                .filter((entry) => entry.isFile())
                .map(async (entry) => {
                    const fullPath = path.join(dir, entry.name)
                    const stats = await fs.stat(fullPath)
                    return {
                        name: entry.name,
                        fullPath,
                        modifiedAt: stats.mtime,
                        size: stats.size,
                    }
                })
        )

        files.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
        return files[0] || null
    } catch {
        return null
    }
}

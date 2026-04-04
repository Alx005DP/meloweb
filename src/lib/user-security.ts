import { db } from "./db"

const SECURITY_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS user_security_flags (
        user_id VARCHAR(36) PRIMARY KEY,
        must_change_password TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`

export const ensureUserSecurityTable = async () => {
    await db.execute(SECURITY_TABLE_SQL)

    const [columns] = await db.execute(
        "SHOW COLUMNS FROM user_security_flags LIKE 'user_id'"
    ) as any

    const columnType = String(columns[0]?.Type || "").toLowerCase()
    if (columnType && columnType !== "varchar(36)") {
        await db.execute(
            "ALTER TABLE user_security_flags MODIFY COLUMN user_id VARCHAR(36) NOT NULL"
        )
    }
}

export const getMustChangePassword = async (userId: string) => {
    await ensureUserSecurityTable()

    const [rows] = await db.execute(
        "SELECT must_change_password FROM user_security_flags WHERE user_id = ? LIMIT 1",
        [userId]
    ) as any

    return Boolean(rows[0]?.must_change_password)
}

export const setMustChangePassword = async (userId: string, mustChangePassword: boolean) => {
    await ensureUserSecurityTable()

    await db.execute(
        `INSERT INTO user_security_flags (user_id, must_change_password)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE must_change_password = VALUES(must_change_password)`,
        [userId, mustChangePassword ? 1 : 0]
    )
}

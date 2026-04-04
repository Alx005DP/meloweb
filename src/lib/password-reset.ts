import { db } from "./db"

const RESET_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        email VARCHAR(150) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_password_reset_user (user_id),
        INDEX idx_password_reset_email (email)
    )
`

export const ensurePasswordResetTable = async () => {
    await db.execute(RESET_TABLE_SQL)
}

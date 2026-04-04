import { db } from "./db"

export const ensureDiscountRedemptionsTable = async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS qr_descuento_canjeos (
            id varchar(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
            qr_id varchar(36) NOT NULL,
            user_id varchar(36) NOT NULL,
            qr_uso_id varchar(36) DEFAULT NULL,
            redeemed_by varchar(36) NOT NULL,
            redeemed_at timestamp NULL DEFAULT current_timestamp(),
            UNIQUE KEY uniq_discount_user (qr_id, user_id)
        )
    `)
}

export const getDiscountPublicTitle = (row: any) => {
    let publicTitle = row.titulo || "Descuento especial"

    try {
        const parsedValue = row.valor ? JSON.parse(row.valor) : null
        if (parsedValue?.titulo_visible) {
            publicTitle = parsedValue.titulo_visible
        }
    } catch {}

    return publicTitle
}

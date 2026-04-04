import type { APIRoute } from "astro"
import jwt from "jsonwebtoken"
import { db } from "../../../lib/db"
import {
    ensureDiscountRedemptionsTable,
    getDiscountPublicTitle,
} from "../../../lib/discounts"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ cookies }) => {
    const token = cookies.get("auth_token")?.value

    if (!token) {
        return new Response(JSON.stringify({ discounts: [] }), { status: 401 })
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any
        await ensureDiscountRedemptionsTable()

        const [rows] = await db.execute(
            `SELECT q.id, q.titulo, q.valor, q.descuento, q.tipo_descuento, q.expires_at, q.activo,
                    u.id AS uso_id
             FROM qr_usos u
             INNER JOIN qr_codes q ON q.id = u.qr_id
             LEFT JOIN qr_descuento_canjeos c
                ON c.qr_id = u.qr_id AND c.user_id = u.user_id
             WHERE u.user_id = ? AND q.tipo = 'descuento'
               AND c.id IS NULL
             ORDER BY
                CASE
                    WHEN q.expires_at IS NULL THEN 0
                    ELSE 1
                END,
                q.expires_at ASC`,
            [payload.id],
        ) as any

        const now = new Date()

        const discounts = rows.map((row: any) => {
            const publicTitle = getDiscountPublicTitle(row)
            const expiresAt = row.expires_at ? new Date(row.expires_at) : null
            const isExpired = expiresAt ? expiresAt < now : false
            const isActive = Boolean(row.activo) && !isExpired

            return {
                id: row.id,
                uso_id: row.uso_id,
                public_title: publicTitle,
                descuento: row.descuento,
                tipo_descuento: row.tipo_descuento,
                value_label: row.tipo_descuento === "porcentaje"
                    ? `${row.descuento}%`
                    : `${row.descuento}€`,
                expires_at: row.expires_at
                    ? new Date(row.expires_at).toISOString()
                    : null,
                status: isExpired ? "caducado" : isActive ? "vigente" : "inactivo",
                status_label: isExpired
                    ? "Caducado"
                    : isActive
                        ? "Disponible"
                        : "Inactivo",
                status_detail: isExpired
                    ? "Este descuento ya no se puede usar"
                    : isActive
                        ? "Listo para usar en tu proxima visita"
                        : "Actualmente no esta disponible",
            }
        })

        return new Response(JSON.stringify({ discounts }), { status: 200 })
    } catch {
        return new Response(
            JSON.stringify({ discounts: [], error: "invalid_session" }),
            { status: 401 },
        )
    }
}

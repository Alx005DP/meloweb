import type { APIRoute } from "astro"
import jwt from "jsonwebtoken"
import { db } from "../../../../lib/db"
import { ensureDiscountRedemptionsTable } from "../../../../lib/discounts"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ cookies, url }) => {
    const token = cookies.get("auth_token")?.value
    const qrId = url.searchParams.get("id")

    if (!token || !qrId) {
        return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400 })
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any
        await ensureDiscountRedemptionsTable()

        const [rows] = await db.execute(
            `SELECT q.id, q.expires_at, q.activo, u.id AS uso_id, c.id AS canje_id
             FROM qr_usos u
             INNER JOIN qr_codes q ON q.id = u.qr_id
             LEFT JOIN qr_descuento_canjeos c
                ON c.qr_id = u.qr_id AND c.user_id = u.user_id
             WHERE u.user_id = ? AND q.id = ? AND q.tipo = 'descuento'
             LIMIT 1`,
            [payload.id, qrId],
        ) as any

        if (!rows.length) {
            return new Response(JSON.stringify({ error: "discount_not_found" }), { status: 404 })
        }

        const discount = rows[0]
        const isExpired = discount.expires_at
            ? new Date(discount.expires_at) < new Date()
            : false

        if (!discount.activo || isExpired || discount.canje_id) {
            return new Response(JSON.stringify({ error: "discount_unavailable" }), { status: 409 })
        }

        const redeemToken = jwt.sign(
            {
                type: "discount_redeem",
                qrId: discount.id,
                userId: payload.id,
                usoId: discount.uso_id,
            },
            JWT_SECRET,
            { expiresIn: "10m" },
        )

        return new Response(JSON.stringify({ token: redeemToken }), { status: 200 })
    } catch {
        return new Response(JSON.stringify({ error: "invalid_session" }), { status: 401 })
    }
}

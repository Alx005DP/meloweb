import type { APIRoute } from "astro"
import jwt from "jsonwebtoken"
import { db } from "../../../lib/db"
import {
    ensureDiscountRedemptionsTable,
    getDiscountPublicTitle,
} from "../../../lib/discounts"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ url, cookies }) => {
    const redirectTo = (path: string, status = 302) =>
        Response.redirect(new URL(path, url).toString(), status)

    const tokenParam = url.searchParams.get("token")
    const sessionToken = cookies.get("auth_token")?.value

    if (!tokenParam) {
        return redirectTo("/descuento/canjeado?status=invalid")
    }

    if (!sessionToken) {
        const redirectPath = encodeURIComponent(`/api/descuentos/canjear?token=${tokenParam}`)
        return redirectTo(`/login?redirect=${redirectPath}`)
    }

    try {
        const employeeSession = jwt.verify(sessionToken, JWT_SECRET) as any
        const [employeeRows] = await db.execute(
            "SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1",
            [employeeSession.id],
        ) as any

        const employee = employeeRows[0]
        if (!employee || !["empleado", "admin", "dueno"].includes(employee.rol)) {
            return redirectTo("/descuento/canjeado?status=forbidden")
        }

        const redeemPayload = jwt.verify(tokenParam, JWT_SECRET) as any
        if (redeemPayload.type !== "discount_redeem") {
            return redirectTo("/descuento/canjeado?status=invalid")
        }

        await ensureDiscountRedemptionsTable()

        const [rows] = await db.execute(
            `SELECT q.id, q.titulo, q.valor, q.descuento, q.tipo_descuento, q.expires_at, q.activo,
                    u.id AS uso_id, u.user_id, c.id AS canje_id,
                    usr.nombre, usr.apellidos, usr.username
             FROM qr_usos u
             INNER JOIN qr_codes q ON q.id = u.qr_id
             INNER JOIN usuarios usr ON usr.id = u.user_id
             LEFT JOIN qr_descuento_canjeos c
                ON c.qr_id = u.qr_id AND c.user_id = u.user_id
             WHERE u.qr_id = ? AND u.user_id = ? AND u.id = ?
             LIMIT 1`,
            [redeemPayload.qrId, redeemPayload.userId, redeemPayload.usoId],
        ) as any

        if (!rows.length) {
            return redirectTo("/descuento/canjeado?status=missing")
        }

        const discount = rows[0]
        const isExpired = discount.expires_at
            ? new Date(discount.expires_at) < new Date()
            : false

        if (!discount.activo || isExpired) {
            return redirectTo("/descuento/canjeado?status=expired")
        }

        if (discount.canje_id) {
            return redirectTo("/descuento/canjeado?status=already")
        }

        await db.execute(
            `INSERT INTO qr_descuento_canjeos (qr_id, user_id, qr_uso_id, redeemed_by)
             VALUES (?, ?, ?, ?)`,
            [discount.id, discount.user_id, discount.uso_id, employee.id],
        )

        await db.execute(
            "DELETE FROM qr_usos WHERE id = ? LIMIT 1",
            [discount.uso_id],
        )

        const title = encodeURIComponent(getDiscountPublicTitle(discount))
        const value = encodeURIComponent(
            discount.tipo_descuento === "porcentaje"
                ? `${discount.descuento}%`
                : `${discount.descuento}€`,
        )
        const customer = encodeURIComponent(
            `${discount.nombre || ""} ${discount.apellidos || ""}`.trim() ||
                discount.username ||
                "Cliente",
        )

        return redirectTo(
            `/descuento/canjeado?status=success&title=${title}&value=${value}&customer=${customer}`,
        )
    } catch {
        return redirectTo("/descuento/canjeado?status=invalid")
    }
}

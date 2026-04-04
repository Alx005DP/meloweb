import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"
import { ensureDiscountRedemptionsTable } from "../../../lib/discounts"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ url, cookies, request }) => {
    const redirectTo = (path: string, status = 302) =>
        Response.redirect(new URL(path, url).toString(), status)

    const qrId = url.searchParams.get("id")
    if (!qrId) return new Response("Invalid QR", { status: 400 })

    // Obtener usuario (si existe)
    let userId = null
    const token = cookies.get("auth_token")?.value

    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET) as any
            userId = payload.id
        } catch {}
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"

    try {
        await ensureDiscountRedemptionsTable()

        // Buscar QR
        const [rows]: any = await db.execute(
            "SELECT * FROM qr_codes WHERE id = ? AND activo = 1",
            [qrId]
        )

        if (rows.length === 0) {
            return redirectTo("/?qr=invalid")
        }

        const qr = rows[0]

        // ⛔ Caducidad
        if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
            return redirectTo("/?qr=expired_date")
        }

        // ⛔ Máximo de usos
        if (qr.max_usos && qr.usos >= qr.max_usos) {
            return redirectTo("/?qr=limit_reached")
        }

        // 🔐 Si es descuento → login obligatorio
        if (qr.tipo === "descuento" && !userId) {
            const redirectPath = encodeURIComponent(`/api/qr/scan?id=${qrId}`)
            return redirectTo(`/login?redirect=${redirectPath}`)
        }

        // 🚫 Evitar que el mismo usuario lo use 2 veces
        if (qr.tipo === "descuento" && userId) {
            const [redeemed]: any = await db.execute(
                "SELECT id FROM qr_descuento_canjeos WHERE qr_id = ? AND user_id = ? LIMIT 1",
                [qr.id, userId]
            )

            if (redeemed.length > 0) {
                return redirectTo("/?qr=already_used")
            }

            const [existing]: any = await db.execute(
                "SELECT id FROM qr_usos WHERE qr_id = ? AND user_id = ?",
                [qr.id, userId]
            )

            if (existing.length > 0) {
                return redirectTo("/?qr=already_used")
            }
        }

        // ✅ Registrar uso
        await db.execute(
            "INSERT INTO qr_usos (qr_id, user_id, ip) VALUES (?, ?, ?)",
            [qr.id, userId, ip]
        )

        await db.execute(
            "UPDATE qr_codes SET usos = usos + 1 WHERE id = ?",
            [qr.id]
        )

        // 🎯 Redirecciones
        if (qr.tipo === "descuento") {
            return redirectTo(`/descuento/${qr.id}`)
        }

        if (qr.tipo === "mensaje") {
            return redirectTo(`/?mensaje=${encodeURIComponent(qr.valor || "")}`)
        }

        if (qr.tipo === "url") {
            return Response.redirect(qr.valor, 302)
        }

        return redirectTo("/")

    } catch (err) {
        return new Response("Error", { status: 500 })
    }
}

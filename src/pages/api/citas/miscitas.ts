import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ cookies }) => {
    const token = cookies.get("auth_token")?.value
    if (!token) return new Response(JSON.stringify({ error: "no_session" }), { status: 401 })

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 })
    }

    try {
        const now = new Date()

        const [proximas] = await db.execute(
            `SELECT id, title, phone, service, start, color, notes, status, created_at
             FROM citas
             WHERE user_id = ? AND start >= ? AND status NOT IN ('cancelled', 'completed')
             ORDER BY start ASC`,
            [payload.id, now]
        ) as any

        const [historial] = await db.execute(
            `SELECT id, title, phone, service, start, color, notes, status, created_at
             FROM citas
             WHERE user_id = ? AND (start < ? OR status IN ('cancelled', 'completed'))
             ORDER BY start DESC`,
            [payload.id, now]
        ) as any

        return new Response(JSON.stringify({ proximas, historial }), { status: 200 })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}
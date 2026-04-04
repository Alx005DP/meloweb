import type { APIRoute } from "astro"
import jwt from "jsonwebtoken"
import { db } from "../../../lib/db"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ cookies, url }) => {
    const token = cookies.get("auth_token")?.value
    if (!token) {
        return new Response(JSON.stringify({ error: "no_session" }), { status: 401 })
    }

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 })
    }

    const [sessionRows]: any = await db.execute(
        "SELECT rol FROM usuarios WHERE id = ? LIMIT 1",
        [payload.id]
    )

    const rol = sessionRows[0]?.rol
    if (!["admin", "dueno"].includes(rol)) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
    }

    const query = url.searchParams.get("q")?.trim() || ""
    const like = `%${query}%`

    try {
        const [rows]: any = await db.execute(
            `SELECT
                id,
                username,
                nombre,
                apellidos,
                email,
                rol,
                created_at,
                CASE WHEN avatar IS NULL THEN 0 ELSE 1 END AS hasAvatar
             FROM usuarios
             WHERE (? = '' OR username LIKE ? OR nombre LIKE ? OR apellidos LIKE ? OR email LIKE ?)
             ORDER BY created_at DESC, id DESC
             LIMIT 100`,
            [query, like, like, like, like]
        )

        return new Response(JSON.stringify({ users: rows }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "db_error" }), { status: 500 })
    }
}

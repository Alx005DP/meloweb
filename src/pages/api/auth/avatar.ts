import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const POST: APIRoute = async ({ request, cookies }) => {
    const token = cookies.get("auth_token")?.value
    if (!token) return new Response(JSON.stringify({ error: "no_session" }), { status: 401 })

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get("avatar") as File

        if (!file) return new Response(JSON.stringify({ error: "no_file" }), { status: 400 })

        // Limitar tamaño a 2MB
        if (file.size > 2 * 1024 * 1024) {
            return new Response(JSON.stringify({
                error: "file_too_large",
                message: "La imagen no puede superar 2MB."
            }), { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        await db.execute(
            "UPDATE usuarios SET avatar = ?, avatar_type = ? WHERE id = ?",
            [buffer, file.type, payload.id]
        )

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err) {
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500 })
    }
}
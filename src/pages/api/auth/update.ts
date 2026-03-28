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

    const { nombre, apellidos, username, email, telefono } = await request.json()

    try {
        // Verificar username no ocupado por otro usuario
        const [existingUsername] = await db.execute(
            "SELECT id FROM usuarios WHERE username = ? AND id != ?",
            [username, payload.id]
        ) as any

        if (existingUsername.length > 0) {
            return new Response(JSON.stringify({
                error: "username_taken",
                message: "Este nombre de usuario ya está en uso."
            }), { status: 400 })
        }

        // Verificar email no ocupado por otro usuario
        const [existingEmail] = await db.execute(
            "SELECT id FROM usuarios WHERE email = ? AND id != ?",
            [email, payload.id]
        ) as any

        if (existingEmail.length > 0) {
            return new Response(JSON.stringify({
                error: "email_taken",
                message: "Este email ya está en uso."
            }), { status: 400 })
        }

        await db.execute(
            "UPDATE usuarios SET nombre = ?, apellidos = ?, username = ?, email = ?, telefono = ? WHERE id = ?",
            [nombre, apellidos, username, email, telefono || null, payload.id]
        )

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err) {
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500 })
    }
}
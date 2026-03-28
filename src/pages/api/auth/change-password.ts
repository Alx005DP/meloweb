import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

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

    const { currentPassword, newPassword } = await request.json()

    try {
        const [rows] = await db.execute(
            "SELECT password FROM usuarios WHERE id = ?",
            [payload.id]
        ) as any

        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: "user_not_found" }), { status: 404 })
        }

        const passwordOk = await bcrypt.compare(currentPassword, rows[0].password)
        if (!passwordOk) {
            return new Response(JSON.stringify({
                error: "wrong_password",
                message: "La contraseña actual no es correcta."
            }), { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12)
        await db.execute(
            "UPDATE usuarios SET password = ? WHERE id = ?",
            [hashedPassword, payload.id]
        )

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err) {
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500 })
    }
}
import type { APIRoute } from "astro"
import { db } from "../../../lib/db"

export const POST: APIRoute = async ({ request }) => {
    const { email, codigo } = await request.json()

    try {
        const [rows] = await db.execute(
            "SELECT verify_code, verify_expires FROM usuarios WHERE email = ?",
            [email]
        ) as any

        if (rows.length === 0) {
            return new Response(JSON.stringify({
                error: "not_found",
                message: "Usuario no encontrado."
            }), { status: 404 })
        }

        const { verify_code, verify_expires } = rows[0]

        if (new Date() > new Date(verify_expires)) {
            await db.execute(
                "DELETE FROM usuarios WHERE email = ? AND verified = 0",
                [email]
            )
            return new Response(JSON.stringify({
                error: "expired",
                message: "El código ha expirado. Por favor regístrate de nuevo."
            }), { status: 400 })
        }

        if (codigo !== verify_code) {
            return new Response(JSON.stringify({
                error: "wrong_code",
                message: "El código es incorrecto."
            }), { status: 400 })
        }

        await db.execute(
            "UPDATE usuarios SET verified = 1, verify_code = NULL, verify_expires = NULL WHERE email = ?",
            [email]
        )

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err: any) {
        return new Response(JSON.stringify({
            error: "server_error",
            message: err.message
        }), { status: 500 })
    }
}
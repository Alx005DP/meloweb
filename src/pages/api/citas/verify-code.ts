import type { APIRoute } from "astro"
import { db } from "../../../lib/db"

export const POST: APIRoute = async ({ request }) => {
    const { email, codigo } = await request.json()

    try {
        const [rows] = await db.execute(
            "SELECT codigo, expires FROM verify_cita WHERE email = ?",
            [email]
        ) as any

        if (rows.length === 0) {
            return new Response(JSON.stringify({
                error: "not_found",
                message: "No hay ningún código pendiente para este email."
            }), { status: 404 })
        }

        if (new Date() > new Date(rows[0].expires)) {
            await db.execute("DELETE FROM verify_cita WHERE email = ?", [email])
            return new Response(JSON.stringify({
                error: "expired",
                message: "El código ha expirado. Solicita uno nuevo."
            }), { status: 400 })
        }

        if (codigo !== rows[0].codigo) {
            return new Response(JSON.stringify({
                error: "wrong_code",
                message: "El código es incorrecto."
            }), { status: 400 })
        }

        // Eliminar código usado
        await db.execute("DELETE FROM verify_cita WHERE email = ?", [email])

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}
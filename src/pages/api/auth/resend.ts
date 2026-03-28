import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import { sendVerificationEmail } from "../../../lib/mailer"

export const POST: APIRoute = async ({ request }) => {
    const { email } = await request.json()

    try {
        const [rows] = await db.execute(
            "SELECT nombre, verified FROM usuarios WHERE email = ?",
            [email]
        ) as any

        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
        }

        if (rows[0].verified) {
            return new Response(JSON.stringify({ error: "already_verified" }), { status: 400 })
        }

        const codigo  = Math.floor(100000 + Math.random() * 900000).toString()
        const expires = new Date(Date.now() + 15 * 60 * 1000)

        await db.execute(
            "UPDATE usuarios SET verify_code = ?, verify_expires = ? WHERE email = ?",
            [codigo, expires, email]
        )

        await sendVerificationEmail(email, codigo, rows[0].nombre)

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}
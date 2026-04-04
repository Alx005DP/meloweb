import type { APIRoute } from "astro"
import crypto from "node:crypto"
import { db } from "../../../../lib/db"
import { sendPasswordResetEmail } from "../../../../lib/mailer"
import { ensurePasswordResetTable } from "../../../../lib/password-reset"

export const POST: APIRoute = async ({ request }) => {
    const { email } = await request.json().catch(() => ({ email: "" }))
    const normalizedEmail = String(email || "").trim().toLowerCase()

    if (!normalizedEmail) {
        return new Response(JSON.stringify({
            error: "missing_email",
            message: "Introduce tu email.",
        }), { status: 400 })
    }

    try {
        await ensurePasswordResetTable()

        const [rows] = await db.execute(
            "SELECT id, nombre, email, verified FROM usuarios WHERE email = ? LIMIT 1",
            [normalizedEmail]
        ) as any

        const user = rows[0]
        if (user && user.verified) {
            const token = crypto.randomBytes(32).toString("hex")
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

            await db.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [user.id])
            await db.execute(
                `INSERT INTO password_reset_tokens (token, user_id, email, expires_at, used)
                 VALUES (?, ?, ?, ?, 0)`,
                [token, user.id, user.email, expiresAt]
            )

            const baseUrl = import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321"
            const resetUrl = `${baseUrl}/forgot-password?token=${encodeURIComponent(token)}`

            await sendPasswordResetEmail(user.email, {
                nombre: user.nombre || "usuario",
                resetUrl,
            })
        }

        return new Response(JSON.stringify({
            success: true,
            message: "Si el email existe, te hemos enviado un enlace para cambiar tu password.",
        }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({
            error: "server_error",
            message: err.message || "No se pudo procesar la solicitud.",
        }), { status: 500 })
    }
}

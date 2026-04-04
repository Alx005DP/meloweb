import type { APIRoute } from "astro"
import bcrypt from "bcryptjs"
import { db } from "../../../../lib/db"
import { ensurePasswordResetTable } from "../../../../lib/password-reset"
import { setMustChangePassword } from "../../../../lib/user-security"

const isValidPassword = (password: string) => {
    return /[A-Z]/.test(password)
        && /[0-9]/.test(password)
        && /[-+*?!]/.test(password)
        && password.length >= 6
}

export const POST: APIRoute = async ({ request }) => {
    const { token, password } = await request.json().catch(() => ({
        token: "",
        password: "",
    }))

    const resetToken = String(token || "").trim()
    const newPassword = String(password || "")

    if (!resetToken || !newPassword) {
        return new Response(JSON.stringify({
            error: "missing_fields",
            message: "Completa todos los campos.",
        }), { status: 400 })
    }

    if (!isValidPassword(newPassword)) {
        return new Response(JSON.stringify({
            error: "invalid_password",
            message: "La password no cumple los requisitos.",
        }), { status: 400 })
    }

    try {
        await ensurePasswordResetTable()

        const [rows] = await db.execute(
            `SELECT token, user_id, email, expires_at, used
             FROM password_reset_tokens
             WHERE token = ?
             LIMIT 1`,
            [resetToken]
        ) as any

        const resetRow = rows[0]
        if (!resetRow) {
            return new Response(JSON.stringify({
                error: "invalid_token",
                message: "El enlace no es valido.",
            }), { status: 400 })
        }

        if (resetRow.used) {
            return new Response(JSON.stringify({
                error: "used_token",
                message: "Este enlace ya se ha usado.",
            }), { status: 400 })
        }

        const expiresAt = new Date(resetRow.expires_at)
        if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
            return new Response(JSON.stringify({
                error: "expired_token",
                message: "El enlace ha expirado.",
            }), { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12)

        await db.execute(
            "UPDATE usuarios SET password = ? WHERE id = ?",
            [hashedPassword, resetRow.user_id]
        )
        await setMustChangePassword(resetRow.user_id, false)

        await db.execute(
            "UPDATE password_reset_tokens SET used = 1 WHERE token = ?",
            [resetToken]
        )

        return new Response(JSON.stringify({
            success: true,
            message: "Tu password se ha actualizado correctamente.",
        }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({
            error: "server_error",
            message: err.message || "No se pudo cambiar la password.",
        }), { status: 500 })
    }
}

import type { APIRoute } from "astro"
import { db } from "../../../../lib/db"
import { ensurePasswordResetTable } from "../../../../lib/password-reset"

export const GET: APIRoute = async ({ url }) => {
    const token = String(url.searchParams.get("token") || "").trim()

    if (!token) {
        return new Response(JSON.stringify({
            valid: false,
            error: "missing_token",
            message: "Falta el token del enlace.",
        }), { status: 400 })
    }

    try {
        await ensurePasswordResetTable()

        const [rows] = await db.execute(
            `SELECT expires_at, used
             FROM password_reset_tokens
             WHERE token = ?
             LIMIT 1`,
            [token]
        ) as any

        const resetRow = rows[0]
        if (!resetRow) {
            return new Response(JSON.stringify({
                valid: false,
                error: "invalid_token",
                message: "El enlace no es valido o ya no esta disponible.",
            }), { status: 404 })
        }

        if (resetRow.used) {
            return new Response(JSON.stringify({
                valid: false,
                error: "used_token",
                message: "Este enlace ya ha sido usado.",
            }), { status: 400 })
        }

        const expiresAt = new Date(resetRow.expires_at)
        if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
            return new Response(JSON.stringify({
                valid: false,
                error: "expired_token",
                message: "El enlace ha expirado.",
            }), { status: 400 })
        }

        return new Response(JSON.stringify({
            valid: true,
        }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({
            valid: false,
            error: "server_error",
            message: err.message || "No se pudo validar el enlace.",
        }), { status: 500 })
    }
}

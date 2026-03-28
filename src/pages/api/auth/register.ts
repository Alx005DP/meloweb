import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import bcrypt from "bcryptjs"
import { sendVerificationEmail } from "../../../lib/mailer"

export const POST: APIRoute = async ({ request }) => {
    const { username, nombre, apellidos, email, password } = await request.json()

    try {
        // — Verificar username —
        const [existingUsername] = await db.execute(
            "SELECT id, verified FROM usuarios WHERE username = ?",
            [username]
        ) as any

        if (existingUsername.length > 0) {
            if (!existingUsername[0].verified) {
                // Username ocupado por usuario no verificado → eliminar
                await db.execute(
                    "DELETE FROM usuarios WHERE username = ? AND verified = 0",
                    [username]
                )
                // Continúa el flujo normal
            } else {
                return new Response(JSON.stringify({
                    error: "username_taken",
                    message: "Este nombre de usuario ya está en uso."
                }), { status: 400 })
            }
        }

        // — Verificar email —
        const [existingEmail] = await db.execute(
            "SELECT id, verified FROM usuarios WHERE email = ?",
            [email]
        ) as any

        if (existingEmail.length > 0) {
            if (!existingEmail[0].verified) {
                // Email ocupado por usuario no verificado → eliminar
                await db.execute(
                    "DELETE FROM usuarios WHERE email = ? AND verified = 0",
                    [email]
                )
                // Continúa el flujo normal
            } else {
                return new Response(JSON.stringify({
                    error: "email_taken",
                    message: "Este email ya está registrado."
                }), { status: 400 })
            }
        }

        // — Encriptar contraseña —
        const hashedPassword = await bcrypt.hash(password, 12)

        // — Generar código de verificación —
        const codigo  = Math.floor(100000 + Math.random() * 900000).toString()
        const expires = new Date(Date.now() + 15 * 60 * 1000)

        // — Insertar usuario sin verificar —
        await db.execute(
            `INSERT INTO usuarios 
            (username, nombre, apellidos, email, password, rol, verified, verify_code, verify_expires) 
            VALUES (?, ?, ?, ?, ?, 'cliente', 0, ?, ?)`,
            [username, nombre, apellidos, email, hashedPassword, codigo, expires]
        )

        // — Enviar email —
        await sendVerificationEmail(email, codigo, nombre)

        return new Response(JSON.stringify({
            success: true,
            message: "Código de verificación enviado."
        }), { status: 201 })

    } catch (err: any) {
        console.error("REGISTER ERROR:", err.message)
        return new Response(JSON.stringify({
            error: "server_error",
            message: err.message
        }), { status: 500 })
    }
}
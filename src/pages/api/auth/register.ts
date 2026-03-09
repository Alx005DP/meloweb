import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import bcrypt from "bcryptjs"

export const POST: APIRoute = async ({ request }) => {
    const { username, nombre, apellidos, email, password } = await request.json()

    try {
        // Verificar si el username ya existe
        const [existingUsername] = await db.execute(
            "SELECT id FROM usuarios WHERE username = ?",
            [username]
        ) as any

        if (existingUsername.length > 0) {
            return new Response(JSON.stringify({
                error: "username_taken",
                message: "Este nombre de usuario ya está en uso."
            }), { status: 400 })
        }

        // Verificar si el email ya existe
        const [existingEmail] = await db.execute(
            "SELECT id FROM usuarios WHERE email = ?",
            [email]
        ) as any

        if (existingEmail.length > 0) {
            return new Response(JSON.stringify({
                error: "email_taken",
                message: "Este email ya está registrado."
            }), { status: 400 })
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 12)

        // Insertar usuario
        await db.execute(
            "INSERT INTO usuarios (username, nombre, apellidos, email, password, rol) VALUES (?, ?, ?, ?, ?, 'cliente')",
            [username, nombre, apellidos, email, hashedPassword]
        )

        return new Response(JSON.stringify({
            success: true,
            message: "Usuario registrado correctamente."
        }), { status: 201 })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({
            error: "server_error",
            message: "Error interno del servidor."
        }), { status: 500 })
    }
}
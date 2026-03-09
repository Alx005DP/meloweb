import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const POST: APIRoute = async ({ request, cookies }) => {
    const { email, password } = await request.json()

    try {
        const [rows] = await db.execute(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        ) as any

        if (rows.length === 0) {
            return new Response(JSON.stringify({
                error: "invalid_credentials",
                message: "Email o contraseña incorrectos."
            }), { status: 401 })
        }

        const usuario = rows[0]
        const passwordOk = await bcrypt.compare(password, usuario.password)

        if (!passwordOk) {
            return new Response(JSON.stringify({
                error: "invalid_credentials",
                message: "Email o contraseña incorrectos."
            }), { status: 401 })
        }

        // Crear JWT
        const token = jwt.sign(
            {
                id:       usuario.id,
                username: usuario.username,
                rol:      usuario.rol
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        )

        // Guardar en cookie httpOnly
        cookies.set("auth_token", token, {
            httpOnly: true,
            secure:   false, // true en producción con HTTPS
            sameSite: "lax",
            maxAge:   60 * 60 * 24 * 7, // 7 días
            path:     "/"
        })

        return new Response(JSON.stringify({
            success: true,
            usuario: {
                id:        usuario.id,
                username:  usuario.username,
                nombre:    usuario.nombre,
                apellidos: usuario.apellidos,
                email:     usuario.email,
                rol:       usuario.rol
            }
        }), { status: 200 })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({
            error: "server_error",
            message: "Error interno del servidor."
        }), { status: 500 })
    }
}
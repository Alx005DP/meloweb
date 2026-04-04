import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getMustChangePassword } from "../../../lib/user-security"

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

        if (!usuario.verified) {
            return new Response(JSON.stringify({
                error: "not_verified",
                message: "Debes verificar tu email antes de iniciar sesión."
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

        const mustChangePassword = await getMustChangePassword(usuario.id)

        return new Response(JSON.stringify({
            success: true,
            mustChangePassword,
            usuario: {
                id:        usuario.id,
                username:  usuario.username,
                nombre:    usuario.nombre,
                apellidos: usuario.apellidos,
                email:     usuario.email,
                rol:       usuario.rol,
                telefono:  usuario.telefono
            }
        }), { status: 200 })

} catch (err: any) {
    console.error("LOGIN ERROR:", err.message, err.code)
    return new Response(JSON.stringify({
        error: "server_error",
        message: err.message  // ← temporal para ver qué falla
    }), { status: 500 })
}
}

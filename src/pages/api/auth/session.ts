import type { APIRoute } from "astro"
import jwt from "jsonwebtoken"
import { db } from "../../../lib/db"
import { getMustChangePassword } from "../../../lib/user-security"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ cookies }) => {
    const token = cookies.get("auth_token")?.value

    if (!token) {
        return new Response(JSON.stringify({ session: null }), { status: 200 })
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any

        // Consultar la BD para obtener datos siempre actualizados
        const [rows] = await db.execute(
            "SELECT id, username, nombre, apellidos, email, rol, telefono, created_at FROM usuarios WHERE id = ?",
            [payload.id]
        ) as any

        if (rows.length === 0) {
            return new Response(JSON.stringify({ session: null }), { status: 200 })
        }

        const usuario = rows[0]
        const mustChangePassword = await getMustChangePassword(usuario.id)

        return new Response(JSON.stringify({
            session: {
                id:        usuario.id,
                username:  usuario.username,
                nombre:    usuario.nombre,
                apellidos: usuario.apellidos,
                email:     usuario.email,
                rol:       usuario.rol,
                telefono: usuario.telefono || null,
                created_at: usuario.created_at ? new Date(usuario.created_at).toISOString() : null,
                mustChangePassword,
            }
        }), { status: 200 })

    } catch {
        return new Response(JSON.stringify({ session: null }), { status: 200 })
    }
}

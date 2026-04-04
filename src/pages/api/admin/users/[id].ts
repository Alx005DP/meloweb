import type { APIRoute } from "astro"
import jwt from "jsonwebtoken"
import { db } from "../../../../lib/db"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

const requireAdmin = async (cookies: any) => {
    const token = cookies.get("auth_token")?.value
    if (!token) {
        return { error: new Response(JSON.stringify({ error: "no_session" }), { status: 401 }) }
    }

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return { error: new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 }) }
    }

    const [sessionRows]: any = await db.execute(
        "SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1",
        [payload.id]
    )

    const currentUser = sessionRows[0]
    if (!currentUser || !["admin", "dueno"].includes(currentUser.rol)) {
        return { error: new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }) }
    }

    return { currentUser }
}

export const GET: APIRoute = async ({ cookies, params }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    const userId = params.id
    if (!userId) {
        return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })
    }

    try {
        const [rows]: any = await db.execute(
            `SELECT id, username, nombre, apellidos, email, telefono, rol, verified, created_at
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [userId]
        )

        if (!rows.length) {
            return new Response(JSON.stringify({ error: "user_not_found", message: "Usuario no encontrado." }), { status: 404 })
        }

        return new Response(JSON.stringify({ user: rows[0] }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "server_error" }), { status: 500 })
    }
}

export const POST: APIRoute = async ({ cookies, params, request }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    const { currentUser } = auth
    const userId = params.id
    if (!userId) {
        return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })
    }

    const { nombre, apellidos, username, email, telefono, rol } = await request.json()

    if (!username || !nombre || !apellidos || !email || !rol) {
        return new Response(JSON.stringify({
            error: "missing_fields",
            message: "Completa todos los campos obligatorios."
        }), { status: 400 })
    }

    const allowedRoles = ["cliente", "empleado", "admin", "dueno"]
    if (!allowedRoles.includes(rol)) {
        return new Response(JSON.stringify({
            error: "invalid_role",
            message: "Rol no válido."
        }), { status: 400 })
    }

    if (currentUser.rol !== "dueno" && rol === "dueno") {
        return new Response(JSON.stringify({
            error: "forbidden_role",
            message: "Solo un dueño puede asignar el rol dueño."
        }), { status: 403 })
    }

    try {
        const [existingUsername]: any = await db.execute(
            "SELECT id FROM usuarios WHERE username = ? AND id != ?",
            [username, userId]
        )
        if (existingUsername.length > 0) {
            return new Response(JSON.stringify({
                error: "username_taken",
                message: "Este nombre de usuario ya está en uso."
            }), { status: 400 })
        }

        const [existingEmail]: any = await db.execute(
            "SELECT id FROM usuarios WHERE email = ? AND id != ?",
            [email, userId]
        )
        if (existingEmail.length > 0) {
            return new Response(JSON.stringify({
                error: "email_taken",
                message: "Este email ya está en uso."
            }), { status: 400 })
        }

        await db.execute(
            `UPDATE usuarios
             SET nombre = ?, apellidos = ?, username = ?, email = ?, telefono = ?, rol = ?
             WHERE id = ?`,
            [nombre, apellidos, username, email, telefono || null, rol, userId]
        )

        const [rows]: any = await db.execute(
            `SELECT id, username, nombre, apellidos, email, telefono, rol, verified, created_at
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [userId]
        )

        return new Response(JSON.stringify({ success: true, user: rows[0] }), { status: 200 })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: "server_error", message: err.message || "No se pudo actualizar el usuario." }), { status: 500 })
    }
}

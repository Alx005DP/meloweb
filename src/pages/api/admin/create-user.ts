import type { APIRoute } from "astro"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { db } from "../../../lib/db"
import { sendAdminCreatedUserEmail } from "../../../lib/mailer"
import { setMustChangePassword } from "../../../lib/user-security"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"
const ALLOWED_ROLES = ["empleado", "admin", "dueno"] as const

const generateTemporaryPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    let password = ""
    for (let i = 0; i < 12; i += 1) {
        password += chars[Math.floor(Math.random() * chars.length)]
    }
    return password
}

export const POST: APIRoute = async ({ request, cookies }) => {
    const token = cookies.get("auth_token")?.value
    if (!token) {
        return new Response(JSON.stringify({ error: "no_session" }), { status: 401 })
    }

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 })
    }

    const [sessionRows]: any = await db.execute(
        "SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1",
        [payload.id]
    )

    const currentUser = sessionRows[0]
    if (!currentUser || !["admin", "dueno"].includes(currentUser.rol)) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
    }

    const {
        username,
        nombre,
        apellidos,
        email,
        telefono,
        rol,
    } = await request.json()

    const normalizedRole = String(rol || "").trim() as typeof ALLOWED_ROLES[number]
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
        return new Response(JSON.stringify({ error: "invalid_role" }), { status: 400 })
    }

    if (currentUser.rol !== "dueno" && normalizedRole === "dueno") {
        return new Response(JSON.stringify({
            error: "forbidden_role",
            message: "Solo un dueño puede crear otro usuario con rol dueño."
        }), { status: 403 })
    }

    const trimmed = {
        username: String(username || "").trim(),
        nombre: String(nombre || "").trim(),
        apellidos: String(apellidos || "").trim(),
        email: String(email || "").trim().toLowerCase(),
        telefono: String(telefono || "").trim(),
    }

    if (!trimmed.username || !trimmed.nombre || !trimmed.apellidos || !trimmed.email || !trimmed.telefono) {
        return new Response(JSON.stringify({
            error: "missing_fields",
            message: "Completa todos los campos obligatorios."
        }), { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed.email)) {
        return new Response(JSON.stringify({
            error: "invalid_email",
            message: "Introduce un email válido."
        }), { status: 400 })
    }

    let insertedUserId: string | null = null

    try {
        const [existingUsername]: any = await db.execute(
            "SELECT id FROM usuarios WHERE username = ? LIMIT 1",
            [trimmed.username]
        )
        if (existingUsername.length > 0) {
            return new Response(JSON.stringify({
                error: "username_taken",
                message: "Ese nombre de usuario ya está en uso."
            }), { status: 400 })
        }

        const [existingEmail]: any = await db.execute(
            "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
            [trimmed.email]
        )
        if (existingEmail.length > 0) {
            return new Response(JSON.stringify({
                error: "email_taken",
                message: "Ese email ya está registrado."
            }), { status: 400 })
        }

        const temporaryPassword = generateTemporaryPassword()
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12)
        const newUserId = crypto.randomUUID()

        await db.execute(
            `INSERT INTO usuarios
                (id, username, nombre, apellidos, email, password, telefono, rol, verified, verify_code, verify_expires)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL)`,
            [
                newUserId,
                trimmed.username,
                trimmed.nombre,
                trimmed.apellidos,
                trimmed.email,
                hashedPassword,
                trimmed.telefono || null,
                normalizedRole,
            ]
        )

        insertedUserId = newUserId
        await setMustChangePassword(insertedUserId, true)

        await sendAdminCreatedUserEmail(trimmed.email, {
            nombre: trimmed.nombre,
            username: trimmed.username,
            rol: normalizedRole,
            temporaryPassword,
        })

        return new Response(JSON.stringify({
            success: true,
            userId: insertedUserId,
        }), { status: 201 })
    } catch (err: any) {
        if (insertedUserId) {
            await db.execute("DELETE FROM user_security_flags WHERE user_id = ?", [insertedUserId])
            await db.execute("DELETE FROM usuarios WHERE id = ?", [insertedUserId])
        }

        return new Response(JSON.stringify({
            error: "server_error",
            message: err.message || "No se pudo crear el usuario."
        }), { status: 500 })
    }
}

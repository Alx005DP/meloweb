import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"
import { sendCitaCreada, sendNuevaCitaAdmin } from "../../../lib/mailer"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const POST: APIRoute = async ({ request, cookies }) => {
    const { nombre, phone, service, start, user_id, email } = await request.json()

    try {
        const hoy = new Date().toISOString().split("T")[0]

        // — Límite para usuarios NO logueados por email —
        if (!user_id && email) {
            const hoy = new Date().toISOString().split("T")[0]
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
                || request.headers.get("x-real-ip")
                || "unknown"

            // Comprobar por email
            const [emailRows] = await db.execute(
                `SELECT COUNT(*) as total FROM citas
         WHERE JSON_UNQUOTE(JSON_EXTRACT(notes, '$.guest_email')) = ?
         AND DATE(created_at) = ?
         AND status NOT IN ('cancelled')`,
                [email, hoy]
            ) as any

            if (emailRows[0].total >= 3) {
                return new Response(JSON.stringify({
                    error: "daily_limit",
                    message: "Has alcanzado el límite de 3 citas por día con este email. Inicia sesión para tener un límite mayor."
                }), { status: 400 })
            }

            // Comprobar por IP
            const [ipRows] = await db.execute(
                "SELECT citas_hoy, fecha FROM rate_limit_ip WHERE ip = ?",
                [ip]
            ) as any

            if (ipRows.length > 0) {
                const fechaGuard = ipRows[0].fecha
                    ? new Date(ipRows[0].fecha).toISOString().split("T")[0]
                    : null
                const citasHoy = fechaGuard === hoy ? ipRows[0].citas_hoy : 0

                if (citasHoy >= 3) {
                    return new Response(JSON.stringify({
                        error: "daily_limit",
                        message: "Has alcanzado el límite de solicitudes por hoy. Inicia sesión para tener un límite mayor o inténtalo mañana."
                    }), { status: 400 })
                }

                await db.execute(
                    "UPDATE rate_limit_ip SET citas_hoy = ?, fecha = ? WHERE ip = ?",
                    [citasHoy + 1, hoy, ip]
                ) as any
            } else {
                await db.execute(
                    "INSERT INTO rate_limit_ip (ip, citas_hoy, fecha) VALUES (?, 1, ?)",
                    [ip, hoy]
                ) as any
            }

            // Guardar IP en notes junto al email
            // (se sobreescribe más abajo en el INSERT)
        }

        // — Límite para clientes logueados —
        if (user_id) {
            const [userRows] = await db.execute(
                "SELECT rol, citas_hoy, citas_hoy_fecha FROM usuarios WHERE id = ?",
                [user_id]
            ) as any

            if (userRows.length > 0 && userRows[0].rol === "cliente") {
                const fechaGuard = userRows[0].citas_hoy_fecha
                    ? new Date(userRows[0].citas_hoy_fecha).toISOString().split("T")[0]
                    : null
                const citasHoy = fechaGuard === hoy ? userRows[0].citas_hoy : 0

                if (citasHoy >= 5) {
                    return new Response(JSON.stringify({
                        error: "daily_limit",
                        message: "Has alcanzado el límite de 5 citas por día. Podrás pedir más mañana."
                    }), { status: 400 })
                }
            }
        }

        // — Comprobar si ya existe una cita en esa fecha y hora —
        const [existing] = await db.execute(
            `SELECT id FROM citas WHERE start = ? AND status NOT IN ('cancelled')`,
            [new Date(start)]
        ) as any

        if (existing.length > 0) {
            return new Response(JSON.stringify({
                error: "slot_taken",
                message: "Ya hay una cita reservada para esa fecha y hora. Por favor elige otro horario."
            }), { status: 400 })
        }

        // — Obtener datos del usuario logueado —
        let created_by = null
        let userEmail  = null
        const token = cookies.get("auth_token")?.value

        if (token) {
            try {
                const payload = jwt.verify(token, JWT_SECRET) as any
                created_by = payload.id

                const [userRows] = await db.execute(
                    "SELECT email FROM usuarios WHERE id = ?",
                    [payload.id]
                ) as any
                if (userRows.length > 0) userEmail = userRows[0].email
            } catch {}
        }

        const ip = !user_id
            ? (request.headers.get("x-forwarded-for")?.split(",")[0].trim()
                || request.headers.get("x-real-ip")
                || "unknown")
            : null

        // — Insertar cita —
        const notes = !user_id && email
            ? JSON.stringify({ guest_email: email, ip })
            : null

        await db.execute(
            `INSERT INTO citas (title, phone, service, start, status, user_id, created_by, notes)
             VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
            [`${service} - ${nombre}`, phone, service, new Date(start), user_id, created_by, notes]
        )

        // — Actualizar contador usuario cliente —
        if (user_id) {
            const [userRows] = await db.execute(
                "SELECT rol, citas_hoy, citas_hoy_fecha FROM usuarios WHERE id = ?",
                [user_id]
            ) as any

            if (userRows.length > 0 && userRows[0].rol === "cliente") {
                const fechaGuard = userRows[0].citas_hoy_fecha
                    ? new Date(userRows[0].citas_hoy_fecha).toISOString().split("T")[0]
                    : null
                const citasHoy = fechaGuard === hoy ? userRows[0].citas_hoy : 0

                await db.execute(
                    "UPDATE usuarios SET citas_hoy = ?, citas_hoy_fecha = ? WHERE id = ?",
                    [citasHoy + 1, hoy, user_id]
                )
            }
        }

        // — Enviar email de confirmación —
        const emailDestino = userEmail || email
        const [admins] = await db.execute(
            "SELECT email FROM usuarios WHERE rol IN ('dueno', 'admin')"
        ) as any

        for (const admin of admins) {
            await sendNuevaCitaAdmin(admin.email, {
                nombre,
                service,
                start,
                phone,
                email: !user_id ? email : undefined
            })
        }
        if (emailDestino) {
            await sendCitaCreada(emailDestino, nombre, { service, start, phone })
        }

        return new Response(JSON.stringify({ success: true }), { status: 201 })

    } catch (err: any) {
        console.error("CREATE CITA ERROR:", err.message)
        return new Response(JSON.stringify({
            error: "server_error",
            message: err.message
        }), { status: 500 })
    }
}
import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"
import { sendCitaCreada, sendNuevaCitaAdmin } from "../../../lib/mailer"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const POST: APIRoute = async ({ request, cookies }) => {
    const { nombre, phone, service, start, user_id, email } = await request.json()

    try {
        const hoy = new Date().toISOString().split("T")[0]

        // — Obtener IP —
        const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            request.headers.get("x-real-ip") ||
            "127.0.0.1"

        // — Construir condiciones dinámicas (clave del fix) —
        const conditions: string[] = []
        const params: any[] = []

        if (user_id) {
            conditions.push("user_id = ?")
            params.push(user_id)
        }

        if (email) {
            conditions.push("JSON_UNQUOTE(JSON_EXTRACT(notes, '$.guest_email')) = ?")
            params.push(email)
        }

        // — Si no hay ninguna forma de identificar, usar IP —
        if (conditions.length === 0) {
            conditions.push("JSON_UNQUOTE(JSON_EXTRACT(notes, '$.ip')) = ?")
            params.push(ip)
        }

        // — Contar citas del día (UNIFICADO) —
        const query = `
            SELECT COUNT(*) as total FROM citas
            WHERE DATE(created_at) = CURDATE()
            AND (${conditions.join(" OR ")})
        `

        const [rows] = await db.execute(query, params) as any
        const total = rows[0].total

        // — Definir límite —
        const limite = user_id ? 3 : 2

        if (total >= limite) {
            return new Response(JSON.stringify({
                error: "daily_limit",
                message: `Has alcanzado el límite de ${limite} citas por día.`
            }), { status: 400 })
        }

        // — Límite extra por IP (anti abuso) —
        const [ipRows] = await db.execute(
            "SELECT citas_hoy, fecha FROM rate_limit_ip WHERE ip = ?",
            [ip]
        ) as any

        if (ipRows.length > 0) {
            const fechaGuard = ipRows[0].fecha
                ? new Date(ipRows[0].fecha).toISOString().split("T")[0]
                : null

            const citasHoy = fechaGuard === hoy ? ipRows[0].citas_hoy : 0

            if (citasHoy >= 5) {
                return new Response(JSON.stringify({
                    error: "ip_limit",
                    message: "Demasiadas solicitudes desde esta IP hoy."
                }), { status: 400 })
            }

            await db.execute(
                "UPDATE rate_limit_ip SET citas_hoy = ?, fecha = ? WHERE ip = ?",
                [citasHoy + 1, hoy, ip]
            )
        } else {
            await db.execute(
                "INSERT INTO rate_limit_ip (ip, citas_hoy, fecha) VALUES (?, 1, ?)",
                [ip, hoy]
            )
        }

        // — Evitar doble reserva de horario —
        const [existing] = await db.execute(
            `SELECT id FROM citas WHERE start = ? AND status NOT IN ('cancelled')`,
            [new Date(start)]
        ) as any

        if (existing.length > 0) {
            return new Response(JSON.stringify({
                error: "slot_taken",
                message: "Ya hay una cita reservada para esa fecha y hora."
            }), { status: 400 })
        }

        // — Obtener usuario desde token —
        let created_by = null
        let userEmail = null

        const token = cookies.get("auth_token")?.value

        if (token) {
            try {
                const payload = jwt.verify(token, JWT_SECRET) as any
                created_by = payload.id

                const [userRows] = await db.execute(
                    "SELECT email FROM usuarios WHERE id = ?",
                    [payload.id]
                ) as any

                if (userRows.length > 0) {
                    userEmail = userRows[0].email
                }
            } catch {}
        }

        // — Crear notes para invitados —
        const notes = !user_id && email
            ? JSON.stringify({ guest_email: email, ip })
            : null

        // — Insertar cita —
        await db.execute(
            `INSERT INTO citas (title, phone, service, start, status, user_id, created_by, notes)
             VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
            [`${service} - ${nombre}`, phone, service, new Date(start), user_id, created_by, notes]
        )

        // — Emails —
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
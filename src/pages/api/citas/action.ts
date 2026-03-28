import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"
import { sendCitaEstado } from "../../../lib/mailer"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const POST: APIRoute = async ({ request, cookies }) => {
    const token = cookies.get("auth_token")?.value
    if (!token) return new Response(JSON.stringify({ error: "no_session" }), { status: 401 })

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 })
    }

    // Solo admins y dueños pueden hacer acciones
    const [userRows] = await db.execute(
        "SELECT rol FROM usuarios WHERE id = ?", [payload.id]
    ) as any
    if (!["admin", "dueno", "empleado"].includes(userRows[0]?.rol)) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
    }

    const { id, action, note, newStart, service } = await request.json()

    try {
        // Obtener cita y email del cliente
        const [citaRows] = await db.execute(
            `SELECT c.*, u.email, u.nombre, u.apellidos,
                    JSON_UNQUOTE(JSON_EXTRACT(c.notes, '$.guest_email')) as guest_email
             FROM citas c
             LEFT JOIN usuarios u ON c.user_id = u.id
             WHERE c.id = ?`,
            [id]
        ) as any

        if (citaRows.length === 0) {
            return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
        }

        const cita       = citaRows[0]
        const emailCliente = cita.email || cita.guest_email
        const nombreCliente = cita.nombre
            ? `${cita.nombre} ${cita.apellidos}`
            : cita.title.split(" - ")[1] || cita.title

        if (action === "accept") {
            await db.execute(
                "UPDATE citas SET status = 'confirmed' WHERE id = ?", [id]
            )
            if (emailCliente) {
                await sendCitaEstado(emailCliente, nombreCliente, {
                    service: cita.service,
                    start:   cita.start,
                    status:  "confirmed",
                    notes:   note || undefined
                })
            }
        }

        if (action === "deny") {
            await db.execute(
                "UPDATE citas SET status = 'cancelled' WHERE id = ?", [id]
            )
            if (emailCliente) {
                await sendCitaEstado(emailCliente, nombreCliente, {
                    service: cita.service,
                    start:   cita.start,
                    status:  "cancelled",
                    notes:   note || undefined
                })
            }
        }

        if (action === "modify") {
            const updates: any[] = []
            const params: any[]  = []

            if (newStart) { updates.push("start = ?");   params.push(new Date(newStart)) }
            if (service)  { updates.push("service = ?"); params.push(service) }
            updates.push("status = 'confirmed'")
            params.push(id)

            await db.execute(
                `UPDATE citas SET ${updates.join(", ")} WHERE id = ?`, params
            )

            if (emailCliente) {
                await sendCitaEstado(emailCliente, nombreCliente, {
                    service: service || cita.service,
                    start:   newStart || cita.start,
                    status:  "confirmed",
                    notes:   note || undefined
                })
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err: any) {
        console.error("ACTION ERROR:", err.message)
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}
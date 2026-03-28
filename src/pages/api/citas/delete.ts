import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"
import { sendCitaEstado } from "../../../lib/mailer"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const POST: APIRoute = async ({ request, cookies }) => {
    const token = cookies.get("auth_token")?.value
    if (!token) return new Response(JSON.stringify({ error: "no_session" }), { status: 401 })

    let payload: any
    try { payload = jwt.verify(token, JWT_SECRET) } catch {
        return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 })
    }

    const { id, motivo } = await request.json()

    try {
        const [citaRows] = await db.execute(
            `SELECT c.*, u.email, u.nombre, u.apellidos,
                    JSON_UNQUOTE(JSON_EXTRACT(c.notes, '$.guest_email')) as guest_email
             FROM citas c LEFT JOIN usuarios u ON c.user_id = u.id
             WHERE c.id = ?`, [id]
        ) as any

        if (citaRows.length === 0) {
            return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
        }

        const cita          = citaRows[0]
        const emailCliente  = cita.email || cita.guest_email
        const nombreCliente = cita.nombre
            ? `${cita.nombre} ${cita.apellidos}`
            : cita.title?.split(" - ")[1] || cita.title

        await db.execute("UPDATE citas SET status = 'cancelled' WHERE id = ?", [id])

        if (emailCliente) {
            await sendCitaEstado(emailCliente, nombreCliente, {
                service: cita.service,
                start:   cita.start,
                status:  "cancelled",
                notes:   motivo || undefined
            })
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}
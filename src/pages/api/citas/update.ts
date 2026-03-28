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

    const { id, start, service, color, notes, phone, title, motivo } = await request.json()

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

        await db.execute(
            `UPDATE citas SET
                start   = COALESCE(?, start),
                service = COALESCE(?, service),
                color   = COALESCE(?, color),
                notes   = COALESCE(?, notes),
                phone   = COALESCE(?, phone),
                title   = COALESCE(?, title)
             WHERE id = ?`,
            [
                start   ? new Date(start) : null,
                service || null,
                color   || null,
                notes   || null,
                phone   || null,
                title   || null,
                id
            ]
        )

        if (emailCliente && motivo) {  // ← solo si hay motivo
            await sendCitaEstado(emailCliente, nombreCliente, {
                service: service || cita.service,
                start: start || cita.start,
                status: "confirmed",
                notes: motivo
            })
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err: any) {
        console.error("UPDATE CITA ERROR:", err.message)
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}
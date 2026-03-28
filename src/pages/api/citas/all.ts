import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ cookies }) => {
    const token = cookies.get("auth_token")?.value

    let rol = "empleado" // por defecto el más restrictivo

    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET) as any
            const [rows] = await db.execute(
                "SELECT rol FROM usuarios WHERE id = ?",
                [payload.id]
            ) as any
            if (rows.length > 0) rol = rows[0].rol
        } catch {}
    }

    try {
        // Empleados solo ven confirmadas, admins y dueños ven todo
        const whereStatus = (rol === "admin" || rol === "dueno")
            ? "status NOT IN ('cancelled')"
            : "status IN ('confirmed', 'completed')"

        const [rows] = await db.execute(
            `SELECT id, title, phone, service, start, color, notes, status, created_at
             FROM citas
             WHERE ${whereStatus}
             ORDER BY start ASC`
        ) as any

        return new Response(JSON.stringify({ citas: rows }), { status: 200 })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}
import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"

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

    const [userRows]: any = await db.execute(
        "SELECT rol FROM usuarios WHERE id = ?", [payload.id]
    )

    if (!["admin", "dueno"].includes(userRows[0]?.rol)) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
    }

    const {
        tipo,
        titulo_interno,
        titulo,
        valor,
        descuento,
        tipo_descuento,
        max_usos,
        expires_at
    } = await request.json()

    try {
        // Insertar QR
        await db.execute(
            `INSERT INTO qr_codes 
            (tipo, titulo_interno, titulo, valor, descuento, tipo_descuento, max_usos, expires_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tipo,
                titulo_interno || null,
                titulo,
                valor || null,
                descuento || null,
                tipo_descuento || null,
                max_usos || null,
                expires_at || null,
                payload.id
            ]
        )

        // Obtener ID generado (UUID)
        const [rows]: any = await db.execute(
            "SELECT id FROM qr_codes WHERE created_by = ? ORDER BY created_at DESC LIMIT 1",
            [payload.id]
        )

        const qrId = rows[0].id

        return new Response(JSON.stringify({ success: true, id: qrId }), { status: 201 })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}

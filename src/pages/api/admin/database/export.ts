import type { APIRoute } from "astro"
import { db } from "../../../../lib/db"
import { recordAdminDatabaseActivity, requireAdmin } from "../../../../lib/admin-database"

const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return ""
    const text = String(value)
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, "\"\"")}"`
    }
    return text
}

const toCsv = (rows: Array<Record<string, unknown>>) => {
    if (!rows.length) return ""
    const headers = Object.keys(rows[0])
    const lines = [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ]
    return lines.join("\n")
}

export const GET: APIRoute = async ({ cookies, url }) => {
    const auth = await requireAdmin(cookies)
    if ("error" in auth) return auth.error

    const type = url.searchParams.get("type")
    if (!type || !["users", "citas"].includes(type)) {
        return new Response(JSON.stringify({ error: "invalid_type" }), { status: 400 })
    }

    try {
        let filename = ""
        let rows: Array<Record<string, unknown>> = []

        if (type === "users") {
            const [userRows]: any = await db.execute(
                `SELECT id, username, nombre, apellidos, email, telefono, rol, verified, created_at
                 FROM usuarios
                 ORDER BY created_at DESC, id DESC`
            )
            rows = userRows
            filename = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`
        }

        if (type === "citas") {
            const [citasRows]: any = await db.execute(
                `SELECT id, title, phone, service, start, color, notes, status, user_id, created_by, created_at
                 FROM citas
                 ORDER BY start DESC, id DESC`
            )
            rows = citasRows
            filename = `citas-${new Date().toISOString().slice(0, 10)}.csv`
        }

        await recordAdminDatabaseActivity({
            action_key: `export_${type}`,
            status: "success",
            title: type === "users" ? "Exportacion de usuarios completada" : "Exportacion de citas completada",
            detail: `Se exportaron ${rows.length} registros en formato CSV.`,
        }, auth.currentUser.id)

        const csv = toCsv(rows)
        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        })
    } catch (err: any) {
        await recordAdminDatabaseActivity({
            action_key: `export_${type}`,
            status: "error",
            title: "Error al exportar datos",
            detail: err.message || "No se pudo completar la exportacion.",
        }, auth.currentUser.id)

        return new Response(JSON.stringify({
            error: "export_error",
            message: err.message || "No se pudo exportar la información.",
        }), { status: 500 })
    }
}

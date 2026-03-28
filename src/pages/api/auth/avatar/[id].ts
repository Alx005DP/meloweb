import type { APIRoute } from "astro"
import { db } from "../../../../lib/db"

export const GET: APIRoute = async ({ params }) => {
    const { id } = params

    try {
        const [rows] = await db.execute(
            "SELECT avatar, avatar_type FROM usuarios WHERE id = ?",
            [id]
        ) as any

        if (rows.length === 0 || !rows[0].avatar) {
            return new Response(null, { status: 404 })
        }

        return new Response(rows[0].avatar, {
            headers: {
                "Content-Type": rows[0].avatar_type || "image/jpeg",
                "Cache-Control": "public, max-age=3600"
            }
        })

    } catch (err) {
        console.error(err)
        return new Response(null, { status: 500 })
    }
}
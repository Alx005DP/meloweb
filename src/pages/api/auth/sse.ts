import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import jwt from "jsonwebtoken"
import { getMustChangePassword } from "../../../lib/user-security"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

export const GET: APIRoute = async ({ cookies, request }) => {
    const token = cookies.get("auth_token")?.value
    if (!token) return new Response("Unauthorized", { status: 401 })

    let payload: any
    try {
        payload = jwt.verify(token, JWT_SECRET)
    } catch {
        return new Response("Unauthorized", { status: 401 })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }

            let lastRol = ""
            let lastAvatar = ""

            const check = async () => {
                try {
                    const [rows] = await db.execute(
                        `SELECT id, username, nombre, apellidos, email, rol, telefono,
                                created_at, avatar_type,
                                UNIX_TIMESTAMP(updated_at) as avatar_ts
                         FROM usuarios WHERE id = ?`,
                        [payload.id]
                    ) as any

                    // Usuario eliminado → forzar logout
                    if (rows.length === 0) {
                        send({ type: "logout" })
                        clearInterval(interval)
                        controller.close()
                        return
                    }

                    const u = rows[0]
                    const mustChangePassword = await getMustChangePassword(u.id)

                    if (lastRol && lastRol !== u.rol) {
                        send({ type: "redirect", to: "/" })
                        clearInterval(interval)
                        controller.close()
                        return
                    }

                    send({
                        type: "session",
                        data: {
                            id:         u.id,
                            username:   u.username,
                            nombre:     u.nombre,
                            apellidos:  u.apellidos,
                            email:      u.email,
                            rol:        u.rol,
                            telefono:   u.telefono   || null,
                            created_at: u.created_at ? new Date(u.created_at).toISOString() : null,
                            hasAvatar:  !!u.avatar_type,
                            avatar_ts: u.avatar_ts || 0,
                            mustChangePassword,
                        }
                    })

                    lastRol    = u.rol
                    lastAvatar = u.avatar_type || ""

                } catch {
                    clearInterval(interval)
                    try { controller.close() } catch {}
                }
            }

            // Enviar datos inmediatamente al conectar
            await check()

            // Polling cada 5 segundos
            const interval = setInterval(check, 2000)

            request.signal.addEventListener("abort", () => {
                clearInterval(interval)
                try { controller.close() } catch {}
            })
        }
    })

    return new Response(stream, {
        headers: {
            "Content-Type":  "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
        }
    })
}

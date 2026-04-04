import { defineMiddleware } from "astro:middleware"
import jwt from "jsonwebtoken"
import { db } from "./lib/db"
import { getMustChangePassword } from "./lib/user-security"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

const PROTECTED_ROUTES: Record<string, string[]> = {
    "/profile":  ["cliente", "empleado", "admin", "dueno"],
    "/calendar": ["empleado", "admin", "dueno"],
    "/admin":    ["admin", "dueno"],
    "/qr":    ["admin", "dueno"],
    "/descuento/[id]":    ["cliente", "empleado", "admin", "dueno"],
    "/descuento/canjeado":    ["cliente", "empleado", "admin", "dueno"],
}

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"]

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url

    const isProtected = Object.keys(PROTECTED_ROUTES).some(route => pathname.startsWith(route))
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

    if (!isProtected && !isAuthRoute) return next()

    const token = context.cookies.get("auth_token")?.value

    let session = null
    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET) as any

            // Consultar rol actualizado desde la BD
            const [rows] = await db.execute(
                "SELECT id, rol FROM usuarios WHERE id = ?",
                [payload.id]
            ) as any

            if (rows.length > 0) {
                session = {
                    id: rows[0].id,
                    rol: rows[0].rol,
                    mustChangePassword: await getMustChangePassword(rows[0].id),
                }
            }
        } catch {
            context.cookies.delete("auth_token", { path: "/" })
        }
    }

    if (isAuthRoute && session) {
        return context.redirect("/")
    }

    if (isProtected && !session) {
        return context.redirect("/login")
    }

    if (isProtected && session) {
        if (session.mustChangePassword) {
            if (pathname !== "/") {
                return context.redirect("/?force_password_change=true")
            }

            return next()
        }

        const rolesPermitidos = PROTECTED_ROUTES[
            Object.keys(PROTECTED_ROUTES).find(route => pathname.startsWith(route))!
        ]
        if (!rolesPermitidos.includes(session.rol)) {
            return context.redirect("/")
        }
    }

    return next()
})

import { defineMiddleware } from "astro:middleware"
import jwt from "jsonwebtoken"

const JWT_SECRET = import.meta.env.JWT_SECRET || "supersecreto_cambiar_en_produccion"

const PROTECTED_ROUTES: Record<string, string[]> = {
    "/profile":  ["cliente", "empleado", "admin", "dueno"],
    "/getdate":  ["cliente", "empleado", "admin", "dueno"],
    "/calendar": ["empleado", "admin", "dueno"],
    "/admin":    ["admin", "dueno"],
}

const AUTH_ROUTES = ["/login", "/register"]

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url

    const isProtected = Object.keys(PROTECTED_ROUTES).some(route => pathname.startsWith(route))
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

    if (!isProtected && !isAuthRoute) return next()

    // Leer token de la cookie
    const token = context.cookies.get("auth_token")?.value

    let session = null
    if (token) {
        try {
            session = jwt.verify(token, JWT_SECRET) as any
        } catch {
            // Token inválido o expirado
            context.cookies.delete("auth_token", { path: "/" })
        }
    }

    // Logueado intentando ir a login/register → inicio
    if (isAuthRoute && session) {
        return context.redirect("/")
    }

    // Sin sesión intentando ruta protegida → login
    if (isProtected && !session) {
        return context.redirect("/login")
    }

    // Con sesión pero sin rol suficiente → inicio
    if (isProtected && session) {
        const rolesPermitidos = PROTECTED_ROUTES[
            Object.keys(PROTECTED_ROUTES).find(route => pathname.startsWith(route))!
        ]
        if (!rolesPermitidos.includes(session.rol)) {
            return context.redirect("/")
        }
    }

    return next()
})
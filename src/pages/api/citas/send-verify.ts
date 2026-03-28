import type { APIRoute } from "astro"
import { db } from "../../../lib/db"
import { transporter } from "../../../lib/mailer"

export const POST: APIRoute = async ({ request }) => {
    const { email } = await request.json()

    if (!email) {
        return new Response(JSON.stringify({ error: "no_email" }), { status: 400 })
    }

    try {
        const codigo  = Math.floor(100000 + Math.random() * 900000).toString()
        const expires = new Date(Date.now() + 15 * 60 * 1000)

        // Guardar código en tabla temporal
        await db.execute(
            `INSERT INTO verify_cita (email, codigo, expires)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE codigo = ?, expires = ?`,
            [email, codigo, expires, codigo, expires]
        )

        await transporter.sendMail({
            from:    `"Marco Aldany" <${import.meta.env.GMAIL_USER}>`,
            to:      email,
            subject: "Código de verificación para tu cita — Marco Aldany",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #181818; color: #ededed; border-radius: 12px; padding: 40px;">
                    <h2 style="color: #b89e0c; margin-bottom: 8px;">Marco Aldany</h2>
                    <h3 style="margin-top: 0;">Código para tu cita</h3>
                    <p style="opacity: 0.7;">Introduce este código para confirmar tu solicitud de cita:</p>
                    <div style="background: #202020; border: 1px solid #b89e0c44; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                        <span style="font-size: 36px; letter-spacing: 12px; font-weight: bold; color: #f0ce08;">${codigo}</span>
                    </div>
                    <p style="opacity: 0.5; font-size: 13px;">Este código expira en 15 minutos.</p>
                </div>
            `
        })

        return new Response(JSON.stringify({ success: true }), { status: 200 })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "server_error", message: err.message }), { status: 500 })
    }
}
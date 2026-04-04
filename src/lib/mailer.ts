import nodemailer from "nodemailer"

const env = {
    GMAIL_USER: process.env.GMAIL_USER || import.meta.env.GMAIL_USER,
    GMAIL_PASS: process.env.GMAIL_PASS || import.meta.env.GMAIL_PASS,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL,
}

console.log("[mailer] env", {
    hasUser: Boolean(env.GMAIL_USER),
    userPreview: env.GMAIL_USER ? `${String(env.GMAIL_USER).slice(0, 3)}***` : null,
    hasPass: Boolean(env.GMAIL_PASS),
    passLength: env.GMAIL_PASS ? String(env.GMAIL_PASS).length : 0,
    publicSiteUrl: env.PUBLIC_SITE_URL || null,
})

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_PASS,
    },
})

export const sendVerificationEmail = async (email: string, codigo: string, nombre: string) => {
    console.log("[mailer] sendVerificationEmail", {
        to: email,
        hasUser: Boolean(env.GMAIL_USER),
        hasPass: Boolean(env.GMAIL_PASS),
    })
    await transporter.sendMail({
        from:    `"Marco Aldany" <${env.GMAIL_USER}>`,
        to:      email,
        subject: "Verifica tu cuenta — Marco Aldany",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #181818; color: #ededed; border-radius: 12px; padding: 40px;">
                <h2 style="color: #b89e0c; margin-bottom: 8px;">Marco Aldany</h2>
                <h3 style="margin-top: 0;">Hola ${nombre}, verifica tu cuenta</h3>
                <p style="opacity: 0.7;">Introduce este código en la página para completar tu registro:</p>
                <div style="background: #202020; border: 1px solid #b89e0c44; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 36px; letter-spacing: 12px; font-weight: bold; color: #f0ce08;">${codigo}</span>
                </div>
                <p style="opacity: 0.5; font-size: 13px;">Este código expira en 15 minutos. Si no has creado una cuenta ignora este email.</p>
            </div>
        `
    })
}

export const sendAdminCreatedUserEmail = async (
    email: string,
    data: {
        nombre: string
        username: string
        rol: "empleado" | "admin" | "dueno"
        temporaryPassword: string
    }
) => {
    const isEmployee = data.rol === "empleado"
    const roleLabel = data.rol === "dueno" ? "dueño" : data.rol
    const roleMessage = isEmployee
        ? "Tu cuenta de empleado ya está preparada para acceder a las herramientas internas."
        : "Tu cuenta de gestión ya está preparada para acceder al panel y a las herramientas administrativas."

    const nextAccess = isEmployee
        ? `${env.PUBLIC_SITE_URL || "http://localhost:4321"}/calendar`
        : `${env.PUBLIC_SITE_URL || "http://localhost:4321"}/admin`

    await transporter.sendMail({
        from: `"Marco Aldany" <${env.GMAIL_USER}>`,
        to: email,
        subject: isEmployee
            ? "Tu cuenta de empleado está lista - Marco Aldany"
            : "Tu cuenta de administración está lista - Marco Aldany",
        html: baseEmail(`
            <h3 style="margin-top: 0;">Hola ${data.nombre}</h3>
            <p style="opacity: 0.7; line-height: 1.6;">
                ${roleMessage}
            </p>

            <div style="background: #202020; border-radius: 10px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Usuario</td>
                        <td style="padding: 8px 0; font-weight: bold;">${data.username}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Rol</td>
                        <td style="padding: 8px 0; text-transform: capitalize;">${roleLabel}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Email</td>
                        <td style="padding: 8px 0;">${email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Contraseña temporal</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #f0ce08;">${data.temporaryPassword}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #b89e0c11; border-left: 3px solid #b89e0c; border-radius: 4px; padding: 12px 16px; margin-top: 8px;">
                <p style="margin: 0; font-size: 13px; opacity: 0.85;">
                    Debes iniciar sesión con esta contraseña temporal y cambiarla inmediatamente al entrar.
                </p>
            </div>

            <div style="text-align: center; margin-top: 24px;">
                <a href="${nextAccess}"
                   style="display: inline-block; background: #b89e0c; color: #000; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;">
                    Acceder ahora
                </a>
            </div>
        `)
    })
}

// — Tipos de estado —
const statusLabels: Record<string, { label: string, color: string, icon: string }> = {
    pending:   { label: "Pendiente de confirmación", color: "#f39c12", icon: "⏳" },
    confirmed: { label: "Confirmada",                color: "#2ecc71", icon: "✅" },
    completed: { label: "Completada",                color: "#3498db", icon: "🎉" },
    cancelled: { label: "Cancelada",                 color: "#e74c3c", icon: "❌" },
}

// — Email base compartido —
const baseEmail = (contenido: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #181818; color: #ededed; border-radius: 12px; overflow: hidden;">
        <div style="background: #111; padding: 24px 32px; border-bottom: 2px solid #b89e0c;">
            <h2 style="margin: 0; color: #f0ce08; font-size: 22px;">Marco Aldany</h2>
        </div>
        <div style="padding: 32px;">
            ${contenido}
        </div>
        <div style="background: #111; padding: 16px 32px; text-align: center;">
            <p style="margin: 0; opacity: 0.4; font-size: 12px;">© 2026 Marco Aldany SOM Multiespai</p>
        </div>
    </div>
`

export const sendPasswordResetEmail = async (
    email: string,
    data: {
        nombre: string
        resetUrl: string
    }
) => {
    console.log("[mailer] sendPasswordResetEmail", {
        to: email,
        hasUser: Boolean(env.GMAIL_USER),
        hasPass: Boolean(env.GMAIL_PASS),
    })
    await transporter.sendMail({
        from: `"Marco Aldany" <${env.GMAIL_USER}>`,
        to: email,
        subject: "Restablece tu password - Marco Aldany",
        html: baseEmail(`
            <h3 style="margin-top: 0;">Hola ${data.nombre}</h3>
            <p style="opacity: 0.7; line-height: 1.6;">
                Hemos recibido una solicitud para restablecer tu password.
            </p>
            <div style="text-align: center; margin: 24px 0;">
                <a
                    href="${data.resetUrl}"
                    style="display: inline-block; background: #b89e0c; color: #000; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;"
                >
                    Cambiar password
                </a>
            </div>
            <p style="opacity: 0.5; font-size: 13px;">
                Este enlace expira en 30 minutos. Si no has pedido este cambio, ignora este email.
            </p>
        `),
    })
}

// — Email: cita creada —
export const sendCitaCreada = async (
    email: string,
    nombre: string,
    cita: { service: string, start: string, phone: string }
) => {
    const fecha = new Date(cita.start).toLocaleDateString("es-ES", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    })
    const hora = new Date(cita.start).toLocaleTimeString("es-ES", {
        hour: "2-digit", minute: "2-digit"
    })

    await transporter.sendMail({
        from:    `"Marco Aldany" <${import.meta.env.GMAIL_USER}>`,
        to:      email,
        subject: "Solicitud de cita recibida — Marco Aldany",
        html: baseEmail(`
            <h3 style="margin-top: 0;">Hola ${nombre}, hemos recibido tu solicitud 👋</h3>
            <p style="opacity: 0.7; line-height: 1.6;">Tu cita está <strong style="color: #f39c12;">pendiente de confirmación</strong>. Nos pondremos en contacto contigo para confirmarla.</p>

            <div style="background: #202020; border-radius: 10px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Servicio</td>
                        <td style="padding: 8px 0; font-weight: bold;">${cita.service}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Fecha</td>
                        <td style="padding: 8px 0; text-transform: capitalize;">${fecha}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Hora</td>
                        <td style="padding: 8px 0;">${hora}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Teléfono</td>
                        <td style="padding: 8px 0;">${cita.phone}</td>
                    </tr>
                </table>
            </div>

            <p style="opacity: 0.5; font-size: 13px;">Si necesitas cancelar o modificar tu cita puedes hacerlo desde tu perfil o contactando con nosotros.</p>
        `)
    })
}

export const sendNuevaCitaAdmin = async (
    emailAdmin: string,
    cita: { nombre: string, service: string, start: string, phone: string, email?: string }
) => {
    const fecha = new Date(cita.start).toLocaleDateString("es-ES", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    })
    const hora = new Date(cita.start).toLocaleTimeString("es-ES", {
        hour: "2-digit", minute: "2-digit"
    })

    await transporter.sendMail({
        from:    `"Marco Aldany" <${import.meta.env.GMAIL_USER}>`,
        to:      emailAdmin,
        subject: "🔔 Nueva cita pendiente — Marco Aldany",
        html: baseEmail(`
            <h3 style="margin-top: 0;">Nueva solicitud de cita</h3>
            <p style="opacity: 0.7; line-height: 1.6;">Has recibido una nueva solicitud de cita que requiere tu confirmación.</p>

            <div style="background: #202020; border-radius: 10px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Cliente</td>
                        <td style="padding: 8px 0; font-weight: bold;">${cita.nombre}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Teléfono</td>
                        <td style="padding: 8px 0;">${cita.phone}</td>
                    </tr>
                    ${cita.email ? `
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Email</td>
                        <td style="padding: 8px 0;">${cita.email}</td>
                    </tr>` : ""}
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Servicio</td>
                        <td style="padding: 8px 0; font-weight: bold;">${cita.service}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Fecha</td>
                        <td style="padding: 8px 0; text-transform: capitalize;">${fecha}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Hora</td>
                        <td style="padding: 8px 0;">${hora}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-top: 24px;">
                <a href="${import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321"}/calendar"
                   style="display: inline-block; background: #b89e0c; color: #000; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;">
                    Ver en el Calendario
                </a>
            </div>

            <p style="opacity: 0.4; font-size: 12px; margin-top: 24px; text-align: center;">
                Accede al calendario para confirmar, modificar o rechazar la cita.
            </p>
        `)
    })
}


// — Email: cambio de estado —
export const sendCitaEstado = async (
    email: string,
    nombre: string,
    cita: { service: string, start: string, status: string, notes?: string }
) => {
    const { label, color, icon } = statusLabels[cita.status] || statusLabels.pending
    const fecha = new Date(cita.start).toLocaleDateString("es-ES", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    })
    const hora = new Date(cita.start).toLocaleTimeString("es-ES", {
        hour: "2-digit", minute: "2-digit"
    })

    const mensajes: Record<string, string> = {
        confirmed: "Tu cita ha sido <strong style='color:#2ecc71'>confirmada</strong>. Te esperamos en el salón.",
        completed: "Tu cita ha sido marcada como <strong style='color:#3498db'>completada</strong>. ¡Gracias por visitarnos!",
        cancelled: "Tu cita ha sido <strong style='color:#e74c3c'>cancelada</strong>. Si tienes alguna duda contáctanos.",
    }

    const subjects: Record<string, string> = {
        confirmed: "✅ Cita confirmada — Marco Aldany",
        completed: "🎉 Gracias por tu visita — Marco Aldany",
        cancelled: "❌ Cita cancelada — Marco Aldany",
    }

    await transporter.sendMail({
        from:    `"Marco Aldany" <${import.meta.env.GMAIL_USER}>`,
        to:      email,
        subject: subjects[cita.status] || "Actualización de tu cita — Marco Aldany",
        html: baseEmail(`
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 14px;">${icon}</span>
                <div style="display: inline-block; background: ${color}22; border: 1px solid ${color}55; border-radius: 20px; padding: 6px 18px; margin-top: 12px;">
                    <span style="color: ${color}; font-size: 14px; font-weight: bold;">${label}</span>
                </div>
            </div>

            <h3 style="margin-top: 0; text-align: center;">Hola ${nombre}</h3>
            <p style="opacity: 0.7; line-height: 1.6; text-align: center;">${mensajes[cita.status] || "El estado de tu cita ha sido actualizado."}</p>

            <div style="background: #202020; border-radius: 10px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Servicio</td>
                        <td style="padding: 8px 0; font-weight: bold;">${cita.service}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Fecha</td>
                        <td style="padding: 8px 0; text-transform: capitalize;">${fecha}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; opacity: 0.5; font-size: 13px;">Hora</td>
                        <td style="padding: 8px 0;">${hora}</td>
                    </tr>
                </table>
            </div>

            ${cita.notes ? `
            <div style="background: #b89e0c11; border-left: 3px solid #b89e0c; border-radius: 4px; padding: 12px 16px; margin-top: 8px;">
                <p style="margin: 0; font-size: 13px; opacity: 0.8;"><strong>Nota:</strong> ${cita.notes}</p>
            </div>` : ""}

            <p style="opacity: 0.5; font-size: 13px; margin-top: 24px;">Si tienes alguna pregunta no dudes en contactarnos.</p>
        `)
    })
}

import { useState, useEffect } from "react"
import Calendar from "./Calendar"

const SERVICES = ["Corte", "Coloración", "Tratamientos", "Peinados"]
const COLORS = [
    { label: "Amarillo", value: "var(--hover)" },
    { label: "Dorado",   value: "#9b8508" },
    { label: "Morado",   value: "#6a5acd" },
    { label: "Verde",    value: "#2e8b57" },
    { label: "Rojo",     value: "#c0392b" },
    { label: "Azul",     value: "#2980b9" },
]

const STATUS_CONFIG = {
    pending:   { label: "Pendiente",  color: "#f39c12" },
    confirmed: { label: "Confirmada", color: "#2ecc71" },
    completed: { label: "Completada", color: "#3498db" },
    cancelled: { label: "Cancelada",  color: "#e74c3c" },
}

const toInputDate = (date) => {
    const d = new Date(date)
    const pad = (n) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDate = (date) =>
    new Date(date).toLocaleDateString("es-ES", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    })

const formatTime = (date) =>
    new Date(date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })

export default function EventModal({ date, event, eventIndex, onSave, onDelete, onClose }) {
    const isEdit    = event !== null
    const isPending = event?.status === "pending"

    const [editing, setEditing]             = useState(!isEdit)
    const [actionMode, setActionMode]       = useState(null)
    const [actionNote, setActionNote]       = useState("")
    const [actionLoading, setActionLoading] = useState(false)
    const [actionMsg, setActionMsg]         = useState("")
    const [deleteMode, setDeleteMode]       = useState(false)
    const [motivo, setMotivo]               = useState("")
    const [saving, setSaving]               = useState(false)
    const [saveMsg, setSaveMsg]             = useState("")

    const [form, setForm] = useState({
        name:    "",
        phone:   "",
        service: "Corte",
        start:   date ? toInputDate(date) : "",
        color:   "var(--hover)",
        notes:   ""
    })

    useEffect(() => {
        const calendarBody = document.querySelector(".week-body, .day-view-body")
        if (calendarBody) calendarBody.style.overflow = "hidden"
        return () => {
            if (calendarBody) calendarBody.style.overflow = ""
        }
    }, [])

    useEffect(() => {
        if (isEdit && event) {
            setForm({
                name:    event.title.split(" - ")[1] || event.title,
                phone:   event.phone || "",
                service: event.service || "Corte",
                start:   toInputDate(event.start),
                color:   event.color || "var(--hover)",
                notes:   event.notes || ""
            })
        }
    }, [event])

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

    const handleSave = async () => {
        if (!form.name.trim()) { setSaveMsg("El nombre es obligatorio."); return }

        const cambioImportante = isEdit && event && (
            form.start !== toInputDate(event.start) ||
            form.service !== (event.service || "Corte") ||
            form.phone !== (event.phone || "")
        )

        if (cambioImportante && !motivo.trim()) {
            setSaveMsg("Por favor introduce un motivo para notificar al cliente.")
            return
        }

        setSaving(true)
        setSaveMsg("")

        if (isEdit && event?.id) {
            const res = await fetch("/api/citas/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: event.id,
                    title: `${form.service} - ${form.name}`,
                    phone: form.phone,
                    service: form.service,
                    start: form.start,
                    color: form.color,
                    notes: form.notes,
                    motivo: cambioImportante ? motivo : undefined
                })
            })
            const data = await res.json()
            if (!res.ok) { setSaveMsg(data.message || "Error al guardar."); setSaving(false); return }
        }

        onSave({
            title: `${form.service} - ${form.name}`,
            phone: form.phone,
            service: form.service,
            start: new Date(form.start),
            color: form.color,
            notes: form.notes
        })
        setSaving(false)
    }

    // — Eliminar —
    const handleDelete = async () => {
        if (!motivo.trim()) { setSaveMsg("Por favor introduce un motivo para notificar al cliente."); return }

        setSaving(true)
        const res = await fetch("/api/citas/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: event.id, motivo })
        })

        if (res.ok) {
            onDelete(eventIndex)
        } else {
            const data = await res.json()
            setSaveMsg(data.message || "Error al eliminar.")
            setSaving(false)
        }
    }

    // — Acciones pendientes —
    const handleAction = async (action) => {
        setActionLoading(true)
        setActionMsg("")

        try {
            const res = await fetch("/api/citas/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id:       event.id,
                    action,
                    note:     actionNote,
                    newStart: action === "modify" ? form.start   : undefined,
                    service:  action === "modify" ? form.service : undefined,
                })
            })
            const data = await res.json()

            if (res.ok) {
                setActionMsg("✓ Acción realizada correctamente.")
                setTimeout(() => {
                    onSave({
                        ...event,
                        status: action === "accept" ? "confirmed" : action === "deny" ? "cancelled" : "confirmed",
                        start:  action === "modify" ? new Date(form.start) : event.start,
                        service: action === "modify" ? form.service : event.service,
                    })
                }, 1000)
            } else {
                setActionMsg(data.message || "Error al procesar la acción.")
            }
        } catch {
            setActionMsg("Error de conexión.")
        } finally {
            setActionLoading(false)
        }
    }

    const status = STATUS_CONFIG[event?.status] || STATUS_CONFIG.pending

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>

                {/* — HEADER — */}
                <div className="modal-header">
                    <div className="modal-header-title">
                        <h2>
                            {isEdit
                                ? editing ? "Editar cita"
                                : actionMode
                                    ? actionMode === "accept" ? "Aceptar cita"
                                    : actionMode === "modify" ? "Modificar cita"
                                    : "Denegar cita"
                                : form.service
                                : "Nueva cita"
                            }
                        </h2>
                        {isEdit && !editing && !actionMode && !isPending && (
                            <button className="modal-edit-btn acbtmodify" onClick={() => setEditing(true)}>
                                <i className="fa-sharp-duotone fa-solid fa-pencil"></i>
                            </button>
                        )}
                        {isEdit && !editing && !actionMode && event?.status && (
                            <span
                                className="modal-status-badge"
                                style={{
                                    backgroundColor: status.color + "22",
                                    color:           status.color,
                                    borderColor:     status.color + "55"
                                }}
                            >
                                {isPending && <span className="pending-dot-small" style={{ marginRight: "5px" }} />}
                                {status.label}
                            </span>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* — MODO PENDIENTE: mostrar info + 3 botones — */}
                {isEdit && !editing && !actionMode && isPending && (
                    <>
                        <div className="modal-info">
                            <div className="modal-info-row">
                                <span className="modal-info-label">Cliente</span>
                                <span className="modal-info-value">{form.name || "—"}</span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Teléfono</span>
                                <span className="modal-info-value">{form.phone || "—"}</span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Servicio</span>
                                <span className="modal-info-value">{form.service}</span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Fecha</span>
                                <span className="modal-info-value" style={{ textTransform: "capitalize" }}>
                                    {formatDate(form.start)}
                                </span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Horario</span>
                                <span className="modal-info-value">{formatTime(form.start)}</span>
                            </div>
                            {form.notes && (
                                <div className="modal-info-row">
                                    <span className="modal-info-label">Notas</span>
                                    <span className="modal-info-value modal-notes">{form.notes}</span>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="modal-action-btn acbtdeny"   onClick={() => setActionMode("deny")}>
                                <i className="fa-sharp-duotone fa-solid fa-xmark"></i> Denegar
                            </button>
                            <button className="modal-action-btn acbtmodify" onClick={() => setActionMode("modify")}>
                                <i className="fa-sharp-duotone fa-solid fa-pen"></i> Modificar
                            </button>
                            <button className="modal-action-btn acbtaccept" onClick={() => setActionMode("accept")}>
                                <i className="fa-sharp-duotone fa-solid fa-check"></i> Aceptar
                            </button>
                        </div>
                    </>
                )}

                {/* — MODO ACEPTAR — */}
                {actionMode === "accept" && (
                    <>
                        <div className="modal-body">
                            <p style={{ opacity: 0.7, fontSize: "14px", gridColumn: "1 / -1" }}>
                                Se confirmará la cita de <strong>{form.name}</strong> para el{" "}
                                <strong style={{ textTransform: "capitalize" }}>{formatDate(form.start)}</strong>{" "}
                                a las <strong>{formatTime(form.start)}</strong> y se le enviará un email.
                            </p>
                            <div className="modal-field" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
                                <label>Nota para el cliente <span style={{ opacity: 0.4, fontSize: "11px" }}>(opcional)</span></label>
                                <textarea
                                    placeholder="Ej: Te esperamos en nuestra sede principal..."
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            {actionMsg && (
                                <p style={{ gridColumn: "1 / -1", color: "#2ecc71", fontSize: "13px" }}>{actionMsg}</p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="acsbutton" onClick={() => setActionMode(null)}>Volver</button>
                            <button className="modal-action-btn accept" onClick={() => handleAction("accept")} disabled={actionLoading}>
                                <i className="fa-sharp-duotone fa-solid fa-check"></i>
                                {actionLoading ? "Enviando..." : "Confirmar aceptación"}
                            </button>
                        </div>
                    </>
                )}

                {/* — MODO MODIFICAR — */}
                {actionMode === "modify" && (
                    <>
                        <div className="modal-body">
                            <div className="modal-row">
                                <div className="modal-field">
                                    <label>Tipo de servicio</label>
                                    <select value={form.service} onChange={(e) => handleChange("service", e.target.value)}>
                                        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="modal-field" style={{ overflow: "hidden" }}>
                                    <label>Nueva fecha y hora</label>
                                    <Calendar
                                        value={form.start ? new Date(form.start) : null}
                                        onChange={(d) => handleChange("start", d ? d.toISOString() : "")}
                                    />
                                </div>
                            </div>
                            <div className="modal-field" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
                                <label>
                                    Motivo para el cliente
                                    <span style={{ color: "#e74c3c", marginLeft: "4px" }}>*</span>
                                </label>
                                <textarea
                                    placeholder="Ej: Hemos tenido que cambiar tu cita al siguiente día disponible..."
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            {actionMsg && (
                                <p style={{ color: actionMsg.startsWith("✓") ? "#2ecc71" : "#e74c3c", fontSize: "13px" }}>
                                    {actionMsg}
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="acsbutton" onClick={() => setActionMode(null)}>Volver</button>
                            <button className="modal-action-btn acbtmodify" onClick={() => handleAction("modify")} disabled={actionLoading}>
                                <i className="fa-sharp-duotone fa-solid fa-pen"></i>
                                {actionLoading ? "Enviando..." : "Confirmar modificación"}
                            </button>
                        </div>
                    </>
                )}

                {/* — MODO DENEGAR — */}
                {actionMode === "deny" && (
                    <>
                        <div className="modal-body">
                            <p style={{ opacity: 0.7, fontSize: "14px", gridColumn: "1 / -1" }}>
                                Se cancelará la cita de <strong>{form.name}</strong> y se le notificará por email.
                            </p>
                            <div className="modal-field" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
                                <label>
                                    Motivo de la denegación
                                    <span style={{ color: "#e74c3c", marginLeft: "4px" }}>*</span>
                                </label>
                                <textarea
                                    placeholder="Ej: Lo sentimos, no tenemos disponibilidad en ese horario..."
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            {actionMsg && (
                                <p style={{ color: actionMsg.startsWith("✓") ? "#2ecc71" : "#e74c3c", fontSize: "13px" }}>
                                    {actionMsg}
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="acsbutton" onClick={() => setActionMode(null)}>Volver</button>
                            <button className="modal-action-btn deny" onClick={() => handleAction("deny")} disabled={actionLoading}>
                                <i className="fa-sharp-duotone fa-solid fa-xmark"></i>
                                {actionLoading ? "Enviando..." : "Confirmar denegación"}
                            </button>
                        </div>
                    </>
                )}

                {/* — MODO VER (no pendiente) — */}
                {isEdit && !editing && !actionMode && !isPending && (
                    <>
                        <div className="modal-info">
                            <div className="modal-info-row">
                                <span className="modal-info-label">Cliente</span>
                                <span className="modal-info-value">{form.name || "—"}</span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Teléfono</span>
                                <span className="modal-info-value">{form.phone || "—"}</span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Servicio</span>
                                <span className="modal-info-value">{form.service}</span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Fecha</span>
                                <span className="modal-info-value" style={{ textTransform: "capitalize" }}>
                                    {formatDate(form.start)}
                                </span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Horario</span>
                                <span className="modal-info-value">{formatTime(form.start)}</span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Notas</span>
                                <span className="modal-info-value modal-notes">
                                    {form.notes || <span style={{ opacity: 0.3 }}>Sin notas</span>}
                                </span>
                            </div>
                            <div className="modal-info-row">
                                <span className="modal-info-label">Color</span>
                                <span className="modal-info-color" style={{ backgroundColor: form.color }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            {!deleteMode && (
                                <button className="acbtdeny" onClick={() => setDeleteMode(true)}>
                                    Eliminar
                                </button>
                            )}
                            {deleteMode && (
                                <>
                                    <div className="modal-field" style={{ flex: 1 }}>
                                        <textarea
                                            placeholder="Motivo de la eliminación para notificar al cliente..."
                                            value={motivo}
                                            onChange={(e) => setMotivo(e.target.value)}
                                            rows={2}
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                    <button className="acsbutton" onClick={() => { setDeleteMode(false); setMotivo(""); setSaveMsg("") }}>
                                        Cancelar
                                    </button>
                                    <button className="modal-action-btn deny" onClick={handleDelete} disabled={saving}>
                                        {saving ? "Eliminando..." : "Confirmar"}
                                    </button>
                                </>
                            )}
                            {!deleteMode && (
                                <button className="modal-cancel acsbutton" onClick={onClose}>Cerrar</button>
                            )}
                            {saveMsg && <p style={{ color: "#e74c3c", fontSize: "13px" }}>{saveMsg}</p>}
                        </div>
                    </>
                )}

                {/* — MODO EDITAR / CREAR — */}
                {(editing || !isEdit) && !actionMode && (
                    <>
                        <div className="modal-body">
                            <div className="modal-row">
                                <div className="modal-field">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del cliente"
                                        value={form.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                    />
                                </div>
                                <div className="modal-field">
                                    <label>Teléfono de contacto</label>
                                    <input
                                        type="tel"
                                        placeholder="+34 600 000 000"
                                        value={form.phone}
                                        onChange={(e) => handleChange("phone", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="modal-row">
                                <div className="modal-field">
                                    <label>Tipo de servicio</label>
                                    <select value={form.service} onChange={(e) => handleChange("service", e.target.value)}>
                                        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="modal-field">
                                    <label>Color</label>
                                    <div className="color-picker">
                                        {COLORS.map(c => (
                                            <div
                                                key={c.value}
                                                className={`color-dot ${form.color === c.value ? "selected" : ""}`}
                                                style={{ backgroundColor: c.value }}
                                                onClick={() => handleChange("color", c.value)}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-row">
                                <div className="modal-field" style={{ overflow: "hidden" }} >
                                    <label>Inicio</label>
                                    <Calendar
                                        value={form.start ? new Date(form.start) : null}
                                        onChange={(d) => handleChange("start", d ? d.toISOString() : "")}
                                    />
                                </div>
                                <div className="modal-field">
                                    <label>Notas</label>
                                    <textarea
                                        placeholder="Alergias, preferencias, observaciones..."
                                        value={form.notes}
                                        onChange={(e) => handleChange("notes", e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            {isEdit && (() => {
                                const cambioImportante =
                                    form.start !== toInputDate(event?.start) ||
                                    form.service !== (event?.service || "Corte") ||
                                    form.phone !== (event?.phone || "")
                                return cambioImportante ? (
                                    <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
                                        <label>
                                            Motivo del cambio
                                            <span style={{ color: "#e74c3c", marginLeft: "4px" }}>*</span>
                                        </label>
                                        <textarea
                                            placeholder="Explica al cliente el motivo de esta modificación..."
                                            value={motivo}
                                            onChange={(e) => setMotivo(e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                ) : null
                            })()}
                            {saveMsg && (
                                <p style={{ gridColumn: "1 / -1", color: "#e74c3c", fontSize: "13px" }}>{saveMsg}</p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="modal-cancel acsbutton"
                                onClick={isEdit ? () => { setEditing(false); setMotivo(""); setSaveMsg("") } : onClose}
                            >
                                Cancelar
                            </button>
                            <button className="modal-save acbtaccept" onClick={handleSave} disabled={saving}>
                                {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cita"}
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}
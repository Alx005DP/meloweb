import { useState, useEffect } from "react"

const SERVICES = ["Corte", "Coloración", "Tratamientos", "Peinados"]
const COLORS = [
    { label: "Amarillo", value: "var(--hover)" },
    { label: "Dorado", value: "#9b8508" },
    { label: "Morado", value: "#6a5acd" },
    { label: "Verde", value: "#2e8b57" },
    { label: "Rojo", value: "#c0392b" },
    { label: "Azul", value: "#2980b9" },
]

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
    const isEdit = event !== null
    const [editing, setEditing] = useState(!isEdit) // si es nuevo, directo a editar

    const [form, setForm] = useState({
        name: "",
        phone: "",
        service: "Corte",
        start: date ? toInputDate(date) : "",
        // end: date ? toInputDate(new Date(new Date(date).getTime() + 30 * 60000)) : "",
        color: "var(--hover)",
        notes: ""
    })

    useEffect(() => {
        if (isEdit && event) {
            setForm({
                name: event.title.split(" - ")[1] || event.title,
                phone: event.phone || "",
                service: event.service || "Corte",
                start: toInputDate(event.start),
                // end: event.end ? toInputDate(event.end) : "",
                color: event.color || "var(--hover)",
                notes: event.notes || ""
            })
        }
    }, [event])

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        if (!form.name.trim()) return
        onSave({
            title: `${form.service} - ${form.name}`,
            phone: form.phone,
            service: form.service,
            start: new Date(form.start),
            // end: form.end ? new Date(form.end) : null,
            color: form.color,
            notes: form.notes
        })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>

                <div className="modal-header">
                    <div className="modal-header-title">
                        <h2>{isEdit ? (editing ? "Editar cita" : form.service) : "Nueva cita"}</h2>
                        {/* Botón editar solo en modo ver */}
                        {isEdit && !editing && (
                            <button className="modal-edit-btn acsbutton" onClick={() => setEditing(true)}>
                                <i class="fa-sharp-duotone fa-solid fa-pencil"></i>
                            </button>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* MODO VER */}
                {isEdit && !editing ? (
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
                            <span className="modal-info-value">
                                {formatTime(form.start)}
                                {/* {form.end && ` → ${formatTime(form.end)}`} */}
                            </span>
                        </div>
                        <div className="modal-info-row">
                            <span className="modal-info-label">Notas</span>
                            <span className="modal-info-value modal-notes">
                                {form.notes || <span style={{ opacity: 0.3 }}>Sin notas</span>}
                            </span>
                        </div>
                        <div className="modal-info-row">
                            <span className="modal-info-label">Color</span>
                            <span
                                className="modal-info-color"
                                style={{ backgroundColor: form.color }}
                            />
                        </div>
                    </div>
                ) : (
                    /* MODO EDITAR / CREAR */
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
                            <div className="modal-field">
                                <label>Inicio</label>
                                <input
                                    type="datetime-local"
                                    value={form.start}
                                    onChange={(e) => handleChange("start", e.target.value)}
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

                            {/* <div className="modal-field">
                                <label>Fin</label>
                                <input
                                    type="datetime-local"
                                    value={form.end}
                                    onChange={(e) => handleChange("end", e.target.value)}
                                />
                            </div> */}
                        </div>
                        
                    </div>
                )}

                <div className="modal-footer">
                    {isEdit && (
                        <button className="modal-delete" onClick={() => onDelete(eventIndex)}>
                            Eliminar
                        </button>
                    )}
                    <button className="modal-cancel acsbutton" onClick={onClose}>Cerrar</button>
                    {(editing || !isEdit) && (
                        <button className="modal-save acpbutton" onClick={handleSave}>
                            {isEdit ? "Guardar cambios" : "Crear cita"}
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}
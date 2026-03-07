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

export default function EventModal({ date, event, eventIndex, onSave, onDelete, onClose }) {
    const isEdit = event !== null

    const [form, setForm] = useState({
        name: "",
        phone: "",
        service: "Corte",
        start: date ? toInputDate(date) : "",
        end: date ? toInputDate(new Date(new Date(date).getTime() + 30 * 60000)) : "",
        color: "var(--hover)"
    })

    useEffect(() => {
        if (isEdit && event) {
            setForm({
                name: event.title.split(" - ")[1] || event.title,
                phone: event.phone || "",
                service: event.service || "Corte",
                start: toInputDate(event.start),
                end: event.end ? toInputDate(event.end) : "",
                color: event.color || "var(--hover)"
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
            end: form.end ? new Date(form.end) : null,
            color: form.color
        })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>

                <div className="modal-header">
                    <h2>{isEdit ? "Editar cita" : "Nueva cita"}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

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
                            <label>Tipo de servicio:</label>
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
                            <label>Fin</label>
                            <input
                                type="datetime-local"
                                value={form.end}
                                onChange={(e) => handleChange("end", e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    {isEdit && (
                        <button className="modal-delete" onClick={() => onDelete(eventIndex)}>
                            Eliminar cita
                        </button>
                    )}
                    <button className="modal-cancel acsbutton" onClick={onClose}>Cancelar</button>
                    <button className="modal-save acpbutton" onClick={handleSave}>
                        {isEdit ? "Guardar cambios" : "Crear cita"}
                    </button>
                </div>

            </div>
        </div>
    )
}
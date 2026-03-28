import { useState, useEffect } from "react"
import MonthView from "./MonthView"
import WeekView from "./WeekView"
import DayView from "./DayView"
import EventModal from "./EventModal"
import { Eye } from 'lucide-react';

export default function AlxCalendar() {
    const [mode, setMode]               = useState("month")
    const [search, setSearch]           = useState("")
    const [showSearch, setShowSearch]   = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents]           = useState([])
    const [loading, setLoading]         = useState(true)
    const [modal, setModal]             = useState({ open: false, date: null, eventIndex: null })
    const [pendingDrop, setPendingDrop] = useState(null)
    const [dropMotivo, setDropMotivo]   = useState("")
    const [dropModal, setDropModal]     = useState(false)
    const [dropSaving, setDropSaving]   = useState(false)
    const [dropError, setDropError]     = useState("")

    // — Cargar citas de la BD —
    const loadCitas = async () => {
        try {
            const res  = await fetch("/api/citas/all")
            const data = await res.json()
            const mapped = data.citas.map((c) => ({
                id:      c.id,
                title:   c.title,
                phone:   c.phone,
                service: c.service,
                start:   new Date(c.start),
                color:   c.status === "pending" ? "#555555" : (c.color || "var(--hover)"),
                status:  c.status,
                notes:   c.notes,
            }))
            setEvents(mapped)
        } catch (err) {
            console.error("Error cargando citas:", err)
        } finally {
            setLoading(false)
        }
    }

    const [hideChrome, setHideChrome] = useState(false)

    useEffect(() => {
        const header = document.querySelector("header")
        const footer = document.querySelector("footer")
        const main = document.querySelector("main")

        if (header) header.style.display = hideChrome ? "none" : ""
        if (footer) footer.style.display = hideChrome ? "none" : ""
        if (main) main.style.marginTop = hideChrome ? "50px" : ""
        if (main) main.style.top = hideChrome ? "0px" : ""
    }, [hideChrome])

    useEffect(() => {
        loadCitas()

        const interval = setInterval(loadCitas, 30000)

        const handleVisibility = () => {
            if (document.visibilityState === "visible") loadCitas()
        }
        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
            clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [])

    const openNewEvent  = (date)       => setModal({ open: true, date, eventIndex: null })
    const openEditEvent = (eventIndex) => setModal({ open: true, date: null, eventIndex })
    const closeModal    = ()           => setModal({ open: false, date: null, eventIndex: null })

    const saveEvent = (eventData) => {
        if (modal.eventIndex !== null) {
            setEvents(prev => prev.map((e, i) => i === modal.eventIndex ? { ...e, ...eventData } : e))
        } else {
            setEvents(prev => [...prev, eventData])
        }
        closeModal()
        loadCitas()
    }

    const deleteEvent = (eventIndex) => {
        setEvents(prev => prev.filter((_, i) => i !== eventIndex))
        closeModal()
        loadCitas()
    }

    // — Drag & drop con motivo —
    const onEventDrop = (eventIndex, newDate) => {
        setPendingDrop({ eventIndex, newDate })
        setDropMotivo("")
        setDropError("")
        setDropModal(true)
    }

    const confirmDrop = async () => {
        if (!dropMotivo.trim()) {
            setDropError("Por favor introduce un motivo para notificar al cliente.")
            return
        }

        setDropSaving(true)
        setDropError("")

        const event = events[pendingDrop.eventIndex]

        const res = await fetch("/api/citas/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id:     event.id,
                start:  pendingDrop.newDate.toISOString(),
                motivo: dropMotivo
            })
        })

        if (res.ok) {
            setEvents(prev => prev.map((e, i) => {
                if (i !== pendingDrop.eventIndex) return e
                return { ...e, start: new Date(pendingDrop.newDate) }
            }))
            setDropModal(false)
            setPendingDrop(null)
            loadCitas()
        } else {
            const data = await res.json()
            setDropError(data.message || "Error al guardar el cambio.")
        }

        setDropSaving(false)
    }

    const pendingCount = events.filter(e => e.status === "pending").length

    const searchResults = search.trim().length > 1
        ? events.map((e, index) => ({ ...e, index })).filter(e =>
            e.title.toLowerCase().includes(search.toLowerCase()) ||
            (e.phone && e.phone.includes(search))
        )
        : []

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]

    const prev = () => {
        const d = new Date(currentDate)
        if (mode === "month") d.setMonth(d.getMonth() - 1)
        if (mode === "week")  d.setDate(d.getDate() - 7)
        if (mode === "day")   d.setDate(d.getDate() - 1)
        setCurrentDate(d)
    }

    const next = () => {
        const d = new Date(currentDate)
        if (mode === "month") d.setMonth(d.getMonth() + 1)
        if (mode === "week")  d.setDate(d.getDate() + 7)
        if (mode === "day")   d.setDate(d.getDate() + 1)
        setCurrentDate(d)
    }

    const goToday = () => setCurrentDate(new Date())

    const getTitle = () => {
        if (mode === "month")
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        if (mode === "week") {
            const start = new Date(currentDate)
            const day   = start.getDay() === 0 ? 6 : start.getDay() - 1
            start.setDate(start.getDate() - day)
            const end = new Date(start)
            end.setDate(end.getDate() + 6)
            return `${start.getDate()} ${monthNames[start.getMonth()]} — ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
        }
        if (mode === "day")
            return currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    }

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", opacity: 0.5 }}>
            Cargando calendario...
        </div>
    )

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <h2 className="calendar-title">{getTitle()}</h2>
                    {pendingCount > 0 && (
                        <div className="pending-badge">
                            <span className="pending-dot" />
                            {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
                        </div>
                    )}
                </div>

                <div className="infonav">
                    <div className="calendar-nav">
                        <button onClick={prev}>‹</button>
                        <button onClick={goToday}>Hoy</button>
                        <button onClick={next}>›</button>
                    </div>
                    <div className="calendar-mode">
                        <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Mes</button>
                        <button className={mode === "week"  ? "active" : ""} onClick={() => setMode("week")}>Semana</button>
                        <button className={mode === "day"   ? "active" : ""} onClick={() => setMode("day")}>Día</button>
                    </div>

                    <div className="search-wrapper">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Buscar cliente o teléfono..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setShowSearch(true) }}
                                onFocus={() => setShowSearch(true)}
                                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                            />
                            {search && (
                                <button className="search-clear" onClick={() => setSearch("")}>✕</button>
                            )}
                        </div>

                        {showSearch && search.trim().length > 1 && (
                            <div className="search-results">
                                {searchResults.length === 0 ? (
                                    <div className="search-empty">No se encontraron citas</div>
                                ) : (
                                    searchResults.map((e, i) => (
                                        <div
                                            className="search-result-item"
                                            key={i}
                                            onClick={() => {
                                                openEditEvent(e.index)
                                                setSearch("")
                                                setShowSearch(false)
                                                setCurrentDate(new Date(e.start))
                                                setMode("day")
                                            }}
                                        >
                                            <div
                                                className="search-result-color"
                                                style={{ backgroundColor: e.color || "var(--hover)" }}
                                            />
                                            <div className="search-result-info">
                                                <span className="search-result-title">{e.title}</span>
                                                <span className="search-result-date">
                                                    {new Date(e.start).toLocaleDateString("es-ES", {
                                                        weekday: "short", day: "numeric", month: "short"
                                                    })} · {new Date(e.start).toLocaleTimeString("es-ES", {
                                                        hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                {e.status === "pending" && <span className="pending-dot-small" />}
                                                <span className="search-result-service">{e.service}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        className={`calendar-eye-btn ${hideChrome ? "active" : ""}`}
                        onClick={() => setHideChrome(prev => !prev)}
                        title={hideChrome ? "Mostrar header y footer" : "Ocultar header y footer"}
                    >
                        <Eye size={20} />
                    </button>
                </div>
            </div>

            {mode === "month" && (
                <MonthView
                    currentDate={currentDate}
                    events={events}
                    onDayClick={(date) => { setCurrentDate(date); setMode("day") }}
                />
            )}
            {mode === "week" && (
                <WeekView
                    currentDate={currentDate}
                    events={events}
                    onEventDrop={onEventDrop}
                    onCellClick={openNewEvent}
                    onEventClick={openEditEvent}
                />
            )}
            {mode === "day" && (
                <DayView
                    currentDate={currentDate}
                    events={events}
                    onEventDrop={onEventDrop}
                    onCellClick={openNewEvent}
                    onEventClick={openEditEvent}
                />
            )}

            {modal.open && (
                <EventModal
                    date={modal.date}
                    event={modal.eventIndex !== null ? events[modal.eventIndex] : null}
                    eventIndex={modal.eventIndex}
                    onSave={saveEvent}
                    onDelete={deleteEvent}
                    onClose={closeModal}
                />
            )}

            {/* — Modal drag & drop — */}
            {dropModal && (
                <div className="modal-overlay" onClick={() => setDropModal(false)}>
                    <div className="modal" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cambio de horario</h2>
                            <button className="modal-close" onClick={() => setDropModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ opacity: 0.7, fontSize: "14px", gridColumn: "1 / -1" }}>
                                Vas a mover la cita al{" "}
                                <strong style={{ textTransform: "capitalize" }}>
                                    {pendingDrop && new Date(pendingDrop.newDate).toLocaleDateString("es-ES", {
                                        weekday: "long", day: "numeric", month: "long"
                                    })}
                                </strong>{" "}
                                a las{" "}
                                <strong>
                                    {pendingDrop && new Date(pendingDrop.newDate).toLocaleTimeString("es-ES", {
                                        hour: "2-digit", minute: "2-digit"
                                    })}
                                </strong>.
                                Se notificará al cliente por email.
                            </p>
                            <div className="modal-field" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
                                <label>
                                    Motivo del cambio
                                    <span style={{ color: "#e74c3c", marginLeft: "4px" }}>*</span>
                                </label>
                                <textarea
                                    placeholder="Ej: Hemos tenido que reorganizar la agenda..."
                                    value={dropMotivo}
                                    onChange={(e) => setDropMotivo(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            {dropError && (
                                <p style={{ gridColumn: "1 / -1", color: "#e74c3c", fontSize: "13px", margin: "4px 0 0" }}>
                                    {dropError}
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="acsbutton" onClick={() => setDropModal(false)}>Cancelar</button>
                            <button
                                className="modal-action-btn modify"
                                onClick={confirmDrop}
                                disabled={dropSaving}
                            >
                                <i className="fa-sharp-duotone fa-solid fa-check"></i>
                                {dropSaving ? "Guardando..." : "Confirmar cambio"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
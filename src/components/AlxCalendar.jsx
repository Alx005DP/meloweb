import { useState } from "react"
import MonthView from "./MonthView"
import WeekView from "./WeekView"
import DayView from "./DayView"
import EventModal from "./EventModal"

export default function AlxCalendar() {
    const [mode, setMode] = useState("month")
    const [search, setSearch] = useState("")
    const [showSearch, setShowSearch] = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState([
        {
            title: "Corte de cabello - Lione Messi",
            start: new Date(2026, 2, 7, 10, 0),
            // end: new Date(2026, 2, 7, 10, 30),
            color: "var(--hover)",
            phone: "612345678",
            service: "Corte"
        },
        {
            title: "Coloración completa - Cristianoz",
            start: new Date(2026, 2, 7, 12, 0),
            // end: new Date(2026, 2, 7, 13, 30),
            color: "#9b8508",
            phone: "698765432",
            service: "Coloración"
        },
        {
            title: "Tratamiento keratina - Eric Rintelen",
            start: new Date(2026, 2, 7, 16, 0),
            // end: new Date(2026, 2, 7, 17, 0),
            color: "#6a5acd",
            phone: "611223344",
            service: "Tratamientos"
        },
        {
            title: "Peinado evento - Tico Dico",
            start: new Date(2026, 2, 8, 9, 0),
            // end: new Date(2026, 2, 8, 9, 45),
            color: "#2e8b57",
            phone: "699887766",
            service: "Peinados"
        },
    ])

    // Modal
    const [modal, setModal] = useState({ open: false, date: null, eventIndex: null })

    const openNewEvent = (date) => {
        setModal({ open: true, date, eventIndex: null })
    }

    const openEditEvent = (eventIndex) => {
        setModal({ open: true, date: null, eventIndex })
    }

    const closeModal = () => {
        setModal({ open: false, date: null, eventIndex: null })
    }

    const saveEvent = (eventData) => {
        if (modal.eventIndex !== null) {
            // Editar existente
            setEvents(prev => prev.map((e, i) => i === modal.eventIndex ? { ...e, ...eventData } : e))
        } else {
            // Crear nuevo
            setEvents(prev => [...prev, eventData])
        }
        closeModal()
    }

    const deleteEvent = (eventIndex) => {
        setEvents(prev => prev.filter((_, i) => i !== eventIndex))
        closeModal()
    }

    const onEventDrop = (eventIndex, newDate) => {
        setEvents(prev => prev.map((e, i) => {
            if (i !== eventIndex) return e
            const oldStart = new Date(e.start)
            const oldEnd = e.end ? new Date(e.end) : null
            const duration = oldEnd ? oldEnd - oldStart : 0
            const newStart = new Date(newDate)
            const newEnd = oldEnd ? new Date(newStart.getTime() + duration) : null
            return { ...e, start: newStart, end: newEnd }
        }))
    }

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
        if (mode === "week") d.setDate(d.getDate() - 7)
        if (mode === "day") d.setDate(d.getDate() - 1)
        setCurrentDate(d)
    }

    const next = () => {
        const d = new Date(currentDate)
        if (mode === "month") d.setMonth(d.getMonth() + 1)
        if (mode === "week") d.setDate(d.getDate() + 7)
        if (mode === "day") d.setDate(d.getDate() + 1)
        setCurrentDate(d)
    }

    const goToday = () => setCurrentDate(new Date())

    const getTitle = () => {
        if (mode === "month")
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        if (mode === "week") {
            const start = new Date(currentDate)
            const day = start.getDay() === 0 ? 6 : start.getDay() - 1
            start.setDate(start.getDate() - day)
            const end = new Date(start)
            end.setDate(end.getDate() + 6)
            return `${start.getDate()} ${monthNames[start.getMonth()]} — ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
        }
        if (mode === "day")
            return currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    }

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h2 className="calendar-title">{getTitle()}</h2>
                <div className="infonav">
                    <div className="calendar-nav">
                        <button onClick={prev}>‹</button>
                        <button onClick={goToday}>Hoy</button>
                        <button onClick={next}>›</button>
                    </div>
                    <div className="calendar-mode">
                        <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Mes</button>
                        <button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Semana</button>
                        <button className={mode === "day" ? "active" : ""} onClick={() => setMode("day")}>Día</button>
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

                        {/* Resultados */}
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
                                                // Navega a la fecha del evento
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
                                            <span className="search-result-service">{e.service}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
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
            </div>
            )
}
export default function WeekView({ currentDate = new Date(), events = [], onEventDrop, onCellClick, onEventClick }) {
    const HOUR_HEIGHT = 60
    const hours = Array.from({ length: 15 }, (_, i) => i + 8)

    const getWeekDays = () => {
        const start = new Date(currentDate)
        const day = start.getDay() === 0 ? 6 : start.getDay() - 1
        start.setDate(start.getDate() - day)
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start)
            d.setDate(d.getDate() + i)
            return d
        })
    }

    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    const weekDays = getWeekDays()
    const today = new Date()

    const isToday = (date) =>
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()

    const getEventsForDay = (date) =>
        events.map((e, index) => ({ ...e, index })).filter(e => {
            const d = new Date(e.start)
            return d.getDate() === date.getDate() &&
                d.getMonth() === date.getMonth() &&
                d.getFullYear() === date.getFullYear()
        })

    const getEventStyle = (event) => {
        const start = new Date(event.start)
        const end = event.end ? new Date(event.end) : new Date(start.getTime() + 30 * 60000)
        const top = (start.getHours() + start.getMinutes() / 60 - 8) * HOUR_HEIGHT // -8 offset
        const height = Math.max(((end - start) / 3600000) * HOUR_HEIGHT, 20)
        return { top: `${top}px`, height: `${height}px` }
    }

    const handleDragStart = (e, eventIndex) => {
        e.dataTransfer.setData("eventIndex", String(eventIndex))
        e.stopPropagation()
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.currentTarget.classList.add("drag-over")
    }

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove("drag-over")
    }

    const handleDrop = (e, date) => {
        e.preventDefault()
        e.currentTarget.classList.remove("drag-over")
        const eventIndex = parseInt(e.dataTransfer.getData("eventIndex"))
        const rect = e.currentTarget.getBoundingClientRect()
        const y = e.clientY - rect.top
        const totalHours = y / HOUR_HEIGHT
        const hour = Math.floor(totalHours) + 8  // +8 offset
        const minutes = Math.round((totalHours - Math.floor(totalHours)) * 60 / 15) * 15
        const newDate = new Date(date)
        newDate.setHours(hour, minutes, 0, 0)
        onEventDrop(eventIndex, newDate)
    }

    return (
        <div className="week-view">

            {/* Header fijo - fuera del scroll */}
            <div className="week-header">
                <div className="week-time-col" />
                {weekDays.map((date, i) => (
                    <div className={`week-day-header ${isToday(date) ? "today" : ""}`} key={i}>
                        <span className="week-day-name">{dayNames[i]}</span>
                        <span className={`week-day-number ${isToday(date) ? "today-number" : ""}`}>
                            {date.getDate()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Body con scroll */}
            <div className="week-body">
                <div className="week-lines">

                    {/* Columna de horas */}
                    <div className="week-lines-times">
                        {hours.map(hour => (
                            <div className="week-line-row" key={hour} style={{ height: `${HOUR_HEIGHT}px` }}>
                                <span>{String(hour).padStart(2, "0")}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Columnas de días */}
                    {weekDays.map((date, i) => (
                        <div
                            className={`week-col ${isToday(date) ? "today-col" : ""}`}
                            key={i}
                            style={{ height: `${HOUR_HEIGHT * 15}px` }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, date)}
                            onClick={(e) => {
                                if (e.target === e.currentTarget || e.target.classList.contains("week-col-line")) {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const y = e.clientY - rect.top
                                    const totalHours = y / HOUR_HEIGHT
                                    const hour = Math.floor(totalHours) + 8  // +8 offset
                                    const minutes = Math.round((totalHours - Math.floor(totalHours)) * 60 / 15) * 15
                                    const clickedDate = new Date(date)
                                    clickedDate.setHours(hour, minutes, 0, 0)
                                    onCellClick(clickedDate)
                                }
                            }}
                        >
                            {/* Líneas horizontales por hora */}
                            {hours.map((hour, index) => (
                                <div
                                    className="week-col-line"
                                    key={hour}
                                    style={{ top: `${index * HOUR_HEIGHT}px` }}
                                />
                            ))}

                            {/* Eventos */}
                            {getEventsForDay(date).map((event, j) => (
                                // En WeekView — dentro del map de eventos:
                                <div
                                    className="week-event-abs"
                                    key={j}
                                    draggable={event.status !== "pending"}  // ← solo draggable si no es pending
                                    onDragStart={(ev) => {
                                        if (event.status === "pending") return  // ← bloquear
                                        handleDragStart(ev, event.index)
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onEventClick(event.index) }}
                                    style={{
                                        ...getEventStyle(event),
                                        backgroundColor: event.color || "var(--hover)",
                                        opacity: event.status === "pending" ? 0.75 : 1,
                                        border: event.status === "pending" ? "1px dashed #888" : "none",
                                        cursor: event.status === "pending" ? "pointer" : "grab"  // ← cursor diferente
                                    }}
                                >
                                    {event.status === "pending" && <span className="event-pending-dot" />}
                                    <span className="event-title">{event.title}</span>
                                    <span className="event-time">
                                        {new Date(event.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
export default function DayView({ currentDate = new Date(), events = [], onEventDrop, onCellClick, onEventClick }) {
    const hours = Array.from({ length: 15 }, (_, i) => i + 8)
    const today = new Date()

    const isToday =
        currentDate.getDate() === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()

    const getEvents = (hour) =>
        events.map((e, index) => ({ ...e, index })).filter(e => {
            const d = new Date(e.start)
            return d.getDate() === currentDate.getDate() &&
                d.getMonth() === currentDate.getMonth() &&
                d.getFullYear() === currentDate.getFullYear() &&
                d.getHours() === hour
        })

    const handleDragStart = (e, eventIndex) => {
        e.dataTransfer.setData("eventIndex", eventIndex)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.currentTarget.classList.add("drag-over")
    }

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove("drag-over")
    }

    const handleDrop = (e, hour) => {
        e.preventDefault()
        e.currentTarget.classList.remove("drag-over")
        const eventIndex = parseInt(e.dataTransfer.getData("eventIndex"))
        const newDate = new Date(currentDate)
        newDate.setHours(hour, 0, 0, 0)
        onEventDrop(eventIndex, newDate)
    }

    return (
        <div className="day-view">
            <div className={`day-view-header ${isToday ? "today" : ""}`}>
                {/* <span className="day-view-weekday">
                    {currentDate.toLocaleDateString("es-ES", { weekday: "long" })}
                </span>
                <span className={`day-view-number ${isToday ? "today-number" : ""}`}>
                    {currentDate.getDate()}
                </span>
                <span className="day-view-month">
                    {currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </span> */}
            </div>

            <div className="day-view-body">
                {hours.map(hour => {
                    const hourEvents = getEvents(hour)
                    return (
                        <div
                            className={`day-row ${hourEvents.length > 0 ? "has-events" : ""}`}
                            key={hour}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, hour)}
                            onClick={() => {
                            const clickedDate = new Date(currentDate)
                            clickedDate.setHours(hour, 0, 0, 0)
                            onCellClick(clickedDate)
                            }}
                        >
                            <div className="day-time">
                                {String(hour).padStart(2, "0")}:00
                            </div>
                            <div className="day-line" />
                            <div className="day-cell">
                                {hourEvents.length > 0
                                    ? hourEvents.map((e, i) => (
                                        <div
                                            className="day-event"
                                            key={i}
                                            draggable={e.status !== "pending"}  // ← solo draggable si no es pending
                                            onDragStart={(ev) => {
                                                if (e.status === "pending") return  // ← bloquear
                                                handleDragStart(ev, e.index)
                                            }}
                                            onClick={(ev) => { ev.stopPropagation(); onEventClick(e.index) }}
                                            style={{
                                                backgroundColor: e.color || "var(--hover)",
                                                opacity: e.status === "pending" ? 0.75 : 1,
                                                border: e.status === "pending" ? "1px dashed #888" : "none",
                                                cursor: e.status === "pending" ? "pointer" : "grab"
                                            }}
                                        >
                                            {e.status === "pending" && <span className="event-pending-dot" />}
                                            <span className="event-title">{e.title}</span>
                                            <span className="event-time">
                                                {new Date(e.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                    ))
                                    : <div className="day-empty" />
                                }
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
export default function MonthView({ currentDate = new Date(), events = [], onDayClick }) {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const startOffset = (firstDay === 0 ? 6 : firstDay - 1)

    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    const cells = [
        ...Array(startOffset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ]

    const isToday = (day) =>
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()

    // Obtener eventos de un día concreto
    const getEventsForDay = (day) =>
        events.filter(e => {
            const d = new Date(e.start)
            return d.getDate() === day &&
                d.getMonth() === month &&
                d.getFullYear() === year
        })

    return (
        <div className="month-view">
            <div className="month-grid">
                {dayNames.map(name => (
                    <div className="day-name" key={name}>{name}</div>
                ))}
            </div>

            <div className="month-grid">
                {cells.map((day, i) => {
                    const dayEvents = day ? getEventsForDay(day) : []
                    return (
                        <div
                            className={`day ${day === null ? "empty" : ""} ${isToday(day) ? "today" : ""}`}
                            key={i}
                            onClick={() => {
                                if (day === null) return
                                onDayClick(new Date(year, month, day))
                            }}
                        >
                            {day && (
                                <>
                                    <div className="day-number">{day}</div>

                                    {/* Puntos de eventos */}
                                    {dayEvents.length > 0 && (
                                        <div className="day-dots">
                                            {dayEvents.slice(0, 3).map((e, j) => (
                                                <span
                                                    className="day-dot"
                                                    key={j}
                                                    style={{ backgroundColor: e.color || "var(--hover)" }}
                                                />
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <span className="day-dot-more">+{dayEvents.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
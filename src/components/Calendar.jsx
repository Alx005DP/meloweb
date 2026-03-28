import { useState, useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

export default function Calendar({ value = null, onChange = null, hiddenInputId = "selected-date-hidden" }) {

    const getDefaultDate = () => {
        const now     = new Date()
        const minutes = now.getMinutes()
        const rounded = Math.ceil(minutes / 15) * 15
        const d       = new Date()
        d.setHours(now.getHours(), rounded, 0, 0)

        const maxT = new Date()
        maxT.setHours(21, 0, 0, 0)

        if (d > maxT) {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(9, 30, 0, 0)
            return tomorrow
        }

        return d
    }

    const [date, setDate] = useState(value ? new Date(value) : getDefaultDate())

    useEffect(() => {
        if (value) setDate(new Date(value))
    }, [value])

    // Inicializar el input oculto con la fecha por defecto
    useEffect(() => {
        const hidden = document.getElementById(hiddenInputId)
        if (hidden && date && !hidden.value) {
            hidden.value = date.toISOString()
        }
    }, [])

    const holidays = ["2026-01-01", "2026-12-24"]

    const isAvailable = (d) => {
        const day       = d.getDay()
        const formatted = d.toISOString().split("T")[0]
        return day !== 0 && !holidays.includes(formatted)
    }

    const isToday = (d) => {
        if (!d) return false
        const today = new Date()
        return d.getDate()     === today.getDate()  &&
               d.getMonth()    === today.getMonth() &&
               d.getFullYear() === today.getFullYear()
    }

    const getMinTime = () => {
        if (isToday(date)) {
            const now     = new Date()
            const minutes = now.getMinutes()
            const rounded = Math.ceil(minutes / 15) * 15
            const minT    = new Date()
            minT.setHours(now.getHours(), rounded, 0, 0)

            const opening = new Date()
            opening.setHours(9, 30, 0, 0)
            return minT > opening ? minT : opening
        }
        const minT = new Date()
        minT.setHours(9, 30, 0, 0)
        return minT
    }

    const getMaxTime = () => {
        const maxT = new Date()
        maxT.setHours(21, 0, 0, 0)
        return maxT
    }

    const handleChange = (d) => {
        setDate(d)
        const hidden = document.getElementById(hiddenInputId)
        if (hidden) hidden.value = d ? d.toISOString() : ""
        if (onChange) onChange(d)
    }

    return (
        <DatePicker
            selected={date}
            onChange={handleChange}
            filterDate={isAvailable}
            minDate={new Date()}
            locale="es"
            dateFormat="dd/MM/yyyy HH:mm"
            placeholderText="Selecciona fecha y hora"
            calendarStartDay={1}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            minTime={getMinTime()}
            maxTime={getMaxTime()}
            className="mi-datepicker"
        />
    )
}
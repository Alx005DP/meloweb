import { useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

export default function Calendar() {
    const [date, setDate] = useState(null);

    const holidays = ["2026-01-01", "2026-12-24"];

    const isAvailable = (d) => {
        const day = d.getDay();
        const formatted = d.toISOString().split("T")[0];

        return day !== 0 && !holidays.includes(formatted);
    };

    const minTime = new Date();
    minTime.setHours(9, 30);

    const maxTime = new Date();
    maxTime.setHours(21, 0);

    return (
        <DatePicker
            selected={date}
            onChange={(d) => setDate(d)}
            filterDate={isAvailable}
            minDate={new Date()}
            locale="es"
            dateFormat="dd/MM/yyyy HH:mm"
            placeholderText="Selecciona fecha y hora"
            calendarStartDay={1}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            minTime={minTime}
            maxTime={maxTime}
            className="mi-datepicker"
        />
    );
}
import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

const DatePicker = ({ selectedDate, onChange, placeholder = "Seleccionar fecha" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef(null);

    useEffect(() => {
        // Sync calendar month with selected date if valid
        if (selectedDate) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentMonth(parseISO(selectedDate));
        }
    }, [selectedDate]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateClick = (day) => {
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="dp-header">
                <button type="button" onClick={prevMonth} className="dp-nav-btn"><ChevronLeft size={18} /></button>
                <span className="dp-current-month">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <button type="button" onClick={nextMonth} className="dp-nav-btn"><ChevronRight size={18} /></button>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const startDate = startOfWeek(currentMonth, { weekStartsOn: 0 }); // Sunday start

        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="dp-day-name" key={i}>
                    {format(addDays(startDate, i), 'EEEEE', { locale: es }).toUpperCase()}
                </div>
            );
        }
        return <div className="dp-days-header">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd');
                const cloneDay = day;
                const isSelected = selectedDate ? isSameDay(day, parseISO(selectedDate)) : false;
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <div
                        className={`dp-day ${!isCurrentMonth ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                        key={day}
                        onClick={() => isCurrentMonth && handleDateClick(cloneDay)}
                    >
                        <span>{formattedDate}</span>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="dp-row" key={day}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="dp-body">{rows}</div>;
    };

    return (
        <div className="datepicker-container" ref={containerRef}>
            <div className="dp-input-wrapper" onClick={() => setIsOpen(!isOpen)}>
                <input
                    type="text"
                    readOnly
                    placeholder={placeholder}
                    value={selectedDate ? format(parseISO(selectedDate), 'dd/MM/yyyy') : ''}
                    className="dp-input"
                />
                <div className="dp-icons">
                    {selectedDate && (
                        <div className="dp-clear-btn" onClick={handleClear} title="Borrar fecha">
                            <X size={16} />
                        </div>
                    )}
                    <CalendarIcon size={18} className="dp-calendar-icon" />
                </div>
            </div>

            {isOpen && (
                <div className="dp-dropdown">
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                    <div className="dp-footer">
                        <button type="button" className="dp-today-btn" onClick={() => handleDateClick(new Date())}>
                            Hoy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

DatePicker.propTypes = {
    selectedDate: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string
};

export default DatePicker;

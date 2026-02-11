import { useState } from 'react';
import PropTypes from 'prop-types';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const CalendarView = ({ projects, onNavigate }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState([]);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    // Gather all tasks with valid dates
    const allTasks = projects.flatMap(p =>
        (p.tasks || []).map(t => ({ ...t, projectTitle: p.title, dbProjectId: p.id }))
    ).filter(t => t.fecha_objetivo);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const handleDayClick = (day, tasks) => {
        setSelectedDay(day);
        setSelectedTasks(tasks);
    };

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Helper to format task date safely
    const getTaskDateString = (dateInput) => {
        if (!dateInput) return '';
        try {
            // If it's already a date object
            if (dateInput instanceof Date) {
                return format(dateInput, 'yyyy-MM-dd');
            }
            // If it's a string
            if (typeof dateInput === 'string') {
                return dateInput.split('T')[0];
            }
            return '';
        } catch (e) {
            console.error("Error parsing date:", dateInput, e);
            return '';
        }
    };

    return (
        <div className="calendar-container">
            {/* Header */}
            <div className="calendar-header">
                <div className="month-nav">
                    <button onClick={prevMonth} className="nav-btn"><ChevronLeft /></button>
                    <h2 className="current-month">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <button onClick={nextMonth} className="nav-btn"><ChevronRight /></button>
                </div>
                <button onClick={goToToday} className="today-btn">Hoy</button>
            </div>

            {/* Weekday Headers */}
            <div className="calendar-grid-header">
                {weekDays.map(day => (
                    <div key={day} className="weekday-label">{day}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {calendarDays.map((day, idx) => {
                    // Check for tasks on this day
                    const dayTasks = allTasks.filter(t => {
                        const taskDate = getTaskDateString(t.fecha_objetivo);
                        return taskDate === format(day, 'yyyy-MM-dd');
                    });

                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDay && isSameDay(day, selectedDay);

                    return (
                        <div
                            key={idx}
                            className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected-day' : ''}`}
                            onClick={() => handleDayClick(day, dayTasks)}
                        >
                            <span className="day-number">{format(day, 'd')}</span>
                            <div className="day-indicators">
                                {dayTasks.slice(0, 3).map((task, i) => (
                                    <div key={i} className={`task-dot ${task.completada ? 'completed' : ''}`} title={task.descripcion} />
                                ))}
                                {dayTasks.length > 3 && <span className="more-dots">+{dayTasks.length - 3}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Task Details for Selected Day */}
            {selectedDay && (
                <div className="day-details-panel">
                    <div className="details-header">
                        <h3>Tareas para el {format(selectedDay, 'd MMMM yyyy', { locale: es })}</h3>
                        <button onClick={() => setSelectedDay(null)} className="close-details"><X size={18} /></button>
                    </div>

                    {selectedTasks.length > 0 ? (
                        <ul className="details-list">
                            {selectedTasks.map((task, idx) => (
                                <li
                                    key={idx}
                                    className={`detail-item ${task.completada ? 'completed' : ''} clickable-task`}
                                    onClick={() => onNavigate && onNavigate(task.dbProjectId)}
                                    title="Ir a este proyecto"
                                >
                                    <span className="detail-project">{task.projectTitle}</span>
                                    <span className="detail-desc">{task.descripcion}</span>
                                    {task.completada && <span className="detail-status">✓</span>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="no-tasks-msg">No hay tareas para este día.</p>
                    )}
                </div>
            )}
        </div>
    );
};

CalendarView.propTypes = {
    projects: PropTypes.array.isRequired
};

export default CalendarView;

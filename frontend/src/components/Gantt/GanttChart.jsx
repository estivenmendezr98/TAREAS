import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, FileIcon } from 'lucide-react';

// --- ESTILOS OPTIMIZADOS (BALANCED SIZE) ---
const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #e0e0e0', fontFamily: 'sans-serif', backgroundColor: 'white', overflow: 'hidden' },
    mainWrapper: { display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' },
    // SIDEBAR: 350px (Standard Wide)
    sidebar: { width: '350px', minWidth: '350px', display: 'flex', flexDirection: 'column', borderRight: '2px solid #ddd', zIndex: 20, backgroundColor: 'white' },
    // HEADER HEIGHT: 90px (3 filas de 30px)
    sidebarHeader: { height: '100px', minHeight: '100px', borderBottom: '1px solid #ccc', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px', backgroundColor: '#f9fafb', fontSize: '14px', gap: '8px' },
    sidebarBody: { flex: 1, overflow: 'hidden' },
    canvas: { flex: 1, overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' },
    // HEADER HEIGHT: 100px (Matching Sidebar)
    headerContainer: { height: '100px', minHeight: '100px', position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#f9fafb', borderBottom: '1px solid #ccc', overflow: 'hidden' },
    // HEADER ROWS: 30px
    row: { display: 'flex', height: '30px', boxSizing: 'border-box' },
    cellHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e0e0e0', fontSize: '12px', fontWeight: '600', color: '#555', boxSizing: 'border-box' },
    cellDay: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #eee', fontSize: '11px', height: '100%', boxSizing: 'border-box' },
    bodyContainer: { position: 'relative' },
    // GROUP HEADER: 30px
    groupHeader: { height: '30px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', paddingLeft: '10px', fontWeight: 'bold', fontSize: '12px', color: '#555', borderBottom: '1px solid #e0e0e0', boxSizing: 'border-box' },
    // BODY ROWS: 60px (Suficiente para texto doble linea)
    gridRow: { display: 'flex', height: '60px', borderBottom: '1px solid #f0f0f0', position: 'relative', boxSizing: 'border-box' },
    gridCell: { borderRight: '1px solid #f9f9f9', height: '100%', boxSizing: 'border-box' },
    // TASK ITEM: 60px, wrapping
    taskItem: {
        height: '60px',
        padding: '5px 15px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'normal',
        lineHeight: '1.2',
        overflow: 'hidden',
        fontSize: '12px',
        color: '#333'
    },
    // BAR: 34px alto
    bar: { position: 'absolute', height: '34px', backgroundColor: '#3b82f6', borderRadius: '4px', top: '13px', display: 'flex', alignItems: 'center', padding: '0 8px', color: 'white', fontSize: '11px', cursor: 'grab', zIndex: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', userSelect: 'none' },
    resizeL: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '15px', cursor: 'w-resize', zIndex: 20 },
    resizeR: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '15px', cursor: 'e-resize', zIndex: 20 }
};

// --- HELPERS ---
const parseLocalDate = (input) => {
    if (!input) return new Date();
    if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0);
    if (typeof input === 'string') {
        const parts = input.split('-');
        if (parts.length >= 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    }
    return new Date();
};
const formatLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

const HOLIDAYS_CO_2026 = ['2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25'];
const isHoliday = (date) => HOLIDAYS_CO_2026.includes(formatLocalDate(date));

// --- COMPONENTE ---
const GanttChart = ({ tasks = [], onTaskUpdate }) => {
    const [currentDate] = useState(new Date());
    const [selectedMonth, setSelectedMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [viewScale, setViewScale] = useState('day'); // 'day' | 'week'
    const [groupingMode, setGroupingMode] = useState('project'); // 'project' | 'week'
    const columnWidth = viewScale === 'day' ? 50 : 250; // Ancho de columna
    const canvasRef = useRef(null);
    const sidebarRef = useRef(null);
    const containerRef = useRef(null);
    const mainWrapperRef = useRef(null);

    // 1. DATA NORMALIZER
    const { groupedTasks, flatTasks } = useMemo(() => {
        if (!Array.isArray(tasks)) return { normalizedTasks: [], groupedTasks: {}, flatTasks: [] };
        const validTasks = tasks.map(t => ({
            ...t,
            _start: parseLocalDate(t.start_date || t.startDate || t.fecha_inicio),
            _end: parseLocalDate(t.fecha_objetivo || t.endDate || t.fecha_fin)
        }));

        let groups = {};

        if (groupingMode === 'project') {
            validTasks.forEach(t => {
                const key = t.project_title || 'Sin Proyecto';
                if (!groups[key]) groups[key] = [];
                groups[key].push(t);
            });
        } else if (groupingMode === 'week') {
            validTasks.forEach(t => {
                const d = t._start;
                const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][d.getMonth()];
                const weekNum = Math.ceil(d.getDate() / 7);
                const year = d.getFullYear();
                const key = `${monthName} ${year} - Semana ${weekNum}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(t);
            });

            const sortedKeys = Object.keys(groups).sort((a, b) => {
                const taskA = groups[a][0];
                const taskB = groups[b][0];
                return taskA._start - taskB._start;
            });

            const sortedGroups = {};
            sortedKeys.forEach(key => sortedGroups[key] = groups[key]);
            groups = sortedGroups;
        }

        return { normalizedTasks: validTasks, groupedTasks: groups, flatTasks: validTasks };
    }, [tasks, groupingMode]);

    // 2. GRID GENERATION (Scoped to Selected Month)
    const { columns, months, totalWidth, monthStart, monthEnd } = useMemo(() => {
        const cols = [];
        const year = selectedMonth.getFullYear();
        const monthIndex = selectedMonth.getMonth();

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0); // Last day of month

        // Ensure accurate start/end for logic
        let current = new Date(startOfMonth);
        current.setHours(12, 0, 0, 0);

        const limitDate = new Date(endOfMonth);
        limitDate.setHours(12, 0, 0, 0);

        if (viewScale === 'day') {
            const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
            const todayStr = formatLocalDate(new Date());

            while (current <= limitDate) {
                const dateStr = formatLocalDate(current);
                const holiday = isHoliday(current);
                const weekend = current.getDay() === 0 || current.getDay() === 6;
                const isToday = dateStr === todayStr;

                cols.push({
                    date: new Date(current),
                    label: current.getDate(),
                    subLabel: weekDays[current.getDay()],
                    isWeekend: weekend,
                    isHoliday: holiday,
                    isToday: isToday,
                    bg: isToday ? '#e3f2fd' : (holiday ? '#ffebee' : (weekend ? '#f8f9fa' : 'white')),
                    color: isToday ? '#1976d2' : (holiday ? '#d32f2f' : (weekend ? '#999' : '#333')),
                    weight: isToday || holiday ? 'bold' : 'normal',
                    borderLeft: isToday ? '2px solid #ef5350' : '1px solid #eee'
                });
                current.setDate(current.getDate() + 1);
            }
        } else if (viewScale === 'week') {
            let weekNum = 1;
            while (current <= limitDate) {
                const weekStart = new Date(current);
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                if (weekEnd > limitDate) weekEnd.setTime(limitDate.getTime()); // Clip to month end helper

                const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;

                cols.push({
                    date: new Date(weekStart),
                    label: `Sem ${weekNum}`,
                    subLabel: `${weekStart.getDate()}-${weekEnd.getDate()}`,
                    isToday: isCurrentWeek,
                    bg: isCurrentWeek ? '#e3f2fd' : 'white',
                    color: isCurrentWeek ? '#1976d2' : '#333',
                    weight: isCurrentWeek ? 'bold' : 'normal',
                    borderLeft: '1px solid #eee'
                });

                // Advance 7 days
                current.setDate(current.getDate() + 7);
                weekNum++;
            }
        }

        const monthsMap = [{
            name: selectedMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase(),
            width: cols.length * columnWidth
        }];

        return {
            columns: cols,
            months: monthsMap,
            totalWidth: cols.length * columnWidth,
            monthStart: startOfMonth,
            monthEnd: endOfMonth
        };
    }, [selectedMonth, viewScale, columnWidth]);

    const getPos = (date) => {
        if (!date) return 0;
        // Reference is START OF SELECTED MONTH now
        const startOfView = new Date(monthStart);
        startOfView.setHours(12, 0, 0, 0);

        const target = new Date(date);
        target.setHours(12, 0, 0, 0);

        const diffTime = target - startOfView;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (viewScale === 'day') {
            return Math.round(diffDays) * columnWidth;
        } else {
            return (diffDays / 7) * columnWidth;
        }
    };

    const handleScroll = (e) => { if (sidebarRef.current) sidebarRef.current.scrollTop = e.target.scrollTop; };

    // --- NAVIGATION ---
    const handlePrevMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // --- EXPORT ---
    const exportToPDF = async () => {
        if (!containerRef.current || !mainWrapperRef.current || !sidebarRef.current || !canvasRef.current) return;

        const container = containerRef.current;
        const mainWrapper = mainWrapperRef.current;
        const sidebarBody = sidebarRef.current;
        const canvas = canvasRef.current;

        // 1. SAVE ORIGINAL STYLES
        const elements = [container, mainWrapper, sidebarBody, canvas];
        const originalStyles = elements.map(el => ({
            height: el.style.height,
            overflow: el.style.overflow,
            position: el.style.position,
            maxHeight: el.style.maxHeight
        }));

        try {
            // 2. EXPAND EVERYTHING
            elements.forEach(el => {
                el.style.height = 'auto';
                el.style.overflow = 'visible';
                el.style.maxHeight = 'none';
            });

            // Force layout recalc
            await new Promise(resolve => setTimeout(resolve, 100));

            // 3. CAPTURE
            const canvasImg = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false,
                height: container.scrollHeight,
                windowHeight: container.scrollHeight,
                x: 0,
                y: 0
            });

            const imgData = canvasImg.toDataURL('image/png');

            // 4. GENERATE PDF (Multi-page)
            const pdf = new jsPDF('l', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Adjust width to fit page, calculate scaled height
            const imgWidth = pageWidth;
            const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            // First page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Subsequent pages
            while (heightLeft > 0) {
                position -= pageHeight; // Shift image up
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Gantt_${formatLocalDate(selectedMonth)}.pdf`);

        } catch (err) {
            console.error("Error exporting PDF:", err);
            alert("Error al exportar PDF.");
        } finally {
            // 5. RESTORE STYLES
            elements.forEach((el, i) => {
                el.style.height = originalStyles[i].height;
                el.style.overflow = originalStyles[i].overflow;
                el.style.position = originalStyles[i].position;
                el.style.maxHeight = originalStyles[i].maxHeight;
            });
        }
    };

    // --- VISUAL EXCEL EXPORT (HTML TABLE) ---
    const exportToExcel = () => {
        // 1. Build HTML Table
        let table = `<table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif;">`;

        // --- HEADER ---
        table += `<thead style="background-color: #f3f4f6; font-weight: bold;">`;

        // Row 1: Month Name spanning timeline
        table += `<tr>`;
        table += `<td colspan="5" style="background-color: white; border: none;"></td>`; // Spacer for fixed cols
        const monthName = selectedMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        table += `<th colspan="${columns.length}" style="background-color: #e5e7eb; padding: 5px; text-align: center; border: 1px solid #ccc;">${monthName}</th>`;
        table += `</tr>`;

        // Row 2: Column Headers
        table += `<tr>`;
        table += `<th style="width: 200px; padding: 5px; background-color: #f3f4f6;">Proyecto</th>`;
        table += `<th style="width: 300px; padding: 5px; background-color: #f3f4f6;">Tarea</th>`;
        table += `<th style="width: 100px; padding: 5px; background-color: #f3f4f6;">Inicio</th>`;
        table += `<th style="width: 100px; padding: 5px; background-color: #f3f4f6;">Fin</th>`;
        table += `<th style="width: 80px; padding: 5px; background-color: #f3f4f6;">Estado</th>`;

        columns.forEach(col => {
            const label = viewScale === 'day' ? `${col.label} ${col.subLabel}` : col.label;
            const bg = col.isWeekend ? '#f9fafb' : '#ffffff';
            // Explicit width for clarity. week needs more
            const width = viewScale === 'week' ? '100px' : '30px';
            table += `<th style="width: ${width}; padding: 2px; text-align: center; background-color: ${bg}; font-size: 10px; border: 1px solid #ccc;">${label}</th>`;
        });
        table += `</tr></thead>`;

        // Body
        table += `<tbody>`;

        Object.entries(groupedTasks).forEach(([projectTitle, projectTasks]) => {
            // Project Header Row
            const totalCols = 5 + columns.length;
            table += `<tr style="background-color: #e5e7eb; font-weight: bold;"><td colspan="${totalCols}" style="padding: 5px; border: 1px solid #ccc;">${projectTitle}</td></tr>`;

            projectTasks.forEach(task => {
                table += `<tr>`;
                table += `<td style="border: 1px solid #eee;">${projectTitle}</td>`;
                table += `<td style="border: 1px solid #eee;">${task.descripcion}</td>`;
                table += `<td style="border: 1px solid #eee;">${formatLocalDate(task._start)}</td>`;
                table += `<td style="border: 1px solid #eee;">${formatLocalDate(task._end)}</td>`;
                table += `<td style="border: 1px solid #eee;">${task.completada ? 'Completada' : 'Pendiente'}</td>`;

                // Timeline Cells
                columns.forEach(col => {
                    // Check intersection
                    let isActive = false;
                    let isWeekend = col.isWeekend;

                    if (viewScale === 'day') {
                        const colDate = col.date.getTime(); // Noon
                        const start = task._start.getTime();
                        const end = task._end.getTime();
                        if (colDate >= start && colDate <= end) isActive = true;
                    } else {
                        // Week overlap
                        const wStart = col.date.getTime();
                        const wEnd = new Date(col.date);
                        wEnd.setDate(wEnd.getDate() + 6);
                        wEnd.setHours(12, 0, 0, 0);
                        const wEndTime = wEnd.getTime();

                        const tStart = task._start.getTime();
                        const tEnd = task._end.getTime();

                        if (Math.max(wStart, tStart) <= Math.min(wEndTime, tEnd)) isActive = true;
                    }

                    const cellBg = isActive
                        ? (task.completada ? '#10b981' : '#3b82f6')
                        : (isWeekend && viewScale === 'day' ? '#f9fafb' : '#ffffff');

                    const cellColor = isActive ? '#ffffff' : '#000000';

                    table += `<td style="background-color: ${cellBg}; color: ${cellColor}; text-align: center;">${isActive ? '' : ''}</td>`;
                });
                table += `</tr>`;
            });
        });

        table += `</tbody></table>`;

        // 2. Create Blob and Download
        const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Gantt_Visual_${formatLocalDate(selectedMonth)}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    // --- DRAG CON VISUAL FEEDBACK (REAL-TIME) ---
    const [dragState, setDragState] = useState(null);

    const onMouseDown = (e, task, type) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({
            type, // 'move', 'resizeL', 'resizeR'
            taskId: task.id,
            startX: e.clientX,
            currentX: e.clientX,
            originalStart: task._start,
            originalEnd: task._end
        });
    };

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragState) return;
            setDragState(prev => ({ ...prev, currentX: e.clientX }));
            document.body.style.cursor = dragState.type === 'move' ? 'grabbing' : 'col-resize';
        };

        const onMouseUp = (e) => {
            if (!dragState) return;
            document.body.style.cursor = 'default';

            const pixelDelta = e.clientX - dragState.startX;

            let dayDelta = 0;
            if (viewScale === 'day') {
                dayDelta = Math.round(pixelDelta / columnWidth);
            } else {
                dayDelta = Math.round((pixelDelta / columnWidth) * 7);
            }

            if (dayDelta !== 0) {
                const { originalStart, originalEnd, taskId, type } = dragState;
                const newS = new Date(originalStart);
                const newE = new Date(originalEnd);

                if (type === 'move') { newS.setDate(newS.getDate() + dayDelta); newE.setDate(newE.getDate() + dayDelta); }
                else if (type === 'resizeL') { newS.setDate(newS.getDate() + dayDelta); }
                else if (type === 'resizeR') { newE.setDate(newE.getDate() + dayDelta); }

                if (newS <= newE && onTaskUpdate) {
                    const originalTask = tasks.find(t => t.id === taskId);
                    if (originalTask) {
                        onTaskUpdate(originalTask.id, {
                            descripcion: originalTask.descripcion,
                            start_date: formatLocalDate(newS),
                            fecha_objetivo: formatLocalDate(newE)
                        });
                    }
                }
            }
            setDragState(null);
        };

        if (dragState) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragState, tasks, onTaskUpdate, viewScale, columnWidth]);

    return (
        <div style={styles.container} ref={containerRef}>
            <div style={styles.mainWrapper} ref={mainWrapperRef}>
                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button onClick={handlePrevMonth} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px' }}><ChevronLeft size={16} /></button>
                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{selectedMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                                <button onClick={handleNextMonth} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px' }}><ChevronRight size={16} /></button>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => setViewScale('day')} style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: viewScale === 'day' ? '#3b82f6' : 'white', color: viewScale === 'day' ? 'white' : '#333', cursor: 'pointer' }}>Día</button>
                                <button onClick={() => setViewScale('week')} style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: viewScale === 'week' ? '#3b82f6' : 'white', color: viewScale === 'week' ? 'white' : '#333', cursor: 'pointer' }}>Semana</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <select
                                value={groupingMode}
                                onChange={(e) => setGroupingMode(e.target.value)}
                                style={{ padding: '2px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '11px', flex: 1, marginRight: '5px' }}
                            >
                                <option value="project">Por Proyecto</option>
                                <option value="week">Por Semana</option>
                            </select>

                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={exportToPDF} title="PDF" style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}><FileIcon size={14} color="#e11d48" /></button>
                                <button onClick={exportToExcel} title="Excel" style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}><FileSpreadsheet size={14} color="#10b981" /></button>
                            </div>
                        </div>
                    </div>
                    <div style={styles.sidebarBody} ref={sidebarRef}>
                        {Object.entries(groupedTasks).map(([projectTitle, projectTasks]) => (
                            <div key={projectTitle}>
                                <div style={styles.groupHeader} title={projectTitle}>{projectTitle}</div>
                                {projectTasks.map(t => (
                                    <div key={t.id} style={styles.taskItem} title={t.descripcion}>
                                        <span style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {t.descripcion}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.canvas} onScroll={handleScroll} ref={canvasRef}>
                    <div style={{ ...styles.headerContainer, width: `${totalWidth}px` }}>
                        {/* SPACER FOR ALIGNMENT */}
                        <div style={{ height: '40px', borderBottom: '1px solid #eee', background: '#fafafa' }}></div>

                        <div style={styles.row}> {months.map((m, i) => <div key={i} style={{ ...styles.cellHeader, width: `${m.width}px` }}>{m.name}</div>)} </div>
                        <div style={styles.row}>
                            {columns.map((col, i) => (
                                <div key={i} style={{
                                    ...styles.cellDay,
                                    width: `${columnWidth}px`,
                                    backgroundColor: col.bg,
                                    color: col.color,
                                    fontWeight: col.weight,
                                    borderLeft: col.borderLeft
                                }}>
                                    <span>{col.label}</span>
                                    <span style={{ fontSize: '9px' }}>{col.subLabel}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ ...styles.bodyContainer, width: `${totalWidth}px` }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                            {columns.map((col, i) => (
                                <div key={i} style={{
                                    ...styles.gridCell,
                                    width: `${columnWidth}px`,
                                    backgroundColor: col.bg === '#e3f2fd' ? 'rgba(239, 83, 80, 0.05)' : (col.isHoliday ? '#ffebee' : (col.isWeekend && viewScale === 'day' ? '#f9f9f9' : 'transparent')),
                                    borderLeft: col.borderLeft,
                                    zIndex: col.isToday ? 5 : 0
                                }} />
                            ))}
                        </div>
                        {Object.entries(groupedTasks).map(([projectTitle, projectTasks]) => (
                            <div key={projectTitle}>
                                <div style={{ ...styles.groupHeader, width: '100%', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e0e0e0', position: 'relative', zIndex: 10 }}>
                                </div>
                                {projectTasks.map(task => {
                                    const isDragging = dragState?.taskId === task.id;
                                    let left = getPos(task._start);
                                    let width = getPos(task._end) - left + (viewScale === 'day' ? columnWidth : columnWidth / 7);

                                    // Check if task interacts with view but isn't visible? 
                                    // With limited view, left could be negative.
                                    // CSS overflow hidden handles visual, but maybe optimization:
                                    // if (left + width < 0 || left > totalWidth) return null;

                                    if (isDragging && dragState?.currentX) {
                                        const pixelDelta = dragState.currentX - dragState.startX;
                                        if (dragState.type === 'move') { left += pixelDelta; }
                                        else if (dragState.type === 'resizeL') { left += pixelDelta; width -= pixelDelta; }
                                        else if (dragState.type === 'resizeR') { width += pixelDelta; }
                                    }

                                    if (width <= 0) return <div key={task.id} style={styles.gridRow} />;

                                    return (
                                        <div key={task.id} style={{ ...styles.gridRow, zIndex: 10 }}>
                                            <div
                                                onMouseDown={(e) => onMouseDown(e, task, 'move')}
                                                style={{
                                                    ...styles.bar,
                                                    left: `${left}px`,
                                                    width: `${Math.max(width, 10)}px`,
                                                    backgroundColor: task.completada ? '#10b981' : '#3b82f6',
                                                    cursor: isDragging ? 'grabbing' : 'grab',
                                                    zIndex: isDragging ? 100 : 10,
                                                    boxShadow: isDragging ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.2)',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <div style={styles.resizeL} onMouseDown={(e) => onMouseDown(e, task, 'resizeL')} />
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none', paddingLeft: '5px' }}>{task.descripcion}</span>
                                                <div style={styles.resizeR} onMouseDown={(e) => onMouseDown(e, task, 'resizeR')} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default GanttChart;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, FileIcon, Archive } from 'lucide-react';
import SelectArchivedModal from './SelectArchivedModal';

// --- ESTILOS OPTIMIZADOS (BALANCED SIZE) ---
// --- ESTILOS OPTIMIZADOS (DYNAMIC) ---
const getStyles = (isMobile, isSidebarCollapsed) => ({
    container: { display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--border-color)', fontFamily: 'sans-serif', backgroundColor: 'var(--card-bg)', overflow: 'hidden' },
    mainWrapper: { display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' },
    // CONTROL BAR
    controlBar: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '10px',
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 'auto'
    },
    sidebar: {
        width: isSidebarCollapsed ? (isMobile ? '100px' : '40px') : (isMobile ? '280px' : '350px'), // 100px on mobile collapsed to show some text
        minWidth: isSidebarCollapsed ? (isMobile ? '100px' : '40px') : (isMobile ? '280px' : '350px'),
        display: 'flex', flexDirection: 'column',
        borderRight: '2px solid var(--border-color)',
        zIndex: isMobile && !isSidebarCollapsed ? 50 : 20,
        backgroundColor: 'var(--card-bg)',
        transition: 'width 0.3s ease, transform 0.3s ease',
        position: isMobile && !isSidebarCollapsed ? 'absolute' : 'relative',
        height: isMobile && !isSidebarCollapsed ? '100%' : 'auto',
        boxShadow: isMobile && !isSidebarCollapsed ? '2px 0 10px rgba(0,0,0,0.5)' : 'none',
        left: 0, top: 0
    },
    backdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40,
        display: isMobile && !isSidebarCollapsed ? 'block' : 'none'
    },
    // HEADER
    sidebarHeader: {
        height: '100px',
        minHeight: '100px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'row', // Align toggle and title horizontally
        alignItems: 'center',
        padding: '10px',
        backgroundColor: 'var(--header-bg)',
        gap: '10px',
        overflow: 'hidden'
    },
    sidebarBody: {
        flex: 1,
        overflow: 'auto', // Always allow independent scroll if needed, sync handles the rest
        overflowX: 'hidden'
    },
    canvas: { flex: 1, overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' },
    // HEADER ROW
    headerContainer: { height: '100px', minHeight: '100px', position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border-color)', overflow: 'hidden' },
    row: { display: 'flex', height: '30px', boxSizing: 'border-box' },
    cellHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-color)', fontSize: isMobile ? '10px' : '12px', fontWeight: '600', color: 'var(--text-main)', boxSizing: 'border-box' },
    cellDay: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-color)', fontSize: isMobile ? '9px' : '11px', height: '100%', boxSizing: 'border-box', color: 'var(--text-main)' },
    bodyContainer: { position: 'relative' },
    groupHeader: { height: '30px', backgroundColor: 'var(--header-bg)', display: 'flex', alignItems: 'center', paddingLeft: '10px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap' },
    gridRow: { display: 'flex', height: '60px', borderBottom: '1px solid var(--border-color)', position: 'relative', boxSizing: 'border-box' },
    gridCell: { borderRight: '1px solid var(--border-color)', height: '100%', boxSizing: 'border-box' },
    taskItem: {
        height: '60px',
        padding: isSidebarCollapsed ? (isMobile ? '5px' : '0') : (isMobile ? '5px' : '5px 15px'),
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isSidebarCollapsed && !isMobile ? 'center' : 'flex-start',
        whiteSpace: isMobile || isSidebarCollapsed ? 'normal' : 'normal', // Allow wrap on mobile even if collapsed? No, space is tight.
        lineHeight: '1.2',
        overflow: 'hidden',
        fontSize: isMobile ? '10px' : '12px',
        color: 'var(--text-main)'
    },
    bar: { position: 'absolute', height: '34px', backgroundColor: '#3b82f6', borderRadius: '4px', top: '13px', display: 'flex', alignItems: 'center', padding: '0 8px', color: 'white', fontSize: isMobile ? '9px' : '11px', cursor: 'grab', zIndex: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', userSelect: 'none' },
    resizeL: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '15px', cursor: 'w-resize', zIndex: 20 },
    resizeR: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '15px', cursor: 'e-resize', zIndex: 20 }
});

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
    const [selectedArchivedIds, setSelectedArchivedIds] = useState(new Set());
    const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);

    // Responsive Logic
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setIsSidebarCollapsed(false); // Auto-expand on desktop
            else setIsSidebarCollapsed(true); // Auto-collapse on mobile initially? Maybe not. Let's start expanded but smaller.
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Widths
    const columnWidth = isMobile ? (viewScale === 'day' ? 30 : 150) : (viewScale === 'day' ? 50 : 250);
    const styles = useMemo(() => getStyles(isMobile, isSidebarCollapsed), [isMobile, isSidebarCollapsed]);

    const canvasRef = useRef(null);
    const sidebarRef = useRef(null);
    const containerRef = useRef(null);
    const mainWrapperRef = useRef(null);
    const isSyncingRef = useRef(false); // Flag to prevent scroll loop

    // 1. DATA NORMALIZER
    const { groupedTasks, flatTasks } = useMemo(() => {
        if (!Array.isArray(tasks)) return { normalizedTasks: [], groupedTasks: {}, flatTasks: [] };
        const validTasks = tasks
            .filter(t => !t.is_archived || selectedArchivedIds.has(t.id)) // Mostrar solo archivadas seleccionadas
            .map(t => ({
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
    }, [tasks, groupingMode, selectedArchivedIds]);

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
                    bg: isToday ? '#e3f2fd' : (holiday ? '#ffebee' : (weekend ? 'var(--header-bg)' : 'transparent')),
                    color: isToday ? '#1976d2' : (holiday ? '#d32f2f' : (weekend ? 'var(--text-secondary)' : 'var(--text-main)')),
                    weight: isToday || holiday ? 'bold' : 'normal',
                    borderLeft: isToday ? '2px solid #ef5350' : '1px solid var(--border-color)'
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
                    bg: isCurrentWeek ? '#e3f2fd' : 'transparent',
                    color: isCurrentWeek ? '#1976d2' : 'var(--text-main)',
                    weight: isCurrentWeek ? 'bold' : 'normal',
                    borderLeft: '1px solid var(--border-color)'
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

    const handleScroll = (e) => {
        if (!sidebarRef.current) return;
        if (isSyncingRef.current) {
            isSyncingRef.current = false;
            return;
        }
        isSyncingRef.current = true;
        sidebarRef.current.scrollTop = e.target.scrollTop;
    };

    const handleSidebarScroll = (e) => {
        if (!canvasRef.current) return;
        if (isSyncingRef.current) {
            isSyncingRef.current = false;
            return;
        }
        isSyncingRef.current = true;
        canvasRef.current.scrollTop = e.target.scrollTop;
    };

    // --- NAVIGATION ---
    const handlePrevMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // --- EXPORT PDF (COMPLETO) ---
    const exportToPDF = async () => {
        try {
            // Calcular Rango Completo de Fechas
            let minDate = new Date();
            let maxDate = new Date();

            if (flatTasks.length > 0) {
                minDate = new Date(Math.min(...flatTasks.map(t => t._start.getTime())));
                maxDate = new Date(Math.max(...flatTasks.map(t => t._end.getTime())));
            } else {
                minDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                maxDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
            }

            // Buffer visual (2 días)
            minDate.setDate(minDate.getDate() - 3);
            maxDate.setDate(maxDate.getDate() + 3);
            minDate.setHours(12, 0, 0, 0);
            maxDate.setHours(12, 0, 0, 0);

            const exportCols = [];
            let currentDay = new Date(minDate);
            while (currentDay <= maxDate) {
                exportCols.push({
                    date: new Date(currentDay),
                    label: currentDay.getDate(),
                    subLabel: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][currentDay.getDay()],
                    isWeekend: currentDay.getDay() === 0 || currentDay.getDay() === 6
                });
                currentDay.setDate(currentDay.getDate() + 1);
            }

            // 1. Build HTML Table
            let tableHTML = `<table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; background-color: white; width: max-content;">`;

            // --- HEADER ---
            tableHTML += `<thead style="background-color: #f3f4f6; font-weight: bold; color: #1f2937;">`;

            // Calculate Month/Year Headers (Top row)
            const monthGroups = [];
            let currentMonthGroup = null;

            exportCols.forEach(col => {
                const mName = col.date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
                if (!currentMonthGroup || currentMonthGroup.name !== mName) {
                    if (currentMonthGroup) monthGroups.push(currentMonthGroup);
                    currentMonthGroup = { name: mName, span: 1 };
                } else {
                    currentMonthGroup.span += 1;
                }
            });
            if (currentMonthGroup) monthGroups.push(currentMonthGroup);

            // Row 1: Month Name spanning timeline
            tableHTML += `<tr>`;
            tableHTML += `<td colspan="5" style="background-color: white; border: none;"></td>`; // Spacer for fixed cols

            monthGroups.forEach(mg => {
                tableHTML += `<th colspan="${mg.span}" style="background-color: #e5e7eb; padding: 5px; text-align: center; border: 1px solid #ccc;">${mg.name}</th>`;
            });

            tableHTML += `</tr>`;

            // Row 2: Column Headers
            tableHTML += `<tr>`;
            tableHTML += `<th style="width: 200px; padding: 5px; background-color: #f3f4f6;">Proyecto</th>`;
            tableHTML += `<th style="width: 300px; padding: 5px; background-color: #f3f4f6;">Tarea</th>`;
            tableHTML += `<th style="width: 100px; padding: 5px; background-color: #f3f4f6;">Inicio</th>`;
            tableHTML += `<th style="width: 100px; padding: 5px; background-color: #f3f4f6;">Fin</th>`;
            tableHTML += `<th style="width: 80px; padding: 5px; background-color: #f3f4f6;">Estado</th>`;

            exportCols.forEach(col => {
                const label = `${col.label} ${col.subLabel}`;
                const bg = col.isWeekend ? '#f9fafb' : '#ffffff';
                const width = '30px'; // Forzamos vista diaria firme
                tableHTML += `<th style="width: ${width}; padding: 2px; text-align: center; background-color: ${bg}; font-size: 10px; border: 1px solid #ccc;">${label}</th>`;
            });
            tableHTML += `</tr></thead>`;

            // Body
            tableHTML += `<tbody style="color: #1f2937;">`;

            Object.entries(groupedTasks).forEach(([projectTitle, projectTasks]) => {
                // Project Header Row
                const totalCols = 5 + exportCols.length;
                tableHTML += `<tr style="background-color: #e5e7eb; font-weight: bold;"><td colspan="${totalCols}" style="padding: 5px; border: 1px solid #ccc;">${projectTitle}</td></tr>`;

                projectTasks.forEach(task => {
                    tableHTML += `<tr>`;
                    tableHTML += `<td style="border: 1px solid #ccc; font-size: 11px; padding: 3px;">${projectTitle}</td>`;
                    tableHTML += `<td style="border: 1px solid #ccc; font-size: 11px; padding: 3px;">${task.descripcion}</td>`;
                    tableHTML += `<td style="border: 1px solid #ccc; font-size: 11px; padding: 3px;">${formatLocalDate(task._start)}</td>`;
                    tableHTML += `<td style="border: 1px solid #ccc; font-size: 11px; padding: 3px;">${formatLocalDate(task._end)}</td>`;
                    tableHTML += `<td style="border: 1px solid #ccc; font-size: 11px; padding: 3px;">${task.completada ? 'Completada' : 'Pendiente'}</td>`;

                    // Timeline Cells
                    exportCols.forEach(col => {
                        let isActive = false;
                        let isWeekend = col.isWeekend;

                        const colDate = col.date.getTime(); // Noon
                        const start = task._start.getTime();
                        const end = task._end.getTime();
                        if (colDate >= start && colDate <= end) isActive = true;

                        const cellBg = isActive
                            ? (task.completada ? '#10b981' : '#3b82f6')
                            : (isWeekend ? '#f9fafb' : '#ffffff');

                        const cellColor = isActive ? '#ffffff' : '#1f2937';

                        tableHTML += `<td style="background-color: ${cellBg}; color: ${cellColor}; text-align: center; border: 1px solid #ddd;">${isActive ? '' : ''}</td>`;
                    });
                    tableHTML += `</tr>`;
                });
            });

            tableHTML += `</tbody></table>`;

            // Creamos un DIV temporal oculto en el DOM para dibujarlo
            const printDiv = document.createElement('div');
            printDiv.innerHTML = tableHTML;
            printDiv.style.position = 'absolute';
            printDiv.style.left = '-9999px';
            printDiv.style.top = '0';
            printDiv.style.backgroundColor = 'white'; // Fondo para canvas
            document.body.appendChild(printDiv);

            // Damos tiempo a renderizar
            await new Promise(resolve => setTimeout(resolve, 300));

            // CAPTURE
            const canvasImg = await html2canvas(printDiv.firstChild, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // LIMPIAMOS
            document.body.removeChild(printDiv);

            const imgData = canvasImg.toDataURL('image/png');

            // 4. GENERATE PDF (Multi-page Bidimensional)
            // Calculamos el tamaño exacto del render en mm. Usando un factor de escala de 0.20 mm por pixel
            const mmScale = 0.20;
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const margin = 5;
            const usableWidth = pageWidth - (margin * 2);
            const usableHeight = pageHeight - (margin * 2);

            const imgProps = pdf.getImageProperties(imgData);
            const totalImgWidthMm = imgProps.width * mmScale;
            const totalImgHeightMm = imgProps.height * mmScale;

            // Cuántas páginas se necesitan horizontal y verticalmente
            const pagesX = Math.ceil(totalImgWidthMm / usableWidth);
            const pagesY = Math.ceil(totalImgHeightMm / usableHeight);

            let isFirstPage = true;

            for (let y = 0; y < pagesY; y++) {
                for (let x = 0; x < pagesX; x++) {
                    if (!isFirstPage) {
                        pdf.addPage();
                    }
                    isFirstPage = false;

                    // Calculamos los offsets de recorte negativos para encajar la porción correspondiente
                    const sourceX = -(x * usableWidth) + margin;
                    const sourceY = -(y * usableHeight) + margin;

                    // Dibujamos la imagen completa desplazada
                    // pdf.addImage(imageData, format, x, y, width, height)
                    pdf.addImage({
                        imageData: imgData,
                        format: 'PNG',
                        x: sourceX,
                        y: sourceY,
                        width: totalImgWidthMm,
                        height: totalImgHeightMm
                    });
                }
            }

            pdf.save(`Gantt_Completo_${formatLocalDate(new Date())}.pdf`);

        } catch (err) {
            console.error("Error exporting PDF:", err);
            alert("Error al exportar PDF.");
        }
    };

    // --- VISUAL EXCEL EXPORT (HTML TABLE) ---
    const exportToExcel = () => {
        // Calcular Rango Completo de Fechas
        let minDate = new Date();
        let maxDate = new Date();

        if (flatTasks.length > 0) {
            minDate = new Date(Math.min(...flatTasks.map(t => t._start.getTime())));
            maxDate = new Date(Math.max(...flatTasks.map(t => t._end.getTime())));
        } else {
            minDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
            maxDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
        }

        // Buffer visual (2 días)
        minDate.setDate(minDate.getDate() - 3);
        maxDate.setDate(maxDate.getDate() + 3);
        minDate.setHours(12, 0, 0, 0);
        maxDate.setHours(12, 0, 0, 0);

        const exportCols = [];
        let currentDay = new Date(minDate);
        while (currentDay <= maxDate) {
            exportCols.push({
                date: new Date(currentDay),
                label: currentDay.getDate(),
                subLabel: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][currentDay.getDay()],
                isWeekend: currentDay.getDay() === 0 || currentDay.getDay() === 6
            });
            currentDay.setDate(currentDay.getDate() + 1);
        }

        // 1. Build HTML Table
        let table = `<table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif;">`;

        // --- HEADER ---
        table += `<thead style="background-color: #f3f4f6; font-weight: bold;">`;

        // Calculate Month/Year Headers (Top row)
        const monthGroups = [];
        let currentMonthGroup = null;

        exportCols.forEach(col => {
            const mName = col.date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
            if (!currentMonthGroup || currentMonthGroup.name !== mName) {
                if (currentMonthGroup) monthGroups.push(currentMonthGroup);
                currentMonthGroup = { name: mName, span: 1 };
            } else {
                currentMonthGroup.span += 1;
            }
        });
        if (currentMonthGroup) monthGroups.push(currentMonthGroup);

        // Row 1: Month Name spanning timeline
        table += `<tr>`;
        table += `<td colspan="5" style="background-color: white; border: none;"></td>`; // Spacer for fixed cols

        monthGroups.forEach(mg => {
            table += `<th colspan="${mg.span}" style="background-color: #e5e7eb; padding: 5px; text-align: center; border: 1px solid #ccc;">${mg.name}</th>`;
        });

        table += `</tr>`;

        // Row 2: Column Headers
        table += `<tr>`;
        table += `<th style="width: 200px; padding: 5px; background-color: #f3f4f6;">Proyecto</th>`;
        table += `<th style="width: 300px; padding: 5px; background-color: #f3f4f6;">Tarea</th>`;
        table += `<th style="width: 100px; padding: 5px; background-color: #f3f4f6;">Inicio</th>`;
        table += `<th style="width: 100px; padding: 5px; background-color: #f3f4f6;">Fin</th>`;
        table += `<th style="width: 80px; padding: 5px; background-color: #f3f4f6;">Estado</th>`;

        exportCols.forEach(col => {
            const label = `${col.label} ${col.subLabel}`;
            const bg = col.isWeekend ? '#f9fafb' : '#ffffff';
            const width = '30px'; // Forzamos vista diaria para Excel completo
            table += `<th style="width: ${width}; padding: 2px; text-align: center; background-color: ${bg}; font-size: 10px; border: 1px solid #ccc;">${label}</th>`;
        });
        table += `</tr></thead>`;

        // Body
        table += `<tbody>`;

        Object.entries(groupedTasks).forEach(([projectTitle, projectTasks]) => {
            // Project Header Row
            const totalCols = 5 + exportCols.length;
            table += `<tr style="background-color: #e5e7eb; font-weight: bold;"><td colspan="${totalCols}" style="padding: 5px; border: 1px solid #ccc;">${projectTitle}</td></tr>`;

            projectTasks.forEach(task => {
                table += `<tr>`;
                table += `<td style="border: 1px solid #eee;">${projectTitle}</td>`;
                table += `<td style="border: 1px solid #eee;">${task.descripcion}</td>`;
                table += `<td style="border: 1px solid #eee;">${formatLocalDate(task._start)}</td>`;
                table += `<td style="border: 1px solid #eee;">${formatLocalDate(task._end)}</td>`;
                table += `<td style="border: 1px solid #eee;">${task.completada ? 'Completada' : 'Pendiente'}</td>`;

                // Timeline Cells
                exportCols.forEach(col => {
                    // Check intersection
                    let isActive = false;
                    let isWeekend = col.isWeekend;

                    const colDate = col.date.getTime(); // Noon
                    const start = task._start.getTime();
                    const end = task._end.getTime();
                    if (colDate >= start && colDate <= end) isActive = true;

                    const cellBg = isActive
                        ? (task.completada ? '#10b981' : '#3b82f6')
                        : (isWeekend ? '#f9fafb' : '#ffffff');

                    const cellColor = isActive ? '#ffffff' : 'var(--text-main)';

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
        a.download = `Gantt_Completo_${formatLocalDate(new Date())}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    // --- DRAG CON VISUAL FEEDBACK (REAL-TIME) ---
    const [dragState, setDragState] = useState(null);

    const onStartDrag = (e, task, type) => {
        // Handle both Mouse and Touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        // Prevent default only if it's not a scroll interaction (simplification: always prevent for drag handles)
        // e.preventDefault(); // Might block scrolling on touch if not careful, but for drag handle it's ok.
        e.stopPropagation();

        setDragState({
            type, // 'move', 'resizeL', 'resizeR'
            taskId: task.id,
            startX: clientX,
            currentX: clientX,
            originalStart: task._start,
            originalEnd: task._end
        });
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!dragState) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            setDragState(prev => ({ ...prev, currentX: clientX }));
            document.body.style.cursor = dragState.type === 'move' ? 'grabbing' : 'col-resize';
        };

        const onEnd = (e) => {
            if (!dragState) return;
            document.body.style.cursor = 'default';

            // For touch end, clientX might be missing in 'e', use last known currentX from state?
            // Actually 'currentX' in state is updated on move.
            const pixelDelta = dragState.currentX - dragState.startX;

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
                        }, {
                            start_date: formatLocalDate(originalStart),
                            fecha_objetivo: formatLocalDate(originalEnd),
                            descripcion: originalTask.descripcion
                        });
                    }
                }
            }
            setDragState(null);
        };

        if (dragState) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove);
            window.addEventListener('touchend', onEnd);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [dragState, tasks, onTaskUpdate, viewScale, columnWidth]);

    const archivedTasks = useMemo(() => tasks.filter(t => t.is_archived), [tasks]);

    return (
        <div style={styles.container} ref={containerRef}>
            <SelectArchivedModal
                isOpen={isArchivedModalOpen}
                onClose={() => setIsArchivedModalOpen(false)}
                archivedTasks={archivedTasks}
                selectedIds={selectedArchivedIds}
                onSelectionChange={setSelectedArchivedIds}
            />
            <div style={styles.controlBar}>
                {/* Navigation & Month */}
                {/* Navigation & Month */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button onClick={handlePrevMonth} aria-label="Mes Anterior" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: 'var(--text-main)' }}><ChevronLeft size={20} /></button>
                    <span style={{ fontWeight: 'bold', fontSize: isMobile ? '14px' : '16px', color: 'var(--text-main)' }} id="month-label">{selectedMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                    <button onClick={handleNextMonth} aria-label="Mes Siguiente" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: 'var(--text-main)' }}><ChevronRight size={20} /></button>
                </div>

                {/* View Scale & Grouping */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '5px' }} role="group" aria-label="Escala de vista">
                        <button onClick={() => setViewScale('day')} aria-pressed={viewScale === 'day'} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: viewScale === 'day' ? '#3b82f6' : 'var(--card-bg)', color: viewScale === 'day' ? 'white' : 'var(--text-main)', cursor: 'pointer' }}>Día</button>
                        <button onClick={() => setViewScale('week')} aria-pressed={viewScale === 'week'} style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: viewScale === 'week' ? '#3b82f6' : 'var(--card-bg)', color: viewScale === 'week' ? 'white' : 'var(--text-main)', cursor: 'pointer' }}>Semana</button>
                    </div>

                    <select
                        value={groupingMode}
                        onChange={(e) => setGroupingMode(e.target.value)}
                        aria-label="Agrupar por"
                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '12px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)' }}
                    >
                        <option value="project">Por Proyecto</option>
                        <option value="week">Por Semana</option>
                    </select>

                    <button
                        onClick={() => setIsArchivedModalOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', fontSize: '12px', borderRadius: '4px',
                            border: `1px solid ${selectedArchivedIds.size > 0 ? '#f59e0b' : 'var(--border-color)'}`,
                            backgroundColor: selectedArchivedIds.size > 0 ? '#fef3c7' : 'var(--card-bg)',
                            color: selectedArchivedIds.size > 0 ? '#92400e' : 'var(--text-main)',
                            cursor: 'pointer', fontWeight: selectedArchivedIds.size > 0 ? 'bold' : 'normal'
                        }}
                        title="Seleccionar tareas archivadas a mostrar"
                    >
                        <Archive size={14} />
                        {selectedArchivedIds.size > 0 ? `Archivadas (${selectedArchivedIds.size})` : 'Seleccionar Archivadas'}
                    </button>
                </div>

                {/* Export Tools */}
                <div style={{ display: 'flex', gap: '5px' }}>
                    {/* Export Tools */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={exportToPDF} aria-label="Exportar a PDF" title="PDF" style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer' }}><FileIcon size={18} color="#e11d48" /></button>
                        <button onClick={exportToExcel} aria-label="Exportar a Excel" title="Excel" style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer' }}><FileSpreadsheet size={18} color="#10b981" /></button>
                    </div>
                </div>
            </div>

            <div style={styles.mainWrapper} ref={mainWrapperRef}>
                {/* BACKDROP */}
                <div style={styles.backdrop} onClick={() => setIsSidebarCollapsed(true)} />

                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        {/* Sidebar Toggle & Title only */}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
                            aria-expanded={!isSidebarCollapsed}
                            style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: '12px', cursor: 'pointer', marginRight: '5px', color: 'var(--text-main)' }}
                        >
                            {isSidebarCollapsed ? '>>' : '<<'}
                        </button>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', display: isSidebarCollapsed && isMobile ? 'none' : 'block' }}>
                            Tareas
                        </span>
                    </div>
                    <div style={styles.sidebarBody} ref={sidebarRef} onScroll={handleSidebarScroll}>
                        {Object.entries(groupedTasks).map(([projectTitle, projectTasks]) => (
                            <div key={projectTitle}>
                                <div style={styles.groupHeader} title={projectTitle}>
                                    {isSidebarCollapsed ? projectTitle.charAt(0) : projectTitle}
                                </div>
                                {projectTasks.map(t => (
                                    <div key={t.id} style={styles.taskItem} title={t.descripcion} tabIndex="0" role="listitem">
                                        <span style={{
                                            display: isSidebarCollapsed && !isMobile ? 'none' : '-webkit-box',
                                            WebkitLineClamp: isMobile ? 3 : 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            width: '100%'
                                        }}>
                                            {t.descripcion}
                                        </span>
                                        {isSidebarCollapsed && !isMobile && <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>#</span>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.canvas} onScroll={handleScroll} ref={canvasRef}>
                    <div style={{ ...styles.headerContainer, width: `${totalWidth}px` }}>
                        {/* SPACER FOR ALIGNMENT */}
                        <div style={{ height: '40px', borderBottom: '1px solid var(--border-color)', background: 'var(--header-bg)' }}></div>

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
                                    backgroundColor: col.bg === '#e3f2fd' ? 'rgba(239, 83, 80, 0.05)' : (col.isHoliday ? '#ffebee' : (col.isWeekend && viewScale === 'day' ? 'var(--header-bg)' : 'transparent')),
                                    borderLeft: col.borderLeft,
                                    zIndex: col.isToday ? 5 : 0
                                }} />
                            ))}
                        </div>
                        {Object.entries(groupedTasks).map(([projectTitle, projectTasks]) => (
                            <div key={projectTitle}>
                                <div style={{ ...styles.groupHeader, width: '100%', backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 10 }}>
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
                                                onMouseDown={(e) => onStartDrag(e, task, 'move')}
                                                onTouchStart={(e) => onStartDrag(e, task, 'move')}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'ArrowLeft') {
                                                        const newS = new Date(task._start);
                                                        const newE = new Date(task._end);
                                                        const delta = viewScale === 'day' ? 1 : 7;
                                                        newS.setDate(newS.getDate() - delta);
                                                        newE.setDate(newE.getDate() - delta);
                                                        if (onTaskUpdate) {
                                                            onTaskUpdate(task.id, {
                                                                descripcion: task.descripcion,
                                                                start_date: formatLocalDate(newS),
                                                                fecha_objetivo: formatLocalDate(newE)
                                                            }, {
                                                                start_date: formatLocalDate(task._start),
                                                                fecha_objetivo: formatLocalDate(task._end),
                                                                descripcion: task.descripcion
                                                            });
                                                        }
                                                    } else if (e.key === 'ArrowRight') {
                                                        const newS = new Date(task._start);
                                                        const newE = new Date(task._end);
                                                        const delta = viewScale === 'day' ? 1 : 7;
                                                        newS.setDate(newS.getDate() + delta);
                                                        newE.setDate(newE.getDate() + delta);
                                                        if (onTaskUpdate) {
                                                            onTaskUpdate(task.id, {
                                                                descripcion: task.descripcion,
                                                                start_date: formatLocalDate(newS),
                                                                fecha_objetivo: formatLocalDate(newE)
                                                            }, {
                                                                start_date: formatLocalDate(task._start),
                                                                fecha_objetivo: formatLocalDate(task._end),
                                                                descripcion: task.descripcion
                                                            });
                                                        }
                                                    }
                                                }}
                                                tabIndex="0"
                                                role="button"
                                                aria-label={`Tarea: ${task.descripcion}. Inicio: ${formatLocalDate(task._start)}. Fin: ${formatLocalDate(task._end)}`}
                                                style={{
                                                    ...styles.bar,
                                                    left: `${left}px`,
                                                    width: `${Math.max(width, 10)}px`,
                                                    backgroundColor: task.completada ? '#10b981' : '#3b82f6',
                                                    cursor: isDragging ? 'grabbing' : 'grab',
                                                    zIndex: isDragging ? 100 : 10,
                                                    boxShadow: isDragging ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.2)',
                                                    userSelect: 'none',
                                                    touchAction: 'none' // Prevent scrolling while dragging
                                                }}
                                            >
                                                <div style={styles.resizeL}
                                                    onMouseDown={(e) => onStartDrag(e, task, 'resizeL')}
                                                    onTouchStart={(e) => onStartDrag(e, task, 'resizeL')}
                                                />
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none', paddingLeft: '5px' }}>{task.descripcion}</span>
                                                <div style={styles.resizeR}
                                                    onMouseDown={(e) => onStartDrag(e, task, 'resizeR')}
                                                    onTouchStart={(e) => onStartDrag(e, task, 'resizeR')}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div >
        </div >
    );
};
export default GanttChart;

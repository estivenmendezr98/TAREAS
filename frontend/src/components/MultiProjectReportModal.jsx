import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, FileText, Square, ChevronDown, ChevronRight, Download, CheckCircle, Clock, Archive, Send } from 'lucide-react';
import { generateDocx } from '../exportUtils';
import { useToast } from '../context/ToastContext';

const MultiProjectReportModal = ({ isOpen, onClose, projects }) => {
    // Ordered array of { taskId, projectId } — order = selection order
    const [taskSelectionOrder, setTaskSelectionOrder] = useState([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());   // fast lookup
    const [selectedProjectIds, setSelectedProjectIds] = useState(new Set());
    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [reportTitle, setReportTitle] = useState('Informe Global de Proyectos');
    const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
    const { addToast } = useToast();

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setTaskSelectionOrder([]);
            setSelectedTaskIds(new Set());
            setSelectedProjectIds(new Set());
            setExpandedProjects(new Set());
            setReportTitle('Informe Global de Proyectos');
            setShowOnlyCompleted(false);
        }
    }, [isOpen]);

    /* ── toggle a single task ── */
    const handleToggleTask = (taskId, projectId) => {
        setTaskSelectionOrder(prev => {
            const exists = prev.some(o => o.taskId === taskId);
            return exists
                ? prev.filter(o => o.taskId !== taskId)   // deselect → removes from order
                : [...prev, { taskId, projectId }];        // select → appended at end
        });

        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            next.has(taskId) ? next.delete(taskId) : next.add(taskId);
            return next;
        });

        // Keep project selection state in sync
        setSelectedProjectIds(prev => {
            const project = projects.find(p => p.id === projectId);
            const projectTaskIds = new Set(project.tasks.filter(t => !t.deleted_at && (!showOnlyCompleted || t.completada)).map(t => t.id));
            // After this toggle, check how many project tasks will be selected
            const afterToggle = selectedTaskIds.has(taskId)
                ? new Set([...selectedTaskIds].filter(id => id !== taskId))
                : new Set([...selectedTaskIds, taskId]);
            const anySelected = [...projectTaskIds].some(id => afterToggle.has(id));
            const next = new Set(prev);
            anySelected ? next.add(projectId) : next.delete(projectId);
            return next;
        });
    };

    /* ── toggle full project (select/deselect all its tasks) ── */
    const handleToggleProject = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        const activeTasks = project.tasks.filter(t => !t.deleted_at && (!showOnlyCompleted || t.completada));
        const isSelected = selectedProjectIds.has(projectId);

        if (isSelected) {
            // Deselect all project tasks
            const projectTaskIds = new Set(activeTasks.map(t => t.id));
            setTaskSelectionOrder(prev => prev.filter(o => !projectTaskIds.has(o.taskId)));
            setSelectedTaskIds(prev => {
                const next = new Set(prev);
                projectTaskIds.forEach(id => next.delete(id));
                return next;
            });
            setSelectedProjectIds(prev => {
                const next = new Set(prev);
                next.delete(projectId);
                return next;
            });
        } else {
            // Select all project tasks (append only those not already selected)
            const toAdd = activeTasks.filter(t => !selectedTaskIds.has(t.id));
            setTaskSelectionOrder(prev => [...prev, ...toAdd.map(t => ({ taskId: t.id, projectId }))]);
            setSelectedTaskIds(prev => {
                const next = new Set(prev);
                activeTasks.forEach(t => next.add(t.id));
                return next;
            });
            setSelectedProjectIds(prev => new Set([...prev, projectId]));
        }
    };

    const toggleExpand = (projectId) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            next.has(projectId) ? next.delete(projectId) : next.add(projectId);
            return next;
        });
    };

    /* ── generate report in SELECTION ORDER ── */
    const handleGenerate = async () => {
        if (taskSelectionOrder.length === 0) {
            addToast('Selecciona al menos una tarea', 'warning');
            return;
        }

        // Build sections grouped by project but in the order tasks were selected.
        // First appearance of a project determines project order.
        const projectOrder = [];
        const projectTasksMap = {};

        for (const { taskId, projectId } of taskSelectionOrder) {
            const project = projects.find(p => p.id === projectId);
            const task = project?.tasks.find(t => t.id === taskId);
            if (!task || task.deleted_at) continue;

            if (!projectTasksMap[projectId]) {
                projectTasksMap[projectId] = { projectTitle: project.title, tasks: [] };
                projectOrder.push(projectId);
            }
            projectTasksMap[projectId].tasks.push(task);
        }

        const sections = projectOrder.map(pid => projectTasksMap[pid]);

        if (sections.length === 0) {
            addToast('No hay tareas seleccionadas válidas', 'warning');
            return;
        }

        try {
            await generateDocx(reportTitle, sections);
            addToast('Informe generado exitosamente', 'success');
            onClose();
        } catch (error) {
            console.error('Error generating report:', error);
            addToast('Error al generar el informe', 'error');
        }
    };

    if (!isOpen) return null;

    const totalSelectedTasks = taskSelectionOrder.length;
    const totalSelectedProjects = selectedProjectIds.size;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={24} color="var(--primary-color)" />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', color: 'var(--text-main)' }}>Generar Informe Global</h2>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                Selecciona las tareas — el informe respetará el orden de selección.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close-btn"><X size={24} /></button>
                </div>

                {/* Body */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>Título del Informe</label>
                        <input
                            type="text"
                            className="task-input"
                            value={reportTitle}
                            onChange={(e) => setReportTitle(e.target.value)}
                            style={{ width: '100%' }}
                        />

                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowOnlyCompleted(!showOnlyCompleted)}>
                            <div style={{ width: 18, height: 18, borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showOnlyCompleted ? 'var(--primary-color)' : 'var(--input-bg)' }}>
                                {showOnlyCompleted && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', userSelect: 'none' }}>Solo mostrar tareas realizadas (completadas)</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {projects.map(project => {
                            const activeTasks = project.tasks.filter(t => !t.deleted_at && (!showOnlyCompleted || t.completada));
                            if (activeTasks.length === 0) return null;

                            const isExpanded = expandedProjects.has(project.id);
                            const isProjectSelected = selectedProjectIds.has(project.id);

                            return (
                                <div key={project.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>

                                    {/* Project header */}
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', padding: '10px 15px', background: 'var(--header-bg)', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}
                                        onClick={() => toggleExpand(project.id)}
                                    >
                                        <div onClick={e => { e.stopPropagation(); handleToggleProject(project.id); }} style={{ marginRight: '10px', cursor: 'pointer' }}>
                                            {isProjectSelected
                                                ? <div style={{ width: 20, height: 20, borderRadius: '4px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </div>
                                                : <Square size={20} color="var(--text-secondary)" />
                                            }
                                        </div>
                                        <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {project.title}
                                            {project.is_archived && (
                                                <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: 'var(--selection-bg)', color: 'var(--primary-color)', fontSize: '0.7rem', fontWeight: 600 }}>
                                                    <Archive size={12} style={{ marginRight: '4px' }} />
                                                    Archivado{project.updated_at ? ` el ${new Date(project.updated_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                                </span>
                                            )}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '10px' }}>{activeTasks.length} tareas</span>
                                        {isExpanded ? <ChevronDown size={18} color="var(--text-secondary)" /> : <ChevronRight size={18} color="var(--text-secondary)" />}
                                    </div>

                                    {/* Task list */}
                                    {isExpanded && (
                                        <div style={{ padding: '0.5rem 0', background: 'var(--card-bg)' }}>
                                            {activeTasks.map(task => {
                                                const orderIndex = taskSelectionOrder.findIndex(o => o.taskId === task.id);
                                                const isSelected = orderIndex !== -1;
                                                const orderNum = orderIndex + 1;

                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => handleToggleTask(task.id, project.id)}
                                                        className="task-selection-item"
                                                        style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 15px 8px 45px', cursor: 'pointer' }}
                                                    >
                                                        {/* Order badge or empty square */}
                                                        <div style={{ marginTop: '2px', marginRight: '10px', flexShrink: 0 }}>
                                                            {isSelected ? (
                                                                <div style={{
                                                                    width: 20, height: 20, borderRadius: '50%',
                                                                    background: 'var(--primary-color)', color: 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '0.7rem', fontWeight: 700
                                                                }}>
                                                                    {orderNum}
                                                                </div>
                                                            ) : (
                                                                <Square size={16} color="var(--text-secondary)" />
                                                            )}
                                                        </div>

                                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.95rem', color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)', fontWeight: isSelected ? 500 : 400 }}>
                                                                {task.descripcion}
                                                            </span>

                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                {task.is_archived && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: 'var(--selection-bg)', color: 'var(--danger-color)', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                        <Archive size={12} style={{ marginRight: '4px' }} />
                                                                        Archivada{task.updated_at ? ` el ${new Date(task.updated_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                                                    </span>
                                                                )}
                                                                {task.updated_at && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: 'var(--header-bg)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                        <Clock size={12} style={{ marginRight: '4px' }} />
                                                                        {new Date(task.updated_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                    </span>
                                                                )}
                                                                {task.completada && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: 'var(--success-bg)', color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                        <CheckCircle size={12} style={{ marginRight: '4px' }} /> Resuelta
                                                                    </span>
                                                                )}
                                                                {task.entregado && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: 'var(--success-bg)', color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                        <Send size={12} style={{ marginRight: '4px' }} /> Entregado
                                                                    </span>
                                                                )}
                                                                {(task.report_content || (task.evidence && task.evidence.length > 0)) && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: 'var(--selection-bg)', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                        <FileText size={12} style={{ marginRight: '4px' }} /> Informe
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--header-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <strong>{totalSelectedProjects}</strong> proyectos, <strong>{totalSelectedTasks}</strong> tareas seleccionadas
                        {totalSelectedTasks > 0 && (
                            <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>— en el orden indicado</span>
                        )}
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={totalSelectedTasks === 0}
                        className="create-btn"
                        style={{
                            background: totalSelectedTasks === 0 ? 'var(--border-color)' : 'var(--primary-color)',
                            color: 'white',
                            cursor: totalSelectedTasks === 0 ? 'not-allowed' : 'pointer',
                            padding: '0.75rem 1.5rem', fontSize: '1rem'
                        }}
                    >
                        <Download size={18} style={{ marginRight: '8px' }} />
                        Descargar Informe (.docx)
                    </button>
                </div>
            </div>
        </div>
    );
};

MultiProjectReportModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    projects: PropTypes.array.isRequired
};

export default MultiProjectReportModal;

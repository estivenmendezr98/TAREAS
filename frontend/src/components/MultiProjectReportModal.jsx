import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, FileText, CheckSquare, Square, ChevronDown, ChevronRight, Download, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { generateDocx } from '../exportUtils';
import { useToast } from '../context/ToastContext';

const MultiProjectReportModal = ({ isOpen, onClose, projects }) => {
    const [selectedProjectIds, setSelectedProjectIds] = useState(new Set());
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [reportTitle, setReportTitle] = useState('Informe Global de Proyectos');
    const { addToast } = useToast();

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedProjectIds(new Set());
            setSelectedTaskIds(new Set());
            setExpandedProjects(new Set());
            setReportTitle('Informe Global de Proyectos');
        }
    }, [isOpen]);

    const handleToggleProject = (projectId) => {
        const newSelectedProjects = new Set(selectedProjectIds);
        const newSelectedTasks = new Set(selectedTaskIds);
        const project = projects.find(p => p.id === projectId);

        if (newSelectedProjects.has(projectId)) {
            newSelectedProjects.delete(projectId);
            // Deselect all tasks of this project
            project.tasks.forEach(t => newSelectedTasks.delete(t.id));
        } else {
            newSelectedProjects.add(projectId);
            // Select all active tasks of this project
            project.tasks.filter(t => !t.deleted_at).forEach(t => newSelectedTasks.add(t.id));
        }
        setSelectedProjectIds(newSelectedProjects);
        setSelectedTaskIds(newSelectedTasks);
    };

    const handleToggleTask = (taskId, projectId) => {
        const newSelectedTasks = new Set(selectedTaskIds);
        if (newSelectedTasks.has(taskId)) {
            newSelectedTasks.delete(taskId);
        } else {
            newSelectedTasks.add(taskId);
        }
        setSelectedTaskIds(newSelectedTasks);

        // Update Project Selection State based on tasks
        const project = projects.find(p => p.id === projectId);
        const projectTaskIds = project.tasks.filter(t => !t.deleted_at).map(t => t.id);
        const hasSelectedTasks = projectTaskIds.some(id => newSelectedTasks.has(id));

        const newSelectedProjects = new Set(selectedProjectIds);
        if (hasSelectedTasks) {
            newSelectedProjects.add(projectId);
        } else {
            newSelectedProjects.delete(projectId);
        }
        setSelectedProjectIds(newSelectedProjects);
    };

    const toggleExpand = (projectId) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
        }
        setExpandedProjects(newExpanded);
    };

    const handleGenerate = async () => {
        if (selectedProjectIds.size === 0) {
            addToast('Selecciona al menos un proyecto', 'warning');
            return;
        }

        const sections = [];

        // Sort projects by ID or Name logic here if needed
        const sortedProjects = [...projects].filter(p => selectedProjectIds.has(p.id));

        for (const project of sortedProjects) {
            const projectTasks = project.tasks
                .filter(t => !t.deleted_at && selectedTaskIds.has(t.id));

            if (projectTasks.length > 0) {
                sections.push({
                    projectTitle: project.title,
                    tasks: projectTasks
                });
            }
        }

        if (sections.length === 0) {
            addToast('No hay tareas seleccionadas para generar el informe', 'warning');
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

    // Calculate stats
    const totalSelectedTasks = selectedTaskIds.size;
    const totalSelectedProjects = selectedProjectIds.size;

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={24} color="#3b82f6" />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Generar Informe Global</h2>
                            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>Selecciona los proyectos y tareas que deseas incluir.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close-btn">
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>Título del Informe</label>
                        <input
                            type="text"
                            className="task-input"
                            value={reportTitle}
                            onChange={(e) => setReportTitle(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="projects-selection-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {projects.filter(p => !p.is_archived).map(project => {
                            const activeTasks = project.tasks.filter(t => !t.deleted_at);
                            if (activeTasks.length === 0) return null;

                            const isExpanded = expandedProjects.has(project.id);
                            const isProjectSelected = selectedProjectIds.has(project.id);
                            // Check partial selection logic if needed, but strict project selection is fine for now

                            return (
                                <div key={project.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                    {/* Project Header */}
                                    <div
                                        style={{
                                            display: 'flex', alignItems: 'center', padding: '10px 15px', background: '#f9fafb',
                                            cursor: 'pointer', borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                                        }}
                                        onClick={() => toggleExpand(project.id)}
                                    >
                                        <div
                                            onClick={(e) => { e.stopPropagation(); handleToggleProject(project.id); }}
                                            style={{ marginRight: '10px', cursor: 'pointer', display: 'flex' }}
                                        >
                                            {isProjectSelected ? <CheckSquare size={20} color="#3b82f6" /> : <Square size={20} color="#9ca3af" />}
                                        </div>

                                        <span style={{ flex: 1, fontWeight: 600, color: '#374151' }}>{project.title}</span>
                                        <span style={{ fontSize: '0.85rem', color: '#6b7280', marginRight: '10px' }}>{activeTasks.length} tareas</span>

                                        {isExpanded ? <ChevronDown size={18} color="#9ca3af" /> : <ChevronRight size={18} color="#9ca3af" />}
                                    </div>

                                    {/* Tasks List */}
                                    {isExpanded && (
                                        <div style={{ padding: '0.5rem 0', background: 'white' }}>
                                            {activeTasks.map(task => {
                                                const isTaskSelected = selectedTaskIds.has(task.id);
                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => handleToggleTask(task.id, project.id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'flex-start', padding: '8px 15px 8px 45px',
                                                            cursor: 'pointer', hover: { background: '#f3f4f6' }
                                                        }}
                                                        className="task-selection-item"
                                                    >
                                                        <div style={{ marginTop: '2px', marginRight: '10px', flexShrink: 0 }}>
                                                            {isTaskSelected ? <CheckSquare size={16} color="#3b82f6" /> : <Square size={16} color="#d1d5db" />}
                                                        </div>
                                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '0.95rem', color: isTaskSelected ? '#1f2937' : '#6b7280' }}>
                                                                {task.descripcion}
                                                            </span>

                                                            {/* Badges */}
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                {task.completada && (
                                                                    <span title="Tarea Completada" style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: '#d1fae5', color: '#059669', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                        <CheckCircle size={12} style={{ marginRight: '4px' }} /> Resuelta
                                                                    </span>
                                                                )}

                                                                {(task.report_content || (task.evidence && task.evidence.length > 0)) && (
                                                                    <span title="Tiene Informe/Evidencia" style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0284c7', fontSize: '0.75rem', fontWeight: 500 }}>
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
                <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        <strong>{totalSelectedProjects}</strong> proyectos, <strong>{totalSelectedTasks}</strong> tareas seleccionadas
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={totalSelectedTasks === 0}
                        className="create-btn"
                        style={{
                            background: totalSelectedTasks === 0 ? '#9ca3af' : '#3b82f6',
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

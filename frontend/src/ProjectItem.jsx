import { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Trash2, Edit2, Save, X, FileDown, CheckSquare, Square, Package } from 'lucide-react';
import TaskList from './TaskList';
import TaskForm from './TaskForm';
import { generateDocx } from './exportUtils';
import ConfirmationModal from './components/ConfirmationModal';
import { useToast } from './context/ToastContext';

const ProjectItem = ({ project, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(project.title);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
    const [actionToConfirm, setActionToConfirm] = useState(null); // { type: 'delete' | 'archive', data: ... }
    const { addToast } = useToast();

    const handleDelete = async () => {
        try {
            await axios.delete(`http://localhost:3000/api/projects/${project.id}`);
            onUpdate();
            addToast('Proyecto eliminado', 'success');
        } catch (error) {
            console.error('Error deleting project:', error);
            addToast('Error al eliminar proyecto', 'error');
        } finally {
            setActionToConfirm(null);
        }
    };

    const handleUpdate = async () => {
        if (!editTitle.trim()) return;
        try {
            await axios.put(`http://localhost:3000/api/projects/${project.id}`, {
                title: editTitle
            });
            setIsEditing(false);
            onUpdate();
            addToast('Proyecto actualizado', 'success');
        } catch (error) {
            console.error('Error updating project:', error);
            addToast('Error al actualizar proyecto', 'error');
        }
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedTaskIds(new Set()); // Reset selection
    };

    const handleSelectTask = (taskId) => {
        const newSelection = new Set(selectedTaskIds);
        if (newSelection.has(taskId)) {
            newSelection.delete(taskId);
        } else {
            newSelection.add(taskId);
        }
        setSelectedTaskIds(newSelection);
    };

    const handleSelectAll = () => {
        if (selectedTaskIds.size === project.tasks.length) {
            setSelectedTaskIds(new Set());
        } else {
            const allIds = new Set(project.tasks.map(t => t.id));
            setSelectedTaskIds(allIds);
        }
    };

    const handleExport = async () => {
        if (selectedTaskIds.size === 0) {
            addToast("Selecciona al menos una tarea para exportar.", 'info');
            return;
        }

        const tasksToExport = project.tasks.filter(t => selectedTaskIds.has(t.id));
        try {
            await generateDocx(project.title, tasksToExport);
            setIsSelectionMode(false);
            setSelectedTaskIds(new Set());
            addToast('Documento generado exitosamente', 'success');
        } catch (error) {
            console.error("Error generating docx:", error);
            addToast("Error al generar el documento.", 'error');
        }
    };

    const handleArchiveToggle = async () => {
        try {
            await axios.put(`http://localhost:3000/api/projects/${project.id}`, {
                is_archived: !project.is_archived
            });
            onUpdate();
            addToast(project.is_archived ? 'Proyecto desarchivado' : 'Proyecto archivado', 'success');
        } catch (error) {
            console.error('Error archiving/unarchiving project:', error);
            addToast('Error al cambiar estado de archivo', 'error');
        } finally {
            setActionToConfirm(null);
        }
    };

    return (
        <div className={`project-card ${project.is_archived ? 'archived' : ''}`} id={`project-${project.id}`}>
            <div className={`project-header ${isSelectionMode ? 'selection-mode' : ''}`}>
                {isEditing ? (
                    <div className="edit-container">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="edit-input"
                            autoFocus
                        />
                        <button onClick={handleUpdate} className="action-btn save-btn"><Save size={18} /></button>
                        <button onClick={() => setIsEditing(false)} className="action-btn cancel-btn"><X size={18} /></button>
                    </div>
                ) : (
                    <>
                        <div className="title-section">
                            <h3 className="project-title">{project.title}</h3>
                            <span className="task-count">({project.tasks?.length || 0} tareas)</span>
                            {project.is_archived && <span className="archived-badge">Archivado</span>}
                        </div>

                        <div className="project-actions">
                            {isSelectionMode ? (
                                <>
                                    <button onClick={handleSelectAll} className="action-btn" title="Seleccionar Todo">
                                        {selectedTaskIds.size === project.tasks?.length ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                    <button onClick={handleExport} className="export-action-btn">
                                        Descargar .DOCX ({selectedTaskIds.size})
                                    </button>
                                    <button onClick={toggleSelectionMode} className="action-btn cancel-btn" title="Cancelar">
                                        <X size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={toggleSelectionMode} className="action-btn export-btn" title="Generar Informe Word">
                                        <FileDown size={18} />
                                    </button>

                                    <button
                                        onClick={() => setActionToConfirm({ type: 'archive' })}
                                        className="action-btn archive-btn"
                                        title={project.is_archived ? "Desarchivar" : "Archivar"}
                                    >
                                        <Package size={18} />
                                    </button>

                                    {!project.is_archived && (
                                        <button onClick={() => setIsEditing(true)} className="action-btn edit-btn" title="Editar Título">
                                            <Edit2 size={18} />
                                        </button>
                                    )}

                                    <button onClick={() => setActionToConfirm({ type: 'delete' })} className="action-btn delete-btn" title="Eliminar Título">
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="project-body">
                {!isSelectionMode && !project.is_archived && !showArchived && <TaskForm onTaskAdded={onUpdate} projectId={project.id} />}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        {showArchived ? 'Ver Tareas Activas' : `Ver Tareas Archivadas (${project.tasks ? project.tasks.filter(t => t.is_archived).length : 0})`}
                    </button>
                </div>

                <TaskList
                    tasks={project.tasks ? project.tasks.filter(t => !!t.is_archived === showArchived) : []}
                    onTaskUpdated={onUpdate}
                    selectionMode={isSelectionMode}
                    selectedIds={selectedTaskIds}
                    onToggleSelect={handleSelectTask}
                    showArchived={showArchived}
                />
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!actionToConfirm}
                onClose={() => setActionToConfirm(null)}
                onConfirm={actionToConfirm?.type === 'delete' ? handleDelete : handleArchiveToggle}
                title={actionToConfirm?.type === 'delete' ? '¿Eliminar Proyecto?' : (project.is_archived ? '¿Desarchivar Proyecto?' : '¿Archivar Proyecto?')}
                message={actionToConfirm?.type === 'delete'
                    ? '¿Eliminar este título y todas sus tareas? Esta acción no se puede deshacer.'
                    : `¿Seguro que deseas ${project.is_archived ? 'desarchivar' : 'archivar'} este proyecto?`
                }
                confirmText={actionToConfirm?.type === 'delete' ? 'Sí, Eliminar' : 'Sí, Confirmar'}
                isDestructive={actionToConfirm?.type === 'delete'}
            />
        </div>
    );
};

ProjectItem.propTypes = {
    project: PropTypes.object.isRequired,
    onUpdate: PropTypes.func.isRequired,
};

export default ProjectItem;

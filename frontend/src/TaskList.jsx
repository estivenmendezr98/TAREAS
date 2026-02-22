import { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Check, Calendar, Trash2, Edit2, Save, X, ClipboardList, Paperclip, Archive, RefreshCw, FileText } from 'lucide-react';
import ReportModal from './ReportModal';
import ConfirmationModal from './components/ConfirmationModal';
import { useToast } from './context/ToastContext';
import DatePicker from './components/DatePicker';

const TaskList = ({ tasks, onTaskUpdated, selectionMode, selectedIds, onToggleSelect, showArchived }) => {
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editDesc, setEditDesc] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [reportTaskId, setReportTaskId] = useState(null); // ID of task currently opening report modal
    const [taskToDelete, setTaskToDelete] = useState(null); // State for delete modal
    const { addToast } = useToast();

    const activeReportTask = reportTaskId ? tasks.find(t => t.id === reportTaskId) : null;

    const handleToggleComplete = async (task) => {
        try {
            await axios.put(`http://localhost:3000/api/tasks/${task.id}`, {
                completada: !task.completada
            });
            onTaskUpdated();
        } catch (error) {
            console.error('Error updating task:', error);
            addToast('Error al actualizar estado', 'error');
        }
    };

    const handleArchiveToggle = async (task) => {
        try {
            await axios.put(`http://localhost:3000/api/tasks/${task.id}`, {
                is_archived: !task.is_archived
            });
            onTaskUpdated();
            addToast(task.is_archived ? 'Tarea restaurada' : 'Tarea archivada', 'success');
        } catch (error) {
            console.error('Error toggling archive task:', error);
            addToast('Error al cambiar estado de archivo', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            await axios.delete(`http://localhost:3000/api/tasks/${taskToDelete}`);
            onTaskUpdated();
            addToast('Tarea eliminada', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            addToast('Error al eliminar tarea', 'error');
        } finally {
            setTaskToDelete(null);
        }
    };

    const startEdit = (task) => {
        setEditingTaskId(task.id);
        setEditDesc(task.descripcion);
        setEditDate(task.fecha_objetivo ? task.fecha_objetivo.split('T')[0] : '');
        setEditStartDate(task.start_date ? task.start_date.split('T')[0] : '');
    };

    const cancelEdit = () => {
        setEditingTaskId(null);
        setEditDesc('');
        setEditDate('');
        setEditStartDate('');
    };

    const saveEdit = async (taskId) => {
        try {
            await axios.put(`http://localhost:3000/api/tasks/${taskId}`, {
                descripcion: editDesc,
                fecha_objetivo: editDate || null,
                start_date: editStartDate || null
            });
            setEditingTaskId(null);
            onTaskUpdated();
            addToast('Tarea editada', 'success');
        } catch (error) {
            console.error('Error updating task details:', error);
            addToast('Error al editar tarea', 'error');
        }
    };

    // FIXED: Safe format that avoids Timezone issues (Off-by-one error)
    // Takes YYYY-MM-DD and returns DD/MM/YYYY direct from string parts
    const formatDate = (dateString) => {
        if (!dateString) return null;
        // Ensure we only look at the date part YYYY-MM-DD
        const cleanDate = dateString.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            // parts[0] = YYYY, parts[1] = MM, parts[2] = DD
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return cleanDate;
    };

    if (tasks.length === 0) {
        return <div className="empty-state">No hay tareas pendientes.</div>;
    }

    return (
        <>
            <ul className={`task-list ${selectionMode ? 'selection-active' : ''}`}>
                {tasks.map((task) => (
                    <li key={task.id} className={`task-item-container ${task.completada ? 'completed' : ''}`}>
                        <div className="task-main-row">
                            {selectionMode ? (
                                <div className="selection-checkbox-container" onClick={() => onToggleSelect(task.id)}>
                                    <div className={`custom-checkbox ${selectedIds.has(task.id) ? 'selected' : ''}`}>
                                        {selectedIds.has(task.id) && <Check size={14} color="white" />}
                                    </div>
                                    <span className="task-text">{task.descripcion}</span>
                                </div>
                            ) : (
                                editingTaskId === task.id ? (
                                    <div className="task-edit-mode">
                                        <input
                                            type="text"
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            className="edit-task-input"
                                            placeholder="Descripción"
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <div style={{ minWidth: '140px' }}>
                                                <DatePicker
                                                    selectedDate={editStartDate}
                                                    onChange={setEditStartDate}
                                                    placeholder="Inicio"
                                                />
                                            </div>
                                            <div style={{ minWidth: '140px' }}>
                                                <DatePicker
                                                    selectedDate={editDate}
                                                    onChange={setEditDate}
                                                    placeholder="Fin"
                                                />
                                            </div>
                                        </div>
                                        <div className="edit-actions">
                                            <button onClick={() => saveEdit(task.id)} className="action-btn save-btn"><Save size={16} /></button>
                                            <button onClick={cancelEdit} className="action-btn cancel-btn"><X size={16} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            className={`check-button ${task.completada ? 'checked' : ''}`}
                                            onClick={() => handleToggleComplete(task)}
                                            title={task.completada ? "Marcar como pendiente" : "Marcar como completada"}
                                        >
                                            {task.completada && <Check size={16} />}
                                        </button>

                                        <div className="task-content">
                                            <span className="task-text">{task.descripcion}</span>
                                            <div className="task-meta">
                                                {(task.start_date || task.fecha_objetivo) && (
                                                    <span className="task-date">
                                                        <Calendar size={14} />
                                                        {task.start_date ? formatDate(task.start_date) : ''}
                                                        {task.start_date && task.fecha_objetivo ? ' - ' : ''}
                                                        {task.fecha_objetivo ? formatDate(task.fecha_objetivo) : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="task-actions">
                                            <button
                                                onClick={() => setReportTaskId(task.id)}
                                                className="action-btn report-btn"
                                                title="Abrir Informe y Evidencias"
                                            >
                                                <ClipboardList size={16} />
                                                {task.report_content && task.report_content.trim().length > 0 && (
                                                    <span className="evidence-badge text-badge" title="Tiene texto en Observaciones/Informe">
                                                        <FileText size={10} />
                                                    </span>
                                                )}
                                                {task.evidence && task.evidence.length > 0 && (
                                                    <span className="evidence-badge" title={`${task.evidence.length} foto(s)`}>
                                                        <Paperclip size={10} />
                                                    </span>
                                                )}
                                            </button>

                                            <button onClick={() => startEdit(task)} className="action-btn edit-btn-sm" title="Editar">
                                                <Edit2 size={14} />
                                            </button>

                                            <button
                                                onClick={() => handleArchiveToggle(task)}
                                                className="action-btn archive-btn-sm"
                                                title={task.is_archived ? "Desarchivar" : "Archivar"}
                                                style={{ color: task.is_archived ? '#10b981' : '#f59e0b' }}
                                            >
                                                {task.is_archived ? <RefreshCw size={14} /> : <Archive size={14} />}
                                            </button>

                                            <button onClick={() => setTaskToDelete(task.id)} className="action-btn delete-btn-sm" title="Eliminar">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                )
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {/* Report Modal */}
            {activeReportTask && (
                <ReportModal
                    task={activeReportTask}
                    onClose={() => setReportTaskId(null)}
                    onUpdate={onTaskUpdated}
                />
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={confirmDelete}
                title="¿Eliminar Tarea?"
                message="Esta acción no se puede deshacer."
                confirmText="Sí, Eliminar"
                isDestructive={true}
            />
        </>
    );
};

TaskList.propTypes = {
    tasks: PropTypes.array.isRequired,
    onTaskUpdated: PropTypes.func.isRequired,
    selectionMode: PropTypes.bool,
    selectedIds: PropTypes.object,
    onToggleSelect: PropTypes.func,
    showArchived: PropTypes.bool,
};

export default TaskList;

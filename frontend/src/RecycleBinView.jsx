import React from 'react';
import { RotateCcw, Trash2, AlertTriangle, Package, CheckSquare } from 'lucide-react';

const RecycleBinView = ({ deletedProjects, deletedTasks, onRestore, onDeletePermanent }) => {

    if (deletedProjects.length === 0 && deletedTasks.length === 0) {
        return (
            <div className="empty-state">
                <Trash2 size={48} color="#9ca3af" />
                <h3>La papelera está vacía</h3>
                <p>Los elementos eliminados aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="recycle-bin-container">
            <div className="recycle-header">
                <Trash2 size={24} color="#ef4444" />
                <h2>Papelera de Reciclaje</h2>
                <span className="recycle-info">Los elementos se eliminan permanentemente después de 30 días.</span>
            </div>

            {deletedProjects.length > 0 && (
                <div className="recycle-section">
                    <h3><Package size={20} /> Proyectos Eliminados</h3>
                    <div className="recycle-grid">
                        {deletedProjects.map(project => (
                            <div key={project.id} className="recycle-card project-card-deleted">
                                <div className="recycle-card-header">
                                    <span className="recycle-title">{project.title}</span>
                                    <span className="recycle-date">Eliminado: {new Date(project.deleted_at).toLocaleDateString()}</span>
                                </div>
                                <div className="recycle-actions">
                                    <button
                                        className="btn-restore"
                                        onClick={() => onRestore('project', project.id)}
                                        title="Restaurar Proyecto"
                                    >
                                        <RotateCcw size={18} /> Restaurar
                                    </button>
                                    <button
                                        className="btn-permanent-delete"
                                        onClick={() => onDeletePermanent('project', project.id)}
                                        title="Eliminar Definitivamente"
                                    >
                                        <Trash2 size={18} /> Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {deletedTasks.length > 0 && (
                <div className="recycle-section">
                    <h3><CheckSquare size={20} /> Tareas Eliminadas</h3>

                    {/* Group tasks by Project Name */}
                    {Object.entries(
                        deletedTasks.reduce((acc, task) => {
                            const projectName = task.project_title || "Sin Proyecto";
                            if (!acc[projectName]) acc[projectName] = [];
                            acc[projectName].push(task);
                            return acc;
                        }, {})
                    ).map(([projectName, tasks]) => (
                        <div key={projectName} className="tasks-group-container">
                            <h4 className="tasks-group-header">
                                <Package size={16} /> {projectName}
                                <span className="group-count">({tasks.length})</span>
                            </h4>
                            <div className="recycle-grid">
                                {tasks.map(task => (
                                    <div key={task.id} className="recycle-card task-card-deleted">
                                        <div className="recycle-card-header">
                                            <div className="task-info">
                                                <span className="recycle-title">{task.descripcion}</span>
                                            </div>
                                            <span className="recycle-date">Eliminado: {new Date(task.deleted_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="recycle-actions">
                                            <button
                                                className="btn-restore"
                                                onClick={() => onRestore('task', task.id)}
                                                title="Restaurar Tarea"
                                            >
                                                <RotateCcw size={18} /> Restaurar
                                            </button>
                                            <button
                                                className="btn-permanent-delete"
                                                onClick={() => onDeletePermanent('task', task.id)}
                                                title="Eliminar Definitivamente"
                                            >
                                                <Trash2 size={18} /> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecycleBinView;

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Square, Archive, Clock, Send } from 'lucide-react';

const SelectArchivedModal = ({ isOpen, onClose, archivedTasks, selectedIds, onSelectionChange }) => {
    const [localSelected, setLocalSelected] = useState(new Set());

    useEffect(() => {
        if (isOpen) {
            setLocalSelected(new Set(selectedIds));
        }
    }, [isOpen, selectedIds]);

    const handleToggleTask = (taskId) => {
        setLocalSelected(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const handleSave = () => {
        onSelectionChange(localSelected);
        onClose();
    };

    if (!isOpen) return null;

    // Group tasks by project
    const grouped = {};
    archivedTasks.forEach(t => {
        const title = t.project_title || 'Sin Proyecto';
        if (!grouped[title]) grouped[title] = [];
        grouped[title].push(t);
    });

    const hasArchived = archivedTasks.length > 0;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
            <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Archive size={24} color="#f59e0b" />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0' }}>Seleccionar Tareas Archivadas</h2>
                            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                                Elige cuáles tareas archivadas deseas mostrar en el diagrama.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close-btn"><X size={24} /></button>
                </div>

                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {!hasArchived ? (
                        <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>No hay tareas archivadas disponibles.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(grouped).map(([projectTitle, tasks]) => (
                                <div key={projectTitle} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ padding: '10px 15px', background: '#f9fafb', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                                        {projectTitle}
                                    </div>
                                    <div style={{ padding: '0.5rem 0', background: 'white' }}>
                                        {tasks.map(task => {
                                            const isSelected = localSelected.has(task.id);
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => handleToggleTask(task.id)}
                                                    style={{ display: 'flex', alignItems: 'center', padding: '8px 15px', cursor: 'pointer' }}
                                                >
                                                    <div style={{ marginRight: '10px', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                                                        {isSelected ? <CheckCircle size={20} color="#3b82f6" /> : <Square size={20} color="#d1d5db" />}
                                                    </div>
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.95rem', color: isSelected ? '#1f2937' : '#6b7280', fontWeight: isSelected ? 500 : 400 }}>
                                                            {task.descripcion}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {task.updated_at && (
                                                                <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 600 }}>
                                                                    <Archive size={12} style={{ marginRight: '4px' }} />
                                                                    Archivado el {new Date(task.updated_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                </span>
                                                            )}
                                                            {task.completada && (
                                                                <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: '#d1fae5', color: '#059669', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                    <CheckCircle size={12} style={{ marginRight: '4px' }} /> Resuelta
                                                                </span>
                                                            )}
                                                            {task.entregado && (
                                                                <span style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', background: '#d1fae5', color: '#059669', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                    <Send size={12} style={{ marginRight: '4px' }} /> Entregado
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontWeight: 500 }}>
                        Cancelar
                    </button>
                    <button onClick={handleSave} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
                        Guardar Selección ({localSelected.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectArchivedModal;

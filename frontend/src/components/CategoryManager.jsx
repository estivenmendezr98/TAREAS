import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const CategoryManager = ({ isOpen, onClose, onUpdate }) => {
    const [categories, setCategories] = useState([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#3b82f6');
    const { addToast } = useToast();
    const { token } = useAuth(); // Use Auth token properly

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#10b981',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
        '#d946ef', '#ec4899', '#6b7280', '#000000'
    ];

    const fetchCategories = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/categories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            addToast('Error al cargar etiquetas', 'error');
        }
    }, [token, addToast]);

    useEffect(() => {
        if (isOpen && token) {
            fetchCategories();
        }
    }, [isOpen, token, fetchCategories]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        try {
            await axios.post('http://localhost:3000/api/categories', {
                name: newCatName,
                color: newCatColor
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewCatName('');
            setNewCatColor('#3b82f6');
            fetchCategories();
            onUpdate(); // Notify App to refresh projects
            addToast('Etiqueta creada', 'success');
        } catch (error) {
            console.error('Error creating category:', error);
            if (error.response?.status === 409) {
                addToast('Ya existe una etiqueta con ese nombre', 'warning');
            } else {
                addToast('Error al crear etiqueta', 'error');
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar esta etiqueta? Los proyectos asociados quedarán sin etiqueta.')) return;

        try {
            await axios.delete(`http://localhost:3000/api/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCategories();
            onUpdate();
            addToast('Etiqueta eliminada', 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            addToast('Error al eliminar etiqueta', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '400px', padding: '0' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Tag size={20} color="#3b82f6" />
                        <h2 style={{ fontSize: '1.1rem' }}>Etiquetas de Proyecto</h2>
                    </div>
                    <button onClick={onClose} className="modal-close-btn">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{ gap: '1.5rem' }}>

                    {/* Add New Category Section */}
                    <div className="add-category-section">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                            Nueva Etiqueta
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <input
                                type="text"
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                placeholder="Nombre..."
                                className="task-input"
                                style={{ flex: 1 }}
                            />
                            <div
                                style={{
                                    width: '36px', height: '36px', borderRadius: '6px', backgroundColor: newCatColor,
                                    flexShrink: 0, border: '1px solid #e5e7eb'
                                }}
                                title="Color Seleccionado"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setNewCatColor(c)}
                                    style={{
                                        width: '100%', aspectRatio: '1', borderRadius: '4px', backgroundColor: c,
                                        border: newCatColor === c ? '2px solid #000' : '1px solid transparent',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleAdd}
                            disabled={!newCatName.trim()}
                            className="create-btn"
                            style={{
                                width: '100%', padding: '0.5rem', background: '#3b82f6', color: 'white',
                                border: 'none', borderRadius: '6px', fontWeight: 600, cursor: !newCatName.trim() ? 'not-allowed' : 'pointer',
                                opacity: !newCatName.trim() ? 0.6 : 1
                            }}
                        >
                            <Plus size={16} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} /> Crear Etiqueta
                        </button>
                    </div>

                    <div style={{ height: '1px', background: '#e5e7eb' }} />

                    {/* Existing Categories List */}
                    <div className="categories-list-section">
                        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Existentes ({categories.length})
                        </h3>
                        <div className="categories-scroll" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {categories.length === 0 && <p style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>No hay etiquetas definidas.</p>}
                            {categories.map(cat => (
                                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }} />
                                        <span style={{ fontWeight: 500, color: '#374151' }}>{cat.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

CategoryManager.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
};

export default CategoryManager;

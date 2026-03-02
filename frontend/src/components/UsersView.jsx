import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Eye } from 'lucide-react';

const UsersView = ({ onImpersonate }) => {
    const [users, setUsers] = useState([]);
    const [newUserStart, setNewUser] = useState({ username: '', password: '', role: 'user' });
    const [editingUser, setEditingUser] = useState(null);
    const { addToast } = useToast();
    const { user: currentUser, impersonate } = useAuth();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const dataToSend = { ...newUserStart };
                if (dataToSend.password === '') delete dataToSend.password;
                await axios.put(`http://localhost:3000/api/users/${editingUser.id}`, dataToSend);
                addToast('Usuario actualizado exitosamente', 'success');
            } else {
                await axios.post('http://localhost:3000/api/users', newUserStart);
                addToast('Usuario creado exitosamente', 'success');
            }
            setNewUser({ username: '', password: '', role: 'user' });
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            addToast('Error al guardar usuario', 'error');
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setNewUser({ username: user.username, password: '', role: user.role });
    };

    const handleCancel = () => {
        setEditingUser(null);
        setNewUser({ username: '', password: '', role: 'user' });
    };

    const handleImpersonate = async (targetUser) => {
        const result = await impersonate(targetUser.id);
        if (result?.success) {
            addToast(`Ahora estás viendo como: ${targetUser.username}`, 'info');
            if (onImpersonate) onImpersonate(); // close users panel, go to active view
        } else {
            addToast('Error al cambiar de usuario', 'error');
        }
    };

    const renderActions = (u) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
                onClick={() => handleEdit(u)}
                style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#4b5563' }}
            >
                Editar
            </button>
            {/* Don't show "Ver como" for the currently logged-in admin */}
            {u.id !== currentUser?.id && (
                <button
                    onClick={() => handleImpersonate(u)}
                    title={`Ver como ${u.username}`}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', fontSize: '12px',
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: '4px', cursor: 'pointer', color: '#2563eb',
                        fontWeight: '500',
                    }}
                >
                    <Eye size={13} /> Ver como
                </button>
            )}
        </div>
    );

    return (
        <div style={{ padding: '20px' }}>
            <h2>Gestión de Usuarios</h2>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
                <h3>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: isMobile ? 'stretch' : 'center' }}>
                    <input
                        type="text"
                        placeholder="Usuario"
                        value={newUserStart.username}
                        onChange={e => setNewUser({ ...newUserStart, username: e.target.value })}
                        required
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <input
                        type="password"
                        placeholder={editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
                        value={newUserStart.password}
                        onChange={e => setNewUser({ ...newUserStart, password: e.target.value })}
                        required={!editingUser}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <select
                        value={newUserStart.role}
                        onChange={e => setNewUser({ ...newUserStart, role: e.target.value })}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="user">Usuario</option>
                        <option value="admin">Administrador</option>
                    </select>
                    <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {editingUser ? 'Actualizar' : 'Crear'}
                    </button>
                    {editingUser && (
                        <button type="button" onClick={handleCancel} style={{ padding: '8px 16px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Cancelar
                        </button>
                    )}
                </form>
            </div>

            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {users.map(u => (
                        <div key={u.id} style={{ padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{u.username}</span>
                                <span style={{
                                    fontSize: '11px',
                                    background: u.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                                    color: u.role === 'admin' ? '#1e40af' : '#374151',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    width: 'fit-content'
                                }}>
                                    {u.role}
                                </span>
                            </div>
                            {renderActions(u)}
                        </div>
                    ))}
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#e5e7eb', textAlign: 'left' }}>
                            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>ID</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>Usuario</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>Rol</th>
                            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{u.id}</td>
                                <td style={{ padding: '10px', fontWeight: '500' }}>{u.username}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        background: u.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                                        color: u.role === 'admin' ? '#1e40af' : '#374151',
                                        fontSize: '0.85rem'
                                    }}>
                                        {u.role}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    {renderActions(u)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UsersView;

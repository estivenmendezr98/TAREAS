import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';

const SettingsView = ({ addToast }) => {
    const [settings, setSettings] = useState({});
    const [originalSettings, setOriginalSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // Obtener la configuración actual
    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/admin/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Suponiendo respuesta tipo { GEMINI_API_KEY: 'asd...', OTHER_SETTING: '123' }
            setSettings(res.data);
            setOriginalSettings(res.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            addToast('Error al cargar la configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Manejador de cambio de input
    const handleChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Guardar una configuración particular
    const handleSave = async (key) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/admin/settings',
                { setting_key: key, setting_value: settings[key] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setOriginalSettings(prev => ({ ...prev, [key]: settings[key] }));
            addToast('Ajuste guardado correctamente', 'success');
        } catch (error) {
            console.error('Error saving setting:', error);
            addToast('Error al guardar el ajuste', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="view-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Cargando ajustes del sistema...</p>
            </div>
        );
    }

    // Configuración base si viene vacío desde la base de datos momentáneamente
    const geminiKey = settings['GEMINI_API_KEY'] || '';
    const hasChanged = geminiKey !== originalSettings['GEMINI_API_KEY'];

    return (
        <div className="view-container fade-in">
            <div className="view-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Settings size={28} color="var(--primary-color)" />
                    <h2>Ajustes del Sistema</h2>
                </div>
            </div>

            <div style={{
                background: 'var(--card-bg)',
                borderRadius: '8px',
                padding: '1.5rem',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                maxWidth: '800px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '6px' }}>
                    <AlertCircle size={20} />
                    <span style={{ fontSize: '0.9rem' }}>Atención: Estos ajustes afectan globalmente a todos los usuarios del sistema. Modificarlos sin precaución puede interrumpir los servicios.</span>
                </div>

                <div className="setting-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1rem' }}>Google Gemini API Key</label>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Clave secreta utilizada para las funciones de Inteligencia Artificial (Reportes Automáticos, Corrección, Reescritura).
                    </p>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                type={showKey ? "text" : "password"}
                                value={geminiKey}
                                onChange={(e) => handleChange('GEMINI_API_KEY', e.target.value)}
                                placeholder="AIzaSyA..."
                                style={{
                                    width: '100%',
                                    padding: '10px 40px 10px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-color)',
                                    color: 'var(--text-main)',
                                    fontFamily: 'monospace'
                                }}
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', padding: '5px'
                                }}
                            >
                                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={() => handleSave('GEMINI_API_KEY')}
                            disabled={!hasChanged || saving}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                                opacity: (!hasChanged || saving) ? 0.6 : 1,
                                cursor: (!hasChanged || saving) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsView;

import { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { X, Save, Camera, FileText, Check, RotateCcw, Sparkles } from 'lucide-react';
import { useToast } from './context/ToastContext';
import ConfirmationModal from './components/ConfirmationModal';

const ReportModal = ({ task, onClose, onUpdate }) => {
    // Initializer function to only set on mount/remount
    const [reportContent, setReportContent] = useState(() => task.report_content || '');
    const [selectedEvidence, setSelectedEvidence] = useState(null); // Fullscreen viewer inside modal
    const [evidenceToDelete, setEvidenceToDelete] = useState(null); // ID of evidence to delete

    // AI States
    const [isImproving, setIsImproving] = useState(false);
    const [aiReviewMode, setAiReviewMode] = useState(false);
    const [originalText, setOriginalText] = useState('');
    const [improvedText, setImprovedText] = useState('');
    const [tokenUsage, setTokenUsage] = useState(null);

    // Prompt Generation State
    const [showPromptInput, setShowPromptInput] = useState(false);
    const [promptText, setPromptText] = useState('');

    const { addToast } = useToast();

    const handleSaveReport = async () => {
        try {
            await axios.put(`http://localhost:3000/api/tasks/${task.id}`, {
                report_content: reportContent
            });
            onUpdate();
            addToast('Informe guardado correctamente', 'success');
        } catch (error) {
            console.error('Error saving report:', error);
            addToast('Error al guardar el informe', 'error');
        }
    };

    const [showAiMenu, setShowAiMenu] = useState(false);

    const handleAiAction = (mode) => {
        setShowAiMenu(false);
        handleAiImprove(mode);
    };

    const handleAiImprove = async (mode = 'fix_grammar') => {
        if (mode !== 'analyze_images' && mode !== 'generate_report' && (!reportContent || reportContent.trim().length === 0)) {
            addToast('Escribe algo primero para mejorarlo', 'warning');
            return;
        }

        if (mode === 'analyze_images' && (!task.evidence || task.evidence.length === 0)) {
            addToast('Sube fotos primero para analizarlas', 'warning');
            return;
        }

        setIsImproving(true);
        try {
            const payload = {
                text: mode === 'generate_report' ? promptText : reportContent,
                mode: mode,
                images: mode === 'analyze_images' ? task.evidence.map(e => e.file_path) : []
            };

            const response = await axios.post('http://localhost:3000/api/ai/improve', payload);

            if (response.data && response.data.improvedText) {
                setOriginalText(reportContent);
                setImprovedText(response.data.improvedText);
                setTokenUsage(response.data.usage); // Save usage data
                setAiReviewMode(true);
                addToast('Sugerencia generada con éxito', 'success');
            }
        } catch (error) {
            console.error('AI Error:', error);
            addToast('Error al conectar con la IA', 'error');
        } finally {
            setIsImproving(false);
        }
    };

    const acceptAiChanges = () => {
        setReportContent(improvedText);
        setAiReviewMode(false);
        setOriginalText('');
        setImprovedText('');
        addToast('Cambios aceptados', 'success');
    };

    const discardAiChanges = () => {
        setAiReviewMode(false);
        setOriginalText('');
        setImprovedText('');
        addToast('Cambios descartados', 'info');
    };

    const handleFileUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        try {
            await axios.post(`http://localhost:3000/api/tasks/${task.id}/evidence`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpdate(); // Refresh to show new images
            addToast('Fotos subidas exitosamente', 'success');
        } catch (error) {
            console.error('Error uploading evidence:', error);
            addToast('Error subiendo las fotos', 'error');
        }
    };

    const handleDeleteEvidence = async () => {
        if (!evidenceToDelete) return;
        try {
            await axios.delete(`http://localhost:3000/api/evidence/${evidenceToDelete.id}`);
            onUpdate();
            addToast('Foto eliminada', 'success');
        } catch (error) {
            console.error('Error deleting evidence:', error);
            addToast('Error al eliminar foto', 'error');
        } finally {
            setEvidenceToDelete(null);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Informe: <span className="modal-task-title">{task.descripcion}</span></h2>
                    <button className="modal-close-btn" onClick={onClose}><X size={24} /></button>
                </header>

                <div className="modal-body">
                    {/* Report Text Section */}
                    <div className="report-section">
                        <div className="section-title">
                            <FileText size={18} />
                            <h3>Observaciones / Informe</h3>
                        </div>

                        {aiReviewMode ? (
                            <div className="ai-review-container">
                                <div className="review-grid">
                                    <div className="review-box original">
                                        <h4>Original</h4>
                                        <div className="review-content">{originalText}</div>
                                    </div>

                                    <div className="review-box improved" style={{ background: '#ecfdf5', borderColor: '#6ee7b7' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <h4 style={{ color: '#047857', margin: 0 }}>Sugerencia IA</h4>
                                            {tokenUsage && (
                                                <span style={{ fontSize: '0.75rem', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                                                    ⚡ {tokenUsage.totalTokenCount} tokens
                                                </span>
                                            )}
                                        </div>
                                        <textarea
                                            value={improvedText}
                                            onChange={(e) => setImprovedText(e.target.value)}
                                            style={{
                                                width: '100%',
                                                minHeight: '300px',
                                                padding: '1.5rem',
                                                border: '2px solid #a7f3d0',
                                                borderRadius: '12px',
                                                fontFamily: 'inherit',
                                                fontSize: '1.2rem',
                                                lineHeight: '1.6',
                                                color: '#111827',
                                                background: '#ffffff',
                                                resize: 'vertical',
                                                marginTop: '0.5rem'
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="review-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                    <button
                                        className="review-btn cancel"
                                        onClick={discardAiChanges}
                                        style={{
                                            flex: 1,
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '2px solid #e5e7eb',
                                            background: 'white',
                                            color: '#4b5563',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <X size={20} /> Descartar
                                    </button>
                                    <button
                                        className="review-btn confirm"
                                        onClick={acceptAiChanges}
                                        style={{
                                            flex: 1,
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
                                        }}
                                    >
                                        <Check size={20} /> Aprobar Cambios
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <textarea
                                    className="report-textarea"
                                    placeholder="Escribe las observaciones detalladas aquí..."
                                    value={reportContent}
                                    onChange={(e) => setReportContent(e.target.value)}
                                />
                                <div className="report-actions">
                                    <div className="ai-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                                        <button
                                            className="ai-improve-btn"
                                            onClick={() => setShowAiMenu(!showAiMenu)}
                                            disabled={isImproving}
                                            title="Herramientas de Inteligencia Artificial"
                                        >
                                            <Sparkles size={16} className="sparkles-icon" />
                                            {isImproving ? 'Procesando...' : 'Mejorar con IA'}
                                        </button>

                                        {showAiMenu && (
                                            <div className="ai-menu-dropdown" style={{
                                                position: 'absolute',
                                                bottom: '100%',
                                                left: '0',
                                                marginBottom: '0.5rem',
                                                background: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                zIndex: 100,
                                                minWidth: '220px',
                                                overflow: 'hidden'
                                            }}>
                                                <button
                                                    onClick={() => handleAiAction('fix_grammar')}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}
                                                    onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                                >
                                                    <Check size={16} color="#10b981" /> Corregir Ortografía
                                                </button>
                                                <button
                                                    onClick={() => handleAiAction('restructure')}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#374151', borderTop: '1px solid #f3f4f6' }}
                                                    onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                                >
                                                    <FileText size={16} color="#6366f1" /> Reestructurar Texto
                                                </button>
                                                <button
                                                    onClick={() => handleAiAction('analyze_images')}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#374151', borderTop: '1px solid #f3f4f6' }}
                                                    onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                                >
                                                    <Camera size={16} color="#f59e0b" /> Analizar Imágenes
                                                </button>
                                                <button
                                                    onClick={() => { setShowAiMenu(false); setShowPromptInput(true); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#7c3aed', borderTop: '1px solid #f3f4f6', fontWeight: 'bold' }}
                                                    onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                                >
                                                    <Sparkles size={16} color="#7c3aed" /> Generar con Prompt
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button className="save-report-btn" onClick={handleSaveReport}>
                                        <Save size={16} /> Guardar Texto
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Prompt Input Modal */}
                    {showPromptInput && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', zIndex: 1100,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                                <h3 style={{ marginTop: 0, color: '#1f2937' }}>Generar Informe con IA</h3>
                                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>Describe detalladamente sobre qué quieres que trate el informe.</p>
                                <textarea
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    placeholder="Ej: Escribe un informe sobre la limpieza del sitio, la organización de las herramientas y el retiro de escombros..."
                                    style={{ width: '100%', minHeight: '120px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '1.5rem', fontFamily: 'inherit', resize: 'vertical' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button onClick={() => setShowPromptInput(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid #e5e7eb', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#374151' }}>Cancelar</button>
                                    <button
                                        onClick={() => {
                                            handleAiImprove('generate_report');
                                            setShowPromptInput(false);
                                        }}
                                        disabled={!promptText.trim()}
                                        style={{ padding: '0.6rem 1.2rem', border: 'none', background: '#7c3aed', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', opacity: !promptText.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Sparkles size={16} /> Generar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Evidence Section */}
                    <div className="evidence-section">
                        <div className="section-title">
                            <Camera size={18} />
                            <h3>Evidencia Fotográfica</h3>
                        </div>

                        <div className="evidence-controls-container">
                            <label htmlFor="modal-file-upload" className="upload-btn">
                                <Camera size={20} />
                                Agregar Fotos
                                <input
                                    id="modal-file-upload"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <p className="evidence-help-text">
                                Haz clic en una foto para verla en grande.<br />
                                Usa el botón rojo para eliminar.
                            </p>
                        </div>

                        <div className="modal-gallery">
                            {task.evidence && task.evidence.length > 0 ? (
                                task.evidence.map((ev) => (
                                    <div key={ev.id} className="modal-thumbnail-wrapper">
                                        <div className="modal-thumbnail" onClick={() => setSelectedEvidence(ev)}>
                                            <img src={`http://localhost:3000/${ev.file_path}`} alt="Evidencia" />
                                        </div>
                                        <button
                                            className="delete-evidence-btn"
                                            onClick={(e) => { e.stopPropagation(); setEvidenceToDelete(ev); }}
                                            title="Eliminar foto"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="no-evidence">No hay fotos adjuntas a este informe.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Internal Lightbox for Modal */}
                {selectedEvidence && (
                    <div className="inner-lightbox" onClick={() => setSelectedEvidence(null)}>
                        <img src={`http://localhost:3000/${selectedEvidence.file_path}`} alt="Evidencia Full" />
                    </div>
                )}
            </div>

            {/* Delete Evidence Confirmation */}
            <ConfirmationModal
                isOpen={!!evidenceToDelete}
                onClose={() => setEvidenceToDelete(null)}
                onConfirm={handleDeleteEvidence}
                title="¿Eliminar Foto?"
                message="Esta acción no se puede deshacer."
                confirmText="Eliminar Foto"
                isDestructive={true}
            />
        </div>
    );
};

ReportModal.propTypes = {
    task: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
};

export default ReportModal;

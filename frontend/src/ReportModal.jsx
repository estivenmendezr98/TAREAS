import { useState, useEffect, useCallback } from 'react';
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

    // Local ordered evidence (user can drag to reorder; doesn't affect DB order)
    const [orderedEvidence, setOrderedEvidence] = useState(() => task.evidence || []);
    const [dragIndex, setDragIndex] = useState(null);

    // Sync orderedEvidence when task.evidence changes (upload / delete)
    useEffect(() => {
        setOrderedEvidence(prev => {
            const currentIds = new Set((task.evidence || []).map(e => e.id));
            const kept = prev.filter(e => currentIds.has(e.id)); // preserve order for existing
            const prevIds = new Set(prev.map(e => e.id));
            const added = (task.evidence || []).filter(e => !prevIds.has(e.id)); // new ones appended
            return [...kept, ...added];
        });
    }, [task.evidence]);

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

    // Persist evidence order to DB
    const saveOrder = async (list) => {
        try {
            await axios.put('http://localhost:3000/api/evidence/reorder', {
                orderedIds: list.map(e => e.id)
            });
        } catch (error) {
            console.error('Error saving image order:', error);
        }
    };

    // --- Image selection (for Ctrl+C copy) ---
    const [selectedImages, setSelectedImages] = useState(new Set());

    const toggleSelectImage = useCallback((e, evId) => {
        e.stopPropagation(); // don't open fullscreen
        setSelectedImages(prev => {
            const next = new Set(prev);
            next.has(evId) ? next.delete(evId) : next.add(evId);
            return next;
        });
    }, []);

    // Ctrl+C → copy selected images to clipboard as PNG
    useEffect(() => {
        const handleKeyDown = async (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedImages.size > 0) {
                e.preventDefault();
                const toCopy = orderedEvidence.filter(ev => selectedImages.has(ev.id));

                // The Clipboard API only supports ONE ClipboardItem at a time.
                // To copy multiple images, we composite them into a single canvas
                // (stacked vertically with a small gap) and write one PNG blob.
                const combinedPngBlob = new Promise((resolve, reject) => {
                    let loaded = 0;
                    const imgs = toCopy.map(() => new Image());
                    const GAP = toCopy.length > 1 ? 16 : 0; // px gap between images

                    const onAllLoaded = () => {
                        const maxW = Math.max(...imgs.map(i => i.naturalWidth));
                        const totalH = imgs.reduce((sum, i) => sum + i.naturalHeight, 0) + GAP * (imgs.length - 1);
                        const canvas = document.createElement('canvas');
                        canvas.width = maxW;
                        canvas.height = totalH;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, maxW, totalH);
                        let y = 0;
                        imgs.forEach(img => {
                            // Center each image horizontally
                            const x = Math.floor((maxW - img.naturalWidth) / 2);
                            ctx.drawImage(img, x, y);
                            y += img.naturalHeight + GAP;
                        });
                        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
                    };

                    imgs.forEach((img, i) => {
                        img.crossOrigin = 'anonymous';
                        img.onload = () => { if (++loaded === imgs.length) onAllLoaded(); };
                        img.onerror = () => reject(new Error(`No se pudo cargar imagen ${i + 1}`));
                        img.src = `http://localhost:3000/${toCopy[i].file_path}`;
                    });
                });

                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': combinedPngBlob })
                    ]);
                    addToast(
                        toCopy.length === 1
                            ? 'Imagen copiada al portapapeles'
                            : `${toCopy.length} imágenes copiadas al portapapeles (combinadas)`,
                        'success'
                    );
                } catch (err) {
                    console.error('Clipboard error:', err.name, err.message);
                    addToast(`Error al copiar: ${err.message}`, 'error');
                }
            }
            // Escape clears selection
            if (e.key === 'Escape') {
                setSelectedImages(new Set());
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImages, orderedEvidence, addToast]);

    const [showAiMenu, setShowAiMenu] = useState(false);

    // Helper: converts markdown to HTML (bold, bullets, line breaks)
    const renderMarkdown = (text) => {
        if (!text) return '';
        // Normalize: collapse 3+ consecutive newlines to max 2, trim
        const normalized = text.replace(/\n{3,}/g, '\n\n').trim();
        const lines = normalized.split('\n');
        const result = [];
        let inList = false;
        let consecutiveBlanks = 0;

        lines.forEach((rawLine) => {
            const line = rawLine.trim();

            // Bullet list item: * or -
            if (/^[\*\-]\s+/.test(line)) {
                consecutiveBlanks = 0;
                if (!inList) { result.push('<ul style="margin:0.4rem 0 0.4rem 1.5rem;padding:0">'); inList = true; }
                const content = line.replace(/^[\*\-]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                result.push(`<li>${content}</li>`);
            } else {
                if (inList) { result.push('</ul>'); inList = false; }
                if (line === '') {
                    consecutiveBlanks++;
                    // Only emit ONE paragraph gap, no matter how many blank lines
                    if (consecutiveBlanks === 1) {
                        result.push('<div style="margin:0.4rem 0"></div>');
                    }
                } else {
                    consecutiveBlanks = 0;
                    const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    result.push(`<span>${formatted}</span><br/>`);
                }
            }
        });

        if (inList) result.push('</ul>');
        return result.join('');
    };


    const handleAiAction = (mode) => {
        setShowAiMenu(false);
        handleAiImprove(mode);
    };

    const handleAiImprove = async (mode = 'fix_grammar') => {
        if (mode !== 'analyze_images' && mode !== 'generate_report' && (!reportContent || reportContent.trim().length === 0)) {
            addToast('Escribe algo primero para mejorarlo', 'warning');
            return;
        }

        if (mode === 'analyze_images' && orderedEvidence.length === 0) {
            addToast('Sube fotos primero para analizarlas', 'warning');
            return;
        }

        setIsImproving(true);
        try {
            const payload = {
                text: mode === 'generate_report'
                    ? promptText
                    : mode === 'analyze_images'
                        // Pass task title + existing report text as rich context for image analysis
                        ? `Tarea: "${task.descripcion}"${reportContent && reportContent.trim() ? `\n\nObservaciones previas: "${reportContent.trim()}"` : ''}`
                        : reportContent,
                mode: mode,
                // Send images in the ORDER the user arranged them
                images: (mode === 'analyze_images' || mode === 'generate_report')
                    ? orderedEvidence.map(e => e.file_path)
                    : []
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

    const uploadFiles = async (files) => {
        if (!files || files.length === 0) return;

        const formData = new FormData();
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (validFiles.length === 0) {
            addToast('Solo se permiten imágenes', 'warning');
            return;
        }

        for (let i = 0; i < validFiles.length; i++) {
            formData.append('files', validFiles[i]);
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

    const handleFileUpload = (event) => {
        uploadFiles(event.target.files);
    };

    // Drag and Drop Logic
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        uploadFiles(files);
    };

    // Paste Logic
    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        const files = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                files.push(items[i].getAsFile());
            }
        }
        if (files.length > 0) {
            e.preventDefault(); // Prevent default paste behavior if images are found
            uploadFiles(files);
        }
    };

    // Attach paste listener globally when modal is open
    // We attach it to the window or document, but limit its effect to when this component is mounted

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                                        {/* Rendered preview with bold support */}
                                        <div
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(improvedText) }}
                                            style={{
                                                width: '100%',
                                                minHeight: '150px',
                                                padding: '1.5rem',
                                                border: '2px solid #a7f3d0',
                                                borderRadius: '12px',
                                                fontFamily: 'inherit',
                                                fontSize: '1rem',
                                                lineHeight: '1.7',
                                                color: '#111827',
                                                background: '#ffffff',
                                                marginTop: '0.5rem',
                                                boxSizing: 'border-box',
                                                overflowY: 'auto',
                                                maxHeight: '300px'
                                            }}
                                        />
                                        {/* Editable raw text below */}
                                        <textarea
                                            value={improvedText}
                                            onChange={(e) => setImprovedText(e.target.value)}
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '0.75rem',
                                                border: '1px dashed #a7f3d0',
                                                borderRadius: '8px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.85rem',
                                                lineHeight: '1.5',
                                                color: '#6b7280',
                                                background: '#f9fffe',
                                                resize: 'vertical',
                                                marginTop: '0.5rem',
                                                boxSizing: 'border-box'
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
                                {/* Rendered preview: shows bold text from **markdown** */}
                                {reportContent && reportContent.includes('**') ? (
                                    <div
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(reportContent) }}
                                        style={{
                                            width: '100%',
                                            minHeight: '120px',
                                            padding: '0.75rem',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontFamily: 'inherit',
                                            fontSize: '1rem',
                                            lineHeight: '1.7',
                                            color: '#111827',
                                            background: '#fafafa',
                                            boxSizing: 'border-box',
                                            overflowY: 'auto',
                                            maxHeight: '200px',
                                            marginBottom: '0.5rem',
                                        }}
                                    />
                                ) : null}
                                <textarea
                                    className="report-textarea"
                                    placeholder="Escribe las observaciones detalladas aquí..."
                                    value={reportContent}
                                    onChange={(e) => setReportContent(e.target.value)}
                                    style={reportContent && reportContent.includes('**') ? {
                                        fontSize: '0.82rem',
                                        fontFamily: 'monospace',
                                        color: '#6b7280',
                                        minHeight: '80px',
                                        background: '#f9fafb',
                                        borderStyle: 'dashed',
                                    } : {}}
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
                            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                                <h3 style={{ marginTop: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Sparkles size={20} color="#7c3aed" /> Generar Informe con IA
                                </h3>
                                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    Describe qué quieres que incluya el informe. La IA usará tu prompt junto con la evidencia fotográfica.
                                </p>

                                {/* Image badge */}
                                {orderedEvidence.length > 0 ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: '#f5f3ff', border: '1px solid #ddd6fe',
                                        borderRadius: '8px', padding: '0.6rem 1rem',
                                        marginBottom: '1rem', fontSize: '0.875rem', color: '#6d28d9'
                                    }}>
                                        <Camera size={16} color="#7c3aed" />
                                        <span>
                                            <strong>{orderedEvidence.length}</strong> {orderedEvidence.length === 1 ? 'imagen será' : 'imágenes serán'} incluidas en el análisis (en el orden actual)
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: '#f9fafb', border: '1px solid #e5e7eb',
                                        borderRadius: '8px', padding: '0.6rem 1rem',
                                        marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280'
                                    }}>
                                        <Camera size={16} color="#9ca3af" />
                                        <span>Sin imágenes adjuntas — el informe se generará solo con tu prompt</span>
                                    </div>
                                )}

                                <textarea
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    placeholder="Ej: Genera un informe paso a paso sobre la instalación eléctrica realizada, incluyendo los materiales utilizados y el estado final del área..."
                                    style={{ width: '100%', minHeight: '130px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '1.5rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button onClick={() => setShowPromptInput(false)} style={{ padding: '0.6rem 1.2rem', border: '1px solid #e5e7eb', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#374151' }}>Cancelar</button>
                                    <button
                                        onClick={() => {
                                            handleAiImprove('generate_report');
                                            setShowPromptInput(false);
                                        }}
                                        disabled={!promptText.trim()}
                                        style={{ padding: '0.6rem 1.2rem', border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', opacity: !promptText.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(124,58,237,0.4)' }}
                                    >
                                        <Sparkles size={16} /> {orderedEvidence.length > 0 ? 'Generar con Imágenes' : 'Generar'}
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

                        <div
                            className={`evidence-controls-container ${isDragging ? 'dragging' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            style={{
                                border: isDragging ? '2px dashed #7c3aed' : '2px dashed #e5e7eb',
                                backgroundColor: isDragging ? '#f5f3ff' : 'transparent',
                                transition: 'all 0.2s ease',
                                padding: '2rem',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center', // Center content
                                justifyContent: 'center',
                                gap: '1rem'
                            }}
                        >
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
                            <p className="evidence-help-text" style={{ textAlign: 'center', color: '#6b7280' }}>
                                Arrastra y suelta imágenes aquí<br />
                                O pega desde el portapapeles (CTRL + V)<br />
                                Haz clic en una foto para verla en grande.
                            </p>
                        </div>

                        <div className="modal-gallery">
                            {orderedEvidence.length > 0 ? (
                                orderedEvidence.map((ev, index) => (
                                    <div
                                        key={ev.id}
                                        className="modal-thumbnail-wrapper"
                                        draggable
                                        onDragStart={() => setDragIndex(index)}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            if (dragIndex === null || dragIndex === index) return;
                                            const newList = [...orderedEvidence];
                                            const [moved] = newList.splice(dragIndex, 1);
                                            newList.splice(index, 0, moved);
                                            setOrderedEvidence(newList);
                                            setDragIndex(index);
                                        }}
                                        onDragEnd={() => {
                                            setDragIndex(null);
                                            saveOrder(orderedEvidence);
                                        }}
                                        style={{
                                            opacity: dragIndex === index ? 0.4 : 1,
                                            cursor: 'grab',
                                            position: 'relative',
                                            transition: 'opacity 0.15s',
                                            outline: selectedImages.has(ev.id) ? '3px solid #3b82f6' : 'none',
                                            borderRadius: '10px'
                                        }}
                                    >
                                        {/* Order number badge — top left */}
                                        <div style={{
                                            position: 'absolute', top: 5, left: 5, zIndex: 10,
                                            background: '#3b82f6', color: 'white',
                                            borderRadius: '50%', width: 22, height: 22,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.7rem', fontWeight: 700,
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                                            pointerEvents: 'none', userSelect: 'none'
                                        }}>
                                            {index + 1}
                                        </div>

                                        {/* Selection checkbox — top right */}
                                        <div
                                            onClick={(e) => toggleSelectImage(e, ev.id)}
                                            title="Seleccionar para copiar (Ctrl+C)"
                                            style={{
                                                position: 'absolute', top: 5, right: 5, zIndex: 10,
                                                width: 20, height: 20, borderRadius: '4px',
                                                background: selectedImages.has(ev.id) ? '#3b82f6' : 'rgba(255,255,255,0.92)',
                                                border: selectedImages.has(ev.id) ? '2px solid #3b82f6' : '2px solid #d1d5db',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            {selectedImages.has(ev.id) && (
                                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>

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

                        {/* Selection hint bar */}
                        {selectedImages.size > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
                                padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe',
                                borderRadius: '8px', fontSize: '0.85rem', color: '#1d4ed8'
                            }}>
                                <span style={{ fontWeight: 600 }}>
                                    {selectedImages.size} imagen{selectedImages.size > 1 ? 'es' : ''} seleccionada{selectedImages.size > 1 ? 's' : ''}
                                </span>
                                <span>—</span>
                                <kbd style={{ background: '#dbeafe', padding: '2px 7px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', border: '1px solid #93c5fd' }}>Ctrl+C</kbd>
                                <span>para copiar al portapapeles</span>
                                <button
                                    onClick={() => setSelectedImages(new Set())}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.8rem', padding: '2px 6px' }}
                                    title="Limpiar selección (Escape)"
                                >✕ Limpiar</button>
                            </div>
                        )}
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

import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDestructive = false }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-icon-wrapper">
                    <AlertTriangle size={32} className={isDestructive ? 'text-danger' : 'text-warning'} />
                </div>
                <h3 className="confirm-title">{title}</h3>
                <p className="confirm-message">{message}</p>
                <div className="confirm-actions">
                    <button className="btn-cancel" onClick={onClose}>{cancelText}</button>
                    <button className={`btn-confirm ${isDestructive ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

ConfirmationModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    isDestructive: PropTypes.bool,
};

export default ConfirmationModal;

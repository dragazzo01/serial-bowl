// renderer/src/components/ConfirmationDialog.tsx
import React from 'react';
import './ConfirmationDialogue.css';

interface ConfirmationDialogueProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmationDialogue: React.FC<ConfirmationDialogueProps> = ({
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    return (
        <div className="confirmation-dialog-overlay">
            <div className="confirmation-dialog">
                <p>{message}</p>
                <div className="button-group">
                    <button onClick={onConfirm} className="confirm-button">
                        {confirmText}
                    </button>
                    <button onClick={onCancel} className="cancel-button">
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationDialogue;
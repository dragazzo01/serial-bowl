// renderer/src/hooks/useConfirmation.ts
import { useState } from 'react';

const useConfirmation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<{
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
    } | null>(null);

    const askConfirmation = (
        message: string,
        onConfirm: () => void,
        confirmText?: string,
        cancelText?: string
    ) => {
        setIsOpen(true);
        setConfig({
            message,
            onConfirm,
            confirmText,
            cancelText
        });
    };

    const handleConfirm = () => {
        config?.onConfirm();
        setIsOpen(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    return {
        isOpen,
        askConfirmation,
        handleConfirm,
        handleCancel,
        config
    };
};

export default useConfirmation;
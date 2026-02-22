
import React, { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
    maxWidth?: string;
    fullScreen?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, maxWidth = 'max-w-md', fullScreen = false }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] transition-opacity duration-300 ${fullScreen ? 'p-0' : 'p-4'}`}
            onClick={onClose}
        >
            <div
                className={`${fullScreen ? 'w-screen h-screen' : `page-card w-full ${maxWidth} rounded-[2rem]`} bg-gray-800/80 backdrop-blur-sm transform transition-all duration-300 scale-100 opacity-100 animate-fade-in-scale`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
            <style>{`
                @keyframes fade-in-scale {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
            `}</style>
        </div>
    );
};

export default Modal;

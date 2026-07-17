
import React, { useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
    maxWidth?: string;
    fullScreen?: boolean;
    zIndex?: string;
    plain?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, maxWidth = 'max-w-md', fullScreen = false, zIndex = 'z-[100]', plain = false }) => {
    const { advancedSettings } = useContext(AppContext);
    const uiTheme = advancedSettings?.uiTheme || 'default';
    const themeMode = advancedSettings?.themeMode || 'dark';
    const isLightMode = themeMode === 'light';

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = () => {
        onClose();
    };

    const modalContent = (
        <div 
            className={`fixed inset-0 bg-[#0B0E11]/80 backdrop-blur-sm flex items-center justify-center ${zIndex} transition-opacity duration-300 modal-overlay ui-${uiTheme} theme-${themeMode} ${!isLightMode ? 'dark' : ''}`}
            onClick={handleOverlayClick}
        >
            <div
                className={`${fullScreen ? 'w-full h-[100dvh] max-w-none max-h-none flex flex-col' : plain ? `w-full ${maxWidth} rounded-[3rem] shadow-2xl max-h-[95vh] flex flex-col my-auto` : `page-card w-full ${maxWidth} rounded-3xl shadow-2xl max-h-[95vh] flex flex-col my-auto`} transform transition-all duration-300 scale-100 opacity-100 animate-modal-in overflow-hidden font-sans text-slate-800 dark:text-[#EAECEF]`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`flex-grow ${fullScreen ? 'overflow-hidden flex flex-col' : 'overflow-y-auto overscroll-contain no-scrollbar scroll-smooth'}`}>
                    {children}
                </div>
            </div>
            <style>{`
                @keyframes modal-in {
                    from { transform: scale(0.98) translateY(10px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-modal-in { animation: modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;

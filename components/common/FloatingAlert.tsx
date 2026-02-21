import React, { useEffect, useState } from 'react';

export interface FloatingAlertProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    /**
     * Optional image source for the app icon. 
     * If not provided, a default bell icon or type-specific icon will be used.
     */
    imageSrc?: string;
    actionLabel?: string;
    onAction?: () => void;
    /**
     * Duration in milliseconds to auto-dismiss.
     * Set to 0 to disable auto-dismiss.
     * Default: 5000ms
     */
    duration?: number;
}

const FloatingAlert: React.FC<FloatingAlertProps> = ({
    isOpen,
    onClose,
    title,
    message,
    imageSrc,
    actionLabel,
    onAction,
    duration = 5000
}) => {
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
        } else {
            // Start exit animation
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 400); // Match animation duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setShouldRender(false);
        }, 400);
    };

    if (!shouldRender) return null;

    return (
        <>
            <div 
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-sm sm:max-w-md md:max-w-lg
                    ${isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade-in'}
                    flex flex-col gap-3 p-4 rounded-3xl
                    backdrop-blur-xl bg-white/10 border border-white/20
                    shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
                    text-white transition-all duration-300 ease-in-out cursor-pointer hover:bg-white/15`}
                onClick={handleClose}
                role="alert"
            >
                <div className="flex items-start gap-4">
                    {/* App Icon / Image */}
                    <div className="flex-shrink-0">
                        {imageSrc ? (
                            <img src={imageSrc} alt="App Icon" className="w-12 h-12 rounded-xl object-cover shadow-lg bg-black/20" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg border border-white/10">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                        <h4 className="text-base font-bold text-white leading-tight drop-shadow-md">{title}</h4>
                        <p className="mt-1 text-sm text-gray-200 leading-snug opacity-90 font-medium">{message}</p>
                    </div>

                    {/* Close Button (Small) */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClose();
                        }}
                        className="flex-shrink-0 text-white/50 hover:text-white transition-colors p-1"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Optional Action Button */}
                {actionLabel && onAction && (
                    <div className="flex justify-end pt-2 border-t border-white/10 mt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAction();
                            }}
                            className="text-xs font-black uppercase tracking-widest text-blue-300 hover:text-blue-100 transition-colors px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/30 border border-blue-400/20"
                        >
                            {actionLabel}
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slide-down-fade-in {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                }
                @keyframes slide-up-fade-out {
                    from {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translate(-50%, -20px) scale(0.95);
                    }
                }
                .animate-slide-down-fade-in {
                    animation: slide-down-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-slide-up-fade-out {
                    animation: slide-up-fade-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </>
    );
};

export default FloatingAlert;

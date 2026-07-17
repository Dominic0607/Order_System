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
    /**
     * Notification alert type.
     * Determines the accent colors, icons, and progress bar style.
     * Default: 'info'
     */
    type?: 'success' | 'info' | 'error';
}

const FloatingAlert: React.FC<FloatingAlertProps> = ({
    isOpen,
    onClose,
    title,
    message,
    imageSrc,
    actionLabel,
    onAction,
    duration = 5000,
    type = 'info'
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

    // Type-specific styles mapping
    const themeStyles = {
        success: {
            border: 'border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_15px_40px_rgba(16,185,129,0.12)]',
            accent: 'bg-gradient-to-r from-emerald-500 to-teal-500',
            iconContainer: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-400',
            titleText: 'text-emerald-400',
            progress: 'bg-emerald-500/30',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )
        },
        error: {
            border: 'border-rose-500/20 hover:border-rose-500/40 shadow-[0_15px_40px_rgba(244,63,94,0.12)]',
            accent: 'bg-gradient-to-r from-rose-500 to-red-500',
            iconContainer: 'bg-gradient-to-br from-rose-500/10 to-red-500/10 border-rose-500/30 text-rose-400',
            titleText: 'text-rose-400',
            progress: 'bg-rose-500/30',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        info: {
            border: 'border-blue-500/20 hover:border-blue-500/40 shadow-[0_15px_40px_rgba(59,130,246,0.12)]',
            accent: 'bg-gradient-to-r from-blue-500 to-indigo-500',
            iconContainer: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-400',
            titleText: 'text-blue-400',
            progress: 'bg-blue-500/30',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            )
        }
    };

    const currentStyle = themeStyles[type] || themeStyles.info;

    return (
        <>
            <div 
                className={`relative z-[110] w-full overflow-hidden
                    ${isClosing ? 'animate-alert-fade-out' : 'animate-alert-fade-in'}
                    flex flex-col gap-3 p-4 rounded-[1.5rem]
                    backdrop-blur-xl bg-[#0b0f19]/90 border
                    text-white transition-all duration-300 ease-in-out cursor-pointer hover:bg-[#0b0f19]/95
                    ${currentStyle.border}`}
                onClick={handleClose}
                role="alert"
            >
                {/* Top Colored Accent line */}
                <div className={`absolute top-0 left-0 w-full h-[3px] ${currentStyle.accent}`}></div>

                <div className="relative p-0.5 flex items-start gap-4 z-10">
                    {/* App Icon / Image */}
                    <div className="flex-shrink-0">
                        {imageSrc ? (
                            <img src={imageSrc} alt="App Icon" className="w-11 h-11 rounded-xl object-cover shadow-lg bg-black/20 border border-white/5" />
                        ) : (
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border ${currentStyle.iconContainer}`}>
                                {currentStyle.icon}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className={`text-sm font-black leading-none uppercase tracking-wider ${currentStyle.titleText}`}>{title}</h4>
                        <p className="mt-1.5 text-xs text-slate-300 leading-snug font-medium">{message}</p>
                    </div>

                    {/* Close Button (Small) */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClose();
                        }}
                        className="flex-shrink-0 text-white/30 hover:text-white transition-colors p-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Optional Action Button */}
                {actionLabel && onAction && (
                    <div className="flex justify-end pt-2 border-t border-white/5 mt-0.5 z-10">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAction();
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 shadow-lg"
                        >
                            {actionLabel}
                        </button>
                    </div>
                )}

                {/* Auto-Dismiss Progress Bar */}
                {duration > 0 && (
                    <div 
                        className={`absolute bottom-0 left-0 h-[2.5px] w-full ${currentStyle.progress}`}
                        style={{ 
                            transformOrigin: 'left',
                            animation: `shrinkWidth ${duration}ms linear forwards`
                        }}
                    ></div>
                )}
            </div>

            <style>{`
                @keyframes alert-fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes alert-fade-out {
                    from {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.95);
                    }
                }
                @keyframes shrinkWidth {
                    from {
                        transform: scaleX(1);
                    }
                    to {
                        transform: scaleX(0);
                    }
                }
                .animate-alert-fade-in {
                    animation: alert-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-alert-fade-out {
                    animation: alert-fade-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </>
    );
};
export default FloatingAlert;

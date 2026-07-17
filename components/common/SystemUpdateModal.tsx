import React, { useState } from 'react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { APP_LOGO_URL } from '../../constants';

interface SystemUpdateModalProps {
    newVersion: string;
    currentVersion: string;
    language?: 'km' | 'en';
    onUpdateStart?: () => Promise<void>;
}

const SystemUpdateModal: React.FC<SystemUpdateModalProps> = ({ 
    newVersion, 
    currentVersion, 
    language = 'km',
    onUpdateStart
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleUpdate = async () => {
        setIsUpdating(true);

        if (onUpdateStart) {
            try {
                await onUpdateStart();
            } catch (e) {
                console.warn("onUpdateStart failed:", e);
            }
        }

        // Prevent infinite reload loops by storing the acknowledged version in localStorage
        try {
            localStorage.setItem('system_update_acknowledged_version', newVersion);
        } catch (e) {
            console.warn("Failed to set localStorage:", e);
        }

        // === v1.1.0 SPECIAL: Auto-switch to Light Mode ===
        // When updating to v1.1.0, force themeMode → 'light' and uiTheme → 'neumorphism'
        // so users get the new Neumorphism UI experience immediately after reload.
        if (newVersion === "1.1.0") {
            try {
                const savedSettings = localStorage.getItem('advancedSettings');
                const currentSettings = savedSettings ? JSON.parse(savedSettings) : {};
                const updatedSettings = {
                    ...currentSettings,
                    themeMode: 'light',
                    uiTheme: 'neumorphism',
                };
                localStorage.setItem('advancedSettings', JSON.stringify(updatedSettings));
                console.log("[Update v1.1.0] ✅ Auto-switched to Light Mode + Neumorphism UI");
            } catch (e) {
                console.warn("[Update v1.1.0] Failed to auto-switch theme:", e);
            }
        }

        // Run progress from 0% to 100%
        let currentProgress = 0;
        const interval = setInterval(() => {
            // Random step increment between 3 and 12 for a realistic network progress feel
            currentProgress += Math.floor(Math.random() * 10) + 3;
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    window.location.reload();
                }, 400); // Brief pause at 100% for user feedback satisfaction
            }
            setProgress(currentProgress);
        }, 90); // Takes ~1.5 - 2 seconds to complete
    };

    const text = {
        km: {
            title: "អាប់ដេតប្រព័ន្ធថ្មី!",
            desc: `ប្រព័ន្ធ O-System ត្រូវបានដំឡើងទៅជំនាន់ថ្មី v${newVersion} រួចរាល់ហើយ (ជំនាន់បច្ចុប្បន្នរបស់អ្នកគឺ v${currentVersion})។ សូមធ្វើការធ្វើបច្ចុប្បន្នភាពឥឡូវនេះ ដើម្បីទទួលបានមុខងារថ្មីៗ និងការកែសម្រួលប្រព័ន្ធដ៏ល្អប្រសើរ។`,
            btn: "ធ្វើបច្ចុប្បន្នភាពឥឡូវនេះ",
            updating: "កំពុងដំឡើងកំណែថ្មី...",
            warning: "ទិន្នន័យដែលកំពុងវាយបញ្ចូល (បើមាន) នឹងមិនត្រូវបានរក្សាទុកឡើយ។"
        },
        en: {
            title: "System Update Available!",
            desc: `O-System has been successfully upgraded to v${newVersion} (your current version is v${currentVersion}). Please update now to experience the latest features, enhancements, and bug fixes.`,
            btn: "Update System Now",
            updating: "Installing updates...",
            warning: "Any unsaved changes will be lost during reload."
        }
    }[language === 'km' ? 'km' : 'en'];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
            {/* Frosted glass background overlay */}
            <div className="absolute inset-0 bg-[#000000]/60 backdrop-blur-[16px] transition-opacity duration-500"></div>

            {/* Glowing animated background elements */}
            <div className="absolute w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
            <div className="absolute w-[200px] h-[200px] bg-yellow-500/5 rounded-full blur-[80px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

            {/* Modal Card */}
            <div 
                className="relative w-full max-w-lg bg-[#0e1114]/80 border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-2xl text-center flex flex-col items-center gap-6 animate-reveal transform hover:scale-[1.01] transition-transform duration-500"
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 40px 0px rgba(59, 130, 246, 0.1)',
                    fontFamily: language === 'km' ? "'Kantumruy Pro', sans-serif" : "'Inter', sans-serif"
                }}
            >
                {/* Brand Logo */}
                <div className="flex flex-col items-center gap-2">
                    <img
                        src={APP_LOGO_URL}
                        alt="O-System Logo"
                        className="w-16 h-16 object-cover"
                    />
                    <span className="text-[11px] font-semibold tracking-[0.15em] text-white/30 uppercase">O-System</span>
                </div>

                {/* Visual Icon Container with multi-layered glow */}
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/20 group">
                    <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-md animate-ping"></div>
                    <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-sm"></div>
                    <RefreshCw 
                        className={`w-9 h-9 text-blue-400 ${isUpdating ? 'animate-spin' : 'animate-[spin_10s_linear_infinite]'}`} 
                        strokeWidth={2.5}
                    />
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                    </div>
                </div>

                {/* Typography Header */}
                <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f1f3f5] to-blue-400 tracking-tight" style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
                        {text.title}
                    </h2>
                    <div className="inline-flex gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3.5 py-1 rounded-full border border-blue-500/20">
                        <span>v{currentVersion}</span>
                        <span className="opacity-50">→</span>
                        <span className="text-yellow-400">v{newVersion}</span>
                    </div>
                </div>

                {/* Body Text */}
                <p className="text-sm leading-relaxed text-[#b7bdc6] opacity-90">
                    {text.desc}
                </p>

                {isUpdating ? (
                    /* Progress Bar Layout */
                    <div className="w-full space-y-3.5 py-2 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-[#b7bdc6] px-1">
                            <span className="flex items-center gap-2 text-blue-400">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                {text.updating}
                            </span>
                            <span className="text-yellow-400 font-mono text-sm tracking-wide">{progress}%</span>
                        </div>
                        {/* Progress Bar Track */}
                        <div className="w-full h-3 rounded-full bg-white/5 border border-white/10 overflow-hidden p-0.5">
                            {/* Animated glowing bar */}
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 transition-all duration-100 ease-out relative"
                                style={{ 
                                    width: `${progress}%`,
                                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.45)'
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Warning message */}
                        <div className="flex items-center gap-2 text-rose-400/80 bg-rose-500/5 border border-rose-500/10 rounded-xl px-4 py-2.5 text-xs max-w-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="text-left font-medium">{text.warning}</span>
                        </div>

                        {/* Premium Button */}
                        <button
                            onClick={handleUpdate}
                            className="relative w-full overflow-hidden group/btn py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                            <span className="relative flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-700" />
                                {text.btn}
                            </span>
                        </button>
                    </>
                )}
            </div>

            {/* Custom Keyframe Styles */}
            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(250%); }
                }
                .animate-reveal {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); filter: blur(10px); }
                    to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default SystemUpdateModal;

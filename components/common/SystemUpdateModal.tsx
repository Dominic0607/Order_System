import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ImageIcon, RefreshCw, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { APP_LOGO_URL } from '../../constants';
import { getAppIconUrl } from '../../constants/appIcon';
import { applyAppIconUpdate, getAppIconStatus, needsAppIconUpdate } from '../../utils/appIconUtils';

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

    const isKh = language === 'km';
    const isIconUpdateRelease = newVersion === '1.1.1';
    const iconUpdateNeeded = isIconUpdateRelease && needsAppIconUpdate();
    const iconStatus = getAppIconStatus();

    const text = useMemo(() => ({
        km: {
            title: 'អាប់ដេតប្រព័ន្ធ O-System',
            subtitle: `កំណែថ្មី v${newVersion} រួចរាល់សម្រាប់ការដំឡើង`,
            desc: `ប្រព័ន្ធត្រូវបានអាប់ដេតទៅកាន់កំណែ v${newVersion} ដើម្បីបន្ថែមមុខងារថ្មីៗ បង្កើនល្បឿនដំណើរការកម្មវិធី និងធានាស្ថិរភាពការងារឱ្យកាន់តែល្អប្រសើរ។`,
            btn: 'ធ្វើបច្ចុប្បន្នភាពឥឡូវនេះ',
            updating: 'កំពុងធ្វើបច្ចុប្បន្នភាព...',
            warning: '⚠️ រាល់ព័ត៌មានដែលកំពុងវាយបញ្ចូល ត្រូវបានរក្សាទុកជា Draft ស្វ័យប្រវត្តិតាមគណនីរបស់អ្នករួចរាល់ហើយ។',
            badge: 'កំណែទម្រង់ថ្មី',
            bullets: [
                '🚀 បង្កើនល្បឿន និងស្ថិរភាពការងារទូទៅ',
                '🛠️ ជួសជុលកំហុស និងពង្រឹងសុវត្ថិភាពទិន្នន័យ',
                '✨ ទទួលបានបទពិសោធន៍រលូនជាមួយមុខងារថ្មីៗ'
            ],
            steps: ['កំពុងរៀបចំ...', 'កំពុងអនុវត្ត...', 'កំពុងផ្ទុកឡើងវិញ...']
        },
        en: {
            title: 'O-System Update Ready',
            subtitle: `Version v${newVersion} is ready to install`,
            desc: `O-System has been updated to v${newVersion} to deliver new features, optimize app performance, and ensure database stability.`,
            btn: 'Update System Now',
            updating: 'Installing updates...',
            warning: 'Any active form inputs have been automatically saved as a draft for your account.',
            badge: 'New Release',
            bullets: [
                '🚀 Enhanced app performance and overall stability',
                '🛠️ Bug fixes and data security improvements',
                '✨ Access to the latest updates and smoother experience'
            ],
            steps: ['Preparing...', 'Applying...', 'Refreshing...']
        }
    }[isKh ? 'km' : 'en']), [isKh, newVersion]);

    const handleUpdate = async () => {
        setIsUpdating(true);

        if (onUpdateStart) {
            try {
                await onUpdateStart();
            } catch (e) {
                console.warn('onUpdateStart failed:', e);
            }
        }

        try {
            localStorage.setItem('system_update_acknowledged_version', newVersion);
        } catch (e) {
            console.warn('Failed to set localStorage:', e);
        }

        // PWA Service Worker skip waiting and cache clearing coordination
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg && reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    console.log('[SystemUpdate] Sent SKIP_WAITING to waiting service worker');
                }
                
                if (newVersion === '1.1.1') {
                    const activeWorker = navigator.serviceWorker.controller;
                    if (activeWorker) {
                        activeWorker.postMessage({ type: 'CLEAR_ICON_CACHE' });
                        console.log('[SystemUpdate] Sent CLEAR_ICON_CACHE to active service worker');
                    }
                }
            } catch (swErr) {
                console.warn('[SystemUpdate] SW skipWaiting/clearCache failed:', swErr);
            }
        }

        if (newVersion === '1.1.0') {
            try {
                const savedSettings = localStorage.getItem('advancedSettings');
                const currentSettings = savedSettings ? JSON.parse(savedSettings) : {};
                const updatedSettings = {
                    ...currentSettings,
                    themeMode: 'light',
                    uiTheme: 'neumorphism',
                };
                localStorage.setItem('advancedSettings', JSON.stringify(updatedSettings));
                console.log('[Update v1.1.0] ✅ Auto-switched to Light Mode + Neumorphism UI');
            } catch (e) {
                console.warn('[Update v1.1.0] Failed to auto-switch theme:', e);
            }
        }

        if (newVersion === '1.1.1' && iconUpdateNeeded) {
            try {
                await applyAppIconUpdate(newVersion);
                console.log('[Update v1.1.1] ✅ App icon refreshed automatically');
            } catch (e) {
                console.warn('[Update v1.1.1] Failed to auto-update app icon:', e);
            }
        }

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.floor(Math.random() * 10) + 3;
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    window.location.reload();
                }, 400);
            }
            setProgress(currentProgress);
        }, 90);
    };

    const currentPhase = progress < 35
        ? text.steps[0]
        : progress < 75
            ? text.steps[1]
            : text.steps[2];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden p-3 sm:p-4">
            <div className="absolute inset-0 bg-[#000000]/70 backdrop-blur-[16px] transition-opacity duration-500"></div>
            <div className="absolute h-[240px] w-[240px] rounded-full bg-blue-500/10 blur-[100px] animate-pulse pointer-events-none"></div>

            <div
                className="relative mx-auto w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#0d1117]/90 p-5 text-center shadow-2xl shadow-black/60 backdrop-blur-2xl animate-reveal sm:rounded-[2rem] sm:p-6"
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px 0 rgba(59, 130, 246, 0.1)',
                    fontFamily: isKh ? "'Kantumruy Pro', sans-serif" : "'Inter', sans-serif"
                }}
            >
                <div className="flex flex-col items-center gap-4">
                    {/* Header: Logo and App Name */}
                    <div className="flex items-center gap-2">
                        <img src={APP_LOGO_URL} alt="O-System Logo" className="h-8 w-8 rounded-lg object-cover" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">O-System</span>
                    </div>

                    {/* Rotating Indicator */}
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600/10">
                        <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-sm animate-ping"></div>
                        <RefreshCw
                            className={`h-6 w-6 text-blue-400 ${isUpdating ? 'animate-spin' : 'animate-[spin_12s_linear_infinite]'}`}
                            strokeWidth={2.5}
                        />
                        <div className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/20">
                            <Sparkles className="h-2.5 w-2.5 text-yellow-400 animate-pulse" />
                        </div>
                    </div>

                    {/* Title & Version info */}
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                            {text.title}
                        </h2>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-400">
                            <span>v{currentVersion}</span>
                            <span className="text-white/20">→</span>
                            <span>v{newVersion}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs leading-relaxed text-[#9aa4b2]">
                        {text.desc}
                    </p>

                    {/* Checklist: Compact */}
                    <div className="w-full space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left">
                        {text.bullets.map((item) => (
                            <div key={item} className="flex items-center gap-2 py-0.5">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                <span className="text-xs text-[#dce3ea] font-medium">{item}</span>
                            </div>
                        ))}
                    </div>

                    {isUpdating ? (
                        /* Updating Progress Indicator */
                        <div className="w-full space-y-2 py-1 animate-fade-in">
                            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-[#b7bdc6]">
                                <span className="flex items-center gap-1.5 text-blue-400">
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    {text.updating}
                                </span>
                                <span className="font-mono text-xs text-yellow-400">{progress}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/5 p-0.5">
                                <div
                                    className="relative h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-100 ease-out"
                                    style={{
                                        width: `${progress}%`,
                                        boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)'
                                    }}
                                >
                                    <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12"></div>
                                </div>
                            </div>
                            <div className="text-center text-[10px] text-[#9aa4b2]">{currentPhase}</div>
                        </div>
                    ) : (
                        /* Action and Alert */
                        <>
                            <div className="flex w-full items-start gap-2 rounded-xl border border-rose-500/10 bg-rose-500/5 p-3 text-[11px] text-rose-300/90">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span className="text-left font-medium leading-relaxed">{text.warning}</span>
                            </div>

                            <button
                                onClick={handleUpdate}
                                className="group/btn relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 h-full w-[50%] -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                                <span className="relative flex items-center justify-center gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5 transition-transform duration-700 group-hover/btn:rotate-180" />
                                    {text.btn}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(250%); }
                }
                .animate-reveal {
                    animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
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

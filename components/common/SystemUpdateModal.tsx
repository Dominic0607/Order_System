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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden p-2 sm:p-4">
            <div className="absolute inset-0 bg-[#000000]/65 backdrop-blur-[16px] transition-opacity duration-500"></div>
            <div className="absolute h-[280px] w-[280px] rounded-full bg-blue-500/10 blur-[110px] animate-pulse pointer-events-none"></div>
            <div className="absolute h-[200px] w-[200px] rounded-full bg-yellow-500/5 blur-[90px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

            <div
                className="relative mx-auto w-full max-h-[90dvh] max-w-xl overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#0d1117]/85 p-4 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl animate-reveal sm:rounded-[2rem] sm:p-8"
                style={{
                    boxShadow: '0 30px 70px -18px rgba(0, 0, 0, 0.8), 0 0 40px 0 rgba(59, 130, 246, 0.12)',
                    fontFamily: isKh ? "'Kantumruy Pro', sans-serif" : "'Inter', sans-serif"
                }}
            >
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-2">
                        <img src={APP_LOGO_URL} alt="O-System Logo" className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">O-System</span>
                    </div>

                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600/10 sm:h-20 sm:w-20">
                        <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-md animate-ping"></div>
                        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-sm"></div>
                        <RefreshCw
                            className={`h-7 w-7 text-blue-400 sm:h-9 sm:w-9 ${isUpdating ? 'animate-spin' : 'animate-[spin_10s_linear_infinite]'}`}
                            strokeWidth={2.5}
                        />
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/20 sm:h-6 sm:w-6">
                            <Sparkles className="h-3 w-3 text-yellow-400 animate-pulse sm:h-3.5 sm:w-3.5" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                            <Zap className="h-3.5 w-3.5" />
                            <span>{text.badge}</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f1f3f5] to-blue-400 sm:text-3xl">
                            {text.title}
                        </h2>
                        <p className="text-sm text-[#9aa4b2]">{text.subtitle}</p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#dce3ea]">
                        <span>v{currentVersion}</span>
                        <span className="text-white/35">→</span>
                        <span className="text-yellow-400">v{newVersion}</span>
                    </div>

                    <p className="max-w-lg text-sm leading-relaxed text-[#b7bdc6]">
                        {text.desc}
                    </p>

                    <div className="w-full space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa4b2] mb-1">
                            {isKh ? 'ការកែលម្អសំខាន់ៗ' : 'Key improvements'}
                        </div>
                        {text.bullets.map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-xl bg-[#0c1016]/50 border border-white/[0.03] p-3 transition-all hover:bg-[#0c1016]/70">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                <span className="text-xs sm:text-sm text-[#dce3ea] font-medium">{item}</span>
                            </div>
                        ))}
                    </div>

                    {isIconUpdateRelease && (
                        <div className="w-full rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 text-left">
                            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>{isKh ? 'មុខងារពិសេសក្នុងកំណែនេះ' : 'Highlights in this release'}</span>
                            </div>
                            <ul className="space-y-2 text-sm text-[#b7bdc6]">
                                <li className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                    <span>{isKh ? 'ការហៅបន្ទាប់ និងការជួបជុំតាមវីដេអូបានស្ថិតនៅក្នុង Chat' : 'Audio, video, and group calling built directly into Chat'}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                    <span>{isKh ? 'Mini App OTO Chat ធ្វើឱ្យការងាររហ័ស និងទំនាក់ទំនងកាន់តែរលូន' : 'OTO Chat mini-app support for faster workflows and richer interaction'}</span>
                                </li>
                            </ul>
                        </div>
                    )}

                    {isIconUpdateRelease && (
                        <div className={`w-full rounded-2xl border p-4 text-left ${iconUpdateNeeded ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    <span>{isKh ? 'ស្ថានភាព App Icon' : 'App Icon Status'}</span>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${iconUpdateNeeded ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                                    {iconUpdateNeeded
                                        ? (isKh ? 'Logo ចាស់' : 'Old Logo')
                                        : (isKh ? 'Logo ថ្មី' : 'New Logo')}
                                </span>
                            </div>

                            <div className="mb-3 flex items-center justify-center gap-4">
                                <div className="flex flex-col items-center gap-1.5">
                                    <img
                                        src={getAppIconUrl('logo.png', '1.0.0')}
                                        alt={isKh ? 'Logo ចាស់' : 'Old logo'}
                                        className={`h-14 w-14 rounded-2xl object-cover border ${iconUpdateNeeded ? 'border-amber-500/30 opacity-100' : 'border-white/10 opacity-40'}`}
                                    />
                                    <span className="text-[10px] uppercase tracking-wider text-[#9aa4b2]">{isKh ? 'ចាស់' : 'Old'}</span>
                                </div>
                                <span className="text-lg text-white/30">→</span>
                                <div className="flex flex-col items-center gap-1.5">
                                    <img
                                        src={getAppIconUrl('logo.png')}
                                        alt={isKh ? 'Logo ថ្មី' : 'New logo'}
                                        className={`h-14 w-14 rounded-2xl object-cover border ${iconUpdateNeeded ? 'border-emerald-500/30' : 'border-emerald-500/40'}`}
                                    />
                                    <span className="text-[10px] uppercase tracking-wider text-emerald-400">{isKh ? 'ថ្មី' : 'New'}</span>
                                </div>
                            </div>

                            <p className="text-sm leading-relaxed text-[#b7bdc6]">
                                {iconUpdateNeeded
                                    ? (isKh
                                        ? 'ឧបករណ៍របស់អ្នកនៅតែប្រើ Logo Icon ចាស់។ សូមចុច «ធ្វើបច្ចុប្បន្នភាពឥឡូវនេះ» ដើម្បីប្តូរទៅ Logo ថ្មីដោយស្វ័យប្រវត្តិ។'
                                        : 'Your device is still using the old app icon. Tap "Update System Now" to switch to the new logo automatically.')
                                    : (isKh
                                        ? 'Logo Icon ថ្មីត្រូវបានដំឡើងរួចរាល់ហើយលើឧបករណ៍របស់អ្នក។'
                                        : 'The new app icon is already active on your device.')}
                            </p>

                            {iconStatus === 'unknown' && !iconUpdateNeeded && (
                                <p className="mt-2 text-xs text-[#9aa4b2]">
                                    {isKh ? 'ស្ថានភាព icon ត្រូវបានផ្ទៀងផ្ទាត់ពីការដំឡើងកំណែចុងក្រោយ។' : 'Icon status was verified from your latest update.'}
                                </p>
                            )}
                        </div>
                    )}

                    {isUpdating ? (
                        <div className="w-full space-y-3.5 py-2 animate-fade-in">
                            <div className="flex items-center justify-between px-1 text-xs font-semibold text-[#b7bdc6]">
                                <span className="flex items-center gap-2 text-blue-400">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    {text.updating}
                                </span>
                                <span className="font-mono text-sm tracking-wide text-yellow-400">{progress}%</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/5 p-0.5">
                                <div
                                    className="relative h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 transition-all duration-100 ease-out"
                                    style={{
                                        width: `${progress}%`,
                                        boxShadow: '0 0 12px rgba(59, 130, 246, 0.45)'
                                    }}
                                >
                                    <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12"></div>
                                </div>
                            </div>
                            <div className="text-center text-sm text-[#9aa4b2]">{currentPhase}</div>
                        </div>
                    ) : (
                        <>
                            <div className="flex w-full items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span className="text-left font-semibold leading-relaxed">{text.warning}</span>
                            </div>

                            <button
                                onClick={handleUpdate}
                                className="group/btn relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 active:scale-[0.98] sm:py-4"
                            >
                                <div className="absolute inset-0 h-full w-[50%] -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                                <span className="relative flex items-center justify-center gap-2">
                                    <RefreshCw className="h-4 w-4 transition-transform duration-700 group-hover/btn:rotate-180" />
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

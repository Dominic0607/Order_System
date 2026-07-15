import React, { useContext, useState, useMemo, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import Modal from './Modal';
import { requestNotificationPermission, sendSystemNotification } from '../../utils/notificationUtils';
import { translations } from '../../translations';
import { NOTIFICATION_SOUNDS } from '../../constants';

interface AdvancedSettingsModalProps {
    onClose: () => void;
}

type SettingsTab = 'interface' | 'audio' | 'privacy' | 'system';

const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({ onClose }) => {
    const { advancedSettings, setAdvancedSettings, language, showNotification } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<SettingsTab>('interface');
    const [isTesting, setIsTesting] = useState(false);
    const lastSoundPlayRef = useRef<number>(0);

    const t = translations[language || 'en'];
    const uiTheme = advancedSettings?.uiTheme || 'default';
    const isLightMode = advancedSettings?.themeMode === 'light';

    if (!advancedSettings || !setAdvancedSettings) return null;

    const getAccentColor = () => {
        if (uiTheme === 'netflix') return '#e50914';
        if (uiTheme === 'samsung') return '#0381fe';
        if (uiTheme === 'finance') return '#10b981';
        if (uiTheme === 'binance') return '#FCD535';
        return '#3b82f6';
    };

    const accentColor = getAccentColor();

    const handleTestNotification = async () => {
        setIsTesting(true);
        try {
            await requestNotificationPermission();
            await sendSystemNotification(t.test_notification, t.test_notification_body);
            showNotification(t.test_notification_body, 'success');
        } catch (err) {
            console.error("Test notification failed", err);
        } finally {
            setTimeout(() => setIsTesting(false), 1000);
        }
    };

    const playVolumePreviewSound = (volumeVal: number, soundIdParam?: string) => {
        const now = Date.now();
        if (now - lastSoundPlayRef.current < 450) return; // Limit to once every 450ms
        lastSoundPlayRef.current = now;
        
        const soundId = soundIdParam || advancedSettings.notificationSound || 'default';
        const sound = NOTIFICATION_SOUNDS.find(s => s.id === soundId);
        if (sound) {
            const audio = new Audio(sound.url);
            audio.volume = volumeVal;
            audio.play().catch(() => {});
        }
    };

    const updateSetting = (key: string, value: any) => {
        setAdvancedSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleResetSettings = () => {
        if (window.confirm(t.reset_confirm || "Reset all settings to default?")) {
            const defaultSettings = { 
                enableFloatingAlerts: true, 
                enablePrivacyMode: false, 
                notificationVolume: 0.5, 
                notificationSound: 'default',
                uiTheme: 'neumorphism' as const,
                themeMode: 'light' as const,
                glassIntensity: 20,
                borderRadius: 24,
                animationSpeed: 'normal' as const,
                fontStyle: 'standard' as const,
                orderEditGracePeriod: 15,
                placingOrderGracePeriod: 5,
                packagingGracePeriod: 2,
                compactMode: false,
                autoSyncInterval: 30
            };
            setAdvancedSettings(defaultSettings);
            showNotification(language === 'km' ? "បានកំណត់ការកំណត់ឡើងវិញជោគជ័យ" : "Settings reset successfully", "success");
        }
    };

    const SectionTitle = ({ title }: { title: string }) => (
        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 mt-4">{title}</h4>
    );

    const ToggleItem = ({ label, desc, value, onChange }: any) => (
        <div className={`flex items-center justify-between group p-4 rounded-2xl ${isLightMode ? 'bg-gray-50 border border-gray-200/60' : 'bg-white/5 border border-white/5'} transition-all hover:scale-[1.01]`}>
            <div className="space-y-1 mr-4">
                <h3 className={`text-sm font-black ${isLightMode ? 'text-gray-900' : 'text-white'} uppercase tracking-tight`}>{label}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">{desc}</p>
            </div>
            <button 
                onClick={() => onChange(!value)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex-shrink-0 ${value ? '' : (isLightMode ? 'bg-gray-300' : 'bg-gray-600')}`}
                style={{ backgroundColor: value ? accentColor : undefined }}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-lg transform transition-transform duration-300 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    const SliderItem = ({ label, value, min, max, step, unit, onChange, desc }: any) => (
        <div className={`space-y-4 p-4 rounded-2xl ${isLightMode ? 'bg-gray-50 border border-gray-200/60' : 'bg-white/5 border border-white/5'}`}>
            <div className="flex justify-between items-end gap-4">
                <div className="space-y-1 min-w-0">
                    <h3 className={`text-sm font-black ${isLightMode ? 'text-gray-900' : 'text-white'} uppercase tracking-tight truncate`}>{label}</h3>
                    {desc && <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest line-clamp-2">{desc}</p>}
                </div>
                <span className="text-xl font-black font-mono leading-none flex-shrink-0" style={{ color: accentColor }}>
                    {value}<span className="text-[10px] text-gray-500 uppercase ml-1">{unit}</span>
                </span>
            </div>
            <input 
                type="range" min={min} max={max} step={step} value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isLightMode ? 'bg-gray-200' : 'bg-gray-700'}`}
                style={{ accentColor: accentColor }}
            />
        </div>
    );

    const SegmentedControl = ({ label, options, value, onChange }: any) => (
        <div className="space-y-4">
            <h3 className={`text-[10px] font-black text-gray-500 uppercase tracking-widest`}>{label}</h3>
            <div className={`flex p-1 rounded-xl ${isLightMode ? 'bg-gray-100 border border-gray-200/50' : 'bg-black/40'} gap-1 overflow-x-auto no-scrollbar`}>
                {options.map((opt: any) => (
                    <button
                        key={opt.id}
                        onClick={() => onChange(opt.id)}
                        className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            value === opt.id 
                            ? (isLightMode ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-white shadow-xl') 
                            : (isLightMode ? 'text-gray-500 hover:text-gray-900' : 'text-gray-500 hover:text-gray-300')
                        }`}
                        style={{ color: value === opt.id ? accentColor : undefined }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const getThemeCardPreview = (themeId: string) => {
        switch (themeId) {
            case 'binance':
                return (
                    <div className="w-full h-12 bg-[#0B0E11] rounded-lg border border-yellow-500/20 p-1 flex flex-col justify-between overflow-hidden relative">
                        <div className="flex justify-between items-center">
                            <div className="w-6 h-1.5 bg-[#FCD535] rounded-sm" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FCD535]" />
                        </div>
                        <div className="w-full h-1 bg-[#FCD535]/10 rounded-sm" />
                        <div className="flex gap-1 justify-end">
                            <div className="w-3 h-2 bg-[#FCD535] rounded-[2px]" />
                        </div>
                    </div>
                );
            case 'netflix':
                return (
                    <div className="w-full h-12 bg-[#141414] rounded-lg border border-red-600/30 p-1 flex flex-col justify-between overflow-hidden relative shadow-[0_0_8px_rgba(229,9,20,0.15)]">
                        <div className="flex justify-between items-center">
                            <div className="w-6 h-1.5 bg-[#e50914] rounded-sm" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        </div>
                        <div className="w-full h-1 bg-[#e50914]/10 rounded-sm" />
                        <div className="flex gap-1 justify-end">
                            <div className="w-3 h-2 bg-[#e50914] rounded-[2px]" />
                        </div>
                    </div>
                );
            case 'finance':
                return (
                    <div className="w-full h-12 bg-[#061c15] rounded-lg border border-emerald-500/20 p-1 flex flex-col justify-between overflow-hidden relative">
                        <div className="flex justify-between items-center">
                            <div className="w-6 h-1.5 bg-emerald-500 rounded-sm" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="w-full h-1 bg-emerald-500/10 rounded-sm" />
                        <div className="flex gap-1 justify-end">
                            <div className="w-3 h-2 bg-emerald-500 rounded-[2px]" />
                        </div>
                    </div>
                );
            case 'samsung':
                return (
                    <div className="w-full h-12 bg-[#f4f7fa] border border-blue-200 rounded-lg p-1 flex flex-col justify-between overflow-hidden relative">
                        <div className="flex justify-between items-center">
                            <div className="w-6 h-1.5 bg-[#0381fe] rounded-sm" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0381fe]/30" />
                        </div>
                        <div className="w-full h-1 bg-gray-200 rounded-sm" />
                        <div className="flex gap-1 justify-end">
                            <div className="w-3 h-2 bg-[#0381fe] rounded-[2px]" />
                        </div>
                    </div>
                );
            case 'neumorphism':
                return (
                    <div className={`w-full h-12 rounded-lg p-1 flex flex-col justify-between overflow-hidden relative border ${isLightMode ? 'bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#ffffff] border-gray-300' : 'bg-[#1e222b] shadow-[inset_2px_2px_4px_#0e1014,inset_-2px_-2px_4px_#2e3442] border-slate-700'}`}>
                        <div className="flex justify-between items-center">
                            <div className="w-6 h-1.5 bg-blue-500 rounded-sm" />
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        </div>
                        <div className="w-full h-1 bg-gray-400/20 rounded-sm" />
                        <div className="flex gap-1 justify-end">
                            <div className="w-3 h-2 bg-blue-500 rounded-[2px]" />
                        </div>
                    </div>
                );
            default: // 'default'
                return (
                    <div className={`w-full h-12 rounded-lg p-1 flex flex-col justify-between overflow-hidden relative border transition-all ${
                        isLightMode 
                        ? 'bg-slate-50 border-gray-200 shadow-sm' 
                        : 'bg-[#0f172a] border-slate-800'
                    }`}>
                        {/* Glow spots to match default app layout */}
                        <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-blue-500/20 blur-[6px] pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-indigo-500/20 blur-[5px] pointer-events-none" />
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500/10 blur-[4px] pointer-events-none" />
                        
                        <div className="flex justify-between items-center relative z-10">
                            <div className="w-6 h-1.5 bg-blue-600 rounded-sm" />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                        </div>
                        <div className={`w-full h-1 rounded-sm relative z-10 ${isLightMode ? 'bg-slate-200' : 'bg-slate-800'}`} />
                        <div className="flex gap-1 justify-end relative z-10">
                            <div className="w-4 h-2 bg-blue-600 rounded-[2px] shadow-sm shadow-blue-600/30" />
                        </div>
                    </div>
                );
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} fullScreen={true}>
            <div className={`flex flex-col md:flex-row h-screen w-screen ${isLightMode ? 'bg-white text-black' : 'bg-[#020617] text-white'} overflow-hidden font-custom transition-colors duration-500`}>
                {/* Global Background Elements */}
                <div className="fixed inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 rounded-full blur-[120px]" style={{ backgroundColor: accentColor }}></div>
                </div>

                {/* Sidebar */}
                <aside className={`w-full md:w-[320px] ${isLightMode ? 'bg-gray-50' : 'bg-black/40'} backdrop-blur-3xl p-4 md:p-6 flex flex-col flex-shrink-0 border-b md:border-b-0 md:border-r ${isLightMode ? 'border-gray-200' : 'border-white/5'} z-20`}>
                    <div className="flex md:hidden justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </div>
                            <h2 className="text-base font-black tracking-tighter uppercase italic leading-none">{t.advanced_settings}</h2>
                        </div>
                        <button onClick={onClose} className={`w-9 h-9 ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-gray-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400'} border rounded-xl flex items-center justify-center transition-all active:scale-90`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-4 mb-10 mt-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500" style={{ backgroundColor: accentColor }}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tighter uppercase italic leading-none">{t.advanced_settings}</h2>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">System Configuration</p>
                        </div>
                    </div>

                    <nav className="flex flex-row md:flex-col overflow-x-auto no-scrollbar gap-1.5 md:space-y-2 pb-2 md:pb-0">
                        {[
                            { id: 'interface', label: t.tab_interface, icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
                            { id: 'audio', label: t.tab_audio, icon: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' },
                            { id: 'privacy', label: t.tab_privacy, icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                            { id: 'system', label: t.tab_system, icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
                        ].map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                                    className={`flex-shrink-0 flex flex-col md:flex-row items-center gap-1.5 md:gap-4 px-3 py-2.5 md:px-5 md:py-4 rounded-xl md:rounded-2xl transition-all group ${
                                        isActive 
                                        ? (isLightMode ? 'bg-white text-black shadow-md border border-gray-200' : 'bg-white/10 text-white shadow-lg') 
                                        : (isLightMode ? 'text-gray-500 hover:bg-gray-100 hover:text-black border border-transparent' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent')
                                    }`}
                                >
                                    <svg 
                                        className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} 
                                        style={{ color: isActive ? accentColor : undefined }}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}
                                    ><path d={tab.icon} /></svg>
                                    <span className="text-[9px] md:text-[12px] font-black uppercase tracking-wider whitespace-nowrap">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* UI Live Preview Card */}
                    <div className={`hidden md:block mt-8 p-5 rounded-3xl border transition-all ${isLightMode ? 'bg-gray-100/50 border-gray-200/80' : 'border-white/5 bg-gradient-to-br from-white/5 to-transparent'}`}>
                        <SectionTitle title={t.ui_preview} />
                        <div className="space-y-4">
                            <div 
                                className={`p-4 transition-all duration-500 relative overflow-hidden ${
                                    uiTheme === 'neumorphism' 
                                    ? (isLightMode 
                                        ? 'bg-[#f0f2f5] border-0 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]' 
                                        : 'bg-[#1a1c23] border-0 shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.03)]')
                                    : uiTheme === 'netflix'
                                    ? 'bg-zinc-950 border border-[#e50914]/30 shadow-[0_0_15px_rgba(229,9,20,0.15)] text-white'
                                    : uiTheme === 'binance'
                                    ? 'bg-[#0B0E11] border border-yellow-500/20 text-white'
                                    : uiTheme === 'finance'
                                    ? 'bg-[#061c15] border border-emerald-500/20 text-white'
                                    : uiTheme === 'samsung'
                                    ? 'bg-white border border-blue-200 shadow-sm text-black'
                                    : (isLightMode ? 'bg-white border-gray-200 shadow-sm text-black' : 'bg-slate-900 border-white/5 text-white')
                                }`}
                                style={{ 
                                    borderRadius: `${advancedSettings.borderRadius}px`,
                                    backdropFilter: advancedSettings.glassIntensity ? `blur(${advancedSettings.glassIntensity / 2}px)` : undefined,
                                    fontFamily: advancedSettings.fontStyle === 'mono' ? 'Courier, monospace' : advancedSettings.fontStyle === 'modern' ? 'ui-sans-serif, system-ui, sans-serif' : undefined
                                }}
                            >
                                <div className="flex gap-2.5 mb-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center relative flex-shrink-0 ${
                                        uiTheme === 'binance' ? 'bg-yellow-500/10 text-yellow-500' : isLightMode ? 'bg-gray-100 text-gray-800' : 'bg-white/10 text-white'
                                    }`}>
                                        <span 
                                            className="w-2.5 h-2.5 rounded-full animate-pulse"
                                            style={{ 
                                                backgroundColor: accentColor,
                                                animationDuration: advancedSettings.animationSpeed === 'none' 
                                                    ? '0s' 
                                                    : advancedSettings.animationSpeed === 'fast' 
                                                    ? '0.4s' 
                                                    : advancedSettings.animationSpeed === 'slow' 
                                                    ? '2.2s' 
                                                    : '1.2s',
                                                animationIterationCount: advancedSettings.animationSpeed === 'none' ? 0 : 'infinite'
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                        <div className={`h-2.5 w-2/3 rounded ${isLightMode ? 'bg-gray-300/80' : 'bg-white/20'}`} />
                                        <div className={`h-2 w-1/2 rounded ${isLightMode ? 'bg-gray-200' : 'bg-white/10'}`} />
                                    </div>
                                </div>
                                <button 
                                    className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-white transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-1"
                                    style={{ 
                                        backgroundColor: accentColor, 
                                        borderRadius: `${(advancedSettings.borderRadius || 24) / 2}px`,
                                        transitionDuration: advancedSettings.animationSpeed === 'none'
                                            ? '0s'
                                            : advancedSettings.animationSpeed === 'fast'
                                            ? '100ms'
                                            : advancedSettings.animationSpeed === 'slow'
                                            ? '600ms'
                                            : '300ms'
                                    }}
                                >
                                    Sample Action
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:block mt-auto pt-6 text-center">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Device ID: {useMemo(() => Math.random().toString(36).substring(7).toUpperCase(), [])}</p>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-hidden flex flex-col relative z-10">
                    <header className={`hidden md:flex px-10 py-12 justify-between items-end border-b ${isLightMode ? 'border-gray-200' : 'border-white/5'}`}>
                        <div className="animate-fade-in-up">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-3">{t.advanced_settings}</p>
                            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-[0.8]">
                                {activeTab === 'interface' ? t.interface_settings : activeTab === 'audio' ? t.audio_settings : activeTab === 'privacy' ? t.privacy_security : t.system_performance}
                            </h2>
                        </div>
                        <button onClick={onClose} className={`w-14 h-14 ${isLightMode ? 'bg-gray-100 border-gray-200 hover:bg-red-500/10' : 'bg-white/5 border-white/10 hover:bg-red-500/20'} text-gray-400 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all border active:scale-90 shadow-2xl`}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-8 md:space-y-12 pb-32">
                        {/* Mobile active tab heading */}
                        <div className="block md:hidden mb-2">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.advanced_settings}</p>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">
                                {activeTab === 'interface' ? t.interface_settings : activeTab === 'audio' ? t.audio_settings : activeTab === 'privacy' ? t.privacy_security : t.system_performance}
                            </h3>
                        </div>

                        {activeTab === 'interface' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in-up">
                                <div className="space-y-10">
                                    <section className="space-y-6">
                                        <SectionTitle title={t.theme_mode} />
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { id: 'light', label: t.mode_light, icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M14.5 12a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
                                                { id: 'dark', label: t.mode_dark, icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' }
                                            ].map(mode => (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => updateSetting('themeMode', mode.id)}
                                                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${
                                                        advancedSettings.themeMode === mode.id 
                                                        ? 'border-transparent text-white shadow-2xl scale-105' 
                                                        : (isLightMode ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10 hover:text-white')
                                                    }`}
                                                    style={{ backgroundColor: advancedSettings.themeMode === mode.id ? accentColor : undefined }}
                                                >
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d={mode.icon} /></svg>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <SectionTitle title={t.ui_style} />
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {[
                                                { id: 'default', label: t.ui_default },
                                                { id: 'neumorphism', label: 'Neumorphism' },
                                                { id: 'samsung', label: 'Samsung UI' },
                                                { id: 'netflix', label: 'O-Entertainment' },
                                                { id: 'finance', label: 'Finance UI' },
                                                { id: 'binance', label: 'Binance UI' }
                                            ].map(theme => {
                                                const isSelected = advancedSettings.uiTheme === theme.id;
                                                return (
                                                    <button
                                                        key={theme.id}
                                                        onClick={() => updateSetting('uiTheme', theme.id)}
                                                        className={`w-full p-2.5 rounded-2xl transition-all border-2 flex flex-col gap-2 text-left relative overflow-hidden group hover:scale-[1.03] ${
                                                            isSelected 
                                                            ? (isLightMode ? 'bg-white border-blue-500 shadow-md text-black' : 'bg-white/10 border-white/20 text-white shadow-xl') 
                                                            : (isLightMode ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white')
                                                        }`}
                                                        style={{ borderColor: isSelected && !isLightMode ? accentColor : undefined }}
                                                    >
                                                        {getThemeCardPreview(theme.id)}
                                                        <div className="flex justify-between items-center w-full mt-1">
                                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none truncate">{theme.label}</span>
                                                            {isSelected && (
                                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-8">
                                    <SectionTitle title="Visual Refinement" />
                                    <SliderItem 
                                        label={t.glass_intensity} value={advancedSettings.glassIntensity || 20} 
                                        min={0} max={100} step={1} unit="px"
                                        onChange={(v: number) => updateSetting('glassIntensity', v)}
                                    />
                                    <SliderItem 
                                        label={t.border_radius} value={advancedSettings.borderRadius || 24} 
                                        min={0} max={40} step={1} unit="px"
                                        onChange={(v: number) => updateSetting('borderRadius', v)}
                                    />
                                    <SegmentedControl 
                                        label={t.font_style}
                                        value={advancedSettings.fontStyle || 'standard'}
                                        onChange={(v: string) => updateSetting('fontStyle', v)}
                                        options={[
                                            { id: 'standard', label: t.font_standard },
                                            { id: 'modern', label: t.font_modern },
                                            { id: 'mono', label: t.font_mono }
                                        ]}
                                    />
                                    <SegmentedControl 
                                        label={t.animation_speed}
                                        value={advancedSettings.animationSpeed || 'normal'}
                                        onChange={(v: string) => updateSetting('animationSpeed', v)}
                                        options={[
                                            { id: 'none', label: t.anim_none },
                                            { id: 'slow', label: t.anim_slow },
                                            { id: 'normal', label: t.anim_normal },
                                            { id: 'fast', label: t.anim_fast }
                                        ]}
                                    />
                                    <ToggleItem 
                                        label={t.compact_mode} desc={t.compact_mode_desc}
                                        value={advancedSettings.compactMode || false}
                                        onChange={(v: boolean) => updateSetting('compactMode', v)}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'audio' && (
                            <div className="max-w-3xl space-y-10 animate-fade-in-up">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SliderItem 
                                        label={t.alert_volume} value={Math.round((advancedSettings.notificationVolume || 1) * 100)} 
                                        min={0} max={100} step={1} unit="%"
                                        onChange={(v: number) => {
                                            const volumeVal = v / 100;
                                            updateSetting('notificationVolume', volumeVal);
                                            playVolumePreviewSound(volumeVal);
                                        }}
                                    />
                                    <SliderItem 
                                        label={t.music_volume} value={Math.round((advancedSettings.musicVolume ?? 0.3) * 100)} 
                                        min={0} max={100} step={1} unit="%"
                                        onChange={(v: number) => updateSetting('musicVolume', v / 100)}
                                    />
                                </div>

                                <section className="space-y-6">
                                    <SectionTitle title={t.notification_sound} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {NOTIFICATION_SOUNDS.map(sound => {
                                            const isSelected = advancedSettings.notificationSound === sound.id;
                                            return (
                                                <button
                                                    key={sound.id}
                                                    onClick={() => {
                                                        updateSetting('notificationSound', sound.id);
                                                        const audio = new Audio(sound.url);
                                                        audio.volume = advancedSettings.notificationVolume ?? 1;
                                                        audio.play().catch(() => {});
                                                    }}
                                                    className={`p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                                                        isSelected 
                                                        ? (isLightMode ? 'bg-gray-100 border-blue-500 shadow-md' : 'bg-white/10 border-transparent shadow-xl') 
                                                        : (isLightMode ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black' : 'bg-white/5 border-transparent text-gray-500 hover:text-white')
                                                    }`}
                                                    style={{ color: isSelected ? accentColor : undefined }}
                                                >
                                                    <span className="text-xs font-black uppercase tracking-widest">{sound.name}</span>
                                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentcolor]" style={{ backgroundColor: accentColor }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <div className="pt-6">
                                    <button 
                                        onClick={handleTestNotification}
                                        disabled={isTesting}
                                        className="w-full md:w-auto px-12 py-5 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-2xl disabled:opacity-50"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        {isTesting ? 'CALIBRATING AUDIO...' : t.test_notification}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="max-w-2xl space-y-6 animate-fade-in-up">
                                <ToggleItem 
                                    label={t.privacy_mode} desc={t.privacy_mode_desc}
                                    value={advancedSettings.enablePrivacyMode}
                                    onChange={(v: boolean) => updateSetting('enablePrivacyMode', v)}
                                />
                                <ToggleItem 
                                    label={t.high_security} desc={t.high_security_desc}
                                    value={advancedSettings.securityLevel === 'high'}
                                    onChange={(v: boolean) => updateSetting('securityLevel', v ? 'high' : 'standard')}
                                />
                                <ToggleItem 
                                    label={t.floating_alerts} desc={t.floating_alerts_desc}
                                    value={advancedSettings.enableFloatingAlerts}
                                    onChange={(v: boolean) => updateSetting('enableFloatingAlerts', v)}
                                />
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="max-w-3xl space-y-10 animate-fade-in-up">
                                <div className="space-y-8">
                                    <SliderItem 
                                        label={t.edit_grace_period} 
                                        value={Math.round((advancedSettings.orderEditGracePeriod || 43200) / 60)} 
                                        min={1} max={1440} step={1} unit="min"
                                        desc={t.edit_grace_period_desc}
                                        onChange={(v: number) => updateSetting('orderEditGracePeriod', v * 60)}
                                    />
                                    <SliderItem 
                                        label={t.placing_order_grace_period} 
                                        value={advancedSettings.placingOrderGracePeriod || 5} 
                                        min={1} max={60} step={1} unit="sec"
                                        desc={t.placing_order_grace_period_desc}
                                        onChange={(v: number) => updateSetting('placingOrderGracePeriod', v)}
                                    />
                                    <SliderItem 
                                        label={t.packaging_grace_period} 
                                        value={advancedSettings.packagingGracePeriod || 5} 
                                        min={1} max={60} step={1} unit="sec"
                                        desc={t.packaging_grace_period_desc}
                                        onChange={(v: number) => updateSetting('packagingGracePeriod', v)}
                                    />
                                    <SegmentedControl 
                                        label={t.auto_sync_interval}
                                        value={advancedSettings.autoSyncInterval === 0 ? 'off' : String(advancedSettings.autoSyncInterval || 30)}
                                        onChange={(v: string) => {
                                            const seconds = v === 'off' ? 0 : parseInt(v, 10);
                                            updateSetting('autoSyncInterval', seconds);
                                        }}
                                        options={[
                                            { id: 'off', label: t.off },
                                            { id: '15', label: `15 ${t.sec_short}` },
                                            { id: '30', label: `30 ${t.sec_short}` },
                                            { id: '60', label: `60 ${t.sec_short}` },
                                            { id: '120', label: `120 ${t.sec_short}` }
                                        ]}
                                    />
                                </div>

                                <section className="space-y-6">
                                    <SectionTitle title={t.reset_to_default} />
                                    <div className={`p-6 rounded-3xl border ${isLightMode ? 'bg-red-50/50 border-red-200' : 'bg-red-500/5 border-red-500/10'} space-y-4`}>
                                        <p className={`text-xs ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {t.reset_confirm}
                                        </p>
                                        <button
                                            onClick={handleResetSettings}
                                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-md"
                                        >
                                            {t.reset_to_default}
                                        </button>
                                    </div>
                                </section>

                                <div className={`p-8 rounded-3xl ${isLightMode ? 'bg-blue-50 border border-blue-200' : 'bg-blue-500/10 border border-blue-500/20'} space-y-4`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
                                        <h3 className={`text-sm font-black uppercase tracking-widest ${isLightMode ? 'text-blue-700' : 'text-blue-400'}`}>System Information</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className={`text-[9px] font-black ${isLightMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Version</p>
                                            <p className={`text-sm font-black ${isLightMode ? 'text-gray-900' : 'text-white'}`}>v4.5.0-GLOBAL-UI</p>
                                        </div>
                                        <div>
                                            <p className={`text-[9px] font-black ${isLightMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Build</p>
                                            <p className={`text-sm font-black ${isLightMode ? 'text-gray-900' : 'text-white'}`}>2026.03.26.PRO</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className={`hidden md:flex h-20 px-10 border-t ${isLightMode ? 'border-gray-200 bg-gray-50' : 'border-white/5 bg-black/20'} items-center justify-between backdrop-blur-xl`}>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Settings persistent on this local device</p>
                        <div className="flex gap-4 items-center">
                            <button 
                                onClick={handleResetSettings}
                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                                    isLightMode 
                                    ? 'bg-white border-gray-300 hover:bg-gray-100 hover:text-red-600 text-gray-600' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:text-red-400 text-gray-400'
                                }`}
                            >
                                {t.reset_to_default}
                            </button>
                            <div className="flex gap-2 items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </Modal>
    );
};

export default AdvancedSettingsModal;

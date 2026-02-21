import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import Modal from './Modal';
import { requestNotificationPermission, sendSystemNotification } from '../../utils/notificationUtils';
import { translations } from '../../translations';
import { NOTIFICATION_SOUNDS } from '../../constants';

interface AdvancedSettingsModalProps {
    onClose: () => void;
}

type SettingsTab = 'general' | 'privacy';

const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({ onClose }) => {
    const { advancedSettings, setAdvancedSettings, language, showNotification } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [isTesting, setIsTesting] = useState(false);

    const t = translations[language || 'en'];

    if (!advancedSettings || !setAdvancedSettings) return null;

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

    const toggleFloatingAlerts = () => {
        setAdvancedSettings(prev => ({
            ...prev,
            enableFloatingAlerts: !prev.enableFloatingAlerts
        }));
    };

    const togglePrivacyMode = () => {
        setAdvancedSettings(prev => ({
            ...prev,
            enablePrivacyMode: !prev.enablePrivacyMode
        }));
    };

    const toggleSecurityLevel = () => {
        setAdvancedSettings(prev => ({
            ...prev,
            securityLevel: prev.securityLevel === 'high' ? 'standard' : 'high'
        }));
    };

    return (
        <Modal isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex h-[500px] text-white">
                {/* Sidebar */}
                <div className="w-1/3 border-r border-white/10 bg-gray-900/50 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-6 px-2">Advance Settings</h2>
                    
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        General
                    </button>

                    <button 
                        onClick={() => setActiveTab('privacy')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'privacy' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Privacy & Security
                    </button>
                </div>

                {/* Content Area */}
                <div className="w-2/3 p-6 overflow-y-auto bg-[#0f172a]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black uppercase tracking-widest text-gray-400">
                            {activeTab === 'general' ? 'General Settings' : 'Privacy & Security'}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {activeTab === 'general' && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                     </div>
                                     <div>
                                        <h3 className="text-sm font-black text-white">Floating Alerts</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Show system toast notifications</p>
                                     </div>
                                </div>
                                
                                <button 
                                    onClick={toggleFloatingAlerts}
                                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${advancedSettings.enableFloatingAlerts ? 'bg-blue-600 shadow-lg shadow-blue-600/40' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${advancedSettings.enableFloatingAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Notification Sound Selection */}
                            <div className="p-4 bg-gray-800/30 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                    </div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Notification Alert Sound</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    {NOTIFICATION_SOUNDS.map(sound => (
                                        <button
                                            key={sound.id}
                                            onClick={() => {
                                                setAdvancedSettings(prev => ({ ...prev, notificationSound: sound.id }));
                                                const audio = new Audio(sound.url);
                                                audio.play().catch(() => {});
                                            }}
                                            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${
                                                advancedSettings.notificationSound === sound.id 
                                                ? 'bg-blue-600/20 border-blue-500/50 text-blue-100' 
                                                : 'bg-gray-800/50 border-white/5 text-gray-400 hover:bg-gray-800 hover:border-white/10'
                                            }`}
                                        >
                                            <span className="text-xs font-bold">{sound.name}</span>
                                            {advancedSettings.notificationSound === sound.id ? (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse" />
                                            ) : (
                                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Test Button Section */}
                            <div className="pt-4 border-t border-white/5">
                                <button 
                                    onClick={handleTestNotification}
                                    disabled={isTesting}
                                    className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg
                                        ${isTesting ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-blue-600/30'}`}
                                >
                                    {isTesting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                            {t.test_notification}
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-3 text-center">Verify system & In-app alerts</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-4 animate-fade-in-up">
                            {/* Privacy Mode Toggle */}
                            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:text-purple-300 group-hover:scale-110 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                     </div>
                                     <div>
                                        <h3 className="text-sm font-black text-white">Privacy Mode</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Mask sensitive customer data</p>
                                     </div>
                                </div>
                                
                                <button 
                                    onClick={togglePrivacyMode}
                                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${advancedSettings.enablePrivacyMode ? 'bg-purple-600 shadow-lg shadow-purple-600/40' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${advancedSettings.enablePrivacyMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Security Level Toggle */}
                            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-2xl border border-white/5 hover:border-green-500/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:text-green-300 group-hover:scale-110 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                     </div>
                                     <div>
                                        <h3 className="text-sm font-black text-white">High Security</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Require re-authentication for critical actions</p>
                                     </div>
                                </div>
                                
                                <button 
                                    onClick={toggleSecurityLevel}
                                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${advancedSettings.securityLevel === 'high' ? 'bg-green-600 shadow-lg shadow-green-600/40' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${advancedSettings.securityLevel === 'high' ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AdvancedSettingsModal;
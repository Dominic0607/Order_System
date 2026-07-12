
import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import EditProfileModal from './EditProfileModal';
import AdvancedSettingsModal from './AdvancedSettingsModal';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import UserAvatar from './UserAvatar';
import { APP_LOGO_URL } from '../../constants';
import Spinner from './Spinner';
import { translations } from '../../translations';
import { requestNotificationPermission, sendSystemNotification } from '../../utils/notificationUtils';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface HeaderProps {
    onBackToRoleSelect: () => void;
    appState: string;
}

const Header: React.FC<HeaderProps> = ({ onBackToRoleSelect, appState }) => {
    const { 
        currentUser, logout, refreshData, originalAdminUser, 
        setIsChatOpen, unreadCount,
        isMobileMenuOpen, setIsMobileMenuOpen,
        language, setLanguage,
        mobilePageTitle,
        advancedSettings,
        showNotification
    } = useContext(AppContext);
    
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
    const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
    const { playNotify } = useSoundEffects();
    
    const [notificationPermission, setNotificationPermission] = useState(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'denied';
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    const t = translations[language];

    const isSystemAdmin = !!currentUser?.IsSystemAdmin;
    const isHybridAdmin = isSystemAdmin && (currentUser?.Team || '').split(',').map(t => t.trim()).filter(Boolean).length > 0;
    const isMobileAdmin = appState === 'admin_dashboard' && window.innerWidth < 768;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleLanguage = (lang: 'en' | 'km') => {
        setLanguage(lang);
    };

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission();
        if (granted && 'Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    };

    const handleTestNotification = async () => {
        playNotify();
        await requestNotificationPermission();
        await sendSystemNotification(t.test_notification, t.test_notification_body);
        showNotification(t.test_notification_body, 'success');
        setDropdownOpen(false);
    };

    const handleDropdownToggle = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleHomeClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isSystemAdmin) return;
        try {
            const params = new URLSearchParams();
            params.set('view', 'admin_dashboard');
            params.set('tab', 'admin');
            params.set('subview', 'dashboard');
            const newUrl = window.location.pathname + '?' + params.toString();
            window.history.pushState(null, '', newUrl);
            window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
        } catch (err) {
            console.warn("Navigation failed:", err);
            window.location.reload();
        }
    };

    const handleLogout = () => {
        logout();
    };

    const handleBackClick = () => {
        onBackToRoleSelect();
    };

    const uiTheme = advancedSettings?.uiTheme || 'default';
    const isLightMode = advancedSettings?.themeMode === 'light';
    const borderRadiusVal = advancedSettings?.borderRadius !== undefined ? advancedSettings.borderRadius : 24;
    const glassIntensityVal = advancedSettings?.glassIntensity !== undefined ? advancedSettings.glassIntensity : 20;

    // Theme style mapping config
    const styles = useMemo(() => {
        switch (uiTheme) {
            case 'binance':
                return {
                    header: 'bg-[#181A20] border-b border-[#2B3139] text-[#EAECEF]',
                    logoText: 'text-[#FCD535] font-black',
                    logoSubtitle: 'text-[#848E9C] font-black tracking-widest',
                    logoSubtitleText: 'BINANCE ENGINE',
                    profilePill: 'bg-[#2B3139]/80 border border-[#2B3139] hover:bg-[#2B3139] text-[#EAECEF]',
                    profileName: 'text-[#EAECEF] font-black',
                    profileRole: 'text-[#848E9C] font-black',
                    dropdownBg: 'bg-[#1E2329] border border-[#2B3139] text-[#EAECEF] shadow-[0_15px_50px_rgba(0,0,0,0.6)]',
                    dropdownHeaderBorder: 'border-b border-[#2B3139]',
                    dropdownItem: 'text-[#EAECEF] hover:bg-[#2B3139]/80 hover:text-[#FCD535]',
                    dropdownItemLogout: 'text-red-400 hover:bg-[#F6465D]/10 hover:text-[#F6465D]',
                    dropdownDivider: 'border-t border-[#2B3139]',
                    langBtnActive: 'bg-[#2B3139] text-[#FCD535] shadow-lg',
                    langBtnInactive: 'text-[#848E9C] hover:text-[#EAECEF]',
                    langBg: 'bg-[#0B0E11] border border-[#2B3139]',
                    chatBtn: 'bg-[#2B3139]/40 text-[#FCD535] border border-[#2B3139]/60 hover:bg-[#FCD535] hover:text-[#1E2329]',
                    bellBtn: 'bg-[#FCD535]/10 border border-[#FCD535]/30 text-[#FCD535] hover:bg-[#FCD535] hover:text-[#1E2329]',
                    badgeBorder: 'border-[#181A20]',
                    hamburgerLine: 'bg-[#FCD535]',
                    hamburgerBtn: 'bg-[#2B3139]/40 border border-[#2B3139]/60 text-[#FCD535]',
                };
            case 'netflix':
                return {
                    header: 'bg-[#141414]/90 border-b border-white/5 text-white',
                    logoText: 'text-[#e50914] font-black',
                    logoSubtitle: 'text-gray-500 font-bold tracking-widest',
                    logoSubtitleText: 'NETFLIX SYSTEM',
                    profilePill: 'bg-[#181818] border border-white/10 hover:bg-[#222222] text-white',
                    profileName: 'text-white font-black',
                    profileRole: 'text-gray-500 font-bold',
                    dropdownBg: 'bg-[#181818] border border-white/10 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)]',
                    dropdownHeaderBorder: 'border-b border-white/10',
                    dropdownItem: 'text-gray-200 hover:bg-[#e50914] hover:text-white',
                    dropdownItemLogout: 'text-red-500 hover:bg-red-600 hover:text-white',
                    dropdownDivider: 'border-t border-white/10',
                    langBtnActive: 'bg-[#e50914] text-white shadow-lg',
                    langBtnInactive: 'text-gray-500 hover:text-gray-300',
                    langBg: 'bg-black/40 border border-white/5',
                    chatBtn: 'bg-white/5 text-[#e50914] border border-white/10 hover:bg-[#e50914] hover:text-white',
                    bellBtn: 'bg-[#e50914]/10 border border-[#e50914]/30 text-[#e50914] hover:bg-[#e50914] hover:text-white',
                    badgeBorder: 'border-[#141414]',
                    hamburgerLine: 'bg-[#e50914]',
                    hamburgerBtn: 'bg-white/5 border border-white/10 text-[#e50914]',
                };
            case 'samsung':
                return {
                    header: isLightMode 
                        ? 'bg-white/95 border-b border-[#e1e1e1] text-black shadow-sm' 
                        : 'bg-[#0a0a0a]/95 border-b border-white/10 text-white',
                    logoText: 'text-[#0381fe] font-black',
                    logoSubtitle: isLightMode ? 'text-gray-500 font-bold' : 'text-gray-400 font-bold',
                    logoSubtitleText: 'SAMSUNG CORE',
                    profilePill: isLightMode 
                        ? 'bg-gray-100 border border-[#e1e1e1] hover:bg-gray-200 text-black' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white',
                    profileName: isLightMode ? 'text-black font-bold' : 'text-white font-bold',
                    profileRole: isLightMode ? 'text-gray-500 font-semibold' : 'text-gray-400 font-semibold',
                    dropdownBg: isLightMode 
                        ? 'bg-white border border-[#e1e1e1] text-black shadow-xl' 
                        : 'bg-[#121212] border border-white/10 text-white shadow-2xl',
                    dropdownHeaderBorder: isLightMode ? 'border-b border-[#e1e1e1]' : 'border-b border-white/10',
                    dropdownItem: isLightMode 
                        ? 'text-gray-800 hover:bg-[#0381fe]/10 hover:text-[#0381fe]' 
                        : 'text-gray-200 hover:bg-[#0381fe] hover:text-white',
                    dropdownItemLogout: 'text-red-500 hover:bg-red-500 hover:text-white',
                    dropdownDivider: isLightMode ? 'border-t border-[#e1e1e1]' : 'border-t border-white/10',
                    langBtnActive: 'bg-[#0381fe] text-white shadow-md',
                    langBtnInactive: isLightMode ? 'text-gray-400 hover:text-gray-700' : 'text-gray-500 hover:text-gray-300',
                    langBg: isLightMode ? 'bg-gray-100 border border-[#e1e1e1]' : 'bg-black/35 border border-white/5',
                    chatBtn: isLightMode 
                        ? 'bg-[#0381fe]/10 text-[#0381fe] border border-[#0381fe]/20 hover:bg-[#0381fe] hover:text-white' 
                        : 'bg-[#0381fe]/25 text-[#0381fe] border border-white/5 hover:bg-[#0381fe] hover:text-white',
                    bellBtn: isLightMode
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 hover:bg-amber-500 hover:text-white'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white',
                    badgeBorder: isLightMode ? 'border-white' : 'border-[#0a0a0a]',
                    hamburgerLine: 'bg-[#0381fe]',
                    hamburgerBtn: isLightMode ? 'bg-[#0381fe]/10 border border-[#0381fe]/20 text-[#0381fe]' : 'bg-[#0381fe]/20 border border-white/5 text-[#0381fe]',
                };
            case 'neumorphism':
                return {
                    header: isLightMode 
                        ? 'bg-[#e0e0e0] text-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.06)]' 
                        : 'bg-[#1e1e1e] text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)]',
                    logoText: isLightMode ? 'text-gray-800 font-extrabold' : 'text-white font-extrabold',
                    logoSubtitle: 'text-gray-500 font-semibold',
                    logoSubtitleText: 'SOFT ENGINE',
                    profilePill: isLightMode 
                        ? 'bg-[#e0e0e0] shadow-[inset_-3px_-3px_7px_rgba(255,255,255,0.7),inset_3px_3px_7px_rgba(0,0,0,0.1)] text-gray-700 hover:scale-[1.01]' 
                        : 'bg-[#1e1e1e] shadow-[inset_-3px_-3px_7px_rgba(255,255,255,0.05),inset_3px_3px_7px_rgba(0,0,0,0.4)] text-gray-300 hover:scale-[1.01]',
                    profileName: isLightMode ? 'text-gray-800 font-bold' : 'text-gray-200 font-bold',
                    profileRole: 'text-gray-500 font-bold',
                    dropdownBg: isLightMode 
                        ? 'bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] text-gray-800 border border-transparent' 
                        : 'bg-[#1e1e1e] shadow-[10px_10px_20px_#0f0f0f,-10px_-10px_20px_#2d2d2d] text-white border border-transparent',
                    dropdownHeaderBorder: isLightMode ? 'border-b border-gray-300' : 'border-b border-[#2d2d2d]',
                    dropdownItem: isLightMode 
                        ? 'text-gray-700 hover:bg-slate-200 hover:text-black rounded-lg mx-2' 
                        : 'text-gray-200 hover:bg-[#2d2d2d] rounded-lg mx-2',
                    dropdownItemLogout: 'text-red-500 hover:bg-red-500/10 rounded-lg mx-2',
                    dropdownDivider: isLightMode ? 'border-t border-gray-300' : 'border-t border-[#2d2d2d]',
                    langBtnActive: isLightMode 
                        ? 'bg-[#e0e0e0] shadow-[inset_-2px_-2px_5px_rgba(255,255,255,0.7),inset_2px_2px_5px_rgba(0,0,0,0.1)] text-blue-600' 
                        : 'bg-[#1e1e1e] shadow-[inset_-2px_-2px_5px_rgba(255,255,255,0.05),inset_2px_2px_5px_rgba(0,0,0,0.4)] text-blue-400',
                    langBtnInactive: 'text-gray-500 hover:text-gray-400',
                    langBg: isLightMode ? 'bg-[#e0e0e0] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)]' : 'bg-[#1e1e1e] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]',
                    chatBtn: isLightMode 
                        ? 'shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff] active:shadow-[inset_2px_2px_5px_#bebebe,inset_-2px_-2px_5px_#ffffff] text-blue-600 hover:text-blue-700' 
                        : 'shadow-[3px_3px_6px_#0f0f0f,-3px_-3px_6px_#2d2d2d] active:shadow-[inset_2px_2px_5px_#0f0f0f,inset_-2px_-2px_5px_#2d2d2d] text-blue-400 hover:text-blue-300',
                    bellBtn: isLightMode
                        ? 'shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff] active:shadow-[inset_2px_2px_5px_#bebebe,inset_-2px_-2px_5px_#ffffff] text-amber-600'
                        : 'shadow-[3px_3px_6px_#0f0f0f,-3px_-3px_6px_#2d2d2d] active:shadow-[inset_2px_2px_5px_#0f0f0f,inset_-2px_-2px_5px_#2d2d2d] text-amber-500',
                    badgeBorder: isLightMode ? 'border-[#e0e0e0]' : 'border-[#1e1e1e]',
                    hamburgerLine: isLightMode ? 'bg-gray-800' : 'bg-white',
                    hamburgerBtn: isLightMode
                        ? 'shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff] text-gray-800'
                        : 'shadow-[3px_3px_6px_#0f0f0f,-3px_-3px_6px_#2d2d2d] text-white',
                };
            case 'finance':
                return {
                    header: 'bg-[#090D10]/95 border-b border-[#141F27] text-white shadow-xl',
                    logoText: 'text-[#10b981] font-black',
                    logoSubtitle: 'text-[#5A6E7F] font-bold tracking-widest',
                    logoSubtitleText: 'MARKET SYSTEM',
                    profilePill: 'bg-[#141F27] border border-[#1C2C37] hover:bg-[#1C2C37] text-white',
                    profileName: 'text-white font-bold',
                    profileRole: 'text-[#5A6E7F] font-semibold',
                    dropdownBg: 'bg-[#0E161C] border border-[#141F27] text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]',
                    dropdownHeaderBorder: 'border-b border-[#141F27]',
                    dropdownItem: 'text-gray-200 hover:bg-[#10b981] hover:text-[#090D10]',
                    dropdownItemLogout: 'text-red-400 hover:bg-red-500/10 hover:text-red-400',
                    dropdownDivider: 'border-t border-[#141F27]',
                    langBtnActive: 'bg-[#10b981] text-[#090D10] shadow-md',
                    langBtnInactive: 'text-[#5A6E7F] hover:text-[#EAECEF]',
                    langBg: 'bg-[#090D10] border border-[#141F27]',
                    chatBtn: 'bg-[#141F27]/80 text-[#10b981] border border-[#1C2C37] hover:bg-[#10b981] hover:text-[#090D10]',
                    bellBtn: 'bg-amber-500/10 border border-[#1C2C37] text-amber-500 hover:bg-amber-500 hover:text-black',
                    badgeBorder: 'border-[#090D10]',
                    hamburgerLine: 'bg-[#10b981]',
                    hamburgerBtn: 'bg-[#141F27]/80 border border-[#1C2C37] text-[#10b981]',
                };
            case 'default':
            default:
                return {
                    header: isLightMode 
                        ? 'bg-white/70 border-b border-slate-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-slate-800' 
                        : 'bg-[#0b0f19]/75 border-b border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-white',
                    logoText: isLightMode 
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent font-extrabold' 
                        : 'bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent font-extrabold',
                    logoSubtitle: isLightMode ? 'text-indigo-600 font-extrabold tracking-widest' : 'text-blue-500 font-black tracking-widest',
                    logoSubtitleText: 'CORE ENGINE',
                    profilePill: isLightMode 
                        ? 'bg-slate-100/60 border border-slate-200/60 hover:bg-slate-200/60 text-slate-700 shadow-sm' 
                        : 'bg-gray-800/50 border border-white/10 hover:bg-gray-800 text-white shadow-md',
                    profileName: isLightMode ? 'text-slate-800 font-bold' : 'text-white font-bold',
                    profileRole: isLightMode ? 'text-indigo-600/70 font-semibold' : 'text-blue-400/80 font-semibold',
                    dropdownBg: isLightMode 
                        ? 'bg-white/95 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-slate-800' 
                        : 'bg-[#0f1524]/95 border border-white/[0.08] shadow-[0_30px_70px_rgba(0,0,0,0.6)] text-white',
                    dropdownHeaderBorder: isLightMode ? 'border-b border-slate-100' : 'border-b border-white/[0.05]',
                    dropdownItem: isLightMode 
                        ? 'text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700' 
                        : 'text-gray-200 hover:bg-blue-600 hover:text-white',
                    dropdownItemLogout: isLightMode
                        ? 'text-red-500 hover:bg-red-50 hover:text-white'
                        : 'text-red-400 hover:bg-red-500 hover:text-white',
                    dropdownDivider: isLightMode ? 'border-t border-slate-100' : 'border-t border-white/[0.05]',
                    langBtnActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
                    langBtnInactive: isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-gray-500 hover:text-gray-300',
                    langBg: isLightMode ? 'bg-slate-100 border border-slate-200/60' : 'bg-black/20 border border-white/5',
                    chatBtn: isLightMode 
                        ? 'bg-indigo-50/70 text-indigo-600 border border-indigo-100/80 hover:bg-indigo-600 hover:text-white' 
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white',
                    bellBtn: isLightMode
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 hover:bg-amber-500 hover:text-white'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white',
                    badgeBorder: isLightMode ? 'border-white' : 'border-[#0b0f19]',
                    hamburgerLine: isLightMode ? 'bg-indigo-600' : 'bg-blue-400',
                    hamburgerBtn: isLightMode ? 'bg-indigo-50/70 border border-indigo-100/80 text-indigo-600' : 'bg-blue-600/10 border border-blue-500/20 text-blue-400',
                };
        }
    }, [uiTheme, isLightMode]);

    if (!currentUser) return null;

    // Apply inline style adjustments
    const headerStyle: React.CSSProperties = {
        top: originalAdminUser ? '40px' : '0px',
        borderRadius: '0px', // Header stays flush at the top
        backdropFilter: `blur(${glassIntensityVal}px)`,
        WebkitBackdropFilter: `blur(${glassIntensityVal}px)`,
    };

    const elementBorderRadius = {
        borderRadius: `${borderRadiusVal * 0.5}px`
    };

    const dropdownBorderRadius = {
        borderRadius: `${borderRadiusVal}px`
    };

    const profilePillBorderRadius = {
        borderRadius: `${borderRadiusVal * 0.75}px`
    };

    return (
        <>
            <header 
                className={`fixed left-0 right-0 z-[60] p-2 sm:p-3 shadow-2xl transition-all duration-300 ${styles.header}`}
                style={headerStyle}
            >
                <div className="w-full max-w-full mx-auto flex justify-between items-center px-2 sm:px-6 relative">
                    
                    {/* Branding Section - Updated with premium animations */}
                    <div 
                        className={`flex items-center gap-3 select-none transition-all transform active:scale-95 duration-200 ${isSystemAdmin ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                        onClick={handleHomeClick}
                    >
                        {/* Custom Mobile Title (If set) */}
                        <div className={`md:hidden ${mobilePageTitle ? 'block' : 'hidden'}`}>
                             <h1 className="text-lg font-black leading-tight truncate uppercase tracking-tight italic">
                                {mobilePageTitle}
                             </h1>
                        </div>

                        {/* Standard Logo (Hidden on mobile if title exists) */}
                        <div className={`flex items-center gap-3 ${mobilePageTitle ? 'hidden md:flex' : 'flex'}`}>
                            <img 
                                src={APP_LOGO_URL} 
                                alt="Logo" 
                                className="w-10 h-10 md:w-11 md:h-11 object-cover flex-shrink-0 transition-transform duration-300 hover:scale-105"
                            />
                            <div className="min-w-0">
                                <h1 className={`text-base sm:text-xl leading-none ${styles.logoText}`} style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
                                    O-System
                                </h1>
                                {/* Live Status — Desktop only */}
                                <div className="hidden md:flex items-center gap-1.5 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse"></span>
                                    <span className="text-[9px] uppercase tracking-[0.18em] font-semibold opacity-60">Live</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center — App State Indicator (Desktop only, hidden on Role Selection) */}
                    {appState !== 'role_selection' && (
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 pointer-events-none select-none">
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-sm border ${
                            uiTheme === 'binance' ? 'bg-[#2B3139]/60 border-[#FCD535]/20 text-[#FCD535]/80' :
                            uiTheme === 'netflix' ? 'bg-white/5 border-white/10 text-gray-300' :
                            uiTheme === 'finance' ? 'bg-[#141F27]/80 border-[#10b981]/20 text-[#10b981]/80' :
                            isLightMode ? 'bg-slate-100/80 border-slate-200/60 text-slate-500' :
                            'bg-white/5 border-white/10 text-white/50'
                        }`}>
                            <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="opacity-80" style={{ letterSpacing: '0.06em' }}>
                                {appState === 'admin_dashboard' ? 'Admin Dashboard' : 'Operations'}
                            </span>
                        </div>
                    </div>
                    )}

                    <div className="flex items-center space-x-2 sm:space-x-3">

                        {/* Inline Language Switcher — XL screens only */}
                        <div className={`hidden xl:flex items-center p-0.5 rounded-xl gap-0.5 ${styles.langBg}`}>
                            <button
                                onClick={() => toggleLanguage('en')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all ${language === 'en' ? styles.langBtnActive : styles.langBtnInactive}`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => toggleLanguage('km')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all ${language === 'km' ? styles.langBtnActive : styles.langBtnInactive}`}
                            >
                                KH
                            </button>
                        </div>

                        {/* Vertical Divider — Desktop only */}
                        <div className={`hidden md:block w-px h-7 opacity-20 ${isLightMode ? 'bg-slate-400' : 'bg-white'}`}></div>

                        {/* User Info — Desktop */}
                        <div className="hidden md:block text-right">
                            <p className={`text-sm font-semibold truncate leading-tight ${styles.profileName}`}>
                                {advancedSettings?.enablePrivacyMode 
                                    ? 'User ****' 
                                    : currentUser.FullName}
                            </p>
                            <p className={`text-[9px] uppercase tracking-widest opacity-60 ${styles.profileRole}`}>
                                {currentUser.Role}
                            </p>
                        </div>
                        
                        {/* Notification Permission Bell */}
                        {notificationPermission === 'default' && (
                            <button 
                                onClick={handleEnableNotifications}
                                className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center transition-all active:scale-95 animate-pulse ${styles.bellBtn}`}
                                style={elementBorderRadius}
                                title="Enable Notifications"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            </button>
                        )}

                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={handleDropdownToggle} 
                                className={`flex items-center gap-2 p-1 md:p-1.5 pr-3 md:pr-4 transition-all active:scale-95 shadow-md group ${styles.profilePill}`}
                                style={profilePillBorderRadius}
                            >
                                <UserAvatar 
                                    avatarUrl={currentUser.ProfilePictureURL}
                                    name={currentUser.FullName}
                                    className="w-9 h-9 md:w-8 md:h-8 border-2 border-white/5 shadow-xl group-hover:scale-105 transition-transform"
                                />
                                <svg className={`w-3.5 h-3.5 opacity-60 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div 
                                    className={`absolute right-0 mt-4 w-64 py-3 z-50 animate-fade-in-scale backdrop-blur-3xl overflow-hidden ${styles.dropdownBg}`}
                                    style={{
                                        ...dropdownBorderRadius,
                                        backdropFilter: `blur(${glassIntensityVal}px)`,
                                        WebkitBackdropFilter: `blur(${glassIntensityVal}px)`
                                    }}
                                >
                                    <div className={`px-5 py-3 mb-2 ${styles.dropdownHeaderBorder}`}>
                                        <p className={`text-sm truncate font-black ${styles.profileName}`}>
                                            {advancedSettings?.enablePrivacyMode 
                                                ? 'User ****' 
                                                : currentUser.FullName}
                                        </p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${styles.profileRole}`}>{currentUser.Role}</p>
                                    </div>
                                    
                                    {/* Edit Profile */}
                                    <button 
                                        onClick={() => { setEditProfileModalOpen(true); setDropdownOpen(false); }} 
                                        className={`w-full text-left px-5 py-3 text-sm font-bold transition-all duration-150 flex items-center gap-3 ${styles.dropdownItem}`}
                                    >
                                        <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        {t.edit_profile}
                                    </button>

                                    {/* Advanced Settings */}
                                    <button 
                                        onClick={() => { setAdvancedSettingsOpen(true); setDropdownOpen(false); }} 
                                        className={`w-full text-left px-5 py-3 text-sm font-bold transition-all duration-150 flex items-center gap-3 ${styles.dropdownItem}`}
                                    >
                                        <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {t.advanced_settings}
                                    </button>

                                    {/* Test Notification */}
                                    <button 
                                        onClick={handleTestNotification} 
                                        className={`w-full text-left px-5 py-3 text-sm font-bold transition-all duration-150 flex items-center gap-3 ${styles.dropdownItem}`}
                                    >
                                        <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                        {t.test_notification}
                                    </button>

                                    {/* Refresh Data */}
                                    <button 
                                        onClick={async () => {
                                            setIsRefreshing(true);
                                            try { await refreshData(); window.location.reload(); } catch (err) { setIsRefreshing(false); }
                                        }} 
                                        className={`w-full text-left px-5 py-3 text-sm font-bold transition-all duration-150 flex items-center justify-between group ${styles.dropdownItem}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 opacity-60 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            {t.refresh_data}
                                        </div>
                                        {isRefreshing && <Spinner size="sm" />}
                                    </button>

                                    {/* Language Switcher Section */}
                                    <div className={`px-5 py-3 mt-2 ${styles.dropdownDivider} bg-black/5`}>
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">{t.language}</p>
                                        <div className={`flex p-1 rounded-xl gap-1 ${styles.langBg}`}>
                                            <button 
                                                onClick={() => toggleLanguage('en')}
                                                className={`flex-1 py-1 rounded-lg text-[9px] font-black transition-all ${language === 'en' ? styles.langBtnActive : styles.langBtnInactive}`}
                                            >
                                                ENGLISH
                                            </button>
                                            <button 
                                                onClick={() => toggleLanguage('km')}
                                                className={`flex-1 py-1 rounded-lg text-[9px] font-black transition-all ${language === 'km' ? styles.langBtnActive : styles.langBtnInactive}`}
                                            >
                                                ភាសាខ្មែរ
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role Switch */}
                                    {!originalAdminUser && appState !== 'role_selection' && (
                                         <button 
                                            onClick={() => { handleBackClick(); setDropdownOpen(false); }} 
                                            className={`w-full text-left px-5 py-3 text-sm font-bold transition-all duration-150 flex items-center gap-3 ${styles.dropdownDivider} ${styles.dropdownItem}`}
                                         >
                                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                            {t.change_team}
                                         </button>
                                    )}

                                    {/* Logout */}
                                    <button 
                                        onClick={handleLogout} 
                                        className={`w-full text-left px-5 py-3 text-sm font-black transition-all duration-150 flex items-center gap-3 ${styles.dropdownDivider} ${styles.dropdownItemLogout}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        {t.logout}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Admin Hamburger Menu */}
                        {isMobileAdmin && (
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className={`relative w-10 h-10 flex items-center justify-center transition-all active:scale-90 ${styles.hamburgerBtn}`}
                                style={elementBorderRadius}
                                aria-label="Toggle Menu"
                            >
                                <div className="flex flex-col gap-1 items-center">
                                    <span className={`h-0.5 rounded-full transition-all duration-300 ${styles.hamburgerLine} ${isMobileMenuOpen ? 'w-5 rotate-45 translate-y-1.5' : 'w-5'}`}></span>
                                    <span className={`h-0.5 rounded-full transition-all duration-300 ${styles.hamburgerLine} ${isMobileMenuOpen ? 'w-0 opacity-0' : 'w-5'}`}></span>
                                    <span className={`h-0.5 rounded-full transition-all duration-300 ${styles.hamburgerLine} ${isMobileMenuOpen ? 'w-5 -rotate-45 -translate-y-1.5' : 'w-5'}`}></span>
                                </div>
                            </button>
                        )}

                        {/* Chat Button (Hidden on Mobile Admin to make space for Hamburger) */}
                        {!isMobileAdmin && (
                            <button 
                                onClick={() => setIsChatOpen(true)}
                                className={`relative p-2.5 transition-all active:scale-90 shadow-md ${styles.chatBtn}`}
                                style={elementBorderRadius}
                                aria-label="Open Chat"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className={`absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 animate-pulse ${styles.badgeBorder}`}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>
            {editProfileModalOpen && <EditProfileModal onClose={() => setEditProfileModalOpen(false)} />}
            {advancedSettingsOpen && <AdvancedSettingsModal onClose={() => setAdvancedSettingsOpen(false)} />}
        </>
    );
};

export default Header;

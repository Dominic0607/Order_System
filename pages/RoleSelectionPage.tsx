import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import UserAvatar from '../components/common/UserAvatar';
import { convertGoogleDriveUrl } from '../utils/fileUtils';
import { APP_LOGO_URL } from '../constants';
import { translations } from '../translations';
import { CLIENT_VERSION } from '../constants/version';

interface RoleSelectionPageProps {
    onSelect: (role: 'admin_dashboard' | 'user_journey' | 'fulfillment' | 'cambodia_map' | 'entertainment' | 'promotions') => void;
}

const getRoleSelectThemeStyles = (theme: string, isLight: boolean) => {
    switch (theme) {
        case 'binance':
            return {
                bg: 'bg-[#12161A] text-[#EAECEF]',
                bgStyle: {
                    background: 'linear-gradient(135deg, #0B0E11 0%, #12161A 50%, #1E2329 100%)'
                },
                profileCard: 'bg-[#1E2329] border border-[#2B3139] shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-3xl p-8 flex flex-col items-center max-w-sm mx-auto',
                avatarBorder: 'border-4 border-[#2B3139]',
                onlineRingBorder: 'border-[#1E2329]',
                nameText: 'text-2xl sm:text-3xl font-extrabold text-[#EAECEF] uppercase tracking-tight',
                roleBadge: 'bg-[#FCD535]/10 border border-[#FCD535]/30 text-[#FCD535] font-extrabold text-xs px-4 py-1.5 rounded-full tracking-widest',
                logoutBtn: 'bg-[#2B3139] border border-[#2B3139] hover:bg-[#363C44] text-[#EAECEF] rounded-full shadow-md transition-all',
                titleSpan: 'text-[#FCD535]',
                subtitleText: 'text-[#848E9C]',
                card: 'bg-[#1E2329] hover:bg-[#2B3139] border border-[#2B3139] hover:border-[#FCD535]/30 shadow-xl rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] flex items-center gap-4 text-left w-full',
                cardIconBg: 'w-12 h-12 rounded-xl bg-[#2B3139] text-[#FCD535] flex items-center justify-center shrink-0 border border-white/5',
                cardArrowColor: 'text-[#FCD535]',
                cardTitle: 'text-white font-extrabold text-sm sm:text-base uppercase tracking-tight',
                cardSub: 'text-[#848E9C] text-xs',
                cardAccentLine: 'bg-[#FCD535]',
                decorDot: '#FCD535',
            };
        case 'netflix':
            return {
                bg: 'bg-[#141414] text-white',
                bgStyle: {
                    background: 'linear-gradient(135deg, #0f0f0f 0%, #141414 50%, #1a1a1a 100%)'
                },
                profileCard: 'bg-[#181818] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-3xl p-8 flex flex-col items-center max-w-sm mx-auto',
                avatarBorder: 'border-4 border-white/10',
                onlineRingBorder: 'border-[#181818]',
                nameText: 'text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight',
                roleBadge: 'bg-[#e50914]/10 border border-[#e50914]/20 text-[#e50914] font-extrabold text-xs px-4 py-1.5 rounded-full tracking-widest',
                logoutBtn: 'bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full transition-all',
                titleSpan: 'text-[#e50914]',
                subtitleText: 'text-gray-500',
                card: 'bg-[#181818] hover:bg-[#222] border border-white/5 hover:border-white/10 shadow-2xl rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] flex items-center gap-4 text-left w-full',
                cardIconBg: 'w-12 h-12 rounded-xl bg-white/5 text-[#e50914] flex items-center justify-center shrink-0 border border-white/5',
                cardArrowColor: 'text-[#e50914]',
                cardTitle: 'text-white font-extrabold text-sm sm:text-base uppercase tracking-tight',
                cardSub: 'text-gray-500 text-xs',
                cardAccentLine: 'bg-[#e50914]',
                decorDot: '#e50914',
            };
        case 'samsung':
            return {
                bg: isLight ? 'bg-slate-50 text-black' : 'bg-[#0a0a0a] text-white',
                bgStyle: {
                    background: isLight 
                        ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' 
                        : 'linear-gradient(135deg, #020617 0%, #0a0a0a 50%, #121212 100%)'
                },
                profileCard: isLight 
                    ? 'bg-white border border-[#e1e1e1] shadow-xl rounded-3xl p-8 flex flex-col items-center max-w-sm mx-auto' 
                    : 'bg-[#121212] border border-white/10 shadow-2xl rounded-3xl p-8 flex flex-col items-center max-w-sm mx-auto',
                avatarBorder: isLight ? 'border-4 border-slate-100 shadow-md' : 'border-4 border-white/5',
                onlineRingBorder: isLight ? 'border-white' : 'border-[#121212]',
                nameText: isLight ? 'text-2xl sm:text-3xl font-extrabold text-black tracking-tight' : 'text-2xl sm:text-3xl font-extrabold text-white tracking-tight',
                roleBadge: 'bg-[#0381fe]/10 border border-[#0381fe]/20 text-[#0381fe] font-extrabold text-xs px-4 py-1.5 rounded-full tracking-widest',
                logoutBtn: isLight 
                    ? 'bg-gray-100 hover:bg-gray-200 border border-slate-200 text-black rounded-full' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full',
                titleSpan: 'text-[#0381fe]',
                subtitleText: isLight ? 'text-gray-500' : 'text-gray-400',
                card: isLight 
                    ? 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#0381fe]/30 shadow-md rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] flex items-center gap-4 text-left w-full' 
                    : 'bg-[#121212] hover:bg-white/5 border border-white/10 hover:border-[#0381fe]/30 shadow-xl rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] flex items-center gap-4 text-left w-full',
                cardIconBg: isLight 
                    ? 'w-12 h-12 rounded-xl bg-slate-100 text-[#0381fe] flex items-center justify-center shrink-0 border border-slate-200' 
                    : 'w-12 h-12 rounded-xl bg-white/5 text-[#0381fe] flex items-center justify-center shrink-0 border border-white/5',
                cardArrowColor: 'text-[#0381fe]',
                cardTitle: isLight ? 'text-slate-800 font-extrabold text-sm sm:text-base uppercase tracking-tight' : 'text-white font-extrabold text-sm sm:text-base uppercase tracking-tight',
                cardSub: isLight ? 'text-gray-500 text-xs' : 'text-gray-400 text-xs',
                cardAccentLine: 'bg-[#0381fe]',
                decorDot: '#0381fe',
            };
        case 'finance':
            return {
                bg: 'bg-[#090D10] text-white',
                bgStyle: {
                    background: 'linear-gradient(135deg, #050709 0%, #090D10 50%, #0E161C 100%)'
                },
                profileCard: 'bg-[#0E161C] border border-[#141F27] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 flex flex-col items-center max-w-sm mx-auto',
                avatarBorder: 'border-4 border-[#141F27]',
                onlineRingBorder: 'border-[#0E161C]',
                nameText: 'text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight',
                roleBadge: 'bg-[#10b981]/10 border border-[#10b981]/25 text-[#10b981] font-extrabold text-xs px-4 py-1.5 rounded-full tracking-widest',
                logoutBtn: 'bg-[#141F27] hover:bg-[#1C2C37] border border-[#1C2C37] text-white rounded-full',
                titleSpan: 'text-[#10b981]',
                subtitleText: 'text-[#5A6E7F]',
                card: 'bg-[#0E161C] hover:bg-[#141F27] border border-[#141F27] hover:border-[#10b981]/30 shadow-xl rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] flex items-center gap-4 text-left w-full',
                cardIconBg: 'w-12 h-12 rounded-xl bg-[#141F27] text-[#10b981] flex items-center justify-center shrink-0 border border-[#141F27]',
                cardArrowColor: 'text-[#10b981]',
                cardTitle: 'text-white font-extrabold text-sm sm:text-base uppercase tracking-tight',
                cardSub: 'text-[#5A6E7F] text-xs',
                cardAccentLine: 'bg-[#10b981]',
                decorDot: '#10b981',
            };
        case 'default':
        default:
            return {
                bg: isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#070b13] text-white',
                bgStyle: {
                    background: isLight 
                        ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' 
                        : 'linear-gradient(135deg, #020617 0%, #0b0f19 50%, #070b13 100%)'
                },
                profileCard: isLight 
                    ? 'bg-white/70 border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col items-center max-w-sm mx-auto' 
                    : 'bg-[#0b0f19]/65 border border-white/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col items-center max-w-sm mx-auto',
                avatarBorder: isLight ? 'border-4 border-white shadow-xl' : 'border-4 border-white/5 shadow-xl',
                onlineRingBorder: isLight ? 'border-white' : 'border-[#0b0f19]/65',
                nameText: isLight ? 'text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-1' : 'text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none mb-1',
                roleBadge: isLight 
                    ? 'bg-indigo-50 border border-indigo-100/80 text-indigo-600 font-extrabold text-xs px-4 py-1.5 rounded-full tracking-wider uppercase' 
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold text-xs px-4 py-1.5 rounded-full tracking-wider uppercase',
                logoutBtn: isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-full shadow-sm' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-full',
                titleSpan: isLight ? 'text-indigo-600' : 'text-blue-500',
                subtitleText: isLight ? 'text-slate-500' : 'text-slate-400',
                card: isLight 
                    ? 'bg-white/70 hover:bg-white border border-slate-200/60 hover:border-indigo-200 shadow-md hover:shadow-xl rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] flex items-center gap-4 text-left w-full' 
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border border-white/[0.05] hover:border-blue-500/30 shadow-2xl hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] rounded-2xl p-5 sm:p-6 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] flex items-center gap-4 text-left w-full',
                cardIconBg: isLight 
                    ? 'w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80' 
                    : 'w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20',
                cardArrowColor: isLight ? 'text-indigo-600' : 'text-blue-400',
                cardTitle: isLight ? 'text-slate-800 font-extrabold text-sm sm:text-base uppercase tracking-tight' : 'text-white font-extrabold text-sm sm:text-base uppercase tracking-tight',
                cardSub: isLight ? 'text-slate-500 text-xs' : 'text-slate-400 text-xs',
                cardAccentLine: isLight ? 'bg-indigo-600' : 'bg-blue-500',
                decorDot: isLight ? '#4f46e5' : '#3b82f6',
            };
    }
};

const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ onSelect }) => {
    const { currentUser, hasPermission, logout, language, advancedSettings } = useContext(AppContext);
    const [mounted, setMounted] = useState(false);
    const [pressedIdx, setPressedIdx] = useState<number | null>(null);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [portalOrder, setPortalOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('portal_buttons_order');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const longPressTimer = useRef<any>(null);

    const handlePressStart = (index: number) => {
        if (isReorderMode) return;
        longPressTimer.current = setTimeout(() => {
            setIsReorderMode(true);
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 700);
    };

    const handlePressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    const moveCard = (rolesList: any[], index: number, direction: 'prev' | 'next') => {
        const targetIndex = direction === 'prev' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < rolesList.length) {
            const currentIds = rolesList.map(r => r.id);
            const temp = currentIds[index];
            currentIds[index] = currentIds[targetIndex];
            currentIds[targetIndex] = temp;
            
            setPortalOrder(currentIds);
            localStorage.setItem('portal_buttons_order', JSON.stringify(currentIds));
        }
    };

    const swapCards = (rolesList: any[], fromIndex: number, toIndex: number) => {
        if (fromIndex >= 0 && fromIndex < rolesList.length && toIndex >= 0 && toIndex < rolesList.length) {
            const currentIds = rolesList.map(r => r.id);
            const temp = currentIds[fromIndex];
            currentIds[fromIndex] = currentIds[toIndex];
            currentIds[toIndex] = temp;
            
            setPortalOrder(currentIds);
            localStorage.setItem('portal_buttons_order', JSON.stringify(currentIds));
        }
    };

    const t = translations[language];

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!currentUser) return null;

    const isInternalAdmin = currentUser.IsSystemAdmin;
    const showAdmin = isInternalAdmin || hasPermission('view_admin_dashboard') || hasPermission('view_order_list');
    const showFulfillment = hasPermission('access_fulfillment');
    const showSales = hasPermission('access_sales_portal') && hasPermission('create_order');
    const showEntertainment = isInternalAdmin || hasPermission('view_entertainment');
    const showPromotions = isInternalAdmin || hasPermission('view_promotions');
    const showProblemItemsAdmin = isInternalAdmin || hasPermission('access_problem_items_admin');
    const showProblemItemsUser = hasPermission('access_problem_items_user');
    const showProblemItems = showProblemItemsAdmin || showProblemItemsUser;
    const showMap = hasPermission('view_map');

    // Determine which UI to render
    const useNeumorphism = advancedSettings?.uiTheme === 'neumorphism';
    const uiTheme = advancedSettings?.uiTheme || 'default';
    const isLightMode = advancedSettings?.themeMode === 'light';
    const styles = useMemo(() => getRoleSelectThemeStyles(uiTheme, isLightMode), [uiTheme, isLightMode]);

    // ════════════════════════════════════════════════════════════
    // UI Ver 1.0 — Original Dark Glassmorphism / Redesigned Theme UI
    // ════════════════════════════════════════════════════════════
    if (!useNeumorphism) {
        const VER = localStorage.getItem('system_update_acknowledged_version') || CLIENT_VERSION;
        const allRoles = [
            showAdmin && {
                id: 'admin',
                label: t.enter_admin,
                sublabel: language === 'km' ? 'គ្រប់គ្រងប្រព័ន្ធ' : 'System Management',
                onClick: () => onSelect('admin_dashboard'),
                accent: styles.decorDot,
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
                        <path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
                    </svg>
                ),
            },
            showFulfillment && {
                id: 'fulfillment',
                label: language === 'km' ? 'វេចខ្ចប់' : 'Fulfillment',
                sublabel: language === 'km' ? 'ដំណើរការកញ្ចប់' : 'Package Processing',
                onClick: () => onSelect('fulfillment'),
                accent: '#b45309',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                ),
            },
            showSales && {
                id: 'sales',
                label: t.enter_user,
                sublabel: language === 'km' ? 'ផ្នែកលក់' : 'Sales Portal',
                onClick: () => onSelect('user_journey'),
                accent: '#047857',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                ),
            },
            showEntertainment && {
                id: 'entertainment',
                label: language === 'km' ? 'កម្សាន្ត' : 'Entertainment',
                sublabel: language === 'km' ? 'មាតិកា & ភាពយន្ត' : 'Content & Media',
                onClick: () => onSelect('entertainment' as any),
                accent: '#be123c',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                ),
            },
            showPromotions && {
                id: 'promotions',
                label: language === 'km' ? 'ប្រម៉ូសិន' : 'Promotions',
                sublabel: language === 'km' ? 'គ្រប់គ្រងការផ្ដល់ជូន' : 'Offer Management',
                onClick: () => onSelect('promotions'),
                accent: '#6d28d9',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                ),
            },
            showMap && {
                id: 'map',
                label: language === 'km' ? 'ផែនទី' : 'Map',
                sublabel: language === 'km' ? 'ផែនទីប្រទេសកម្ពុជា' : 'Cambodia Map',
                onClick: () => onSelect('cambodia_map'),
                accent: '#92400e',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                ),
            },
            showProblemItems && {
                id: 'problem',
                label: t.enter_damaged,
                sublabel: language === 'km' ? 'ទំនិញខូច / បញ្ហា' : 'Damaged Items',
                onClick: () => {
                    const key = showProblemItemsAdmin
                        ? '063a669e39fef90d061aef98caaa0fc589fba961cae83040e9ee2038a3ebb7e8'
                        : '60a5f0446fe326829643de09bcf2a70854fc134f070591b8f73bb27811774661';
                    window.open(`https://brokenaccflexi.onrender.com/?key=${key}`, '_blank');
                },
                accent: '#9f1239',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                ),
            },
        ].filter(Boolean) as any[];
        const sortedRoles = [...allRoles].sort((a, b) => {
            const idxA = portalOrder.indexOf(a.id);
            const idxB = portalOrder.indexOf(b.id);
            const valA = idxA === -1 ? 999 : idxA;
            const valB = idxB === -1 ? 999 : idxB;
            return valA - valB;
        });

        return (
            <div className={`min-h-screen w-full flex flex-col items-center justify-start relative font-['Kantumruy_Pro'] overflow-y-auto pt-16 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${styles.bg}`} style={styles.bgStyle}>
                {/* Background decorative glows */}
                <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ backgroundColor: styles.decorDot }}></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ backgroundColor: '#10b981' }}></div>
                </div>

                <style>{`
                    .selection-btn { transition: all 0.4s cubic-bezier(0.2,0.8,0.2,1); }
                    .selection-btn:hover { transform: translateY(-4px) scale(1.015); }
                    .selection-btn:active { transform: scale(0.98) translateY(0); }
                    .shimmer { position: absolute; top:0; left:-100%; width:50%; height:100%; background: linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent); transition: 0.6s; }
                    .selection-btn:hover .shimmer { left:100%; transition: 0.8s; }
                    @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); filter:blur(10px); } to { opacity:1; transform:translateY(0); filter:blur(0); } }
                    .animate-reveal { animation: fadeInUp 0.6s cubic-bezier(0.2,0.8,0.2,1) forwards; }
                    @keyframes wiggle {
                        0% { transform: rotate(-0.8deg) scale(0.995); }
                        100% { transform: rotate(0.8deg) scale(1.005); }
                    }
                    .wiggle {
                        animation: wiggle 0.24s ease-in-out infinite alternate;
                        pointer-events: auto !important;
                    }
                `}</style>

                {/* Logout Button */}
                <div className="absolute top-4 right-4 lg:top-8 lg:right-10 z-50 animate-reveal" style={{ animationDelay: '0.05s' }}>
                    <button 
                        onClick={logout} 
                        className={`flex items-center gap-2 px-4 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] shadow-lg ${styles.logoutBtn}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="hidden sm:inline">{t.logout}</span>
                    </button>
                </div>

                <div className="w-full max-w-5xl z-10 flex flex-col items-center justify-start gap-6 sm:gap-8 lg:gap-12 my-auto">
                    {/* Redesigned Profile Section */}
                    <div className="animate-reveal shrink-0 w-full" style={{ animationDelay: '0.15s' }}>
                        <div className={styles.profileCard}>
                            <div className="relative mb-3 sm:mb-4 group">
                                <div className={`p-1 transition-transform duration-500 group-hover:scale-105 rounded-full ${styles.avatarBorder}`}>
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden shadow-xl bg-slate-900/10">
                                        <UserAvatar avatarUrl={currentUser.ProfilePictureURL} name={currentUser.FullName} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-115" />
                                    </div>
                                </div>
                                <div className={`absolute bottom-1 right-1 lg:bottom-1.5 lg:right-1.5 w-4.5 h-4.5 lg:w-5.5 lg:h-5.5 bg-emerald-500 border-[3.5px] rounded-full shadow-lg z-20 animate-pulse ${styles.onlineRingBorder}`}></div>
                            </div>
                            <div className="text-center">
                                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-[-0.03em] leading-tight mb-2 ${styles.nameText}`}>
                                    {currentUser.FullName}
                                </h1>
                                <div className={styles.roleBadge}>
                                    <span className={styles.roleBadgeText}>
                                        {currentUser.Role || (language === 'km' ? 'អ្នកប្រើប្រាស់' : 'System User')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Title */}
                    <div className="text-center animate-reveal shrink-0 px-4" style={{ animationDelay: '0.25s' }}>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-1 lg:mb-2 tracking-tight leading-none uppercase italic">
                            {language === 'km' ? (
                                <>ជ្រើសរើស <span className={styles.titleSpan}>ការចូល</span> ប្រព័ន្ធ</>
                            ) : (
                                <>Select <span className={styles.titleSpan}>Access</span></>
                            )}
                        </h2>
                        <p className={`text-[9px] lg:text-[11px] font-bold uppercase tracking-[0.3em] lg:tracking-[0.4em] ${styles.subtitleText}`}>
                            {t.role_subtext}
                        </p>
                    </div>

                    {isReorderMode && (
                        <div className="flex justify-end w-full max-w-4xl px-2 sm:px-0 mb-2 z-50 animate-reveal">
                            <button 
                                onClick={() => setIsReorderMode(false)}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] tracking-wider uppercase shadow-md transition-all active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                Done (រួចរាល់)
                            </button>
                        </div>
                    )}

                    {/* Cards Grid */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 animate-reveal px-2 sm:px-0" style={{ animationDelay: '0.35s' }}>
                        {sortedRoles.map((role: any, idx: number) => (
                            <button 
                                key={role.id} 
                                onClick={() => {
                                    if (isReorderMode) return;
                                    role.onClick();
                                }} 
                                onMouseDown={() => {
                                    setPressedIdx(idx);
                                    handlePressStart(idx);
                                }}
                                onMouseUp={() => {
                                    setPressedIdx(null);
                                    handlePressEnd();
                                }}
                                onMouseLeave={() => {
                                    setPressedIdx(null);
                                    handlePressEnd();
                                }}
                                onTouchStart={() => {
                                    setPressedIdx(idx);
                                    handlePressStart(idx);
                                }}
                                onTouchEnd={() => {
                                    setPressedIdx(null);
                                    handlePressEnd();
                                }}
                                draggable={isReorderMode}
                                onDragStart={(e) => {
                                    setDraggedIdx(idx);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedIdx !== null && draggedIdx !== idx) {
                                        swapCards(sortedRoles, draggedIdx, idx);
                                    }
                                }}
                                onDragEnd={() => setDraggedIdx(null)}
                                className={`selection-btn group relative overflow-hidden flex flex-row sm:flex-col p-3.5 sm:p-5 gap-3.5 sm:gap-3 w-full h-[76px] sm:h-[150px] transition-opacity duration-200 ${isReorderMode ? 'wiggle' : ''} ${styles.card}`}
                                style={{ opacity: draggedIdx === idx ? 0.4 : 1 }}
                            >
                                <div className="shimmer"></div>
                                <div className="flex items-center sm:items-start justify-between w-full">
                                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-105 ${styles.cardIconBg}`}>
                                        <div className="w-6 h-6 sm:w-7 sm:h-7">{role.icon}</div>
                                    </div>
                                    
                                    {isReorderMode ? (
                                        <div className="flex items-center gap-1.5 z-50 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {idx > 0 && (
                                                <button 
                                                    onClick={() => moveCard(sortedRoles, idx, 'prev')}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white/90 border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 transition-all active:scale-90"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                                </button>
                                            )}
                                            {idx < sortedRoles.length - 1 && (
                                                <button 
                                                    onClick={() => moveCard(sortedRoles, idx, 'next')}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white/90 border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 transition-all active:scale-90"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`transition-transform duration-300 group-hover:translate-x-1 mt-0 sm:absolute sm:top-5 sm:right-5 shrink-0 ${styles.cardArrowColor}`}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col flex-grow text-left gap-0.5 mt-0 sm:mt-2">
                                    <h3 className={`text-[12px] sm:text-[14px] font-extrabold tracking-tight leading-tight transition-colors ${styles.cardTitle}`}>
                                        {role.label}
                                    </h3>
                                    <p className={`text-[9px] sm:text-[10px] font-medium leading-snug ${styles.cardSub}`}>
                                        {role.sublabel}
                                    </p>
                                </div>
                                <div
                                    className="hidden sm:block mt-auto h-[3px] rounded-full w-8 transition-all duration-300 group-hover:w-full"
                                    style={{ background: `linear-gradient(90deg, ${role.accent || styles.decorDot}, rgba(255,255,255,0.1))` }}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="animate-reveal flex flex-col items-center gap-2 mt-2 pb-4 shrink-0" style={{ animationDelay: '0.5s' }}>
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-current to-transparent opacity-10"></div>
                        <div className="flex items-center gap-2 mt-1">
                            <img src={APP_LOGO_URL} alt="Logo" className="w-3 h-3 grayscale opacity-25" />
                            <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] ${styles.subtitleText}`}>
                                O-System Core v{VER}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    const BG = isLightMode ? '#f0f4f8' : '#171b22';
    const S1 = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.7)';   // shadow dark
    const S2 = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.04)'; // shadow light
    const TXT = isLightMode ? '#0f172a' : '#eaecef';  // text primary
    const TXT2 = isLightMode ? '#334155' : '#848e9c'; // text secondary
    const TXT3 = isLightMode ? '#64748b' : '#94a3b8'; // text muted
    const accentBlue = isLightMode ? '#3b5fc4' : '#60a5fa';
    const VER = localStorage.getItem('system_update_acknowledged_version') || CLIENT_VERSION;

    const allRoles = [
        showAdmin && {
            id: 'admin',
            label: t.enter_admin,
            sublabel: language === 'km' ? 'គ្រប់គ្រងប្រព័ន្ធ' : 'System Management',
            onClick: () => onSelect('admin_dashboard'),
            accent: '#3b5fc4',
            accentLight: '#dce6ff',
            accentGlow: 'rgba(59,95,196,0.15)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
                    <path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
                </svg>
            ),
        },
        showFulfillment && {
            id: 'fulfillment',
            label: language === 'km' ? 'វេចខ្ចប់' : 'Fulfillment',
            sublabel: language === 'km' ? 'ដំណើរការកញ្ចប់' : 'Package Processing',
            onClick: () => onSelect('fulfillment'),
            accent: '#b45309',
            accentLight: '#fef3c7',
            accentGlow: 'rgba(180,83,9,0.14)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
            ),
        },
        showSales && {
            id: 'sales',
            label: t.enter_user,
            sublabel: language === 'km' ? 'ផ្នែកលក់' : 'Sales Portal',
            onClick: () => onSelect('user_journey'),
            accent: '#047857',
            accentLight: '#d1fae5',
            accentGlow: 'rgba(4,120,87,0.14)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
            ),
        },
        showEntertainment && {
            id: 'entertainment',
            label: language === 'km' ? 'កម្សាន្ត' : 'Entertainment',
            sublabel: language === 'km' ? 'មាតិកា & ភាពយន្ត' : 'Content & Media',
            onClick: () => onSelect('entertainment' as any),
            accent: '#be123c',
            accentLight: '#ffe4e6',
            accentGlow: 'rgba(190,18,60,0.13)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            ),
        },
        showPromotions && {
            id: 'promotions',
            label: language === 'km' ? 'ប្រម៉ូសិន' : 'Promotions',
            sublabel: language === 'km' ? 'គ្រប់គ្រងការផ្ដល់ជូន' : 'Offer Management',
            onClick: () => onSelect('promotions'),
            accent: '#6d28d9',
            accentLight: '#ede9fe',
            accentGlow: 'rgba(109,40,217,0.13)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
            ),
        },
        showMap && {
            id: 'map',
            label: language === 'km' ? 'ផែនទី' : 'Map',
            sublabel: language === 'km' ? 'ផែនទីប្រទេសកម្ពុជា' : 'Cambodia Map',
            onClick: () => onSelect('cambodia_map'),
            accent: '#92400e',
            accentLight: '#fef9c3',
            accentGlow: 'rgba(146,64,14,0.13)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
            ),
        },
        showProblemItems && {
            id: 'problem',
            label: t.enter_damaged,
            sublabel: language === 'km' ? 'ទំនិញខូច / បញ្ហា' : 'Damaged Items',
            onClick: () => {
                const key = showProblemItemsAdmin
                    ? '063a669e39fef90d061aef98caaa0fc589fba961cae83040e9ee2038a3ebb7e8'
                    : '60a5f0446fe326829643de09bcf2a70854fc134f070591b8f73bb27811774661';
                window.open(`https://brokenaccflexi.onrender.com/?key=${key}`, '_blank');
            },
            accent: '#9f1239',
            accentLight: '#ffe4e6',
            accentGlow: 'rgba(159,18,57,0.13)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
            ),
        },
    ].filter(Boolean) as any[];

    const sortedRoles = [...allRoles].sort((a, b) => {
        const idxA = portalOrder.indexOf(a.id);
        const idxB = portalOrder.indexOf(b.id);
        const valA = idxA === -1 ? 999 : idxA;
        const valB = idxB === -1 ? 999 : idxB;
        return valA - valB;
    });

    return (
        <div
            className="min-h-screen w-full flex flex-col font-['Kantumruy_Pro'] overflow-hidden"
            style={{ 
                background: isLightMode 
                    ? `linear-gradient(145deg, #e8edf5 0%, ${BG} 50%, #dce3ee 100%)` 
                    : `linear-gradient(145deg, #12151a 0%, ${BG} 50%, #1d212a 100%)` 
            }}
        >
            <style>{`
                /* ── Keyframes ── */
                @keyframes nmSlideDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes nmFadeUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes nmPop {
                    from { opacity: 0; transform: scale(0.88) translateY(16px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes nmPulseRing {
                    0%,100% { box-shadow: 0 0 0 0 rgba(56,161,105,0.35); }
                    50%     { box-shadow: 0 0 0 8px rgba(56,161,105,0); }
                }

                /* ── Header Bar ── */
                .nm-header {
                    background: ${BG};
                    box-shadow: 0 4px 16px ${isLightMode ? 'rgba(163, 177, 198, 0.4)' : 'rgba(0, 0, 0, 0.4)'}, 0 -1px 0 ${isLightMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.03)'} inset;
                    animation: nmSlideDown 0.5s cubic-bezier(0.22,1,0.36,1) both;
                }

                /* ── Avatar ring ── */
                .nm-avatar-shell {
                    background: ${BG};
                    box-shadow: 8px 8px 20px ${S1}, -8px -8px 20px ${S2};
                    border-radius: 50%;
                    padding: 6px;
                    animation: nmPop 0.7s 0.15s cubic-bezier(0.22,1,0.36,1) both;
                }
                .nm-avatar-inner {
                    box-shadow: inset 3px 3px 8px ${S1}, inset -3px -3px 8px ${S2};
                    border-radius: 50%;
                    overflow: hidden;
                }
                .nm-online-ring {
                    animation: nmPulseRing 2.5s ease-in-out infinite;
                }

                /* ── Role badge ── */
                .nm-role-badge {
                    background: ${BG};
                    box-shadow: inset 2px 2px 5px ${S1}, inset -2px -2px 5px ${S2};
                    border-radius: 999px;
                }

                /* ── Section heading line ── */
                .nm-heading-wrap {
                    animation: nmFadeUp 0.6s 0.25s cubic-bezier(0.22,1,0.36,1) both;
                }

                /* ── Cards ── */
                .nm-card {
                    background: ${BG};
                    box-shadow: 5px 5px 12px ${S1}, -5px -5px 12px ${S2};
                    border-radius: 24px;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    transition: box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1);
                    position: relative;
                    overflow: hidden;
                    text-align: left;
                }
                .nm-card:hover {
                    box-shadow: 8px 8px 18px ${S1}, -8px -8px 18px ${S2};
                    transform: translateY(-4px);
                }
                .nm-card:active, .nm-card.pressed {
                    box-shadow: inset 3px 3px 8px ${S1}, inset -3px -3px 8px ${S2};
                    transform: translateY(0) scale(0.975);
                }
                .nm-card-shine {
                    position: absolute;
                    top: -60%; left: -60%;
                    width: 80%; height: 80%;
                    background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%);
                    pointer-events: none;
                    transition: opacity 0.4s;
                    opacity: 0;
                    border-radius: 50%;
                }
                .nm-card:hover .nm-card-shine { opacity: 1; }

                /* ── Card icon ── */
                .nm-icon-circle {
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
                }
                .nm-card:hover .nm-icon-circle {
                    transform: scale(1.1) rotate(-4deg);
                }

                /* ── Arrow ── */
                .nm-arrow {
                    transition: transform 0.3s ease, opacity 0.3s ease;
                    opacity: 1;
                    transform: translateX(0);
                }
                @media (min-width: 640px) {
                    .nm-arrow {
                        opacity: 0;
                        transform: translateX(-6px);
                    }
                    .nm-card:hover .nm-arrow {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                /* ── Logout button ── */
                .nm-logout {
                    background: ${BG};
                    box-shadow: 4px 4px 10px ${S1}, -4px -4px 10px ${S2};
                    border-radius: 14px;
                    border: none;
                    cursor: pointer;
                    transition: box-shadow 0.25s ease, transform 0.25s ease;
                }
                .nm-logout:hover {
                    box-shadow: 6px 6px 14px ${S1}, -6px -6px 14px ${S2};
                    transform: translateY(-2px);
                }
                .nm-logout:active {
                    box-shadow: inset 3px 3px 8px ${S1}, inset -3px -3px 8px ${S2};
                    transform: translateY(0);
                }

                /* ── Logo button ── */
                .nm-logo-wrap {
                    background: ${BG};
                    box-shadow: inset 2px 2px 5px ${S1}, inset -2px -2px 5px ${S2};
                    border-radius: 14px;
                    padding: 8px;
                    display: flex; align-items: center; justify-content: center;
                }

                /* ── Footer separator ── */
                .nm-sep {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, ${isLightMode ? 'rgba(163, 177, 198, 0.4)' : 'rgba(0, 0, 0, 0.3)'}, transparent);
                }

                /* ── Stagger grid ── */
                .nm-grid > *:nth-child(1) { animation-delay: 0.30s; }
                .nm-grid > *:nth-child(2) { animation-delay: 0.37s; }
                .nm-grid > *:nth-child(3) { animation-delay: 0.44s; }
                .nm-grid > *:nth-child(4) { animation-delay: 0.51s; }
                .nm-grid > *:nth-child(5) { animation-delay: 0.58s; }
                .nm-grid > *:nth-child(6) { animation-delay: 0.65s; }
                .nm-grid > *:nth-child(7) { animation-delay: 0.72s; }
                .nm-grid > * { animation: nmPop 0.55s cubic-bezier(0.22,1,0.36,1) both; }
                @keyframes nmWiggle {
                    0% { transform: rotate(-0.8deg) scale(0.995); }
                    100% { transform: rotate(0.8deg) scale(1.005); }
                }
                .nm-wiggle {
                    animation: nmWiggle 0.24s ease-in-out infinite alternate;
                    pointer-events: auto !important;
                }
            `}</style>



            {/* ══════════════ MAIN CONTENT ══════════════ */}
            <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-10 pt-20 pb-8 sm:py-8 overflow-y-auto">
                <div className="w-full max-w-4xl 2xl:max-w-5xl flex flex-col items-center gap-4 sm:gap-8 lg:gap-10 my-auto">

                    {/* ── Profile Section ── */}
                    <div
                        className="flex flex-col items-center gap-2 sm:gap-4"
                        style={{ animation: 'nmFadeUp 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both' }}
                    >
                        {/* Avatar */}
                        <div className="relative mb-2 sm:mb-3.5">
                            <div 
                                className={`rounded-full p-1.5 transition-transform duration-500 hover:scale-105 border ${isLightMode ? 'border-white' : 'border-white/5'}`}
                                style={{
                                    background: BG,
                                    boxShadow: `4px 4px 12px ${S1}, -4px -4px 12px ${S2}`
                                }}
                            >
                                <div className={`w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden ${isLightMode ? 'bg-slate-50' : 'bg-slate-900/40'}`}>
                                    <UserAvatar
                                        avatarUrl={currentUser.ProfilePictureURL}
                                        name={currentUser.FullName}
                                        className="w-full h-full object-cover transition-transform duration-[1.5s] hover:scale-110"
                                    />
                                </div>
                            </div>
                            {/* Online indicator */}
                            <div
                                className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border-[2.5px] sm:border-[3px]"
                                style={{
                                    backgroundColor: '#38a169',
                                    borderColor: BG
                                }}
                            />
                        </div>

                        {/* Name */}
                        <div className="text-center">
                            <h1
                                className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-none mb-1.5"
                                style={{ color: TXT }}
                            >
                                {currentUser.FullName}
                            </h1>
                            <div className="flex items-center justify-center gap-2">
                                {/* Role badge */}
                                <div 
                                    className="px-4 py-1.5 rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em]"
                                    style={{
                                        background: BG,
                                        boxShadow: `inset 2px 2px 5px ${S1}, inset -2px -2px 5px ${S2}`,
                                        color: accentBlue
                                    }}
                                >
                                    {currentUser.Role || (language === 'km' ? 'អ្នកប្រើប្រាស់' : 'System User')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section Heading ── */}
                    <div className="nm-heading-wrap flex flex-col items-center gap-1 sm:gap-2 text-center px-4">
                        {/* Decorative top line */}
                        <div className="hidden sm:flex items-center gap-3 w-full justify-center mb-1">
                            <div className="nm-sep flex-1 max-w-[60px]" />
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ background: accentBlue, boxShadow: isLightMode ? '0 0 8px rgba(59,95,196,0.5)' : '0 0 8px rgba(96,165,250,0.5)' }}
                            />
                            <div className="nm-sep flex-1 max-w-[60px]" />
                        </div>

                        <h2
                            className="text-[17px] sm:text-2xl lg:text-3xl font-black leading-snug tracking-tight"
                            style={{ color: TXT }}
                        >
                            {language === 'km' ? (
                                <>ជ្រើសរើស <span style={{ color: accentBlue }}>ការចូល</span> ប្រព័ន្ធ</>
                            ) : (
                                <>Select your <span style={{ color: accentBlue }}>Access</span> Portal</>
                            )}
                        </h2>
                        <p
                            className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-[0.3em]"
                            style={{ color: TXT3 }}
                        >
                            {t.role_subtext}
                        </p>
                    </div>

                    {isReorderMode && (
                        <div className="flex justify-end w-full max-w-4xl px-4 mb-2 z-50 animate-reveal">
                            <button 
                                onClick={() => setIsReorderMode(false)}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] tracking-wider uppercase shadow-md transition-all active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                Done (រួចរាល់)
                            </button>
                        </div>
                    )}

                    {/* ── Cards Grid ── */}
                    <div className="nm-grid w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
                        {sortedRoles.map((role: any, i: number) => (
                            <button
                                key={role.id}
                                onClick={() => {
                                    if (isReorderMode) return;
                                    role.onClick();
                                }}
                                onMouseDown={() => {
                                    setPressedIdx(i);
                                    handlePressStart(i);
                                }}
                                onMouseUp={() => {
                                    setPressedIdx(null);
                                    handlePressEnd();
                                }}
                                onMouseLeave={() => {
                                    setPressedIdx(null);
                                    handlePressEnd();
                                }}
                                onTouchStart={() => {
                                    setPressedIdx(i);
                                    handlePressStart(i);
                                }}
                                onTouchEnd={() => {
                                    setPressedIdx(null);
                                    handlePressEnd();
                                }}
                                draggable={isReorderMode}
                                onDragStart={(e) => {
                                    setDraggedIdx(i);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedIdx !== null && draggedIdx !== i) {
                                        swapCards(sortedRoles, draggedIdx, i);
                                    }
                                }}
                                onDragEnd={() => setDraggedIdx(null)}
                                className={`nm-card group w-full transition-all relative ${isReorderMode ? 'nm-wiggle' : ''} ${pressedIdx === i ? ' pressed' : ''}`}
                                style={{ opacity: draggedIdx === i ? 0.4 : 1 }}
                            >
                                <div className="nm-card-shine" />

                                <div className="flex flex-row sm:flex-col items-center sm:items-stretch p-3.5 sm:p-5 gap-3.5 sm:gap-4 w-full h-[76px] sm:h-[150px]">
                                    {/* Left (on Mobile) / Top (on Desktop) - Icon wrapper */}
                                    <div
                                        className="nm-icon-circle w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0"
                                        style={{
                                            background: isLightMode ? role.accentLight : (role.accent + '15'),
                                            color: role.accent,
                                            boxShadow: isLightMode 
                                                ? `3px 3px 8px ${S1}88, -3px -3px 8px ${S2}cc, 0 0 0 1px ${role.accent}18`
                                                : `inset 2px 2px 5px ${S1}, inset -2px -2px 5px ${S2}, 0 0 0 1px ${role.accent}20`,
                                        }}
                                    >
                                        <div className="w-6 h-6 sm:w-7 sm:h-7">{role.icon}</div>
                                    </div>

                                    {/* Center (on Mobile) / Middle (on Desktop) - Text block */}
                                    <div className="flex flex-col flex-grow text-left gap-0.5 sm:gap-1">
                                        <h3
                                            className="text-[13px] sm:text-[15px] lg:text-[16px] font-black leading-tight sm:leading-snug tracking-tight"
                                            style={{ color: TXT }}
                                        >
                                            {role.label}
                                        </h3>
                                        <p
                                            className="text-[10px] sm:text-[11px] font-medium leading-tight sm:leading-snug"
                                            style={{ color: TXT3 }}
                                        >
                                            {role.sublabel}
                                        </p>
                                    </div>

                                    {isReorderMode ? (
                                        <div className="flex items-center gap-1.5 z-50 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {i > 0 && (
                                                <button 
                                                    onClick={() => moveCard(sortedRoles, i, 'prev')}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white/90 border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 transition-all active:scale-90"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                                </button>
                                            )}
                                            {i < sortedRoles.length - 1 && (
                                                <button 
                                                    onClick={() => moveCard(sortedRoles, i, 'next')}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white/90 border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 transition-all active:scale-90"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        /* Right (on Mobile) / Right of top row (on Desktop) - Arrow */
                                        <div className="nm-arrow shrink-0 sm:absolute sm:top-5 sm:right-5">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={role.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                        </div>
                                    )}

                                    {/* Bottom accent line - only on Desktop/Tablet */}
                                    <div
                                        className="hidden sm:block mt-auto h-[3.5px] rounded-full w-8 transition-all duration-300 group-hover:w-full"
                                        style={{ background: `linear-gradient(90deg, ${role.accent}, ${role.accent}44)` }}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* ── Footer ── */}
                    <div
                        className="flex flex-col items-center gap-2 pb-2 shrink-0"
                        style={{ animation: 'nmFadeUp 0.5s 0.8s cubic-bezier(0.22,1,0.36,1) both' }}
                    >
                        <div className="nm-sep w-16" />
                        <div className="flex items-center gap-2 mt-1">
                            <img
                                src={APP_LOGO_URL}
                                alt="Logo"
                                className="w-3 h-3 grayscale opacity-25"
                            />
                            <span
                                className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em]"
                                style={{ color: TXT3 }}
                            >
                                O-System Core v{VER}
                            </span>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default RoleSelectionPage;

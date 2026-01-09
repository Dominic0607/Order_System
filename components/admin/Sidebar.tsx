
import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import UserAvatar from '../common/UserAvatar';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { APP_LOGO_URL } from '../../constants';
import Spinner from '../common/Spinner';
import { translations } from '../../translations';

interface SidebarProps {
    activeDashboard: string;
    currentAdminView: string;
    isReportSubMenuOpen: boolean;
    isProfileSubMenuOpen: boolean;
    onNavChange: (id: string) => void;
    onReportSubNav: (id: any) => void;
    setIsReportSubMenuOpen: (open: boolean) => void;
    setIsProfileSubMenuOpen: (open: boolean) => void;
    setEditProfileModalOpen: (open: boolean) => void;
    isMobile?: boolean;
    isMobileOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    activeDashboard, currentAdminView, isReportSubMenuOpen, isProfileSubMenuOpen,
    onNavChange, onReportSubNav, setIsReportSubMenuOpen, setIsProfileSubMenuOpen,
    setEditProfileModalOpen, isMobile = false, isMobileOpen = false
}) => {
    const { 
        currentUser, logout, refreshData, isSidebarCollapsed, setIsSidebarCollapsed, 
        setAppState, originalAdminUser, previewImage, setIsChatOpen, unreadCount,
        language, setLanguage
    } = useContext(AppContext);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const t = translations[language];

    const reportSections = [
        { id: 'overview', title: t.overview, icon: '📊' },
        { id: 'sales_team', title: t.sales_team_report, icon: '👥' },
        { id: 'sales_page', title: t.sales_page_report, icon: '📄' },
        { id: 'performance', title: t.performance, icon: '📈' },
        { id: 'profitability', title: t.profitability, icon: '💰' },
        { id: 'forecasting', title: t.forecasting, icon: '🔮' },
        { id: 'shipping', title: t.shipping_report, icon: '🚚' },
    ];

    const navItems = [
        { id: 'dashboard', label: t.dashboard, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>, component: 'admin' },
        { id: 'fulfillment', label: 'Fulfillment', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={2.5} /></svg>, component: 'fulfillment' },
        { id: 'orders', label: t.orders, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>, component: 'orders' },
        { id: 'reports', label: t.reports, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414" /></svg>, component: 'reports' },
        { id: 'settings', label: t.settings, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0h9.75" /></svg>, component: 'settings' },
    ];

    const isHybridAdmin = currentUser?.IsSystemAdmin && (currentUser?.Team || '').split(',').map(t => t.trim()).filter(Boolean).length > 0;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshData();
            window.location.reload();
        } catch (err) {
            setIsRefreshing(false);
        }
    };

    return (
        <aside className={`
            ${isMobile 
                ? `w-full bg-transparent flex flex-col` 
                : `fixed left-0 top-0 h-screen border-r border-white/5 z-50 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-56'} bg-gray-950/80 backdrop-blur-3xl`
            } flex flex-col`}>
            
            {/* Desktop Logo Only */}
            {!isMobile && (
                <div className={`px-6 py-8 flex items-center gap-3 overflow-hidden border-b border-white/5`}>
                    <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10'} bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 flex-shrink-0 transition-all`}>
                        <img src={convertGoogleDriveUrl(APP_LOGO_URL)} alt="Logo" className="w-full h-full object-contain p-1.5" />
                    </div>
                    {!isSidebarCollapsed && (
                        <h1 className="text-lg font-black text-white italic uppercase tracking-tighter animate-fade-in whitespace-nowrap">O-System</h1>
                    )}
                </div>
            )}

            {!isMobile && (
                <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-10 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white shadow-xl z-[60] transition-all"
                >
                    <svg className={`w-3 h-3 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}><path d="M15 19l-7-7 7-7" /></svg>
                </button>
            )}

            {/* Mobile Chat Indicator (Enhanced) */}
            {isMobile && (
                <div className="px-4 mb-4">
                    <button 
                        onClick={() => setIsChatOpen(true)}
                        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 active:scale-[0.98] transition-all group"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="relative">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
                            </div>
                            <span className="text-[13px] font-black uppercase tracking-widest whitespace-nowrap">{t.chat_system || "Chat Engine"}</span>
                        </div>
                        {unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/10">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            )}

            <nav className={`flex-grow space-y-1.5 px-4 ${isMobile ? 'mt-2' : 'mt-6'} overflow-y-auto custom-scrollbar`}>
                {navItems.map((item) => {
                    const isReports = item.id === 'reports';
                    const isActive = (activeDashboard === item.component) && (item.component !== 'admin' || item.id === currentAdminView);
                    const isExpanded = isReports && isReportSubMenuOpen;
                    
                    return (
                        <div key={item.id} className="space-y-1">
                            <button 
                                onClick={() => onNavChange(item.id)} 
                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <span className={`${isActive ? 'text-white' : 'text-gray-500'} flex-shrink-0`}>{item.icon}</span>
                                    {(isMobile || !isSidebarCollapsed) && <span className="text-[14px] font-black tracking-tight uppercase whitespace-nowrap truncate">{item.label}</span>}
                                </div>
                                {isReports && (isMobile || !isSidebarCollapsed) && (
                                    <svg className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                )}
                            </button>

                            {isExpanded && (isMobile || !isSidebarCollapsed) && (
                                <div className="ml-5 pl-4 border-l border-white/5 space-y-1 animate-fade-in py-2">
                                    {reportSections.map(sub => (
                                        <button 
                                            key={sub.id}
                                            onClick={() => onReportSubNav(sub.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-3 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${activeDashboard === 'reports' && sub.id === 'overview' ? 'text-blue-400 bg-blue-600/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span className="text-base flex-shrink-0">{sub.icon}</span>
                                            <span className="whitespace-nowrap truncate">{sub.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className={`mt-auto p-4 ${isMobile ? '' : 'border-t border-white/5 bg-black/40 rounded-tr-[2rem]'}`}>
                {/* Profile Toggle */}
                <button 
                    onClick={() => setIsProfileSubMenuOpen(!isProfileSubMenuOpen)}
                    className={`w-full flex items-center gap-4 p-2 rounded-2xl hover:bg-white/5 transition-all ${(!isMobile && isSidebarCollapsed) ? 'justify-center' : ''}`}
                >
                    <UserAvatar avatarUrl={currentUser?.ProfilePictureURL} name={currentUser?.FullName || ''} size="md" className="ring-2 ring-blue-500/20 shadow-xl flex-shrink-0" />
                    {(isMobile || !isSidebarCollapsed) && (
                        <div className="min-w-0 flex-grow text-left animate-fade-in">
                            <p className="text-[14px] font-black text-white truncate leading-tight whitespace-nowrap">{currentUser?.FullName}</p>
                            <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mt-1 opacity-70 truncate whitespace-nowrap">{currentUser?.Role}</p>
                        </div>
                    )}
                </button>

                {isProfileSubMenuOpen && (isMobile || !isSidebarCollapsed) && (
                    <div className="mt-6 animate-fade-in-down space-y-4">
                        {/* Language Switcher Section */}
                        <div className="bg-[#1e293b] rounded-2xl border border-white/5 p-1 flex shadow-inner">
                            <button onClick={() => setLanguage('en')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${language === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>English</button>
                            <button onClick={() => setLanguage('km')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${language === 'km' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>ភាសាខ្មែរ</button>
                        </div>

                        {/* Action Grid (Premium Dashboard Style) */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setEditProfileModalOpen(true)} className="flex flex-col items-center justify-center py-5 bg-gray-800/40 rounded-3xl border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group overflow-hidden active:scale-95">
                                <svg className="w-5 h-5 mb-2 text-blue-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase whitespace-nowrap truncate w-full text-center px-2">{t.edit_profile}</span>
                            </button>
                            
                            <button onClick={handleRefresh} disabled={isRefreshing} className="flex flex-col items-center justify-center py-5 bg-gray-800/40 rounded-3xl border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group overflow-hidden active:scale-95">
                                {isRefreshing ? <Spinner size="sm" /> : (<>
                                    <svg className="w-5 h-5 mb-2 text-emerald-400 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase whitespace-nowrap truncate w-full text-center px-2">SYNC</span>
                                </>)}
                            </button>
                            
                            {isHybridAdmin && (
                                <button onClick={() => setAppState('role_selection')} className="flex flex-col items-center justify-center py-5 bg-gray-800/40 rounded-3xl border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all group overflow-hidden active:scale-95">
                                    <svg className="w-5 h-5 mb-2 text-yellow-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase whitespace-nowrap truncate w-full text-center px-2">ROLES</span>
                                </button>
                            )}
                            
                            <button onClick={logout} className={`flex flex-col items-center justify-center py-5 bg-red-600/10 rounded-3xl border border-red-500/20 hover:bg-red-600 hover:text-white transition-all group overflow-hidden active:scale-95 ${!isHybridAdmin ? 'col-span-2' : ''}`}>
                                <svg className="w-5 h-5 mb-2 text-red-500 group-hover:text-white transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span className="text-[9px] font-black text-red-500 group-hover:text-white uppercase whitespace-nowrap truncate w-full text-center px-2">{t.logout}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;

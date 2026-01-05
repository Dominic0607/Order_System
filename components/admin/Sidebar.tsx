
import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import UserAvatar from '../common/UserAvatar';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { APP_LOGO_URL } from '../../constants';
import Spinner from '../common/Spinner';

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
        setAppState, originalAdminUser, previewImage 
    } = useContext(AppContext);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const reportSections = [
        { id: 'overview', title: 'សង្ខេបប្រតិបត្តិការ', icon: '📊' },
        { id: 'sales_team', title: 'របាយការណ៍ក្រុម', icon: '👥' },
        { id: 'sales_page', title: 'របាយការណ៍ Page', icon: '📄' },
        { id: 'performance', title: 'ការអនុវត្ត (KPI)', icon: '📈' },
        { id: 'profitability', title: 'វិភាគប្រាក់ចំណេញ', icon: '💰' },
        { id: 'forecasting', title: 'ការព្យាករណ៍ AI', icon: '🔮' },
        { id: 'shipping', title: 'ចំណាយដឹកជញ្ជូន', icon: '🚚' },
    ];

    const navItems = [
        { id: 'dashboard', label: 'ទិន្នន័យសង្ខេប', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>, component: 'admin' },
        { id: 'fulfillment', label: 'វេចខ្ចប់ទំនិញ', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={2} /></svg>, component: 'fulfillment' },
        { id: 'orders', label: 'ប្រតិបត្តិការណ៍', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>, component: 'orders' },
        { id: 'reports', label: 'របាយការណ៍', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, component: 'reports' },
        { id: 'settings', label: 'ការគ្រប់គ្រង', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0h9.75" /></svg>, component: 'settings' },
    ];

    const isHybridAdmin = currentUser?.IsSystemAdmin && (currentUser?.Team || '').split(',').map(t => t.trim()).filter(Boolean).length > 0;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshData();
            window.location.reload();
        } catch (err) {
            console.error("Refresh failed:", err);
            setIsRefreshing(false);
        }
    };

    return (
        <aside className={`
            ${isMobile 
                ? `fixed inset-y-0 left-0 w-64 bg-gray-900 z-[100] transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}` 
                : `fixed left-0 top-0 h-screen border-r border-white/5 z-50 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-52'}`
            } bg-gray-950/60 backdrop-blur-3xl flex flex-col`}>
            
            <div className={`px-4 py-6 flex items-center gap-3 overflow-hidden border-b border-white/5`}>
                <div className={`${(!isMobile && isSidebarCollapsed) ? 'w-8 h-8' : 'w-10 h-10'} bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-lg flex-shrink-0 transition-all duration-300`}>
                    <img src={convertGoogleDriveUrl(APP_LOGO_URL)} alt="Logo" className="w-full h-full object-contain p-1.5" />
                </div>
                {(isMobile || !isSidebarCollapsed) && (
                    <div className="min-w-0 animate-fade-in">
                        <h1 className="text-base font-black text-white leading-tight truncate uppercase tracking-tighter">គ្រប់គ្រងការកម្មង់</h1>
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest opacity-80">Admin Panel</p>
                    </div>
                )}
            </div>

            {!isMobile && (
                <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-10 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] z-[60] transition-all hover:scale-110 active:scale-95 group"
                    title={isSidebarCollapsed ? "បើក Sidebar" : "បិទ Sidebar"}
                >
                    <svg 
                        className={`w-3.5 h-3.5 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        strokeWidth={4}
                    >
                        <path d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            <nav className="flex-grow space-y-1.5 px-2 mt-4 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const isReports = item.id === 'reports';
                    const isActive = (activeDashboard === item.component) && (item.component !== 'admin' || item.id === currentAdminView);
                    const isExpanded = isReports && isReportSubMenuOpen;
                    
                    return (
                        <div key={item.id} className="space-y-1">
                            <button 
                                onClick={() => onNavChange(item.id)} 
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={isActive ? 'text-white' : 'text-gray-500'}>{item.icon}</span>
                                    {(isMobile || !isSidebarCollapsed) && <span className="text-[15px] font-black truncate tracking-tight">{item.label}</span>}
                                </div>
                                {isReports && (isMobile || !isSidebarCollapsed) && (
                                    <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                )}
                            </button>

                            {isExpanded && (isMobile || !isSidebarCollapsed) && (
                                <div className="ml-4 pl-3 border-l border-white/5 space-y-1 animate-fade-in-down py-1">
                                    {reportSections.map(sub => (
                                        <button 
                                            key={sub.id}
                                            onClick={() => onReportSubNav(sub.id)}
                                            className={`w-full flex items-center gap-3 px-2 py-2.5 text-[12px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeDashboard === 'reports' && sub.id === 'overview' ? 'text-blue-400 bg-blue-600/10' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                                        >
                                            <span className="text-sm">{sub.icon}</span>
                                            {sub.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="mt-auto p-2 border-t border-white/5 bg-black/20">
                <button 
                    onClick={() => setIsProfileSubMenuOpen(!isProfileSubMenuOpen)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all ${(!isMobile && isSidebarCollapsed) ? 'justify-center' : ''}`}
                >
                    <UserAvatar avatarUrl={currentUser?.ProfilePictureURL} name={currentUser?.FullName || ''} size={(isMobile || !isSidebarCollapsed) ? 'md' : 'sm'} className="ring-1 ring-white/10" />
                    {(isMobile || !isSidebarCollapsed) && (
                        <div className="min-w-0 flex-grow text-left animate-fade-in">
                            <p className="text-sm font-black text-white truncate leading-tight">{currentUser?.FullName}</p>
                            <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mt-1 opacity-70">{currentUser?.Role}</p>
                        </div>
                    )}
                </button>

                {isProfileSubMenuOpen && (isMobile || !isSidebarCollapsed) && (
                    <div className="grid grid-cols-2 gap-1.5 mt-2 animate-fade-in-down pb-2">
                        <button 
                            onClick={() => setEditProfileModalOpen(true)} 
                            className="flex flex-col items-center justify-center py-2.5 bg-gray-800/50 rounded-xl text-[9px] font-bold text-gray-400 hover:text-white border border-gray-700 hover:bg-gray-700 transition-all"
                        >
                            <svg className="w-4 h-4 mb-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            កែសម្រួល
                        </button>
                        <button 
                            onClick={handleRefresh} 
                            disabled={isRefreshing}
                            className="flex flex-col items-center justify-center py-2.5 bg-gray-800/50 rounded-xl text-[9px] font-bold text-gray-400 hover:text-white border border-gray-700 hover:bg-gray-700 transition-all"
                        >
                            {isRefreshing ? <Spinner size="sm" /> : (
                                <>
                                    <svg className="w-4 h-4 mb-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    ទាញទិន្នន័យ
                                </>
                            )}
                        </button>
                        {isHybridAdmin && (
                            <button 
                                onClick={() => setAppState('role_selection')} 
                                className="flex flex-col items-center justify-center py-2.5 bg-gray-800/50 rounded-xl text-[9px] font-bold text-gray-400 hover:text-white border border-gray-700 hover:bg-gray-700 transition-all"
                            >
                                <svg className="w-4 h-4 mb-1 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                ប្តូរតួនាទី
                            </button>
                        )}
                        <button 
                            onClick={logout} 
                            className={`flex flex-col items-center justify-center py-2.5 bg-red-600/10 rounded-xl text-[9px] font-black text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 transition-all ${!isHybridAdmin ? 'col-span-1' : ''}`}
                        >
                            <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            ចាកចេញ
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;

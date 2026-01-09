
import React, { useContext } from 'react';
import Sidebar from './Sidebar';
import { AppContext } from '../../context/AppContext';

interface SidebarDrawerProps {
    activeDashboard: string;
    currentAdminView: string;
    onNavChange: (id: string) => void;
    onReportSubNav: (id: any) => void;
    isReportSubMenuOpen: boolean;
    setIsReportSubMenuOpen: (open: boolean) => void;
    isProfileSubMenuOpen: boolean;
    setIsProfileSubMenuOpen: (open: boolean) => void;
    setEditProfileModalOpen: (open: boolean) => void;
}

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ 
    activeDashboard, 
    currentAdminView,
    onNavChange,
    onReportSubNav,
    isReportSubMenuOpen,
    setIsReportSubMenuOpen,
    isProfileSubMenuOpen,
    setIsProfileSubMenuOpen,
    setEditProfileModalOpen
}) => {
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useContext(AppContext);

    if (!isMobileMenuOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex overflow-hidden">
            {/* SaaS Dark Backdrop */}
            <div 
                className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md transition-opacity duration-500 animate-fade-in" 
                onClick={() => setIsMobileMenuOpen(false)} 
            />
            
            {/* Premium Side Drawer */}
            <div className="relative w-[85%] max-w-[340px] h-full bg-[#0f172a] border-r border-white/5 shadow-[25px_0_50px_rgba(0,0,0,0.5)] animate-slide-right flex flex-col overflow-hidden ring-1 ring-white/5 rounded-r-[2.5rem]">
                
                {/* Header / Brand Area */}
                <div className="flex-shrink-0 px-7 pt-10 pb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/30 border border-white/10">
                             <span className="text-white font-black italic text-lg">O</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter italic leading-none whitespace-nowrap">O-System</h2>
                            <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1 opacity-70 whitespace-nowrap">Admin Console</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 active:scale-90 transition-all border border-white/5"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                </div>

                {/* Content Area - Constrained to Single Line */}
                <div className="flex-grow overflow-y-auto custom-scrollbar px-3">
                    <Sidebar 
                        isMobile={true}
                        isMobileOpen={true}
                        activeDashboard={activeDashboard}
                        currentAdminView={currentAdminView}
                        isReportSubMenuOpen={isReportSubMenuOpen}
                        isProfileSubMenuOpen={isProfileSubMenuOpen}
                        onNavChange={(id) => {
                            onNavChange(id);
                            if (id !== 'reports') setIsMobileMenuOpen(false);
                        }}
                        onReportSubNav={(id) => { 
                            onReportSubNav(id); 
                            setIsMobileMenuOpen(false); 
                        }}
                        setIsReportSubMenuOpen={setIsReportSubMenuOpen}
                        setIsProfileSubMenuOpen={setIsProfileSubMenuOpen}
                        setEditProfileModalOpen={setEditProfileModalOpen}
                    />
                </div>

                {/* Bottom System Pulse */}
                <div className="p-7 border-t border-white/5 bg-black/20 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] whitespace-nowrap">System Operational</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slide-right {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-slide-right {
                    animation: slide-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default SidebarDrawer;

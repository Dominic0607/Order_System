import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

interface BottomNavBarProps {
    activeDashboard: string;
    onNavChange: (id: string) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeDashboard, onNavChange }) => {
    const { advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    const navItems = [
        { id: 'dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM14 13a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>, label: 'Hub' },
        { id: 'orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, label: 'Orders' },
        { id: 'fulfillment', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, label: 'Ops' },
        { id: 'reports', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, label: 'Report' },
        { id: 'settings', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Config' }
    ];

    const handleClick = (id: string) => {
        onNavChange(id);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] animate-slide-up">
            <style>{`
                .docked-nav {
                    background: ${isLightMode ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.94)'};
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border-top: 1px solid ${isLightMode ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)'};
                    box-shadow: ${
                        isLightMode 
                            ? '0 -4px 20px rgba(0, 0, 0, 0.02)' 
                            : '0 -4px 30px rgba(0, 0, 0, 0.3)'
                    };
                }
                .nav-active-indicator {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 20px;
                    height: 3px;
                    background: #2563eb;
                    border-radius: 0 0 3px 3px;
                    box-shadow: 0 1px 6px rgba(37, 99, 235, 0.4);
                }
            `}</style>
            
            <div className="docked-nav w-full flex items-center justify-around h-[54px] relative px-2">
                {navItems.map((item) => {
                    const isActive = activeDashboard === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleClick(item.id)}
                            className={`flex flex-col items-center justify-center gap-0.5 w-[56px] h-[50px] transition-all relative group active:scale-95 ${
                                isActive 
                                    ? (isLightMode ? 'text-blue-600 font-extrabold' : 'text-blue-400') 
                                    : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-gray-500 hover:text-gray-300')
                            }`}
                        >
                            {isActive && (
                                <div className="nav-active-indicator animate-reveal"></div>
                            )}
                            
                            <span className={`relative z-10 transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-65'}`}>
                                {item.icon}
                            </span>
                            
                            <span className={`relative z-10 text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNavBar;

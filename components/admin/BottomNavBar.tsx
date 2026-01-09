
import React from 'react';

interface BottomNavBarProps {
    currentView: string;
    onViewChange: (view: any) => void;
    viewConfig: any;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onViewChange, viewConfig }) => {
    return (
        <nav className="bottom-nav md:hidden !justify-between px-2">
            {(Object.keys(viewConfig)).map(view => {
                const { label, icon } = viewConfig[view];
                return (
                    <a
                        href="#"
                        key={view}
                        onClick={(e) => { e.preventDefault(); onViewChange(view); }}
                        className={`transition-all duration-300 ${currentView === view ? 'active !text-blue-500 scale-110' : 'opacity-60'}`}
                    >
                        <div className={`p-1.5 rounded-xl transition-colors ${currentView === view ? 'bg-blue-500/10' : ''}`}>
                            {icon}
                        </div>
                        <span className="label font-black text-[9px] uppercase tracking-tighter">{label}</span>
                    </a>
                );
            })}
        </nav>
    );
};

export default BottomNavBar;

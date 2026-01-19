
import React from 'react';

interface FilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, children }) => {
    return (
        <>
            <div 
                className={`filter-panel-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={onClose}
            ></div>
            <div 
                className={`filter-panel fixed right-0 top-0 h-full w-[85%] max-w-md bg-[#0f172a] z-[80] shadow-2xl border-l border-white/5 transition-transform duration-500 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Filter Engine</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow custom-scrollbar space-y-8">{children}</div>
                <div className="p-6 border-t border-white/5 bg-black/20">
                    <button onClick={onClose} className="btn btn-primary w-full py-4 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 rounded-2xl active:scale-95 transition-transform">Apply Configuration</button>
                </div>
            </div>
        </>
    );
};

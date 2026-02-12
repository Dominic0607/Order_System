
import React from 'react';

interface MapTooltipProps {
    name: string;
    revenue: number;
    orders: number;
}

export const MapTooltip: React.FC<MapTooltipProps> = ({ name, revenue, orders }) => {
    return (
        <div className="relative group min-w-[240px]">
            {/* Holographic Container */}
            <div className="relative bg-[#0f0518]/90 backdrop-blur-xl p-5 border-l-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden">
                
                {/* Decorative Tech Corners */}
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-purple-500/50"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-500/50"></div>
                
                {/* Background Grid/Scanline Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-50 pointer-events-none"></div>

                {/* Animated Scanner Line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-purple-400/50 shadow-[0_0_10px_#a855f7] animate-scan-fast pointer-events-none"></div>

                {/* Content Header */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/30 relative z-10">
                    <div className="flex flex-col">
                         <span className="text-[9px] text-purple-500 font-mono uppercase tracking-widest leading-none mb-1">Sector Analysis</span>
                         <h4 className="font-black text-base text-white tracking-wider uppercase font-sans drop-shadow-md">{name}</h4>
                    </div>
                    {revenue > 0 ? (
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </div>
                    ) : (
                        <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                    )}
                </div>
                
                {/* Data Grid */}
                <div className="grid grid-cols-1 gap-4 relative z-10">
                    
                    {/* Revenue Block */}
                    <div className="relative group/item">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-purple-300/70 text-[10px] font-mono uppercase tracking-widest">Revenue Output</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm text-purple-500 font-mono">$</span>
                            <span className="font-mono font-bold text-2xl text-white tracking-tighter drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                {revenue.toLocaleString()}
                            </span>
                        </div>
                        {/* Custom Bar */}
                        <div className="w-full h-1 bg-purple-900/50 mt-2 relative overflow-hidden">
                             <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-yellow-400 relative shadow-[0_0_10px_#a855f7]" 
                                style={{ width: `${Math.min((revenue / 50000) * 100, 100)}%` }}
                             >
                                 <div className="absolute right-0 top-0 h-full w-[2px] bg-white animate-pulse"></div>
                             </div>
                        </div>
                    </div>

                    {/* Orders Block */}
                    <div className="flex justify-between items-center bg-purple-950/30 p-2 border border-purple-500/20 rounded-sm">
                        <span className="text-purple-400 text-[10px] font-mono uppercase">Active Orders</span>
                        <div className="flex items-center gap-2">
                             <span className="font-mono font-bold text-lg text-white">{orders}</span>
                             <span className="text-[9px] text-purple-600 font-bold px-1 border border-purple-600/30 rounded">UNITS</span>
                        </div>
                    </div>
                </div>

                {/* Decorative ID */}
                <div className="absolute bottom-1 right-2 text-[8px] text-purple-900 font-mono select-none">
                    ID: {name.substring(0, 3).toUpperCase()}-{Math.floor(Math.random() * 999)}
                </div>
            </div>

            {/* Animation Styles */}
            <style>{`
                @keyframes scan-fast {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-fast {
                    animation: scan-fast 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

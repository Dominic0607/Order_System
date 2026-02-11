
import React from 'react';

interface MapTooltipProps {
    name: string;
    revenue: number;
    orders: number;
}

export const MapTooltip: React.FC<MapTooltipProps> = ({ name, revenue, orders }) => {
    return (
        <div className="px-5 py-4 min-w-[200px] bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50">
            <h4 className="font-black text-sm uppercase text-slate-200 border-b border-slate-700 pb-2 mb-3 tracking-wider flex items-center justify-between">
                {name}
                {revenue > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-emerald-500/50 shadow-lg"></span>
                )}
            </h4>
            
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Revenue</span>
                    <span className="font-black text-xl text-cyan-400 drop-shadow-lg">${revenue.toLocaleString()}</span>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400" 
                        style={{ width: `${Math.min((revenue / 50000) * 100, 100)}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 text-xs font-semibold uppercase">Orders</span>
                    <span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md text-xs border border-slate-700">{orders}</span>
                </div>
            </div>
        </div>
    );
};

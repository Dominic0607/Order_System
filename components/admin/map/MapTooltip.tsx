
import React from 'react';

interface MapTooltipProps {
    name: string;
    revenue: number;
    orders: number;
}

export const MapTooltip: React.FC<MapTooltipProps> = ({ name, revenue, orders }) => {
    return (
        <div className="px-4 py-3 text-gray-900 min-w-[180px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
            <h4 className="font-black text-sm uppercase text-gray-800 border-b border-gray-200 pb-2 mb-2 tracking-wide">{name}</h4>
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Revenue</span>
                    <span className="font-black text-blue-600 text-sm">${revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Orders</span>
                    <span className="font-black text-gray-800 text-sm">{orders}</span>
                </div>
            </div>
            {revenue > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Active Region</span>
                </div>
            )}
        </div>
    );
};

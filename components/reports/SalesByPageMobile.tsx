
import React, { useState, useEffect } from 'react';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';

interface SalesByPageMobileProps {
    data: any[];
    onPreviewImage: (url: string) => void;
    onNavigate: (key: string, value: string) => void;
    onMonthClick?: (pageName: string, monthIndex: number) => void;
    sortConfig?: { key: string, direction: 'asc' | 'desc' };
    onToggleSort?: (key: any) => void;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SalesByPageMobile: React.FC<SalesByPageMobileProps> = ({ 
    data, 
    onPreviewImage, 
    onNavigate, 
    onMonthClick,
    sortConfig,
    onToggleSort
}) => {
    // Initialize state from localStorage, default to 'table'
    const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
        const saved = localStorage.getItem('mobile_view_preference');
        return (saved === 'card' || saved === 'table') ? saved : 'table';
    });

    const handleViewChange = (mode: 'card' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('mobile_view_preference', mode);
    };

    return (
        <div className="md:hidden space-y-4 pb-12 px-1">
            <div className="flex justify-between items-center px-2 mb-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-indigo-500 rounded-full"></span>
                    Page Report
                </h3>
                
                {/* View Switcher */}
                <div className="flex bg-gray-800 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => handleViewChange('card')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                        title="Card View"
                    >
                        {/* New Grid/Card Icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    </button>
                    <button 
                        onClick={() => handleViewChange('table')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                        title="Table View"
                    >
                        {/* List/Table Icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    </button>
                </div>
            </div>

            {viewMode === 'card' ? (
                // CARD VIEW
                data.map((item: any) => {
                    const aov = item.orderCount > 0 ? item.revenue / item.orderCount : 0;
                    return (
                        <div 
                            key={item.pageName} 
                            className="bg-gray-800/40 border border-white/10 rounded-[2.5rem] p-6 shadow-xl space-y-5 animate-fade-in-up group relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
                            onClick={() => onNavigate('page', item.pageName)}
                        >
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-700 bg-gray-950 shadow-inner p-0.5" onClick={(e) => { e.stopPropagation(); onPreviewImage(convertGoogleDriveUrl(item.logoUrl)); }}>
                                        <img src={convertGoogleDriveUrl(item.logoUrl)} className="w-full h-full object-cover rounded-lg" alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-base font-black text-white truncate leading-tight uppercase tracking-tight">{item.pageName}</h4>
                                        <p 
                                            className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1"
                                            onClick={(e) => { e.stopPropagation(); onNavigate('team', item.teamName); }}
                                        >
                                            {item.teamName}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">ចំណូលសរុប</p>
                                    <p className="text-lg font-black text-blue-400 tracking-tighter">${item.revenue.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">ប្រាក់ចំណេញ</p>
                                    <p className="text-lg font-black text-emerald-400 tracking-tighter">${item.profit.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Monthly Breakdown Section - Only shown if onMonthClick is provided */}
                            {onMonthClick && (
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Monthly Breakdown</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                        {MONTHS.map((m, idx) => {
                                            const rev = item[`rev_${m}`] || 0;
                                            if (rev === 0) return null; // Only show active months
                                            
                                            return (
                                                <button 
                                                    key={m}
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        onMonthClick(item.pageName, idx); 
                                                    }}
                                                    className="flex-shrink-0 bg-gray-900/60 p-2.5 rounded-xl border border-white/5 min-w-[70px] flex flex-col items-center hover:bg-gray-800 hover:border-blue-500/30 transition-all active:scale-95"
                                                >
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase mb-0.5">{m}</span>
                                                    <span className="text-[10px] font-black text-blue-300">${rev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </button>
                                            );
                                        })}
                                        {MONTHS.every(m => (item[`rev_${m}`] || 0) === 0) && (
                                            <span className="text-[9px] text-gray-600 italic pl-1">No monthly data</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between px-1 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.orderCount} Orders</span>
                                </div>
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AOV: ${aov.toFixed(0)}</span>
                            </div>
                            
                            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-600/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                        </div>
                    );
                })
            ) : (
                // TABLE VIEW (Computer-like)
                <div className="bg-gray-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#0f172a] border-b border-white/10 text-xs text-gray-400 font-bold uppercase tracking-wider">
                                    {/* Sticky First Column - Clickable for Sort */}
                                    <th 
                                        className="p-3 sticky left-0 z-20 bg-[#0f172a] border-r border-white/10 min-w-[140px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-gray-800 transition-colors"
                                        onClick={() => onToggleSort && onToggleSort('pageName')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Page Name
                                            {sortConfig?.key === 'pageName' && (
                                                <span className="text-blue-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    
                                    {/* Total Rev Column - Clickable for Sort */}
                                    <th 
                                        className="p-3 text-right min-w-[100px] text-blue-300 bg-blue-900/10 cursor-pointer hover:bg-blue-900/20 transition-colors"
                                        onClick={() => onToggleSort && onToggleSort('revenue')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Total Rev
                                            {sortConfig?.key === 'revenue' && (
                                                <span className="text-white">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    
                                    {MONTHS.map(m => (
                                        <th key={m} className="p-3 text-right min-w-[80px]">{m}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {data.map((item: any, idx: number) => (
                                    <tr key={item.pageName} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 sticky left-0 z-20 bg-gray-900 border-r border-white/10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-7 h-7 rounded-lg bg-gray-800 border border-white/10 overflow-hidden flex-shrink-0"
                                                    onClick={(e) => { e.stopPropagation(); onPreviewImage(convertGoogleDriveUrl(item.logoUrl)); }}
                                                >
                                                    <img src={convertGoogleDriveUrl(item.logoUrl)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div 
                                                        className="font-black text-white truncate max-w-[120px] leading-tight" 
                                                        onClick={() => onNavigate('page', item.pageName)}
                                                    >
                                                        {item.pageName}
                                                    </div>
                                                    <div 
                                                        className="text-[9px] text-gray-500 font-bold uppercase truncate max-w-[120px]" 
                                                        onClick={() => onNavigate('team', item.teamName)}
                                                    >
                                                        {item.teamName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="p-3 text-right font-black text-blue-400 bg-blue-900/5">
                                            ${item.revenue.toLocaleString()}
                                        </td>

                                        {MONTHS.map((m, mIdx) => {
                                            const rev = item[`rev_${m}`] || 0;
                                            return (
                                                <td 
                                                    key={m} 
                                                    className={`p-3 text-right font-mono ${rev > 0 ? 'text-gray-300 font-bold' : 'text-gray-700'}`}
                                                    onClick={() => onMonthClick && onMonthClick(item.pageName, mIdx)}
                                                >
                                                    {rev > 0 ? rev.toLocaleString() : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default SalesByPageMobile;

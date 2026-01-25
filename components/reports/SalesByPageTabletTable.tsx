
import React from 'react';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';

interface SalesByPageTabletTableProps {
    data: any[];
    dataType: 'revenue' | 'profit';
    rowSpans: number[];
    displayRow: boolean[];
    MONTHS: string[];
    grandTotals: any;
    onNavigate: (key: string, value: string) => void;
    onPreviewImage: (url: string) => void;
    onMonthClick: (pageName: string, monthIndex: number) => void;
}

const SalesByPageTabletTable: React.FC<SalesByPageTabletTableProps> = ({ 
    data, dataType, rowSpans, displayRow, MONTHS, grandTotals, onNavigate, onPreviewImage, onMonthClick
}) => {
    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in flex flex-col w-full relative">
            <div className="overflow-x-auto custom-scrollbar w-full relative">
                <table className="w-max min-w-full text-sm border-separate border-spacing-0">
                    <thead>
                        <tr className="h-16 bg-[#0f172a]">
                            <th className="sticky left-0 z-30 bg-[#0f172a] px-2 text-center text-gray-500 font-black border-b border-white/10 w-[50px] min-w-[50px] border-r border-white/5">#</th>
                            <th className="sticky left-[50px] z-30 bg-[#0f172a] px-4 text-left text-white font-black uppercase tracking-wider border-b border-white/10 w-[110px] min-w-[110px] border-r border-white/5">Team</th>
                            <th className="sticky left-[160px] z-30 bg-[#0f172a] px-4 text-left text-white font-black uppercase tracking-wider border-b border-white/10 w-[200px] min-w-[200px] shadow-[6px_0_15px_-3px_rgba(0,0,0,0.5)] border-r border-white/5">Page Name</th>
                            <th className={`px-6 text-right font-black uppercase tracking-wider border-b border-white/10 ${dataType === 'revenue' ? 'text-blue-300 bg-blue-900/10' : 'text-green-300 bg-green-900/10'} min-w-[140px]`}>
                                Total {dataType === 'revenue' ? 'Rev' : 'Prof'}
                            </th>
                            {MONTHS.map(m => (
                                <th key={m} className="px-4 text-right text-gray-400 font-bold uppercase border-b border-white/10 min-w-[90px]">{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((item: any, idx) => {
                            const teamColorIndex = Array.from(String(item.teamName)).reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 5;
                            const groupColors = ['bg-blue-500/[0.02]', 'bg-purple-500/[0.02]', 'bg-emerald-500/[0.02]', 'bg-orange-500/[0.02]', 'bg-pink-500/[0.02]'];
                            const baseRowBg = groupColors[teamColorIndex];
                            
                            const stickyBg = 'bg-[#111827]'; 
                            const prefix = dataType === 'revenue' ? 'rev' : 'prof';

                            return (
                                <tr key={item.pageName} className={`${baseRowBg} hover:bg-white/5 transition-colors h-16 group`}>
                                    <td className={`sticky left-0 z-20 ${stickyBg} border-r border-white/5 border-b border-white/5 text-center font-bold text-gray-600`}>{idx + 1}</td>
                                    
                                    {displayRow[idx] ? (
                                        <td 
                                            rowSpan={rowSpans[idx]} 
                                            className={`sticky left-[50px] z-20 ${stickyBg} border-r border-white/5 border-b border-white/5 align-middle px-4 cursor-pointer hover:bg-gray-800`}
                                            onClick={() => onNavigate('team', item.teamName)}
                                        >
                                            <div className="font-black text-white bg-gray-800 border border-white/10 px-2.5 py-1.5 rounded-xl inline-block shadow-sm text-[10px] tracking-wide truncate max-w-[90px]">
                                                {item.teamName}
                                            </div>
                                        </td>
                                    ) : null}

                                    <td 
                                        className={`sticky left-[160px] z-20 ${stickyBg} border-r border-white/5 border-b border-white/5 shadow-[6px_0_15px_-3px_rgba(0,0,0,0.5)] px-4 cursor-pointer hover:bg-gray-800`}
                                        onClick={() => onNavigate('page', item.pageName)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg p-0.5 bg-gray-800 border border-white/10 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onPreviewImage(convertGoogleDriveUrl(item.logoUrl)); }}>
                                                <img src={convertGoogleDriveUrl(item.logoUrl)} className="w-full h-full rounded-md object-cover" alt="" />
                                            </div>
                                            <span className="truncate max-w-[140px] text-xs font-bold text-gray-200 group-hover:text-blue-300 transition-colors" title={item.pageName}>{item.pageName}</span>
                                        </div>
                                    </td>

                                    <td 
                                        className={`px-6 text-right font-black ${dataType === 'revenue' ? 'text-blue-400 bg-blue-900/5 group-hover:bg-blue-900/20' : 'text-emerald-400 bg-emerald-900/5 group-hover:bg-emerald-900/20'} border-r border-white/5 border-b border-white/5 text-sm cursor-pointer`}
                                        onClick={() => onNavigate('page', item.pageName)}
                                    >
                                        ${(dataType === 'revenue' ? item.revenue : item.profit).toLocaleString()}
                                    </td>

                                    {MONTHS.map((m, mIdx) => {
                                        const val = item[`${prefix}_${m}`] || 0;
                                        return (
                                            <td 
                                                key={m} 
                                                className={`px-4 text-right font-mono text-xs border-b border-white/5 cursor-pointer hover:bg-gray-800 transition-colors ${val > 0 ? 'text-gray-300 font-bold' : 'text-gray-700'}`}
                                                onClick={() => onMonthClick(item.pageName, mIdx)}
                                            >
                                                {val !== 0 ? val.toLocaleString() : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                    
                    {grandTotals && (
                        <tfoot className="bg-[#0f172a] font-black border-t-2 border-white/20">
                            <tr className="h-16">
                                <td className="sticky left-0 bg-[#0f172a] z-30 border-r border-white/5 border-b border-white/5"></td>
                                <td className="sticky left-[50px] bg-[#0f172a] z-30 border-r border-white/5 border-b border-white/5"></td>
                                <td className="sticky left-[160px] bg-[#0f172a] z-30 px-4 text-right uppercase tracking-widest text-white shadow-[6px_0_15px_-3px_rgba(0,0,0,0.5)] border-r border-white/5 border-b border-white/5 text-xs flex items-center justify-end h-16">
                                    Grand Total
                                </td>
                                
                                <td className={`px-6 text-right ${dataType === 'revenue' ? 'text-blue-300' : 'text-green-300'} border-r border-white/5 border-b border-white/5 text-base bg-[#1e293b]`}>
                                    ${(dataType === 'revenue' ? grandTotals.revenue : grandTotals.profit).toLocaleString()}
                                </td>
                                
                                {MONTHS.map(m => {
                                    const prefix = dataType === 'revenue' ? 'rev' : 'prof';
                                    const val = grandTotals[`${prefix}_${m}`] || 0;
                                    return (
                                        <td key={m} className="px-4 text-right text-gray-400 font-mono text-[10px] border-b border-white/5 bg-[#0f172a]">
                                            {val !== 0 ? val.toLocaleString() : '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default SalesByPageTabletTable;

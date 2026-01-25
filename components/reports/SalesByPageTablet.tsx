
import React, { useState, useMemo } from 'react';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import SalesByPageTabletTable from './SalesByPageTabletTable';

interface SalesByPageTabletProps {
    data: any[];
    grandTotals?: any;
    onPreviewImage: (url: string) => void;
    onNavigate: (key: string, value: string) => void;
    onMonthClick: (pageName: string, monthIndex: number) => void;
}

type ViewMode = 'table' | 'grid';
type DataType = 'revenue' | 'profit';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SalesByPageTablet: React.FC<SalesByPageTabletProps> = ({ data, grandTotals, onPreviewImage, onNavigate, onMonthClick }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [dataType, setDataType] = useState<DataType>('revenue');

    // Logic to calculate row spans for Table view (Adjacency Grouping)
    const { rowSpans, displayRow } = useMemo(() => {
        if (viewMode !== 'table') return { rowSpans: [], displayRow: [] };
        
        const spans: number[] = new Array(data.length).fill(0);
        const display: boolean[] = new Array(data.length).fill(true);
        
        let i = 0;
        while (i < data.length) {
            const currentTeam = data[i].teamName;
            let count = 1;
            while (i + count < data.length && data[i + count].teamName === currentTeam) {
                count++;
            }
            spans[i] = count;
            display[i] = true;
            for (let j = 1; j < count; j++) {
                spans[i + j] = 0;
                display[i + j] = false;
            }
            i += count;
        }
        return { rowSpans: spans, displayRow: display };
    }, [data, viewMode]);

    return (
        <div className="hidden md:block xl:hidden space-y-5 pb-12 px-1">
            {/* Header Control Panel */}
            <div className="bg-gray-900/80 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-20 z-40">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/30">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Tablet Report</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            {data.length} Active Pages
                        </p>
                    </div>
                </div>
                
                {/* Controls Group */}
                <div className="flex gap-3">
                    {/* Data Type Switcher */}
                    <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex">
                        <button onClick={() => setDataType('revenue')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${dataType === 'revenue' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Revenue</button>
                        <button onClick={() => setDataType('profit')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${dataType === 'profit' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Profit</button>
                    </div>

                    {/* View Switcher */}
                    <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex">
                        <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
            
            {viewMode === 'grid' ? (
                // GRID VIEW
                <div className="grid grid-cols-2 gap-5 animate-fade-in">
                    {data.map((item: any) => (
                        <div key={item.pageName} className="bg-gray-800/40 border border-white/10 rounded-[2.5rem] p-6 shadow-xl flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => onNavigate('page', item.pageName)}>
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-[100px] pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
                            
                            <div className="flex items-center gap-5 mb-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-gray-700 bg-gray-950 p-0.5 flex-shrink-0 shadow-2xl group-hover:scale-105 transition-transform" onClick={(e) => { e.stopPropagation(); onPreviewImage(convertGoogleDriveUrl(item.logoUrl)); }}>
                                    <img src={convertGoogleDriveUrl(item.logoUrl)} className="w-full h-full object-cover rounded-xl" alt="" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-base font-black text-white truncate leading-tight uppercase tracking-tight group-hover:text-blue-300 transition-colors">{item.pageName}</h4>
                                    <span className="text-[10px] bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full border border-blue-500/20 font-black uppercase mt-1.5 inline-block tracking-widest">{item.teamName}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3 flex-grow relative z-10">
                                <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5 group-hover:bg-blue-600/10 transition-colors">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Revenue</span>
                                    <span className="text-base font-black text-blue-400 tracking-tight">${item.revenue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Profit</span>
                                    <span className="text-base font-black text-emerald-400 tracking-tight">${item.profit.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // TABLE VIEW (Using Component)
                <SalesByPageTabletTable 
                    data={data}
                    dataType={dataType}
                    rowSpans={rowSpans}
                    displayRow={displayRow}
                    MONTHS={MONTHS}
                    grandTotals={grandTotals}
                    onNavigate={onNavigate}
                    onPreviewImage={onPreviewImage}
                    onMonthClick={onMonthClick}
                />
            )}
        </div>
    );
};

export default SalesByPageTablet;

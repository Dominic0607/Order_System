
import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder } from '../types';
import { convertGoogleDriveUrl } from '../utils/fileUtils';
import SimpleBarChart from '../components/admin/SimpleBarChart';
import StatCard from '../components/performance/StatCard';

interface SalesByPageReportProps {
    orders: ParsedOrder[];
    onBack: () => void;
}

type SortKey = 'revenue' | 'profit' | 'teamName' | 'pageName';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SalesByPageReport: React.FC<SalesByPageReportProps> = ({ orders, onBack }) => {
    const { appData, previewImage } = useContext(AppContext);
    const [showBorders, setShowBorders] = useState(true);
    const [isFrozen, setIsFrozen] = useState(false);
    const [showFillColor, setShowFillColor] = useState(true);
    const [isMerged, setIsMerged] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'teamName', direction: 'asc' });

    const toggleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const pageStats = useMemo(() => {
        const stats: Record<string, any> = {};
        orders.forEach(o => {
            const page = o.Page || 'Unknown';
            if (!stats[page]) {
                const info = appData.pages?.find(p => p.PageName === page);
                stats[page] = { 
                    pageName: page, 
                    teamName: o.Team || 'Unassigned', 
                    logoUrl: info?.PageLogoURL || '', 
                    revenue: 0, 
                    profit: 0,
                    orderCount: 0
                };
                MONTHS.forEach(m => { stats[page][`rev_${m}`] = 0; stats[page][`prof_${m}`] = 0; });
            }
            const rev = Number(o['Grand Total']) || 0;
            const cost = (Number(o['Total Product Cost ($)']) || 0) + (Number(o['Internal Cost']) || 0);
            stats[page].revenue += rev;
            stats[page].profit += (rev - cost);
            stats[page].orderCount += 1;
            if (o.Timestamp) { 
                const d = new Date(o.Timestamp); 
                const monthName = MONTHS[d.getMonth()];
                stats[page][`rev_${monthName}`] += rev; 
                stats[page][`prof_${monthName}`] += (rev - cost); 
            }
        });

        return Object.values(stats).sort((a: any, b: any) => {
            const mult = sortConfig.direction === 'asc' ? 1 : -1;
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'string') return valA.localeCompare(valB) * mult;
            return (valA - valB) * mult;
        });
    }, [orders, sortConfig, appData.pages]);

    const teamSpanCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        const firstIndices: Record<string, number> = {};
        pageStats.forEach((s: any, idx) => {
            if (firstIndices[s.teamName] === undefined) {
                firstIndices[s.teamName] = idx;
                counts[s.teamName] = 1;
            } else {
                counts[s.teamName]++;
            }
        });
        return { counts, firstIndices };
    }, [pageStats]);

    const grandTotals = useMemo(() => {
        const totals: any = { revenue: 0, profit: 0, pagesCount: pageStats.length };
        MONTHS.forEach(m => { totals[`rev_${m}`] = 0; totals[`prof_${m}`] = 0; });
        pageStats.forEach((s: any) => { 
            totals.revenue += s.revenue; 
            totals.profit += s.profit; 
            MONTHS.forEach(m => { 
                totals[`rev_${m}`] += s[`rev_${m}`]; 
                totals[`prof_${m}`] += s[`prof_${m}`]; 
            }); 
        });
        return totals;
    }, [pageStats]);

    const topPagesChartData = useMemo(() => {
        return [...pageStats]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map(p => ({ label: p.pageName, value: p.revenue, imageUrl: p.logoUrl }));
    }, [pageStats]);

    const renderTable = (type: 'Revenue' | 'Profit', prefix: string) => {
        const columns = [
            { key: 'index', label: '#' },
            { key: 'teamName', label: 'ក្រុម (Team)', sortable: true, sortKey: 'teamName' as SortKey },
            { key: 'logo', label: 'Logo' },
            { key: 'pageName', label: 'ឈ្មោះ Page', sortable: true, sortKey: 'pageName' as SortKey },
            { key: `total${type}`, label: `សរុប (${type})`, sortable: true, sortKey: type.toLowerCase() as SortKey },
            ...MONTHS.map(m => ({ key: `${prefix}_${m}`, label: m }))
        ];
        const active = columns.filter(c => true);

        return (
            <div className="hidden md:flex page-card flex-col mb-8 !p-6 border-gray-700/50 shadow-xl overflow-hidden bg-gray-900/40">
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-xl font-black flex items-center gap-2 ${type === 'Revenue' ? 'text-blue-300' : 'text-green-400'}`}>
                        <span className={`w-2 h-6 rounded-full ${type === 'Revenue' ? 'bg-blue-600' : 'bg-green-600'}`}></span>
                        តារាង{type === 'Revenue' ? 'ចំណូល' : 'ប្រាក់ចំណេញ'}តាម Page
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsMerged(!isMerged)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${isMerged ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>MERGE</button>
                        <button onClick={() => setShowFillColor(!showFillColor)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${showFillColor ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>COLOR</button>
                        <button onClick={() => setIsFrozen(!isFrozen)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${isFrozen ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>FREEZE</button>
                    </div>
                </div>

                <div className={`overflow-x-auto custom-scrollbar pb-2 ${showBorders ? 'border border-gray-700/50 rounded-xl' : ''}`}>
                    <table className="report-table w-full border-separate border-spacing-0 text-sm">
                        <thead className="bg-gray-800/90 backdrop-blur-md">
                            <tr>
                                {active.map(col => {
                                    let stickyClass = "";
                                    let stickyStyle: React.CSSProperties = {};
                                    if (isFrozen) {
                                        if (col.key === 'index') { stickyClass = "sticky left-0 z-30 bg-gray-800"; stickyStyle = { width: '45px', minWidth: '45px' }; }
                                        else if (col.key === 'teamName') { stickyClass = "sticky left-[45px] z-30 bg-gray-800 border-r border-gray-700 shadow-md"; stickyStyle = { minWidth: '130px' }; }
                                        else if (col.key === 'logo') { stickyClass = `sticky z-30 bg-gray-800`; stickyStyle = { left: '175px', width: '50px', minWidth: '50px' }; }
                                        else if (col.key === 'pageName') { stickyClass = `sticky z-30 bg-gray-800 shadow-md`; stickyStyle = { left: '225px', minWidth: '160px' }; }
                                        else if (col.key.includes('total')) { stickyClass = `sticky z-30 bg-gray-800 border-r border-gray-700 shadow-lg`; stickyStyle = { left: '385px', width: '100px', minWidth: '100px' }; }
                                    }
                                    const headerBg = col.key.includes('total') ? (type === 'Revenue' ? 'bg-blue-900/50' : 'bg-green-900/50') : '';
                                    return (
                                        <th key={col.key} onClick={() => col.sortable && toggleSort(col.sortKey!)} className={`px-4 py-4 whitespace-nowrap text-left font-black uppercase tracking-wider border-b border-gray-700 ${stickyClass} ${headerBg} ${col.sortable ? 'cursor-pointer hover:bg-gray-700' : ''}`} style={stickyStyle}>
                                            <div className="flex items-center gap-1">{col.label} {col.sortable && sortConfig.key === col.sortKey && (<span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {pageStats.map((item: any, idx) => {
                                const isTeamFirstRow = teamSpanCounts.firstIndices[item.teamName] === idx;
                                const teamRowSpan = isMerged ? teamSpanCounts.counts[item.teamName] : 1;
                                const teamColorIndex = Array.from(String(item.teamName)).reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 5;
                                const groupColors = [{ bg: 'bg-blue-500/10', border: 'border-l-4 border-l-blue-500' }, { bg: 'bg-purple-500/10', border: 'border-l-4 border-l-purple-500' }, { bg: 'bg-emerald-500/10', border: 'border-l-4 border-l-emerald-500' }, { bg: 'bg-orange-500/10', border: 'border-l-4 border-l-orange-500' }, { bg: 'bg-pink-500/10', border: 'border-l-4 border-l-pink-500' }];
                                const colorSet = groupColors[teamColorIndex];
                                const rowBgClass = showFillColor ? colorSet.bg : 'hover:bg-blue-500/5';
                                return (
                                    <tr key={item.pageName} className={`${rowBgClass} transition-colors group`}>
                                        {active.map(col => {
                                            const cellClass = `px-4 py-3 lg:py-4 whitespace-nowrap border-gray-800`;
                                            let stickyClass = "";
                                            let stickyStyle: React.CSSProperties = {};
                                            if (isFrozen) {
                                                if (col.key === 'index') { stickyClass = "sticky left-0 z-10 bg-gray-900"; stickyStyle = { width: '45px', minWidth: '45px' }; }
                                                else if (col.key === 'teamName') { stickyClass = "sticky left-[45px] z-10 bg-gray-900 border-r border-gray-800 shadow-md"; stickyStyle = { width: '130px', minWidth: '130px' }; }
                                                else if (col.key === 'logo') { stickyClass = `sticky z-10 bg-gray-900`; stickyStyle = { left: '175px', width: '50px', minWidth: '50px' }; }
                                                else if (col.key === 'pageName') { stickyClass = `sticky z-10 bg-gray-900 shadow-md`; stickyStyle = { left: '225px', minWidth: '160px' }; }
                                                else if (col.key.includes('total')) { stickyClass = `sticky z-10 bg-gray-900 border-r border-gray-800 shadow-lg`; stickyStyle = { left: '385px', width: '100px', minWidth: '100px' }; }
                                            }
                                            if (col.key === 'index') return <td key={col.key} className={`${cellClass} text-center font-bold text-gray-500 ${stickyClass}`} style={stickyStyle}>{idx + 1}</td>;
                                            if (col.key === 'teamName') {
                                                if (isMerged && !isTeamFirstRow) return null;
                                                return <td key={col.key} rowSpan={teamRowSpan} className={`${cellClass} font-black text-white bg-gray-900/90 align-middle text-center ${stickyClass} ${showFillColor ? colorSet.border : ''}`} style={stickyStyle}><div className="bg-gray-800/50 py-1 px-2 rounded-md inline-block">{item.teamName}</div></td>;
                                            }
                                            if (col.key === 'logo') return <td key={col.key} className={`${cellClass} text-center ${stickyClass}`} style={stickyStyle}><img src={convertGoogleDriveUrl(item.logoUrl)} className="w-8 h-8 rounded-full border border-gray-700 mx-auto" alt="logo" onClick={() => previewImage(convertGoogleDriveUrl(item.logoUrl))} /></td>;
                                            if (col.key === 'pageName') return <td key={col.key} className={`${cellClass} font-black text-white ${stickyClass}`} style={stickyStyle}>{item.pageName}</td>;
                                            if (col.key.includes('total')) return <td key={col.key} className={`${cellClass} text-right font-black ${stickyClass} ${type === 'Revenue' ? 'text-blue-100 bg-blue-600/15' : 'text-green-100 bg-green-600/15'}`} style={stickyStyle}>${(type === 'Revenue' ? item.revenue : item.profit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>;
                                            if (col.key.startsWith(prefix)) {
                                                const val = item[col.key] || 0;
                                                const color = type === 'Profit' ? (val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-gray-600') : (val > 0 ? 'text-blue-300' : 'text-gray-600');
                                                return <td key={col.key} className={`${cellClass} text-right font-medium font-mono ${color}`}>{val !== 0 ? `$${val.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td>;
                                            }
                                            return <td key={col.key} className={cellClass}>-</td>;
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-800/90 font-black">
                            <tr>
                                {active.map((col, idx) => {
                                    const cellClass = `px-4 py-4 whitespace-nowrap border-t-2 border-gray-700`;
                                    let stickyClass = "";
                                    let stickyStyle: React.CSSProperties = {};
                                    if (isFrozen) {
                                        if (col.key === 'index') { stickyClass = "sticky left-0 z-30 bg-gray-800"; stickyStyle = { width: '45px', minWidth: '45px' }; }
                                        else if (col.key === 'teamName') { stickyClass = "sticky left-[45px] z-30 bg-gray-800 border-r border-gray-700 shadow-md"; stickyStyle = { minWidth: '130px' }; }
                                        else if (col.key === 'logo') { stickyClass = `sticky z-30 bg-gray-800`; stickyStyle = { left: '175px', width: '50px', minWidth: '50px' }; }
                                        else if (col.key === 'pageName') { stickyClass = `sticky z-30 bg-gray-800 shadow-md`; stickyStyle = { left: '225px', minWidth: '160px' }; }
                                        else if (col.key.includes('total')) { stickyClass = `sticky z-30 bg-gray-800 border-r border-gray-700 shadow-lg`; stickyStyle = { left: '385px', width: '100px', minWidth: '100px' }; }
                                    }
                                    if (idx === 0) return <td key={col.key} className={`${cellClass} uppercase tracking-widest text-white ${stickyClass}`} style={stickyStyle} colSpan={4}>សរុបរួម</td>;
                                    if (['teamName', 'logo', 'pageName'].includes(col.key)) return null;
                                    if (col.key.includes('total')) return <td key={col.key} className={`${cellClass} text-right ${stickyClass} ${type === 'Revenue' ? 'text-blue-200 bg-blue-600/25' : 'text-green-200 bg-green-600/25'}`} style={stickyStyle}>${(type === 'Revenue' ? grandTotals.revenue : grandTotals.profit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>;
                                    if (col.key.startsWith(prefix)) return <td key={col.key} className={`${cellClass} text-right text-gray-300 font-mono`}>${grandTotals[col.key].toLocaleString(undefined, {minimumFractionDigits: 2})}</td>;
                                    return <td key={col.key} className={cellClass}></td>;
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard label="ចំណូលសរុប (Total Rev)" value={`$${grandTotals.revenue.toLocaleString()}`} icon="💰" colorClass="from-blue-600 to-indigo-500" />
                <StatCard label="ប្រាក់ចំណេញ (Total Profit)" value={`$${grandTotals.profit.toLocaleString()}`} icon="📈" colorClass="from-emerald-600 to-green-500" />
            </div>
            <div className="space-y-8">
                {renderTable('Revenue', 'rev')}
                {renderTable('Profit', 'prof')}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8"><div className="page-card !p-4 bg-gray-800/40 border-gray-700/50"><SimpleBarChart data={topPagesChartData} title="Page ដែលមានចំណូលខ្ពស់បំផុត (Top 5 Pages Revenue)" /></div></div>
                <div className="lg:col-span-4 flex flex-col justify-center page-card !p-5 bg-gray-800/30 border-gray-700/50"><h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6"><span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>សង្ខេប</h3><div className="space-y-4"><div className="flex justify-between border-b border-gray-700/50 pb-2"><span className="text-xs text-gray-400">ចំនួន Page សកម្ម:</span><span className="text-white font-black text-sm">{grandTotals.pagesCount}</span></div><div className="flex justify-between"><span className="text-xs text-gray-400">មធ្យមភាគ/Page:</span><span className="text-blue-400 font-black text-sm">${(grandTotals.revenue / (grandTotals.pagesCount || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div></div></div>
            </div>
        </div>
    );
};

export default SalesByPageReport;

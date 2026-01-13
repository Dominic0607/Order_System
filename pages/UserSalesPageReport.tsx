
import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder } from '../types';
import SimpleBarChart from '../components/admin/SimpleBarChart';
import StatCard from '../components/performance/StatCard';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Spinner from '../components/common/Spinner';
import { convertGoogleDriveUrl } from '../utils/fileUtils';

interface UserSalesPageReportProps {
    orders: ParsedOrder[];
    onBack: () => void;
    team: string; // Team is required to filter pages specific to the user's team
}

type SortKey = 'revenue' | 'profit' | 'pageName';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const UserSalesPageReport: React.FC<UserSalesPageReportProps> = ({ 
    orders, 
    onBack, 
    team
}) => {
    const { appData, previewImage } = useContext(AppContext);
    const [showBorders, setShowBorders] = useState(true);
    const [isFrozen, setIsFrozen] = useState(false);
    const [showFillColor, setShowFillColor] = useState(true);
    const [showAllPages, setShowAllPages] = useState(true); 
    const [isExporting, setIsExporting] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });

    const toggleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const pageStats = useMemo(() => {
        const stats: Record<string, any> = {};
        
        // 1. Initialize stats for ALL pages in this team (so we see 0 sales pages too)
        if (appData.pages) {
            const teamPages = appData.pages.filter(p => (p.Team || '').trim() === team);
            teamPages.forEach(p => {
                stats[p.PageName] = {
                    pageName: p.PageName,
                    logoUrl: p.PageLogoURL || '',
                    revenue: 0,
                    profit: 0,
                    orderCount: 0
                };
                MONTHS.forEach(m => { stats[p.PageName][`rev_${m}`] = 0; stats[p.PageName][`prof_${m}`] = 0; });
            });
        }

        // 2. Aggregate data from orders
        orders.forEach(o => {
            // Strict check: Only process orders matching the passed team
            if ((o.Team || '').trim() !== team) return;

            const page = o.Page || 'Unknown';
            
            if (!stats[page]) {
                // Handle case where page might not be in static list but exists in orders
                const info = appData.pages?.find(p => p.PageName === page);
                stats[page] = { 
                    pageName: page, 
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

        let result = Object.values(stats);
        if (!showAllPages) {
            result = result.filter(item => item.revenue > 0);
        }

        return result.sort((a: any, b: any) => {
            const mult = sortConfig.direction === 'asc' ? 1 : -1;
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'string') return valA.localeCompare(valB) * mult;
            return (valA - valB) * mult;
        });
    }, [orders, sortConfig, appData.pages, showAllPages, team]);

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

    const handleExportPDF = () => {
        setIsExporting(true);
        setTimeout(() => {
            try {
                const doc = new jsPDF({ orientation: 'landscape' }) as any;
                const pageWidth = doc.internal.pageSize.width;
                doc.setFontSize(18);
                doc.text(`Sales Report - Team: ${team}`, pageWidth / 2, 15, { align: 'center' });
                doc.save(`Page_Report_${team}_${Date.now()}.pdf`);
            } catch (err) {
                console.error(err);
                alert("Export failed");
            } finally {
                setIsExporting(false);
            }
        }, 100);
    };

    const topPagesChartData = useMemo(() => {
        return [...pageStats]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map(p => ({ label: p.pageName, value: p.revenue, imageUrl: p.logoUrl }));
    }, [pageStats]);

    // --- Table Rendering (Simplified for User View) ---
    const renderTable = (type: 'Revenue' | 'Profit', prefix: string) => {
        const columns = [
            { key: 'index', label: '#' },
            { key: 'logo', label: 'Logo' },
            { key: 'pageName', label: 'ឈ្មោះ Page', sortable: true, sortKey: 'pageName' as SortKey },
            { key: `total${type}`, label: `សរុប (${type})`, sortable: true, sortKey: type.toLowerCase() as SortKey },
            ...MONTHS.map(m => ({ key: `${prefix}_${m}`, label: m }))
        ];
        const active = columns;

        return (
            <div className="hidden md:flex page-card flex-col mb-8 !p-6 border-gray-700/50 shadow-xl overflow-hidden bg-gray-900/40">
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-xl font-black flex items-center gap-2 ${type === 'Revenue' ? 'text-blue-300' : 'text-green-400'}`}>
                        <span className={`w-2 h-6 rounded-full ${type === 'Revenue' ? 'bg-blue-600' : 'bg-green-600'}`}></span>
                        តារាង{type === 'Revenue' ? 'ចំណូល' : 'ប្រាក់ចំណេញ'}តាម Page
                    </h3>
                    <div className="flex items-center gap-2">
                        {type === 'Revenue' && (
                             <>
                                <button onClick={() => setShowAllPages(!showAllPages)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${showAllPages ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                    {showAllPages ? 'ALL PAGES' : 'ACTIVE ONLY'}
                                </button>
                                <button 
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="btn !py-1 !px-4 text-[10px] font-black bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                                >
                                    {isExporting ? <Spinner size="sm"/> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
                                    EXPORT PDF
                                </button>
                             </>
                        )}
                        <button onClick={() => setShowFillColor(!showFillColor)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${showFillColor ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>COLOR</button>
                        <button onClick={() => setIsFrozen(!isFrozen)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${isFrozen ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>FREEZE</button>
                        <button onClick={() => setShowBorders(!showBorders)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${showBorders ? 'bg-gray-700 border-gray-600 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>BORDER</button>
                    </div>
                </div>

                <div className={`overflow-x-auto custom-scrollbar pb-2 ${showBorders ? 'border-2 border-white/20 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)]' : ''}`}>
                    <table className={`report-table w-full border-separate border-spacing-0 text-sm ${showBorders ? 'border-collapse' : ''}`}>
                        <thead className="bg-[#0f172a] backdrop-blur-md">
                            <tr className="border-b-2 border-white/20">
                                {active.map(col => {
                                    let stickyClass = "";
                                    let stickyStyle: React.CSSProperties = {};
                                    if (isFrozen) {
                                        if (col.key === 'index') { 
                                            stickyClass = "sticky left-0 z-30 bg-[#0f172a]"; 
                                            stickyStyle = { width: '45px', minWidth: '45px' }; 
                                        } else if (col.key === 'logo') { 
                                            stickyClass = "sticky left-[45px] z-30 bg-[#0f172a] shadow-sm"; 
                                            stickyStyle = { width: '60px', minWidth: '60px' }; 
                                        } else if (col.key === 'pageName') { 
                                            stickyClass = `sticky left-[105px] z-30 bg-[#0f172a] shadow-md border-r border-white/20`; 
                                            stickyStyle = { minWidth: '180px' }; 
                                        } else if (col.key.includes('total')) { 
                                            stickyClass = `sticky z-30 bg-[#0f172a] border-r border-white/20 shadow-lg`; 
                                            stickyStyle = { left: '285px', width: '100px', minWidth: '100px' }; 
                                        }
                                    }
                                    const headerBg = col.key.includes('total') ? (type === 'Revenue' ? 'bg-blue-900/80' : 'bg-green-900/80') : '';
                                    return (
                                        <th key={col.key} onClick={() => col.sortable && toggleSort(col.sortKey!)} className={`px-4 py-5 whitespace-nowrap text-left font-black uppercase tracking-wider border-b-2 border-white/20 ${showBorders ? 'border-x border-white/10' : ''} ${stickyClass} ${headerBg} ${col.sortable ? 'cursor-pointer hover:bg-gray-700' : ''}`} style={stickyStyle}>
                                            <div className="flex items-center gap-1">{col.label} {col.sortable && sortConfig.key === col.sortKey && (<span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {pageStats.map((item: any, idx) => {
                                const rowBgClass = showFillColor ? (idx % 2 === 0 ? 'bg-gray-800/30' : 'bg-transparent') : 'hover:bg-blue-500/5';
                                return (
                                    <tr key={item.pageName} className={`${rowBgClass} transition-colors group border-b border-white/10`}>
                                        {active.map(col => {
                                            const cellClass = `px-4 py-4 lg:py-5 whitespace-nowrap border-white/10 ${showBorders ? 'border-x border-white/10' : ''}`;
                                            let stickyClass = "";
                                            let stickyStyle: React.CSSProperties = {};
                                            if (isFrozen) {
                                                if (col.key === 'index') { 
                                                    stickyClass = "sticky left-0 z-10 bg-[#020617]"; 
                                                    stickyStyle = { width: '45px', minWidth: '45px' }; 
                                                } else if (col.key === 'logo') { 
                                                    stickyClass = "sticky left-[45px] z-10 bg-[#020617] shadow-sm"; 
                                                    stickyStyle = { width: '60px', minWidth: '60px' }; 
                                                } else if (col.key === 'pageName') { 
                                                    stickyClass = `sticky left-[105px] z-10 bg-[#020617] shadow-md border-r border-white/20`; 
                                                    stickyStyle = { minWidth: '180px' }; 
                                                } else if (col.key.includes('total')) { 
                                                    stickyClass = `sticky z-10 bg-[#020617] border-r border-white/20 shadow-lg`; 
                                                    stickyStyle = { left: '285px', width: '100px', minWidth: '100px' }; 
                                                }
                                            }
                                            if (col.key === 'index') return <td key={col.key} className={`${cellClass} text-center font-bold text-gray-500 ${stickyClass}`} style={stickyStyle}>{idx + 1}</td>;
                                            
                                            if (col.key === 'logo') return <td key={col.key} className={`${cellClass} text-center ${stickyClass} border-b border-white/10`} style={stickyStyle}><img src={convertGoogleDriveUrl(item.logoUrl)} className="w-9 h-9 rounded-full border border-gray-700 mx-auto shadow-md object-cover" alt="logo" onClick={() => previewImage(convertGoogleDriveUrl(item.logoUrl))} /></td>;
                                            
                                            if (col.key === 'pageName') return <td key={col.key} className={`${cellClass} font-black text-white ${stickyClass} border-b border-white/10`} style={stickyStyle}>{item.pageName}</td>;
                                            if (col.key.includes('total')) return <td key={col.key} className={`${cellClass} text-right font-black ${stickyClass} ${type === 'Revenue' ? 'text-blue-100 bg-blue-600/10' : 'text-green-100 bg-green-600/10'} border-b border-white/10`} style={stickyStyle}>${(type === 'Revenue' ? item.revenue : item.profit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>;
                                            if (col.key.startsWith(prefix)) {
                                                const val = item[col.key] || 0;
                                                const color = type === 'Profit' ? (val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-gray-500') : (val > 0 ? 'text-blue-300' : 'text-gray-500');
                                                return <td key={col.key} className={`${cellClass} text-right font-bold font-mono ${color} border-b border-white/10`}>{val !== 0 ? `$${val.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td>;
                                            }
                                            return <td key={col.key} className={`${cellClass} border-b border-white/10`}>-</td>;
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-[#0f172a] font-black border-t-2 border-white/20">
                            <tr className="border-t-2 border-white/20">
                                {active.map((col, idx) => {
                                    const cellClass = `px-4 py-5 whitespace-nowrap border-t-2 border-white/20 ${showBorders ? 'border-x border-white/10' : ''}`;
                                    let stickyClass = "";
                                    let stickyStyle: React.CSSProperties = {};
                                    if (isFrozen) {
                                        if (col.key === 'index') { stickyClass = "sticky left-0 z-30 bg-[#0f172a]"; stickyStyle = { width: '45px', minWidth: '45px' }; }
                                        else if (col.key === 'logo') { stickyClass = "sticky left-[45px] z-30 bg-[#0f172a] shadow-sm"; stickyStyle = { width: '60px', minWidth: '60px' }; }
                                        else if (col.key === 'pageName') { 
                                            stickyClass = `sticky left-[105px] z-30 bg-[#0f172a] shadow-md border-r border-white/20`; 
                                            stickyStyle = { minWidth: '180px' }; 
                                        }
                                        else if (col.key.includes('total')) { 
                                            stickyClass = `sticky z-30 bg-[#0f172a] border-r border-white/20 shadow-lg`; 
                                            stickyStyle = { left: '285px', width: '100px', minWidth: '100px' }; 
                                        }
                                    }
                                    if (idx === 0) return <td key={col.key} className={`${cellClass} uppercase tracking-widest text-white font-black ${stickyClass}`} style={stickyStyle} colSpan={3}>សរុបរួម (GRAND TOTAL)</td>;
                                    if (['pageName', 'logo'].includes(col.key)) return null;
                                    if (col.key.includes('total')) return <td key={col.key} className={`${cellClass} text-right ${stickyClass} ${type === 'Revenue' ? 'text-blue-300 bg-blue-600/10' : 'text-green-300 bg-green-600/10'}`} style={stickyStyle}>${(type === 'Revenue' ? grandTotals.revenue : grandTotals.profit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>;
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

    // --- Mobile Card View (Simplified) ---
    const MobileCardView = () => (
        <div className="md:hidden space-y-4 pb-12 px-1">
            <h3 className="text-lg font-black text-white px-2 flex items-center gap-2 mb-4">
                <span className="w-1.5 h-5 bg-indigo-500 rounded-full"></span>
                របាយការណ៍តាម Page ({team})
            </h3>
            {pageStats.map((item: any) => (
                <div key={item.pageName} className="bg-gray-800/40 border border-white/10 rounded-[2.5rem] p-6 shadow-xl space-y-5 animate-fade-in-up group relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-700 bg-gray-950 shadow-inner p-0.5">
                                <img src={convertGoogleDriveUrl(item.logoUrl)} className="w-full h-full object-cover rounded-lg" alt="" onClick={() => previewImage(convertGoogleDriveUrl(item.logoUrl))} />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-base font-black text-white truncate leading-tight uppercase tracking-tight">{item.pageName}</h4>
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

                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.orderCount} Orders</span>
                        </div>
                    </div>
                    
                    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-600/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard label="ចំណូលសរុប (Total Rev)" value={`$${grandTotals.revenue.toLocaleString()}`} icon="💰" colorClass="from-blue-600 to-indigo-500" />
                <StatCard label="ប្រាក់ចំណេញ (Total Profit)" value={`$${grandTotals.profit.toLocaleString()}`} icon="📈" colorClass="from-emerald-600 to-green-500" />
            </div>

            <div className="flex items-center gap-2 mb-4">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors text-xs font-bold uppercase tracking-wider">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </button>
            </div>

            {/* Desktop Tables */}
            <div className="hidden md:block space-y-8">
                {renderTable('Revenue', 'rev')}
                {renderTable('Profit', 'prof')}
            </div>
            
            {/* Mobile View */}
            <MobileCardView />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
                <div className="lg:col-span-8"><div className="page-card !p-4 bg-gray-800/40 border-gray-700/50"><SimpleBarChart data={topPagesChartData} title="Top Pages (Revenue)" /></div></div>
                <div className="lg:col-span-4 flex flex-col justify-center page-card !p-5 bg-gray-800/30 border-gray-700/50"><h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6"><span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>សង្ខេប</h3><div className="space-y-4"><div className="flex justify-between border-b border-white/5 pb-2"><span className="text-xs text-gray-400">ចំនួន Page:</span><span className="text-white font-black text-sm">{grandTotals.pagesCount}</span></div><div className="flex justify-between"><span className="text-xs text-gray-400">មធ្យមភាគ/Page:</span><span className="text-blue-400 font-black text-sm">${(grandTotals.revenue / (grandTotals.pagesCount || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div></div></div>
            </div>
        </div>
    );
};

export default UserSalesPageReport;

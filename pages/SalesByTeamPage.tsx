
import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder } from '../types';
import Modal from '../components/common/Modal';
import SimpleBarChart from '../components/admin/SimpleBarChart';
import StatCard from '../components/performance/StatCard';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Spinner from '../components/common/Spinner';

interface SalesByTeamPageProps {
    orders: ParsedOrder[];
    onBack: () => void;
}

type SortKey = 'revenue' | 'profit' | 'name' | 'orders';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SalesByTeamPage: React.FC<SalesByTeamPageProps> = ({ orders, onBack }) => {
    const { appData } = useContext(AppContext);
    const [showBorders, setShowBorders] = useState(true);
    const [isFrozen, setIsFrozen] = useState(false);
    const [showFillColor, setShowFillColor] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'desc' | 'asc' }>({ key: 'revenue', direction: 'desc' });
    const [isExporting, setIsExporting] = useState(false);
    const [topPagesLimit, setTopPagesLimit] = useState<number>(10);

    const toggleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const teamStats = useMemo(() => {
        const stats: Record<string, any> = {};
        orders.forEach(order => {
            let teamName = order.Team || (order.User && appData.users?.find(u => u.UserName === order.User)?.Team?.split(',')[0].trim()) || 'Unassigned';
            if (!stats[teamName]) {
                stats[teamName] = { name: teamName, revenue: 0, profit: 0, orders: 0, members: new Set() };
                MONTHS.forEach(m => { stats[teamName][`rev_${m}`] = 0; stats[teamName][`prof_${m}`] = 0; });
            }
            const rev = Number(order['Grand Total']) || 0;
            const cost = (Number(order['Total Product Cost ($)']) || 0) + (Number(order['Internal Cost']) || 0);
            stats[teamName].revenue += rev;
            stats[teamName].profit += (rev - cost);
            stats[teamName].orders += 1;
            if (order.User) stats[teamName].members.add(order.User);
            if (order.Timestamp) {
                const d = new Date(order.Timestamp);
                const mName = MONTHS[d.getMonth()];
                stats[teamName][`rev_${mName}`] += rev;
                stats[teamName][`prof_${mName}`] += (rev - cost);
            }
        });

        return Object.values(stats).sort((a: any, b: any) => {
            const mult = sortConfig.direction === 'asc' ? 1 : -1;
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'string') return valA.localeCompare(valB) * mult;
            return (valA - valB) * mult;
        });
    }, [orders, sortConfig, appData.users]);

    const grandTotals = useMemo(() => {
        const totals: any = { revenue: 0, profit: 0, orders: 0 };
        MONTHS.forEach(m => { totals[`rev_${m}`] = 0; totals[`prof_${m}`] = 0; });
        teamStats.forEach((t: any) => {
            totals.revenue += t.revenue; 
            totals.profit += t.profit;
            totals.orders += t.orders;
            MONTHS.forEach(m => { totals[`rev_${m}`] += t[`rev_${m}`]; totals[`prof_${m}`] += t[`prof_${m}`]; });
        });
        return totals;
    }, [teamStats]);

    const handleExportPDF = () => {
        setIsExporting(true);
        setTimeout(() => {
            try {
                const doc = new jsPDF({ orientation: 'landscape' }) as any;
                const pageWidth = doc.internal.pageSize.width;

                doc.setFontSize(18);
                doc.text("Sales Report by Team", pageWidth / 2, 15, { align: 'center' });
                doc.setFontSize(10);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });

                // Table 1: Revenue
                doc.setFontSize(14);
                doc.text("1. Team Revenue Summary", 14, 32);
                
                const revHead = [['#', 'Team Name', 'Total Revenue', ...MONTHS]];
                const revBody = teamStats.map((t: any, i) => [
                    i + 1,
                    t.name,
                    `$${t.revenue.toLocaleString()}`,
                    ...MONTHS.map(m => `$${t[`rev_${m}`].toLocaleString()}`)
                ]);
                revBody.push(['', 'GRAND TOTAL', `$${grandTotals.revenue.toLocaleString()}`, ...MONTHS.map(m => `$${grandTotals[`rev_${m}`].toLocaleString()}`)]);

                doc.autoTable({
                    startY: 38,
                    head: revHead,
                    body: revBody,
                    theme: 'grid',
                    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
                    styles: { fontSize: 7 },
                    didParseCell: (data: any) => {
                        if (data.row.index === revBody.length - 1) data.cell.styles.fontStyle = 'bold';
                    }
                });

                // Table 2: Profit
                doc.addPage();
                doc.setFontSize(14);
                doc.text("2. Team Profit Summary", 14, 15);
                
                const profHead = [['#', 'Team Name', 'Total Profit', ...MONTHS]];
                const profBody = teamStats.map((t: any, i) => [
                    i + 1,
                    t.name,
                    `$${t.profit.toLocaleString()}`,
                    ...MONTHS.map(m => `$${t[`prof_${m}`].toLocaleString()}`)
                ]);
                profBody.push(['', 'GRAND TOTAL', `$${grandTotals.profit.toLocaleString()}`, ...MONTHS.map(m => `$${grandTotals[`prof_${m}`].toLocaleString()}`)]);

                doc.autoTable({
                    startY: 20,
                    head: profHead,
                    body: profBody,
                    theme: 'grid',
                    headStyles: { fillColor: [5, 150, 105], textColor: 255 },
                    styles: { fontSize: 7 },
                    didParseCell: (data: any) => {
                        if (data.row.index === profBody.length - 1) data.cell.styles.fontStyle = 'bold';
                    }
                });

                doc.save(`Team_Sales_Report_${Date.now()}.pdf`);
            } catch (err) {
                console.error(err);
                alert("Export failed");
            } finally {
                setIsExporting(false);
            }
        }, 100);
    };

    const teamChartData = useMemo(() => {
        return teamStats.slice(0, 10).map(t => ({ label: t.name, value: t.revenue }));
    }, [teamStats]);

    const DesktopTable = (type: 'Revenue' | 'Profit', prefix: string) => {
        const columns = [
            { key: 'index', label: '#' },
            { key: 'teamName', label: 'ឈ្មោះក្រុម (Team)', sortable: true, sortKey: 'name' as SortKey },
            { key: `total${type}`, label: `សរុប (${type})`, sortable: true, sortKey: type.toLowerCase() as SortKey },
            ...MONTHS.map(m => ({ key: `${prefix}_${m}`, label: m }))
        ];
        const active = columns;

        return (
            <div className="hidden md:flex page-card flex-col mb-8 !p-6 border-gray-700/50 shadow-xl overflow-hidden bg-gray-900/40">
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-xl font-black flex items-center gap-2 ${type === 'Revenue' ? 'text-blue-300' : 'text-green-400'}`}>
                        <span className={`w-2 h-6 rounded-full ${type === 'Revenue' ? 'bg-blue-600' : 'bg-green-600'}`}></span>
                        តារាង{type === 'Revenue' ? 'ចំណូល' : 'ប្រាក់ចំណេញ'}តាមក្រុម
                    </h3>
                    <div className="flex items-center gap-2">
                        {type === 'Revenue' && (
                             <button 
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="btn !py-1 !px-4 text-[10px] font-black bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                            >
                                {isExporting ? <Spinner size="sm"/> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
                                EXPORT PDF
                            </button>
                        )}
                        <button onClick={() => setShowFillColor(!showFillColor)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${showFillColor ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>COLOR</button>
                        <button onClick={() => setIsFrozen(!isFrozen)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${isFrozen ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>FREEZE</button>
                        <button onClick={() => setShowBorders(!showBorders)} className={`btn !py-1 !px-3 text-[10px] font-black border transition-all ${showBorders ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>BORDER</button>
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
                                        else if (col.key === 'teamName') { stickyClass = "sticky left-[45px] z-30 bg-gray-800 border-r border-gray-700 shadow-md"; stickyStyle = { width: '140px', minWidth: '140px' }; }
                                        else if (col.key.includes('total')) { stickyClass = "sticky left-[185px] z-30 bg-gray-800 border-r border-gray-700 shadow-lg"; stickyStyle = { width: '100px', minWidth: '100px' }; }
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
                            {teamStats.map((team: any, index: number) => {
                                const teamColorIndex = Array.from(String(team.name)).reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 5;
                                const groupColors = ['bg-blue-500/10', 'bg-purple-500/10', 'bg-emerald-500/10', 'bg-orange-500/10', 'bg-pink-500/10'];
                                const rowBgClass = showFillColor ? groupColors[teamColorIndex] : 'hover:bg-blue-500/5';
                                return (
                                    <tr key={team.name} className={`${rowBgClass} transition-colors group`}>
                                        {active.map(col => {
                                            const cellClass = `px-4 py-3 lg:py-4 whitespace-nowrap border-gray-800`;
                                            let stickyClass = "";
                                            let stickyStyle: React.CSSProperties = {};
                                            if (isFrozen) {
                                                if (col.key === 'index') { stickyClass = "sticky left-0 z-10 bg-gray-900"; stickyStyle = { width: '45px', minWidth: '45px' }; }
                                                else if (col.key === 'teamName') { stickyClass = "sticky left-[45px] z-10 bg-gray-900 border-r border-gray-800 shadow-md"; stickyStyle = { width: '140px', minWidth: '140px' }; }
                                                else if (col.key.includes('total')) { stickyClass = "sticky left-[185px] z-10 bg-gray-900 border-r border-gray-800 shadow-lg"; stickyStyle = { width: '100px', minWidth: '100px' }; }
                                            }
                                            if (col.key === 'index') return <td key={col.key} className={`${cellClass} text-center font-bold text-gray-500 ${stickyClass}`} style={stickyStyle}>{index + 1}</td>;
                                            if (col.key === 'teamName') return <td key={col.key} className={`${cellClass} font-black text-white ${stickyClass}`} style={stickyStyle}>{team.name}</td>;
                                            if (col.key.includes('total')) return <td key={col.key} className={`${cellClass} text-right font-black ${stickyClass} ${type === 'Revenue' ? 'text-blue-100 bg-blue-600/15' : 'text-green-100 bg-green-600/15'}`} style={stickyStyle}>${(type === 'Revenue' ? team.revenue : team.profit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>;
                                            if (col.key.startsWith(prefix)) {
                                                const val = team[col.key] || 0;
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
                                        else if (col.key === 'teamName') { stickyClass = "sticky left-[45px] z-30 bg-gray-800 shadow-md"; stickyStyle = { width: '140px', minWidth: '140px' }; }
                                        else if (col.key.includes('total')) { stickyClass = "sticky left-[185px] z-30 bg-gray-800 shadow-lg"; stickyStyle = { width: '100px', minWidth: '100px' }; }
                                    }
                                    if (idx === 0) return <td key={col.key} className={`${cellClass} uppercase tracking-widest text-white ${stickyClass}`} style={stickyStyle} colSpan={2}>សរុបរួម</td>;
                                    if (col.key === 'teamName') return null;
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
        <div className="w-full space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="ចំណូលសរុប (Revenue)" value={`$${grandTotals.revenue.toLocaleString()}`} icon="💰" colorClass="from-blue-600 to-indigo-500" />
                <StatCard label="ប្រាក់ចំណេញ (Profit)" value={`$${grandTotals.profit.toLocaleString()}`} icon="📈" colorClass="from-emerald-600 to-teal-500" />
                <StatCard label="ការកម្មង់សរុប (Orders)" value={grandTotals.orders} icon="📦" colorClass="from-purple-600 to-pink-500" />
            </div>
            <div className="space-y-8">
                {DesktopTable('Revenue', 'rev')}
                {DesktopTable('Profit', 'prof')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                <div className="page-card !p-4 bg-gray-800/40 border-gray-700/50"><SimpleBarChart data={teamChartData} title="ចំណូលតាមក្រុម (Top Teams Revenue)" /></div>
                <div className="page-card !p-6 bg-gray-800/40 border-gray-700/50 flex flex-col justify-center">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span> ស្ថិតិក្រុមលក់
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                            <span className="text-xs text-gray-500 font-bold uppercase">ចំនួនក្រុមសកម្ម:</span>
                            <span className="text-white font-black text-lg">{teamStats.length}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                            <span className="text-xs text-gray-500 font-bold uppercase">មធ្យមភាគចំណូល/ក្រុម:</span>
                            <span className="text-blue-400 font-black text-lg">${(grandTotals.revenue / (teamStats.length || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-bold uppercase">មធ្យមភាគចំណេញ/ក្រុម:</span>
                            <span className="text-emerald-400 font-black text-lg">${(grandTotals.profit / (teamStats.length || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesByTeamPage;


import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder } from '../types';
import Modal from '../components/common/Modal';
import SimpleBarChart from '../components/admin/SimpleBarChart';
import StatCard from '../components/performance/StatCard';

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
    const [selectedTeamDetails, setSelectedTeamDetails] = useState<any | null>(null);
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

    const pageRevenueStats = useMemo(() => {
        const stats: Record<string, { label: string, value: number, imageUrl?: string }> = {};
        orders.forEach(order => {
            const pageName = order.Page || 'Unknown Page';
            if (!stats[pageName]) {
                const pageInfo = appData.pages?.find(p => p.PageName === pageName);
                stats[pageName] = { 
                    label: pageName, 
                    value: 0, 
                    imageUrl: pageInfo?.PageLogoURL 
                };
            }
            stats[pageName].value += (Number(order['Grand Total']) || 0);
        });
        return Object.values(stats)
            .sort((a, b) => b.value - a.value)
            .slice(0, topPagesLimit);
    }, [orders, appData.pages, topPagesLimit]);

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

    const teamChartData = useMemo(() => {
        return teamStats.slice(0, 10).map(t => ({ label: t.name, value: t.revenue }));
    }, [teamStats]);

    const DesktopView = (type: 'Revenue' | 'Profit', prefix: string) => {
        const columns = [
            { key: 'index', label: '#' },
            { key: 'teamName', label: 'ឈ្មោះក្រុម (Team)', sortable: true, sortKey: 'name' as SortKey },
            { key: `total${type}`, label: `សរុប (${type})`, sortable: true, sortKey: type.toLowerCase() as SortKey },
            ...MONTHS.map(m => ({ key: `${prefix}_${m}`, label: m }))
        ];
        const visibleSet = new Set(['index', 'teamName', `total${type}`, ...MONTHS.map(m => `${prefix}_${m}`)]);
        const active = columns.filter(c => visibleSet.has(c.key));

        return (
            <div className="hidden md:flex page-card flex-col mb-8 !p-6 border-gray-700/50 shadow-xl overflow-hidden bg-gray-900/40">
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-xl font-black flex items-center gap-2 ${type === 'Revenue' ? 'text-blue-300' : 'text-green-400'}`}>
                        <span className={`w-2 h-6 rounded-full ${type === 'Revenue' ? 'bg-blue-600' : 'bg-green-600'}`}></span>
                        តារាង{type === 'Revenue' ? 'ចំណូល' : 'ប្រាក់ចំណេញ'}តាមក្រុម
                    </h3>
                    <div className="flex items-center gap-2">
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
                                    if (idx === 0) return <td key={col.key} className={`${cellClass} uppercase tracking-widest text-white ${stickyClass}`} style={stickyStyle} colSpan={visibleSet.has('index') && visibleSet.has('teamName') ? 2 : 1}>សរុបរួម</td>;
                                    if (col.key === 'teamName' && visibleSet.has('index')) return null;
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
                {DesktopView('Revenue', 'rev')}
                {DesktopView('Profit', 'prof')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="page-card !p-4 bg-gray-800/40 border-gray-700/50"><SimpleBarChart data={teamChartData} title="ចំណូលតាមក្រុម (Top Teams Revenue)" /></div>
                <div className="page-card !p-4 bg-gray-800/40 border-gray-700/50 relative">
                    <div className="absolute top-4 right-4 z-10"><select value={topPagesLimit} onChange={(e) => setTopPagesLimit(Number(e.target.value))} className="bg-gray-900 border border-gray-700 text-blue-400 text-[10px] font-black rounded px-2 py-1 outline-none"><option value={5}>Top 5</option><option value={10}>Top 10</option><option value={15}>Top 15</option></select></div>
                    <SimpleBarChart data={pageRevenueStats} title="ចំណូលតាម Page (Top Pages Revenue)" />
                </div>
            </div>
        </div>
    );
};

export default SalesByTeamPage;


import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder } from '../types';
import StatCard from '../components/performance/StatCard';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Spinner from '../components/common/Spinner';
import { convertGoogleDriveUrl } from '../utils/fileUtils';
import SimpleBarChart from '../components/admin/SimpleBarChart';
import { WEB_APP_URL } from '../constants';
import { CacheService } from '../services/cacheService';

// Import separate view components
import SalesByPageDesktop from '../components/reports/SalesByPageDesktop';
import SalesByPageTablet from '../components/reports/SalesByPageTablet';
import SalesByPageMobile from '../components/reports/SalesByPageMobile';

interface UserSalesPageReportProps {
    orders: ParsedOrder[]; // Kept for interface compatibility, but we fetch our own full data
    onBack: () => void;
    team: string;
}

type SortKey = 'revenue' | 'pageName';
type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'all' | 'custom';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const UserSalesPageReport: React.FC<UserSalesPageReportProps> = ({ 
    orders: initialOrders, 
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

    // Data State
    const [fullOrders, setFullOrders] = useState<ParsedOrder[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // --- Filter State ---
    const [datePreset, setDatePreset] = useState<DateRangePreset>('this_month');
    const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
    const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

    // --- Data Fetching Logic with Cache ---
    const checkAndFetchData = async () => {
        const CACHE_KEY = 'user_sales_report_full_data';
        const CACHE_DURATION = 5 * 60 * 1000; // 5 Minutes Expiry

        // Check Cache first
        const cached = CacheService.get<ParsedOrder[]>(CACHE_KEY);
        
        if (cached) {
            console.log("Using cached data for report");
            setFullOrders(cached);
        } else {
            // Cache expired or missing, fetch fresh data
            console.log("Fetching fresh data for report...");
            setIsLoadingData(true);
            try {
                const response = await fetch(`${WEB_APP_URL}/api/admin/all-orders`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    const rawData = Array.isArray(result.data) ? result.data.filter((o: any) => o !== null) : [];
                    const parsed = rawData.map((o: any) => {
                        let products = [];
                        try { if (o['Products (JSON)']) products = JSON.parse(o['Products (JSON)']); } catch(e) {}
                        return { ...o, Products: products };
                    });
                    
                    setFullOrders(parsed);
                    // Save to cache
                    CacheService.set(CACHE_KEY, parsed, CACHE_DURATION);
                }
            } catch (err) {
                console.error("Failed to fetch report data", err);
            } finally {
                setIsLoadingData(false);
            }
        }
    };

    // Initial load
    useEffect(() => {
        checkAndFetchData();
    }, []);

    const toggleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handlePresetChange = (preset: DateRangePreset) => {
        setDatePreset(preset);
        // Check data freshness whenever user switches filters
        checkAndFetchData();
    };

    // --- Date Filtering Logic ---
    const filteredOrders = useMemo(() => {
        // Use fullOrders if available, otherwise fallback to props (though fetch should handle it)
        const sourceData = fullOrders.length > 0 ? fullOrders : initialOrders;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start: Date | null = null;
        let end: Date | null = null; 

        switch (datePreset) {
            case 'today': 
                start = today; 
                end = new Date(today);
                end.setHours(23, 59, 59, 999); 
                break;
            case 'yesterday': 
                start = new Date(today); 
                start.setDate(today.getDate() - 1); 
                end = new Date(today); 
                end.setMilliseconds(-1); 
                break;
            case 'this_week': 
                const day = now.getDay(); 
                start = new Date(today); 
                start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'this_month': 
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); 
                break;
            case 'last_month': 
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1); 
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); 
                break;
            case 'all': 
                start = null; 
                end = null; 
                break;
            case 'custom': 
                start = new Date(customStart + 'T00:00:00');
                end = new Date(customEnd + 'T23:59:59');
                break;
        }

        return sourceData.filter(o => {
            // Strict Team Check (Case Insensitive)
            if ((o.Team || '').trim().toLowerCase() !== team.trim().toLowerCase()) return false;

            // Date Check
            if (!start) return true; // All time
            const orderDate = new Date(o.Timestamp);
            
            if (end) {
                return orderDate >= start && orderDate <= end;
            }
            return orderDate >= start;
        });
    }, [fullOrders, initialOrders, team, datePreset, customStart, customEnd]);

    const pageStats = useMemo(() => {
        const stats: Record<string, any> = {};
        
        // 1. Initialize stats for ALL pages in this team
        if (appData.pages) {
            const teamPages = appData.pages.filter(p => (p.Team || '').trim() === team);
            teamPages.forEach(p => {
                stats[p.PageName] = {
                    pageName: p.PageName,
                    teamName: team, // Required for shared components
                    logoUrl: p.PageLogoURL || '',
                    revenue: 0,
                    profit: 0, // Required for shared components
                    orderCount: 0
                };
                // Initialize monthly breakdown keys to prevent undefined access
                MONTHS.forEach(m => { stats[p.PageName][`rev_${m}`] = 0; stats[p.PageName][`prof_${m}`] = 0; });
            });
        }

        // 2. Aggregate data from Filtered Orders
        filteredOrders.forEach(o => {
            const page = o.Page || 'Unknown';
            
            if (!stats[page]) {
                const info = appData.pages?.find(p => p.PageName === page);
                stats[page] = { 
                    pageName: page,
                    teamName: team,
                    logoUrl: info?.PageLogoURL || '',
                    revenue: 0, 
                    profit: 0,
                    orderCount: 0
                };
                MONTHS.forEach(m => { stats[page][`rev_${m}`] = 0; stats[page][`prof_${m}`] = 0; });
            }

            const rev = Number(o['Grand Total']) || 0;
            const cost = (Number(o['Total Product Cost ($)']) || 0) + (Number(o['Internal Cost']) || 0);
            const profit = rev - cost;
            
            stats[page].revenue += rev;
            stats[page].profit += profit;
            stats[page].orderCount += 1;

            if (o.Timestamp) {
                const d = new Date(o.Timestamp);
                const mName = MONTHS[d.getMonth()];
                stats[page][`rev_${mName}`] += rev;
                stats[page][`prof_${mName}`] += profit;
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
    }, [filteredOrders, sortConfig, appData.pages, showAllPages, team]);

    const grandTotals = useMemo(() => {
        const totals: any = { revenue: 0, profit: 0, pagesCount: pageStats.length, orders: 0 };
        // Initialize monthly breakdown keys for grandTotals to prevent undefined access
        MONTHS.forEach(m => { totals[`rev_${m}`] = 0; totals[`prof_${m}`] = 0; });

        pageStats.forEach((s: any) => { 
            totals.revenue += s.revenue; 
            totals.profit += s.profit;
            totals.orders += s.orderCount;
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
                doc.setFontSize(12);
                doc.text(`Period: ${datePreset.toUpperCase()}`, pageWidth / 2, 22, { align: 'center' });
                
                // Add Summary Table
                doc.autoTable({
                    startY: 30,
                    head: [['Metric', 'Value']],
                    body: [
                        ['Total Revenue', `$${grandTotals.revenue.toLocaleString()}`],
                        ['Total Orders', grandTotals.orders],
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185] },
                });

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

    if (isLoadingData && fullOrders.length === 0) {
        return <div className="flex h-96 items-center justify-center"><Spinner size="lg" /></div>;
    }

    return (
        <div className="w-full space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="bg-gray-800 p-3 rounded-2xl border border-gray-700 hover:bg-gray-700 active:scale-95 transition-all">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">Page Report</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{team}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex overflow-x-auto gap-2 p-1 bg-gray-900/50 rounded-2xl border border-white/5 max-w-full no-scrollbar">
                    {(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'all'] as const).map(preset => (
                        <button
                            key={preset}
                            onClick={() => handlePresetChange(preset)}
                            className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl whitespace-nowrap transition-all ${datePreset === preset ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white/5'}`}
                        >
                            {preset.replace('_', ' ')}
                        </button>
                    ))}
                    <button
                        onClick={() => handlePresetChange('custom')}
                        className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl whitespace-nowrap transition-all ${datePreset === 'custom' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white/5'}`}
                    >
                        Custom
                    </button>
                </div>
            </div>

            {/* Custom Date Inputs */}
            {datePreset === 'custom' && (
                <div className="flex items-center gap-4 bg-gray-800/30 p-4 rounded-2xl border border-white/5 animate-fade-in-down">
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold" />
                    <span className="text-gray-500 font-bold">-</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold" />
                </div>
            )}

            {/* Top Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="ចំណូលសរុប (Revenue)" value={`$${grandTotals.revenue.toLocaleString()}`} icon="💰" colorClass="from-blue-600 to-indigo-500" />
                <StatCard label="ការកម្មង់ (Orders)" value={grandTotals.orders} icon="📦" colorClass="from-purple-600 to-pink-500" />
                <StatCard label="Page សកម្ម" value={grandTotals.pagesCount} icon="📄" colorClass="from-orange-500 to-yellow-500" />
            </div>

            {/* 1. Desktop View */}
            <SalesByPageDesktop 
                data={pageStats}
                grandTotals={grandTotals}
                sortConfig={sortConfig}
                onToggleSort={toggleSort}
                showAllPages={showAllPages}
                setShowAllPages={setShowAllPages}
                onExportPDF={handleExportPDF}
                isExporting={isExporting}
                onPreviewImage={previewImage}
            />
            
            {/* 2. Tablet View */}
            <SalesByPageTablet 
                data={pageStats}
                grandTotals={grandTotals}
                onPreviewImage={previewImage}
            />

            {/* 3. Mobile View */}
            <SalesByPageMobile 
                data={pageStats}
                onPreviewImage={previewImage}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
                <div className="lg:col-span-8"><div className="page-card !p-4 bg-gray-800/40 border-gray-700/50"><SimpleBarChart data={topPagesChartData} title="Page ដែលមានចំណូលខ្ពស់បំផុត (Top 5 Pages Revenue)" /></div></div>
                <div className="lg:col-span-4 flex flex-col justify-center page-card !p-5 bg-gray-800/30 border-gray-700/50"><h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6"><span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>សង្ខេប</h3><div className="space-y-4"><div className="flex justify-between border-b border-white/5 pb-2"><span className="text-xs text-gray-400">ចំនួន Page សកម្ម:</span><span className="text-white font-black text-sm">{grandTotals.pagesCount}</span></div><div className="flex justify-between"><span className="text-xs text-gray-400">មធ្យមភាគ/Page:</span><span className="text-blue-400 font-black text-sm">${(grandTotals.revenue / (grandTotals.pagesCount || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div></div></div>
            </div>
        </div>
    );
};

export default UserSalesPageReport;

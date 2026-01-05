
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder } from '../types';
import ReportsView from '../components/admin/ReportsView';
import Spinner from '../components/common/Spinner';
import { WEB_APP_URL } from '../constants';
import SalesByTeamPage from './SalesByTeamPage';
import SalesByPageReport from './SalesByPageReport';
import Modal from '../components/common/Modal';
import SearchableProductDropdown from '../components/common/SearchableProductDropdown';

type ReportType = 'overview' | 'performance' | 'profitability' | 'forecasting' | 'shipping' | 'sales_team' | 'sales_page';
type DateRangePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

interface ReportDashboardProps {
    activeReport: ReportType;
    onBack: () => void;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({ activeReport, onBack }) => {
    const { appData } = useContext(AppContext);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<ParsedOrder[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    const [filters, setFilters] = useState({
        datePreset: 'this_month' as DateRangePreset,
        startDate: '',
        endDate: '',
        team: '',
        product: '',
    });

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${WEB_APP_URL}/api/admin/all-orders`);
                const result = await response.json();
                if (result.status === 'success') {
                    const parsed = (result.data || []).filter((o: any) => o !== null).map((o: any) => {
                        let p = []; try { if (o['Products (JSON)']) p = JSON.parse(o['Products (JSON)']); } catch (e) {}
                        return { ...o, Products: p };
                    });
                    setOrders(parsed);
                }
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            // Date Filter
            if (filters.datePreset !== 'all') {
                const d = new Date(o.Timestamp);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                let start: Date | null = null, end: Date | null = new Date();
                
                switch (filters.datePreset) {
                    case 'today': start = today; break;
                    case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = new Date(today); end.setMilliseconds(-1); break;
                    case 'this_week': const day = now.getDay(); start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1)); break;
                    case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
                    case 'last_month': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); break;
                    case 'this_year': start = new Date(now.getFullYear(), 0, 1); break;
                    case 'last_year': start = new Date(now.getFullYear() - 1, 0, 1); end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59); break;
                    case 'custom':
                        if (filters.startDate) start = new Date(filters.startDate + 'T00:00:00');
                        if (filters.endDate) end = new Date(filters.endDate + 'T23:59:59');
                        break;
                }
                if (start && d < start) return false;
                if (end && d > end) return false;
            }

            // Team Filter
            if (filters.team && o.Team !== filters.team) return false;

            // Product Filter
            if (filters.product && !o.Products.some(p => p.name === filters.product)) return false;

            return true;
        });
    }, [orders, filters]);

    const reportTitles: Record<ReportType, string> = {
        overview: 'សង្ខេបប្រតិបត្តិការ',
        sales_team: 'របាយការណ៍ក្រុម',
        sales_page: 'របាយការណ៍ Page',
        performance: 'ការអនុវត្ត (KPI)',
        profitability: 'វិភាគប្រាក់ចំណេញ',
        shipping: 'ចំណាយដឹកជញ្ជូន',
        forecasting: 'ការព្យាករណ៍ AI'
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

    const activeFilterCount = [filters.team, filters.product, filters.datePreset !== 'this_month' ? 'date' : ''].filter(Boolean).length;

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/20 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">{reportTitles[activeReport]}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">
                            {filters.datePreset === 'custom' ? `${filters.startDate} - ${filters.endDate}` : `ទិន្នន័យ៖ ${filters.datePreset.replace('_', ' ')}`}
                            {filters.team && ` • ក្រុម: ${filters.team}`}
                            {filters.product && ` • ផលិតផល: ${filters.product}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => setIsFilterOpen(true)} 
                        className="relative flex-1 sm:flex-none btn btn-secondary !py-2.5 !px-6 rounded-2xl border border-gray-700 flex items-center justify-center gap-3 transition-all hover:bg-gray-700 active:scale-95"
                    >
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        កំណត់តម្រង
                        {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-gray-900">{activeFilterCount}</span>}
                    </button>
                </div>
            </div>

            {/* Dynamic Report Content Area */}
            <div className="min-h-[500px]">
                {activeReport === 'overview' && <ReportsView orders={filteredOrders} reportType="overview" allOrders={orders} />}
                {activeReport === 'sales_team' && <SalesByTeamPage orders={filteredOrders} onBack={onBack} />}
                {activeReport === 'sales_page' && <SalesByPageReport orders={filteredOrders} onBack={onBack} />}
                {activeReport === 'shipping' && <ReportsView orders={filteredOrders} reportType="shipping" allOrders={orders} />}
                {activeReport === 'profitability' && <ReportsView orders={filteredOrders} reportType="profitability" allOrders={orders} />}
                {activeReport === 'performance' && <ReportsView orders={filteredOrders} reportType="performance" allOrders={orders} />}
                {activeReport === 'forecasting' && <ReportsView orders={orders} reportType="forecasting" allOrders={orders} />}
            </div>

            {/* Global Filter Modal */}
            <Modal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} maxWidth="max-w-md">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">កំណត់តម្រងទិន្នន័យ</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Date Preset */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1">កាលបរិច្ឆេទ</label>
                            <select value={filters.datePreset} onChange={e => setFilters({...filters, datePreset: e.target.value as DateRangePreset})} className="form-select bg-gray-900 border-gray-700 !py-3 rounded-xl focus:ring-blue-500/20">
                                <option value="all">ទាំងអស់ (All Time)</option>
                                <option value="today">ថ្ងៃនេះ</option>
                                <option value="yesterday">ម្សិលមិញ</option>
                                <option value="this_week">សប្តាហ៍នេះ</option>
                                <option value="this_month">ខែនេះ</option>
                                <option value="last_month">ខែមុន</option>
                                <option value="this_year">ឆ្នាំនេះ</option>
                                <option value="last_year">ឆ្នាំមុន (Last Year)</option>
                                <option value="custom">ជ្រើសរើសដោយខ្លួនឯង (Custom)</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {filters.datePreset === 'custom' && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-in-down">
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1 ml-1">ចាប់ពី</label>
                                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="form-input bg-gray-900 border-gray-700 !py-2 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1 ml-1">ដល់</label>
                                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="form-input bg-gray-900 border-gray-700 !py-2 rounded-lg" />
                                </div>
                            </div>
                        )}

                        {/* Team Filter */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1">ក្រុម (Team)</label>
                            <select value={filters.team} onChange={e => setFilters({...filters, team: e.target.value})} className="form-select bg-gray-900 border-gray-700 !py-3 rounded-xl focus:ring-blue-500/20">
                                <option value="">គ្រប់ក្រុមទាំងអស់</option>
                                {Array.from(new Set(orders.map(o => o.Team))).filter(Boolean).sort().map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* Product Filter */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1">ផលិតផល (Product)</label>
                            <SearchableProductDropdown 
                                products={appData.products || []} 
                                selectedProductName={filters.product} 
                                onSelect={(val) => setFilters({...filters, product: val})}
                                showTagEditor={false}
                            />
                        </div>
                        
                        <div className="pt-4 flex gap-3">
                            <button 
                                onClick={() => setFilters({ datePreset: 'this_month', startDate: '', endDate: '', team: '', product: '' })}
                                className="flex-1 py-4 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Reset
                            </button>
                            <button 
                                onClick={() => setIsFilterOpen(false)} 
                                className="flex-[2] btn btn-primary py-4 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                            >
                                យល់ព្រម
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ReportDashboard;

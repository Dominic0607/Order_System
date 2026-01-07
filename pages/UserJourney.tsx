
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder, FullOrder } from '../types';
import { WEB_APP_URL } from '../constants';
import Spinner from '../components/common/Spinner';
import OrdersList from '../components/orders/OrdersList';
import CreateOrderPage from './CreateOrderPage';
import { useUrlState } from '../hooks/useUrlState';

type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

const UserOrdersView: React.FC<{ team: string }> = ({ team }) => {
    const [orders, setOrders] = useState<ParsedOrder[]>([]);
    const [globalOrders, setGlobalOrders] = useState<ParsedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [dateRange, setDateRange] = useState<DateRangePreset>('this_month');
    const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
    const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

    const userVisibleColumns = useMemo(() => new Set([
        'index', 'orderId', 'customerName', 'productInfo', 'location', 'pageInfo', 'total', 'shippingService', 'status', 'date', 'print'
    ]), []);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(`${WEB_APP_URL}/api/admin/all-orders`);
                const result = await response.json();
                if (result.status === 'success') {
                    const allRaw: FullOrder[] = Array.isArray(result.data) ? result.data.filter((o: any) => o !== null) : [];
                    const allParsed = allRaw.map(o => {
                        let products = [];
                        try { if (o['Products (JSON)']) products = JSON.parse(o['Products (JSON)']); } catch(e) {}
                        return { ...o, Products: products };
                    });
                    
                    setGlobalOrders(allParsed);
                    const teamOnly = allParsed.filter(o => (o.Team || '').trim() === (team || '').trim());
                    setOrders(teamOnly.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()));
                }
            } catch (err: any) { setError(err.message); } finally { setLoading(false); }
        };
        fetchOrders();
    }, [team]);
    
    const getDateBounds = (preset: DateRangePreset) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start: Date | null = null;
        let end: Date | null = new Date();

        switch (preset) {
            case 'today': start = today; break;
            case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = new Date(today); end.setMilliseconds(-1); break;
            case 'this_week': const d = now.getDay(); start = new Date(today); start.setDate(today.getDate() - (d === 0 ? 6 : d - 1)); break;
            case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'custom': 
                start = new Date(customStart + 'T00:00:00');
                end = new Date(customEnd + 'T23:59:59');
                break;
        }
        return { start, end };
    };

    const filteredOrders = useMemo(() => {
        const { start, end } = getDateBounds(dateRange);
        return orders.filter(o => {
            const orderDate = new Date(o.Timestamp);
            if (start && orderDate < start) return false;
            if (end && orderDate > end) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = o['Order ID'].toLowerCase().includes(q) || 
                              (o['Customer Name'] || '').toLowerCase().includes(q) || 
                              (o['Customer Phone'] || '').includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [orders, searchQuery, dateRange, customStart, customEnd]);

    const totalFilteredRevenue = useMemo(() => {
        return filteredOrders.reduce((sum, o) => sum + (Number(o['Grand Total']) || 0), 0);
    }, [filteredOrders]);

    const topTeams = useMemo(() => {
        const { start, end } = getDateBounds(dateRange);
        
        const periodOrders = globalOrders.filter(o => {
            const orderDate = new Date(o.Timestamp);
            if (start && orderDate < start) return false;
            if (end && orderDate > end) return false;
            return true;
        });

        const teamStats: Record<string, number> = {};
        periodOrders.forEach(o => {
            const tName = (o.Team || 'Unassigned').trim();
            teamStats[tName] = (teamStats[tName] || 0) + (Number(o['Grand Total']) || 0);
        });

        return Object.entries(teamStats)
            .map(([name, revenue]) => ({ name, revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);
    }, [globalOrders, dateRange, customStart, customEnd]);

    const periodLabel = useMemo(() => {
        switch (dateRange) {
            case 'today': return 'ថ្ងៃនេះ';
            case 'yesterday': return 'ម្សិលមិញ';
            case 'this_week': return 'សប្តាហ៍នេះ';
            case 'this_month': return 'ខែនេះ';
            case 'custom': return `${customStart} ដល់ ${customEnd}`;
            default: return '';
        }
    }, [dateRange, customStart, customEnd]);

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg"/></div>;

    return (
        <div className="space-y-6 flex flex-col min-h-[2000px]">
            <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-1.5 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.3)]"></div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    ចំណាត់ថ្នាក់លក់បានច្រើនជាងគេ ({dateRange === 'custom' ? 'តាមកាលបរិច្ឆេទកំណត់' : periodLabel})
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topTeams.length > 0 ? topTeams.map((t, i) => (
                    <div key={t.name} className="relative overflow-hidden bg-gray-800/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 transition-all duration-500 hover:bg-gray-800/60 shadow-xl">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg ${
                            i === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 
                            i === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/50' : 
                            'bg-orange-600/20 text-orange-500 border border-orange-600/50'
                        }`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TOP {i+1} TEAM</p>
                            <h4 className="text-sm font-black text-white truncate">{t.name}</h4>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-400 font-black">${t.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-4 text-center bg-gray-800/20 rounded-2xl border border-dashed border-gray-700">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">មិនទាន់មានទិន្នន័យលក់</p>
                    </div>
                )}
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-700 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <input type="text" placeholder="ស្វែងរក ID, ឈ្មោះ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input !pl-10 w-full !py-2 bg-gray-900/60" />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-500/20 hidden sm:block">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">សរុបលក់បាន ({dateRange === 'custom' ? 'កំណត់' : periodLabel})</p>
                            <p className="text-lg font-black text-white leading-none">${totalFilteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-lg border border-gray-700">
                            {(['today', 'this_week', 'this_month', 'custom'] as const).map(p => (
                                <button key={p} onClick={() => setDateRange(p)} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${dateRange === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                                    {p === 'today' ? 'ថ្ងៃនេះ' : p === 'this_week' ? 'សប្តាហ៍នេះ' : p === 'this_month' ? 'ខែនេះ' : 'កំណត់'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {dateRange === 'custom' && (
                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-800 animate-fade-in-down">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ចាប់ពី</span>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="form-input !py-1.5 !px-3 bg-gray-800 border-gray-700 text-xs rounded-xl" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ដល់</span>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="form-input !py-1.5 !px-3 bg-gray-800 border-gray-700 text-xs rounded-xl" />
                        </div>
                    </div>
                )}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-700/50">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">មិនមានទិន្នន័យត្រូវបានរកឃើញ</p>
                </div>
            ) : (
                <div className="space-y-4 flex-grow">
                    <OrdersList orders={filteredOrders} showActions={false} visibleColumns={userVisibleColumns} />
                    
                    <div className="md:hidden bg-blue-600 p-5 rounded-[2rem] shadow-2xl flex justify-between items-center border border-white/10">
                        <span className="text-white font-black uppercase text-xs tracking-widest">សរុបលក់បាន ({filteredOrders.length})</span>
                        <span className="text-white font-black text-xl">${totalFilteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            )}

            {/* Bottom Spacer សម្រាប់ការពារ Tooltip និងរក្សាកម្ពស់ */}
            <div className="h-64 md:h-[600px] pointer-events-none opacity-0 shrink-0"></div>
        </div>
    );
};

const UserJourney: React.FC<{ onBackToRoleSelect: () => void }> = ({ onBackToRoleSelect }) => {
    const { currentUser, setChatVisibility } = useContext(AppContext);
    const [view, setView] = useState<'list' | 'create'>('list');
    const [selectedTeam, setSelectedTeam] = useUrlState<string>('team', '');
    const userTeams = useMemo(() => (currentUser?.Team || '').split(',').map(t => t.trim()).filter(Boolean), [currentUser]);

    useEffect(() => { setChatVisibility(view !== 'create'); }, [view]);
    useEffect(() => { if (userTeams.length === 1 && !selectedTeam) setSelectedTeam(userTeams[0]); }, [userTeams, selectedTeam]);

    if (userTeams.length === 0) return <div className="page-card text-center p-12 mt-20 max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-white mb-2">សួស្តី, {currentUser?.FullName}</h2><p className="text-gray-400">មិនមានទិន្នន័យក្រុម</p><button onClick={onBackToRoleSelect} className="btn btn-secondary mt-6">ត្រឡប់</button></div>;

    if (!selectedTeam) {
        return (
             <div className="w-full max-w-5xl mx-auto p-4 mt-10 md:mt-20 animate-fade-in text-center">
                <h2 className="text-3xl font-bold text-white mb-8">សូមជ្រើសរើសក្រុមដើម្បីបន្ត</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {userTeams.map(team => (
                        <button key={team} onClick={() => setSelectedTeam(team)} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-blue-500 transition-all group shadow-xl">
                            <span className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{team}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'create') return <CreateOrderPage team={selectedTeam} onSaveSuccess={() => setView('list')} onCancel={() => setView('list')} />;

    return (
        <div className="w-full max-w-[115rem] mx-auto p-2 sm:p-4 animate-fade-in overflow-x-hidden min-h-[2000px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        ការកម្មង់របស់ខ្ញុំ 
                        <span className="text-[10px] bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-[0.2em]">{selectedTeam}</span>
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-3">
                         {userTeams.length > 1 && (
                            <button 
                                onClick={() => setSelectedTeam('')} 
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded-xl text-[11px] font-black uppercase transition-all border border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                ប្តូរក្រុម
                            </button>
                         )}
                         {currentUser?.IsSystemAdmin && (
                            <button 
                                onClick={onBackToRoleSelect} 
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-yellow-600 text-gray-300 hover:text-white rounded-xl text-[11px] font-black uppercase transition-all border border-gray-700 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-600/20 active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
                                ជ្រើសរើសតួនាទី
                            </button>
                         )}
                    </div>
                </div>
                <button onClick={() => setView('create')} className="btn btn-primary w-full md:w-auto px-10 shadow-xl shadow-blue-600/20 h-14 text-base font-black active:scale-95 transition-all rounded-2xl uppercase tracking-widest">បង្កើតការកម្មង់ថ្មី</button>
            </div>
            
            <div className="bg-gray-800/20 border border-gray-700/50 rounded-[2.5rem] p-2 sm:p-6 shadow-2xl overflow-visible min-h-[2000px]">
                <UserOrdersView team={selectedTeam} />
            </div>
        </div>
    );
};

export default UserJourney;

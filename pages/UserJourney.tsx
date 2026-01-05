
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { ParsedOrder, FullOrder } from '../types';
import { WEB_APP_URL } from '../constants';
import Spinner from '../components/common/Spinner';
import OrdersList from '../components/orders/OrdersList';
import CreateOrderPage from './CreateOrderPage';
import { useUrlState } from '../hooks/useUrlState';
import DateRangeFilter, { DateRangePreset } from '../components/common/DateRangeFilter';
import TeamLeaderboard from '../components/performance/TeamLeaderboard';

const UserOrdersView: React.FC<{ team: string }> = ({ team }) => {
    const [orders, setOrders] = useState<ParsedOrder[]>([]);
    const [globalOrders, setGlobalOrders] = useState<ParsedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // កំណត់ Default ជា "ថ្ងៃនេះ"
    const [dateRange, setDateRange] = useState<DateRangePreset>('today');
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
                    const teamOnly = allParsed.filter(o => o.Team === team);
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
            case 'this_week': const d = now.getDay(); start = new Date(today); start.setDate(today.getDate() - (d === 0 ? 6 : d - 1)); break;
            case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'custom': 
                start = new Date(customStart + 'T00:00:00');
                end = new Date(customEnd + 'T23:59:59');
                break;
        }
        return { start, end };
    };

    const { start, end } = useMemo(() => getDateBounds(dateRange), [dateRange, customStart, customEnd]);

    const filteredOrders = useMemo(() => {
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
    }, [orders, searchQuery, start, end]);

    const totalFilteredRevenue = useMemo(() => {
        return filteredOrders.reduce((sum, o) => sum + (Number(o['Grand Total']) || 0), 0);
    }, [filteredOrders]);

    const periodLabel = useMemo(() => {
        switch (dateRange) {
            case 'today': return 'ថ្ងៃនេះ';
            case 'this_week': return 'សប្តាហ៍នេះ';
            case 'this_month': return 'ខែនេះ';
            case 'custom': return `${customStart} ដល់ ${customEnd}`;
            default: return '';
        }
    }, [dateRange, customStart, customEnd]);

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg"/></div>;

    return (
        <div className="space-y-10">
            {/* Top 3 Leaderboard Component */}
            <TeamLeaderboard 
                globalOrders={globalOrders} 
                startDate={start} 
                endDate={end} 
                periodLabel={dateRange === 'custom' ? 'តាមការកំណត់' : periodLabel} 
            />

            {/* Filter & Search Section */}
            <div className="bg-gray-800/20 backdrop-blur-md border border-white/5 p-6 rounded-[2.5rem] shadow-xl space-y-6">
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                    <div className="relative w-full lg:max-w-md">
                        <input type="text" placeholder="ស្វែងរក ID, ឈ្មោះ, ទូរស័ព្ទ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input !pl-12 w-full !py-3 bg-gray-900/60 rounded-2xl border-gray-700" />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
                        <div className="bg-blue-600/10 px-6 py-2.5 rounded-2xl border border-blue-500/20 flex flex-col items-end">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5">សរុបលក់បាន ({periodLabel})</p>
                            <p className="text-2xl font-black text-white leading-none">${totalFilteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>

                        {/* Date Range Filter Component */}
                        <DateRangeFilter 
                            dateRange={dateRange} 
                            onRangeChange={setDateRange} 
                            customStart={customStart} 
                            onCustomStartChange={setCustomStart} 
                            customEnd={customEnd} 
                            onCustomEndChange={setCustomEnd} 
                        />
                    </div>
                </div>
            </div>

            {/* Orders List Section */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/10 rounded-[3rem] border-2 border-dashed border-gray-700/50">
                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                         <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-sm">មិនមានទិន្នន័យត្រូវបានរកឃើញសម្រាប់ {periodLabel} ទេ</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-5 w-1 bg-blue-500 rounded-full"></div>
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">បញ្ជីប្រតិបត្តិការណ៍ ({filteredOrders.length})</h4>
                    </div>
                    <OrdersList orders={filteredOrders} showActions={false} visibleColumns={userVisibleColumns} />
                </div>
            )}
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

    if (userTeams.length === 0) return <div className="page-card text-center p-12 mt-20 max-w-2xl mx-auto animate-fade-in"><h2 className="text-2xl font-black text-white mb-2">សួស្តី, {currentUser?.FullName}</h2><p className="text-gray-400 font-bold">មិនមានទិន្នន័យក្រុមនៅក្នុងគណនីរបស់អ្នកទេ</p><button onClick={onBackToRoleSelect} className="btn btn-secondary mt-8 px-10 rounded-2xl">ត្រឡប់ក្រោយ</button></div>;

    if (!selectedTeam) {
        return (
             <div className="w-full max-w-5xl mx-auto p-4 mt-10 md:mt-20 animate-fade-in text-center">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">សូមជ្រើសរើសក្រុម</h2>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-12">ជ្រើសរើសក្រុមដែលអ្នកកំពុងបំពេញការងារ</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {userTeams.map(team => (
                        <button key={team} onClick={() => setSelectedTeam(team)} className="bg-gray-800/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 hover:border-blue-500 hover:bg-gray-800/50 transition-all group shadow-2xl active:scale-95">
                            <span className="text-xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{team}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'create') return <CreateOrderPage team={selectedTeam} onSaveSuccess={() => setView('list')} onCancel={() => setView('list')} />;

    return (
        <div className="w-full max-w-[95rem] mx-auto p-2 sm:p-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                        ការកម្មង់របស់ខ្ញុំ 
                        <span className="text-[10px] bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-[0.2em]">{selectedTeam}</span>
                    </h1>
                    <div className="mt-6 flex flex-wrap gap-3">
                         {userTeams.length > 1 && (
                            <button 
                                onClick={() => setSelectedTeam('')} 
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded-2xl text-[11px] font-black uppercase transition-all border border-gray-700 hover:border-blue-500 shadow-xl active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                ប្តូរក្រុម
                            </button>
                         )}
                         {currentUser?.IsSystemAdmin && (
                            <button 
                                onClick={onBackToRoleSelect} 
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-yellow-600 text-gray-300 hover:text-white rounded-2xl text-[11px] font-black uppercase transition-all border border-gray-700 hover:border-yellow-500 shadow-xl active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
                                ត្រឡប់ទៅជ្រើសរើសតួនាទី
                            </button>
                         )}
                    </div>
                </div>
                
                {/* ប៊ូតុង បង្កើតការកម្មង់ថ្មី ដែលបានកែសម្រួលម៉ូតថ្មី */}
                <button 
                    onClick={() => setView('create')} 
                    className="relative group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.6)] transition-all duration-300 active:scale-95 overflow-hidden w-full md:w-auto"
                >
                    {/* Light Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                    
                    <svg className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm font-black uppercase tracking-[0.15em] relative z-10">បង្កើតការកម្មង់ថ្មី</span>
                </button>
            </div>
            <UserOrdersView team={selectedTeam} />
        </div>
    );
};

export default UserJourney;

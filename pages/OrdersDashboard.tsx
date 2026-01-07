
import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import { FullOrder, ParsedOrder, ShippingMethod, Driver, BankAccount, User, MasterProduct } from '../types';
import EditOrderPage from './EditOrderPage';
import OrdersList from '../components/orders/OrdersList';
import { WEB_APP_URL } from '../constants';
import Modal from '../components/common/Modal';
import SearchableProductDropdown from '../components/common/SearchableProductDropdown';
import { useUrlState } from '../hooks/useUrlState';
import PdfExportModal from '../components/admin/PdfExportModal';

interface OrdersDashboardProps {
    onBack: () => void;
}

type DateRangePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

const datePresets: { label: string, value: DateRangePreset }[] = [
    { label: 'ទាំងអស់ (All Time)', value: 'all' },
    { label: 'ថ្ងៃនេះ (Today)', value: 'today' },
    { label: 'ម្សិលមិញ (Yesterday)', value: 'yesterday' },
    { label: 'សប្តាហ៍នេះ (This Week)', value: 'this_week' },
    { label: 'សប្តាហ៍មុន (Last Week)', value: 'last_week' },
    { label: 'ខែនេះ (This Month)', value: 'this_month' },
    { label: 'ខែមុន (Last Month)', value: 'last_month' },
    { label: 'ឆ្នាំនេះ (This Year)', value: 'this_year' },
    { label: 'ឆ្នាំមុន (Last Year)', value: 'last_year' },
    { label: 'កំណត់ខ្លួនឯង (Custom)', value: 'custom' },
];

const availableColumns = [
    { key: 'index', label: '#' },
    { key: 'orderId', label: 'ID' },
    { key: 'customerName', label: 'ឈ្មោះអតិថិជន' },
    { key: 'productInfo', label: 'ព័ត៌មាន Product' }, 
    { key: 'location', label: 'ទីតាំង' },
    { key: 'pageInfo', label: 'Page' }, 
    { key: 'total', label: 'សរុប' },
    { key: 'shippingService', label: 'សេវាដឹក' },
    { key: 'shippingCost', label: '(Cost) សេវាដឹក' },
    { key: 'status', label: 'ស្ថានភាព' },
    { key: 'date', label: 'កាលបរិច្ឆេទ' },
    { key: 'print', label: 'ព្រីន' },
    { key: 'actions', label: 'សកម្មភាព' },
    { key: 'check', label: 'Check' },
];

const ColumnToggler = ({ columns, visibleColumns, onToggle }: { columns: typeof availableColumns, visibleColumns: Set<string>, onToggle: (key: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="relative inline-block text-left" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="btn btn-secondary !py-2 !px-4 text-sm flex items-center bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all rounded-lg shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v12a1 1 0 002 0V4zM9 4a1 1 0 00-2 0v12a1 1 0 002 0V4zM13 4a1 1 0 00-2 0v12a1 1 0 002 0V4zM17 4a1 1 0 00-2 0v12a1 1 0 002 0V4z" /></svg>
                Column
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[100] origin-top-right overflow-hidden border border-white/5 backdrop-blur-xl">
                    <div className="p-2 space-y-1">
                        {columns.map(col => (
                            <label key={col.key} className="flex items-center px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500" checked={visibleColumns.has(col.key)} onChange={() => onToggle(col.key)} />
                                <span className="ml-3 font-medium">{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const FilterPanel = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children?: React.ReactNode }) => {
    return (
        <>
            <div className={`filter-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
            <div className={`filter-panel ${isOpen ? 'open' : ''}`}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#1a1f2e]">
                    <h2 className="text-xl font-bold text-white">Filter Orders</h2>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow bg-[#1a1f2e]">{children}</div>
                <div className="p-6 border-t border-gray-700 bg-[#1a1f2e]">
                    <button onClick={onClose} className="btn btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-blue-600/20">Apply Filters</button>
                </div>
            </div>
        </>
    );
};

const OrdersDashboard: React.FC<OrdersDashboardProps> = ({ onBack }) => {
    const { appData, refreshData, refreshTimestamp, currentUser } = useContext(AppContext);
    const [editingOrderId, setEditingOrderId] = useUrlState<string>('editOrder', '');
    
    const [urlTeam, setUrlTeam] = useUrlState<string>('teamFilter', '');
    const [urlDate, setUrlDate] = useUrlState<string>('dateFilter', 'this_month');

    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(
        availableColumns.filter(c => c.key !== 'productInfo').map(c => c.key)
    ));

    const [allOrders, setAllOrders] = useState<ParsedOrder[]>([]);
    const [usersList, setUsersList] = useState<User[]>([]); 
    const [loading, setLoading] = useState(true);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Bulk Selection States ---
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    
    // Bulk Modals Visibility
    const [isBulkCostModalOpen, setIsBulkCostModalOpen] = useState(false);
    const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
    const [isBulkShippingModalOpen, setIsBulkShippingModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Bulk Input Values
    const [bulkCostValue, setBulkCostValue] = useState<string>('');
    const [bulkPaymentStatus, setBulkPaymentStatus] = useState<string>('Paid');
    const [bulkPaymentInfo, setBulkPaymentInfo] = useState<string>('');
    const [bulkShippingMethod, setBulkShippingMethod] = useState<string>('');
    const [bulkDeletePassword, setBulkDeletePassword] = useState<string>('');

    const [filters, setFilters] = useState(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return {
            datePreset: (searchParams.get('dateFilter') as DateRangePreset) || 'this_month',
            startDate: '',
            endDate: '',
            team: searchParams.get('teamFilter') || '',
            user: '',
            paymentStatus: '',
            shippingService: '',
            driver: '',
            product: '',
            bank: '',
        };
    });

    useEffect(() => {
        if (urlTeam !== filters.team || urlDate !== filters.datePreset) {
            setFilters(prev => ({
                ...prev,
                team: urlTeam || prev.team,
                datePreset: (urlDate as DateRangePreset) || prev.datePreset
            }));
        }
    }, [urlTeam, urlDate]);

    useEffect(() => {
        if (filters.team !== urlTeam) setUrlTeam(filters.team);
        if (filters.datePreset !== urlDate) setUrlDate(filters.datePreset);
    }, [filters.team, filters.datePreset]);

    const calculatedRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start: Date | null = null;
        let end: Date | null = new Date();
        switch (filters.datePreset) {
            case 'today': start = today; break;
            case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = new Date(today); end.setMilliseconds(-1); break;
            case 'this_week': const day = now.getDay(); start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1)); break;
            case 'last_week': start = new Date(today); start.setDate(today.getDate() - now.getDay() - 6); end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59); break;
            case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'last_month': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); break;
            case 'this_year': start = new Date(now.getFullYear(), 0, 1); break;
            case 'all': return 'All time data';
            case 'custom': return `${filters.startDate || '...'} to ${filters.endDate || '...'}`;
        }
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        return start ? `${formatDate(start)} to ${formatDate(end)}` : 'All time data';
    }, [filters.datePreset, filters.startDate, filters.endDate]);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(key)) { if (next.size > 1) next.delete(key); } else { next.add(key); }
            return next;
        });
    };

    const fetchAllOrders = async () => {
        setLoading(true);
        try {
            const [ordersRes, usersRes] = await Promise.all([
                fetch(`${WEB_APP_URL}/api/admin/all-orders`),
                fetch(`${WEB_APP_URL}/api/users`)
            ]);
            const ordersData = await ordersRes.json();
            const usersData = await usersRes.json();
            if (ordersData.status === 'success') {
                const parsed = (ordersData.data || [])
                    .filter((o: any) => o !== null && o['Order ID'] !== 'Opening Balance')
                    .map((o: any) => {
                        let products = [];
                        try { if (o['Products (JSON)']) products = JSON.parse(o['Products (JSON)']); } catch (e) {}
                        const rawVerified: any = o.IsVerified;
                        const isVerified = rawVerified === true || String(rawVerified).toUpperCase() === 'TRUE' || rawVerified === 1 || rawVerified === "1";
                        return { ...o, Products: products, IsVerified: isVerified };
                    });
                setAllOrders(parsed.sort((a: any, b: any) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()));
            }
            if (usersData.status === 'success') setUsersList(usersData.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchAllOrders(); }, [refreshTimestamp]);

    const enrichedOrders = useMemo(() => {
        return allOrders.map(order => {
            let team = order.Team;
            if (!team && order.User) {
                const u = usersList.find(u => u.UserName === order.User);
                if (u?.Team) team = u.Team.split(',')[0].trim();
            }
            return { ...order, Team: team || 'Unassigned' };
        });
    }, [allOrders, usersList]);

    const filteredOrders = useMemo(() => {
        return enrichedOrders.filter(order => {
            if (filters.datePreset !== 'all') {
                const orderDate = new Date(order.Timestamp);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                let start: Date | null = null;
                let end: Date | null = new Date();
                switch (filters.datePreset) {
                    case 'today': start = today; break;
                    case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = new Date(today); end.setMilliseconds(-1); break;
                    case 'this_week': const day = now.getDay(); start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1)); break;
                    case 'last_week': start = new Date(today); start.setDate(today.getDate() - now.getDay() - 6); end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59); break;
                    case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
                    case 'last_month': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); break;
                    case 'this_year': start = new Date(now.getFullYear(), 0, 1); break;
                    case 'custom':
                        if (filters.startDate) start = new Date(filters.startDate + 'T00:00:00');
                        if (filters.endDate) end = new Date(filters.endDate + 'T23:59:59');
                        break;
                }
                if (start && orderDate < start) return false;
                if (end && orderDate > end) return false;
            }
            if (filters.team && order.Team !== filters.team) return false;
            if (filters.user && (order.User || '').trim().toLowerCase() !== filters.user.trim().toLowerCase()) return false;
            if (filters.paymentStatus && order['Payment Status'] !== filters.paymentStatus) return false;
            if (filters.shippingService && order['Internal Shipping Method'] !== filters.shippingService) return false;
            if (filters.driver && order['Internal Shipping Details'] !== filters.driver) return false;
            if (filters.bank && order['Payment Info'] !== filters.bank) return false;
            if (filters.product && !order.Products.some(p => p.name === filters.product)) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = order['Order ID'].toLowerCase().includes(q) ||
                              (order['Customer Name'] || '').toLowerCase().includes(q) ||
                              (order['Customer Phone'] || '').includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [enrichedOrders, filters, searchQuery]);

    // --- Selection Handlers ---
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (ids: string[]) => {
        const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                ids.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds(prev => new Set([...prev, ...ids]));
        }
    };

    const handleBulkUpdate = async (updateData: any) => {
        if (selectedIds.size === 0) return;
        setIsBulkProcessing(true);
        try {
            const promises = Array.from(selectedIds).map(id => 
                fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        sheetName: 'AllOrders', 
                        primaryKey: { 'Order ID': id }, 
                        newData: updateData 
                    })
                })
            );
            await Promise.all(promises);
            await refreshData();
            setSelectedIds(new Set());
            fetchAllOrders();
            setIsBulkCostModalOpen(false);
            setIsBulkPaymentModalOpen(false);
            setIsBulkShippingModalOpen(false);
        } catch (e) {
            alert("Bulk update failed.");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        
        const activeUser = appData.users?.find(u => u.UserName === currentUser?.UserName);
        if (bulkDeletePassword !== activeUser?.Password) {
            alert("លេខសម្ងាត់មិនត្រឹមត្រូវ!");
            return;
        }

        setIsBulkProcessing(true);
        try {
            const promises = Array.from(selectedIds).map(id => {
                const order = allOrders.find(o => o['Order ID'] === id);
                return fetch(`${WEB_APP_URL}/api/admin/delete-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: id,
                        team: order?.Team,
                        userName: currentUser?.UserName,
                        telegramMessageIds: [order?.['Telegram Message ID 1'], order?.['Telegram Message ID 2']].filter(Boolean)
                    })
                });
            });
            await Promise.all(promises);
            await refreshData();
            setSelectedIds(new Set());
            fetchAllOrders();
            setIsBulkDeleteModalOpen(false);
            setBulkDeletePassword('');
        } catch (e) {
            alert("Bulk delete failed.");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const FiltersComponent = () => (
        <div className="space-y-6">
            <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">Date Range</label>
                <select value={filters.datePreset} onChange={e => setFilters({...filters, datePreset: e.target.value as any})} className="form-select !bg-[#2b3548] border-none !py-3">
                    {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <div className="mt-2 bg-[#121620] p-3 rounded-lg text-center text-sm font-mono text-gray-500 border border-gray-800/50">
                    {calculatedRange}
                </div>
            </div>
            {filters.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <div><label className="text-xs text-gray-500 mb-1 block">From</label><input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="form-input !bg-[#2b3548] border-none" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">To</label><input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="form-input !bg-[#2b3548] border-none" /></div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">Team</label>
                    <select value={filters.team} onChange={e => setFilters({...filters, team: e.target.value})} className="form-select !bg-[#2b3548] border-none !py-3">
                        <option value="">All Teams</option>
                        {Array.from(new Set(enrichedOrders.map(o => o.Team))).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">User (អ្នកលក់)</label>
                    <select value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})} className="form-select !bg-[#2b3548] border-none !py-3">
                        <option value="">All Users</option>
                        {usersList.map(u => <option key={u.UserName} value={u.UserName}>{u.FullName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">Payment Status</label>
                    <select value={filters.paymentStatus} onChange={e => setFilters({...filters, paymentStatus: e.target.value})} className="form-select !bg-[#2b3548] border-none !py-3">
                        <option value="">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">Product</label>
                    <SearchableProductDropdown products={appData.products} selectedProductName={filters.product} onSelect={val => setFilters({...filters, product: val})} showTagEditor={false} />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">Shipping Service</label>
                    <select value={filters.shippingService} onChange={e => setFilters({...filters, shippingService: e.target.value})} className="form-select !bg-[#2b3548] border-none !py-3">
                        <option value="">All Services</option>
                        {appData.shippingMethods?.map(s => <option key={s.MethodName} value={s.MethodName}>{s.MethodName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">Driver</label>
                    <select value={filters.driver} onChange={e => setFilters({...filters, driver: e.target.value})} className="form-select !bg-[#2b3548] border-none !py-3">
                        <option value="">All Drivers</option>
                        {appData.drivers?.map(d => <option key={d.DriverName} value={d.DriverName}>{d.DriverName}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block uppercase tracking-wide">Bank Account</label>
                <select value={filters.bank} onChange={e => setFilters({...filters, bank: e.target.value})} className="form-select !bg-[#2b3548] border-none !py-3">
                    <option value="">All Bank Accounts</option>
                    {appData.bankAccounts?.map(b => <option key={b.BankName} value={b.BankName}>{b.BankName}</option>)}
                </select>
            </div>
        </div>
    );

    if (loading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
    if (editingOrderId) {
        const order = enrichedOrders.find(o => o['Order ID'] === editingOrderId);
        return order ? <EditOrderPage order={order} onSaveSuccess={() => { setEditingOrderId(''); fetchAllOrders(); refreshData(); }} onCancel={() => setEditingOrderId('')} /> : null;
    }

    return (
        <div className="w-full px-2 sm:px-6 lg:px-10 animate-fade-in relative pb-32">
            <div className="md:hidden"><FilterPanel isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)}><FiltersComponent /></FilterPanel></div>
            <div className="hidden md:block">
                <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} maxWidth="max-w-4xl">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#1a1f2e]"><h2 className="text-2xl font-bold text-white tracking-tight">Filter Orders</h2><button onClick={() => setIsFilterModalOpen(false)} className="text-3xl text-gray-500 hover:text-white">&times;</button></div>
                    <div className="p-8 bg-[#1a1f2e] max-h-[70vh] overflow-y-auto"><FiltersComponent /></div>
                    <div className="p-8 border-t border-gray-700 bg-[#1a1f2e] flex justify-center"><button onClick={() => setIsFilterModalOpen(false)} className="btn btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-transform">Apply Filters</button></div>
                </Modal>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">គ្រប់គ្រងប្រតិបត្តិការណ៍</h1>
                <button onClick={onBack} className="group flex items-center gap-2 px-6 py-2 bg-gray-800 border border-gray-700 hover:border-blue-500 text-gray-400 hover:text-blue-400 font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </button>
            </div>

            <div className="page-card !p-3 mb-6 bg-gray-800/40 border-gray-700/50 relative z-20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:max-w-md">
                        <input type="text" placeholder="ស្វែងរក ID, ឈ្មោះ, ទូរស័ព្ទ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input !pl-10 !py-2 bg-gray-900/50" />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => setIsFilterModalOpen(true)} className="btn btn-secondary flex-1 md:flex-none !py-2 bg-gray-700 hover:bg-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>Filters</button>
                        <button onClick={() => setIsPdfModalOpen(true)} className="btn !bg-red-600/80 text-white flex-1 md:flex-none !py-2">Export PDF</button>
                        <div className="hidden md:block"><ColumnToggler columns={availableColumns} visibleColumns={visibleColumns} onToggle={toggleColumn} /></div>
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <OrdersList 
                    orders={filteredOrders} 
                    onEdit={o => setEditingOrderId(o['Order ID'])} 
                    showActions={true} 
                    visibleColumns={visibleColumns} 
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelection}
                    onToggleSelectAll={toggleSelectAll}
                />
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 backdrop-blur-xl border border-blue-500/30 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-center gap-3 animate-fade-in-up min-w-[300px] max-w-[95vw]">
                    <div className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        {isBulkProcessing ? <Spinner size="sm" /> : <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center">{selectedIds.size}</span>}
                        បានជ្រើសរើស
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <button onClick={() => setIsBulkCostModalOpen(true)} className="px-4 py-2 bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-orange-500/20">Edit Cost</button>
                        <button onClick={() => setIsBulkPaymentModalOpen(true)} className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-emerald-500/20">Edit Payment</button>
                        <button onClick={() => setIsBulkShippingModalOpen(true)} className="px-4 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-purple-500/20">Edit Shipping</button>
                        <button onClick={() => setIsBulkDeleteModalOpen(true)} className="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-red-500/20">Delete</button>
                    </div>
                    <button onClick={() => setSelectedIds(new Set())} className="text-gray-500 hover:text-white transition-colors p-2 text-xl">&times;</button>
                </div>
            )}

            {/* Bulk Edit Cost Modal */}
            <Modal isOpen={isBulkCostModalOpen} onClose={() => setIsBulkCostModalOpen(false)} maxWidth="max-w-sm">
                <div className="p-6 bg-[#1a1f2e]">
                    <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">កែប្រែតម្លៃដឹកដើម (Bulk)</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">តម្លៃថ្មី ($)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={bulkCostValue} 
                                onChange={e => setBulkCostValue(e.target.value)}
                                className="form-input bg-gray-900 border-gray-700"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setIsBulkCostModalOpen(false)} className="btn btn-secondary flex-1">បោះបង់</button>
                        <button 
                            onClick={() => handleBulkUpdate({ 'Internal Cost': Number(bulkCostValue) })} 
                            className="btn btn-primary flex-1 shadow-lg shadow-blue-600/20"
                            disabled={isBulkProcessing || bulkCostValue === ''}
                        >
                            {isBulkProcessing ? <Spinner size="sm" /> : 'រក្សាទុក'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Edit Payment Modal */}
            <Modal isOpen={isBulkPaymentModalOpen} onClose={() => setIsBulkPaymentModalOpen(false)} maxWidth="max-w-md">
                <div className="p-6 bg-[#1a1f2e]">
                    <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">កែប្រែព័ត៌មានបង់ប្រាក់ (Bulk)</h3>
                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">ស្ថានភាព</label>
                            <select 
                                value={bulkPaymentStatus} 
                                onChange={e => setBulkPaymentStatus(e.target.value)}
                                className="form-select bg-gray-900 border-gray-700"
                            >
                                <option value="Paid">ទូទាត់រួច (Paid)</option>
                                <option value="Unpaid">មិនទាន់ទូទាត់ (Unpaid)</option>
                            </select>
                        </div>
                        {bulkPaymentStatus === 'Paid' && (
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">ធនាគារ / គណនី</label>
                                <select 
                                    value={bulkPaymentInfo} 
                                    onChange={e => setBulkPaymentInfo(e.target.value)}
                                    className="form-select bg-gray-900 border-gray-700"
                                >
                                    <option value="">-- ជ្រើសរើសធនាគារ --</option>
                                    {appData.bankAccounts?.map((b: any) => (
                                        <option key={b.BankName} value={b.BankName}>{b.BankName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 mt-10">
                        <button onClick={() => setIsBulkPaymentModalOpen(false)} className="btn btn-secondary flex-1">បោះបង់</button>
                        <button 
                            onClick={() => handleBulkUpdate({ 
                                'Payment Status': bulkPaymentStatus, 
                                'Payment Info': bulkPaymentStatus === 'Paid' ? bulkPaymentInfo : '' 
                            })} 
                            className="btn btn-primary flex-1 shadow-lg shadow-blue-600/20"
                            disabled={isBulkProcessing || (bulkPaymentStatus === 'Paid' && !bulkPaymentInfo)}
                        >
                            {isBulkProcessing ? <Spinner size="sm" /> : 'រក្សាទុក'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Edit Shipping Modal */}
            <Modal isOpen={isBulkShippingModalOpen} onClose={() => setIsBulkShippingModalOpen(false)} maxWidth="max-w-sm">
                <div className="p-6 bg-[#1a1f2e]">
                    <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">កែប្រែសេវាដឹក (Bulk)</h3>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">សេវាដឹក</label>
                        <select 
                            value={bulkShippingMethod} 
                            onChange={e => setBulkShippingMethod(e.target.value)}
                            className="form-select bg-gray-900 border-gray-700"
                        >
                            <option value="">-- ជ្រើសរើសសេវាដឹក --</option>
                            {appData.shippingMethods?.map(m => (
                                <option key={m.MethodName} value={m.MethodName}>{m.MethodName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setIsBulkShippingModalOpen(false)} className="btn btn-secondary flex-1">បោះបង់</button>
                        <button 
                            onClick={() => handleBulkUpdate({ 'Internal Shipping Method': bulkShippingMethod })} 
                            className="btn btn-primary flex-1 shadow-lg shadow-blue-600/20"
                            disabled={isBulkProcessing || !bulkShippingMethod}
                        >
                            {isBulkProcessing ? <Spinner size="sm" /> : 'រក្សាទុក'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Delete Verification Modal */}
            <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} maxWidth="max-w-sm">
                <div className="p-6 bg-[#1a1f2e]">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-white">បញ្ជាក់ការលុបជាក្រុម</h3>
                        <p className="text-sm text-gray-500 mt-2">តើអ្នកប្រាកដថាចង់លុបប្រតិបត្តិការណ៍ទាំង <span className="text-red-500 font-black">{selectedIds.size}</span> នេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ។</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block text-center">បញ្ចូលលេខសម្ងាត់ដើម្បីបន្ត</label>
                            <input 
                                type="password" 
                                value={bulkDeletePassword} 
                                onChange={e => setBulkDeletePassword(e.target.value)} 
                                className="form-input bg-black/40 border-gray-700 text-center text-lg tracking-widest focus:ring-red-500/20 focus:border-red-500" 
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setIsBulkDeleteModalOpen(false)} className="btn btn-secondary flex-1" disabled={isBulkProcessing}>បោះបង់</button>
                        <button 
                            onClick={handleBulkDelete} 
                            className="btn !bg-red-600 hover:!bg-red-700 text-white flex-1 font-black shadow-lg shadow-red-600/20" 
                            disabled={isBulkProcessing || !bulkDeletePassword}
                        >
                            {isBulkProcessing ? <Spinner size="sm" /> : 'លុបចេញ'}
                        </button>
                    </div>
                </div>
            </Modal>

            {isPdfModalOpen && <PdfExportModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} orders={filteredOrders} />}
        </div>
    );
};

export default OrdersDashboard;

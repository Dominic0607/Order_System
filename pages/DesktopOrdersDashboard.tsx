
import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import { ParsedOrder, User } from '../types';
import EditOrderPage from './EditOrderPage';
import OrdersList from '../components/orders/OrdersList';
import { WEB_APP_URL } from '../constants';
import Modal from '../components/common/Modal';
import { useUrlState } from '../hooks/useUrlState';
import PdfExportModal from '../components/admin/PdfExportModal';
import BulkActionManager from '../components/admin/BulkActionManager';
import OrderFilters, { FilterState, initialFilterState } from '../components/orders/OrderFilters';
import { useFilterEngine } from '../hooks/useFilterEngine';
import { ColumnToggler, availableColumns } from '../components/orders/ColumnToggler';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import { translations } from '../translations';

interface DesktopOrdersDashboardProps {
    onBack: () => void;
    initialFilters?: Partial<FilterState>;
}

const DesktopOrdersDashboard: React.FC<DesktopOrdersDashboardProps> = ({ onBack, initialFilters }) => {
    const {
        appData, refreshData, fetchOrders, refreshTimestamp, currentUser,
        orders, isOrdersLoading, language, isSyncing, advancedSettings, isSidebarCollapsed
    } = useContext(AppContext);

    const uiTheme = advancedSettings?.uiTheme || 'default';
    const isBinance = uiTheme === 'binance';
    const isLightMode = advancedSettings?.themeMode === 'light';
    
    const t = useMemo(() => translations[language || 'km'] || translations['km'], [language]);

    const [editingOrderId, setEditingOrderId] = useUrlState<string>('editOrder', '');
    const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<string>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [groupBy, setGroupBy] = useState<string>('none');
    const optimisticUpdateRef = useRef<((ids: string[], status: string) => void) | null>(null);
    const [viewMode, setViewMode] = useUrlState<'card' | 'list'>('viewMode', 'list');
    
    // Server-side Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [totalCount, setTotalCount] = useState(0);

    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
        const defaults = availableColumns || [];
        return new Set(
            defaults.filter(c => 
                c.key !== 'productInfo' && 
                c.key !== 'print' && 
                c.key !== 'check' && 
                c.key !== 'fulfillment' &&
                c.key !== 'note' &&
                c.key !== 'driver' &&
                c.key !== 'telegramStatus'
            ).map(c => c.key)
        );
    });

    const { uniqueValues, filterOrders } = useFilterEngine(orders, appData);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBorders, setShowBorders] = useState(true);

    // Filter State
    const [filters, setFilters] = useState<FilterState>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return {
            ...initialFilterState,
            datePreset: (initialFilters?.datePreset || searchParams.get('dateFilter') as any) || 'this_month',
            startDate: initialFilters?.startDate || searchParams.get('startDate') || '',
            endDate: initialFilters?.endDate || searchParams.get('endDate') || '',
            team: initialFilters?.team || searchParams.get('teamFilter') || '',
            location: initialFilters?.location || searchParams.get('locationFilter') || '',
            fulfillmentStore: initialFilters?.fulfillmentStore || searchParams.get('storeFilter') || '',
            store: initialFilters?.store || searchParams.get('brandFilter') || '',
            shippingService: initialFilters?.shippingService || searchParams.get('shippingFilter') || '',
            driver: initialFilters?.driver || searchParams.get('driverFilter') || '',
            paymentStatus: initialFilters?.paymentStatus || searchParams.get('paymentFilter') || '',
            user: initialFilters?.user || searchParams.get('userFilter') || '',
            page: initialFilters?.page || searchParams.get('pageFilter') || '',
            internalCost: initialFilters?.internalCost || searchParams.get('costFilter') || '',
            bank: initialFilters?.bank || searchParams.get('bankFilter') || '',
            product: initialFilters?.product || searchParams.get('productFilter') || '',
            customerSearch: initialFilters?.customerSearch || searchParams.get('customerFilter') || '',
            fulfillmentStatus: initialFilters?.fulfillmentStatus || searchParams.get('fulfillmentFilter') || '',
            isVerified: (initialFilters?.isVerified as any) || 'All',
            telegramStatus: initialFilters?.telegramStatus || ''
        };
    });

    // Trigger optimized fetch when filters or pagination change
    useEffect(() => {
        let ignore = false;
        const fetchPaginated = async () => {
            const params: any = {
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
                view: 'compact',
                team: filters.team,
                user: filters.user,
                fulfillmentStore: filters.fulfillmentStore,
                fulfillmentStatus: filters.fulfillmentStatus
            };

            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            if (filters.datePreset !== 'all') {
                params.datePreset = filters.datePreset;
                if (filters.startDate) params.startDate = filters.startDate;
                if (filters.endDate) params.endDate = filters.endDate;
            } else {
                params.datePreset = 'all';
            }

            const result: any = await fetchOrders(false, params);
            if (!ignore && result) {
                setTotalCount(result.total);
            }
        };

        fetchPaginated();
        return () => { ignore = true; };
    }, [filters.datePreset, filters.startDate, filters.endDate, filters.team, filters.user, filters.fulfillmentStore, filters.fulfillmentStatus, currentPage, pageSize, searchQuery, fetchOrders]);

    const getOrderTimestamp = (order: any) => {
        const ts = order.Timestamp;
        if (!ts) return 0;
        const match = ts.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s(\d{1,2}):(\d{2})/);
        if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5])).getTime();
        const d = new Date(ts);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    // Data Processing (Client-side secondary filtering)
    const enrichedOrders = useMemo(() => {
        return orders.map(order => {
            let team = (order.Team || '').trim();
            if (!team) {
                const u = appData.users?.find(u => u.UserName === order.User);
                if (u?.Team) team = u.Team.split(',')[0].trim();
                else {
                    const p = appData.pages?.find(pg => pg.PageName === order.Page);
                    if (p?.Team) team = p.Team;
                }
            }
            return { ...order, Team: team || 'Unassigned' };
        });
    }, [orders, appData.users, appData.pages]);

    const filteredOrders = useMemo(() => {
        const base = filterOrders(enrichedOrders, filters, searchQuery);
        
        return base.sort((a, b) => {
            let vA: any, vB: any;
            switch(sortBy) {
                case 'date': vA = getOrderTimestamp(a); vB = getOrderTimestamp(b); break;
                case 'total': vA = Number(a['Grand Total']) || 0; vB = Number(b['Grand Total']) || 0; break;
                case 'customer': vA = (a['Customer Name'] || '').toLowerCase(); vB = (b['Customer Name'] || '').toLowerCase(); break;
                case 'id': vA = a['Order ID']; vB = b['Order ID']; break;
                default: vA = getOrderTimestamp(a); vB = getOrderTimestamp(b);
            }
            if (vA < vB) return sortOrder === 'asc' ? -1 : 1;
            if (vA > vB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [enrichedOrders, filters, searchQuery, sortBy, sortOrder, filterOrders]);

    const viewingOrder = useMemo(() => {
        if (!viewingOrderId) return null;
        return enrichedOrders.find(o => o['Order ID'] === viewingOrderId) || null;
    }, [viewingOrderId, enrichedOrders]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(key)) { if (next.size > 1) next.delete(key); } else { next.add(key); }
            return next;
        });
    };

    const calculatedRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start: Date | null = null;
        let end: Date | null = new Date();
        switch (filters.datePreset) {
            case 'today': start = today; break;
            case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = new Date(today); end.setMilliseconds(-1); break;
            case 'this_week': const day = now.getDay(); start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1)); break;
            case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'all': return 'All time data';
            case 'custom': return `${filters.startDate || '...'} to ${filters.endDate || '...'}`;
            default: start = today;
        }
        const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return start ? `${formatDate(start)} to ${formatDate(end)}` : 'All time data';
    }, [filters.datePreset, filters.startDate, filters.endDate]);

    if (editingOrderId) {
        const order = enrichedOrders.find(o => o['Order ID'] === editingOrderId);
        const sidebarWidth = (() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) return '0px';
            const uiTheme = advancedSettings?.uiTheme || 'default';
            if (uiTheme === 'binance') return isSidebarCollapsed ? '64px' : '240px';
            if (uiTheme === 'neumorphism') return isSidebarCollapsed ? '96px' : '288px';
            return isSidebarCollapsed ? '80px' : '256px';
        })();

        return order ? (
            <div 
                className={`fixed top-0 bottom-0 right-0 z-[100] flex flex-col ${isLightMode ? 'bg-[#f8fafc]' : 'bg-[#0B0E11]'}`}
                style={{ left: sidebarWidth }}
            >
                <EditOrderPage order={order} onSaveSuccess={() => { setEditingOrderId(''); refreshData(); }} onCancel={() => setEditingOrderId('')} />
            </div>
        ) : null;
    }

    return (
        <div className={`w-full h-full flex flex-col animate-reveal relative ${isLightMode ? 'bg-[#f8fafc]' : isBinance ? 'bg-[#0B0E11]' : 'bg-[#020617]'} overflow-hidden`}>
            <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} maxWidth="max-w-5xl">
                <div className={`p-8 ${isLightMode ? 'bg-white border border-slate-200' : isBinance ? 'bg-[#1E2329]' : 'bg-[#0f172a] rounded-[2.5rem]'} flex flex-col h-[85vh]`} style={isBinance && !isLightMode ? { borderRadius: '2px' } : { borderRadius: '24px' }}>
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className={`w-2 h-10 ${isLightMode ? 'bg-blue-600 rounded-full' : isBinance ? 'bg-[#FCD535]' : 'bg-blue-600 rounded-full'}`} style={isBinance && !isLightMode ? { borderRadius: '1px' } : undefined}></div>
                            <h2 className={`text-2xl font-black ${isLightMode ? 'text-slate-800' : isBinance ? 'text-[#EAECEF]' : 'text-white'} uppercase tracking-tight`}>{t.filter_engine}</h2>
                        </div>
                        <button onClick={() => setIsFilterModalOpen(false)} className={`w-10 h-10 ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl' : isBinance ? 'bg-[#2B3139] border-[#474D57] text-[#848E9C] hover:text-[#EAECEF]' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'} flex items-center justify-center border transition-all active:scale-95`} style={isBinance && !isLightMode ? { borderRadius: '2px' } : undefined}>&times;</button>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                        <OrderFilters filters={filters} setFilters={setFilters} orders={enrichedOrders} usersList={appData.users || []} appData={appData} calculatedRange={calculatedRange} />
                    </div>
                    <div className={`mt-6 border-t ${isLightMode ? 'border-slate-200' : isBinance ? 'border-[#2B3139]' : 'border-white/5'} pt-6`}>
                        <button onClick={() => { setIsFilterModalOpen(false); setCurrentPage(1); }} className={`w-full py-4 ${isLightMode ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-xl' : isBinance ? 'bg-[#FCD535] hover:bg-[#f0c51d] text-[#181A20]' : 'bg-blue-600 hover:bg-blue-500 text-white rounded-xl'} text-[13px] font-black uppercase tracking-[0.15em] transition-all active:scale-[0.99]`} style={isBinance && !isLightMode ? { borderRadius: '2px' } : undefined}>{t.apply_config}</button>
                    </div>
                </div>
            </Modal>

            {/* Binance-Standard Header */}
            <div className={`${isBinance ? 'px-4 pt-4 pb-2' : 'px-6 pt-6 pb-2'}`}>
                
                {/* Row 1: Title + Actions */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => onBack()} className={`p-2 transition-all active:scale-90 ${isLightMode ? 'bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-650 hover:text-slate-800' : isBinance ? 'bg-transparent hover:bg-[#2B3139] text-[#848E9C] hover:text-[#EAECEF]' : 'bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white'}`} style={isBinance && !isLightMode ? { borderRadius: '4px' } : undefined}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <div className={`w-1 h-5 ${isLightMode ? 'bg-blue-500 rounded-full' : isBinance ? 'bg-[#FCD535]' : 'bg-blue-500 rounded-full'}`} style={isBinance && !isLightMode ? { borderRadius: '1px' } : undefined}></div>
                            <h1 className={`text-base font-black ${isLightMode ? 'text-slate-800' : isBinance ? 'text-[#EAECEF]' : 'text-white italic'} tracking-tight uppercase`}>{t.manage_orders}</h1>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 ml-2 ${isLightMode ? 'bg-slate-100 text-slate-700 border-slate-200 rounded-lg' : isBinance ? 'bg-[#0B0E11] border-[#2B3139]' : 'bg-white/5 border-white/5 rounded-lg'} border`} style={isBinance && !isLightMode ? { borderRadius: '2px' } : undefined}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-[#FCD535] animate-pulse' : 'bg-[#0ECB81]'}`}></span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : isBinance ? 'text-[#848E9C]' : 'text-gray-400'}`}>
                                    {isSyncing ? 'Sync' : 'Live'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Pagination Control (Mini) */}
                        {totalPages > 1 && (
                            <div className={`flex items-center p-0.5 rounded-lg mr-2 border ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-[#1E2329] border-[#2B3139]'}`}>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-1.5 disabled:opacity-30 transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={3}/></svg>
                                </button>
                                <span className={`text-[10px] font-black px-2 tabular-nums ${isLightMode ? 'text-blue-600' : 'text-[#FCD535]'}`}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-1.5 disabled:opacity-30 transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={3}/></svg>
                                </button>
                            </div>
                        )}

                        {/* Search */}
                        <div className="relative group">
                            <input 
                                type="text" 
                                placeholder={t.search_placeholder} 
                                value={searchQuery} 
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                                className={`w-[240px] border py-2 pl-9 pr-3 text-xs font-medium outline-none transition-all ${
                                    isLightMode
                                        ? 'bg-white border-slate-300 text-slate-800 focus:border-blue-500 placeholder-slate-400 rounded-2xl shadow-sm'
                                        : isBinance 
                                            ? 'bg-[#0B0E11] border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] placeholder-[#848E9C]' 
                                            : 'bg-white/[0.03] border-white/5 text-white focus:bg-white/10 rounded-2xl'
                                }`} 
                                style={isBinance && !isLightMode ? { borderRadius: '4px' } : undefined} 
                            />
                            <div className={`absolute left-2.5 top-0 bottom-0 flex items-center justify-center pointer-events-none ${isLightMode ? 'text-slate-400 group-focus-within:text-blue-500' : isBinance ? 'text-[#848E9C]' : 'text-gray-600 group-focus-within:text-blue-500'} transition-colors`}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>

                        {/* Filters Button */}
                        <button onClick={() => setIsFilterModalOpen(true)} className={`flex items-center gap-1.5 px-3 py-2 border text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                            isLightMode
                                ? 'bg-white border-slate-200 text-slate-650 hover:text-slate-800 hover:bg-slate-50 rounded-2xl shadow-sm'
                                : isBinance
                                    ? 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:text-[#EAECEF] hover:border-[#474D57]'
                                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white rounded-2xl'
                        }`} style={isBinance && !isLightMode ? { borderRadius: '4px' } : undefined}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filters
                        </button>

                        {/* Export Button */}
                        <button onClick={() => setIsPdfModalOpen(true)} className={`flex items-center gap-1.5 px-3 py-2 border text-[10px] font-bold uppercase tracking-wider transition-all ${
                            isLightMode
                                ? 'bg-rose-50 border-rose-250 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl shadow-sm'
                                : isBinance
                                    ? 'bg-transparent border-[#2B3139] text-[#848E9C] hover:text-[#FCD535] hover:border-[#FCD535]'
                                    : 'bg-red-600/10 border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl'
                        }`} style={isBinance && !isLightMode ? { borderRadius: '4px' } : undefined}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            Export
                        </button>

                        {/* Column Toggler */}
                        <ColumnToggler visibleColumns={visibleColumns} onToggle={toggleColumn} />
                    </div>
                </div>

                {/* Row 2: Date Filter Tabs + Sort Controls */}
                <div className={`flex items-center justify-between ${isLightMode ? 'border-b border-slate-200' : isBinance ? 'border-b border-[#2B3139]' : ''} mb-2 pb-0`}>
                    {/* Date Filter Tabs */}
                    <div className="flex items-center">
                        {[
                            { id: 'all', label: (t as any)['all'] || 'All' },
                            { id: 'today', label: (t as any)['today'] || 'Today' },
                            { id: 'yesterday', label: (t as any)['yesterday'] || 'Yesterday' },
                            { id: 'this_week', label: (t as any)['this_week'] || 'This Week' },
                            { id: 'this_month', label: (t as any)['this_month'] || 'This Month' }
                        ].map(p => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    setFilters(prev => ({ ...prev, datePreset: p.id as any, startDate: '', endDate: '' }));
                                    setCurrentPage(1); // Reset to page 1 when date changes
                                }}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                                    isLightMode
                                    ? (filters.datePreset === p.id
                                        ? 'text-blue-600 border-blue-600 font-extrabold'
                                        : 'text-slate-500 border-transparent hover:text-slate-800')
                                    : isBinance
                                        ? (filters.datePreset === p.id
                                            ? 'text-[#EAECEF] border-[#FCD535]'
                                            : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]')
                                        : (filters.datePreset === p.id
                                            ? 'text-white border-blue-500'
                                            : 'text-gray-500 border-transparent hover:text-gray-300')
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort + Group Controls */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold ${isLightMode ? 'text-slate-400' : isBinance ? 'text-[#848E9C]' : 'text-gray-500'} uppercase tracking-wider`}>Sort</span>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={`bg-transparent border-none text-[10px] font-bold ${isLightMode ? 'text-blue-600' : isBinance ? 'text-[#EAECEF]' : 'text-blue-400'} focus:ring-0 cursor-pointer`}>
                                <option value="date" className={isLightMode ? 'bg-white text-slate-850' : isBinance ? 'bg-[#1E2329] text-[#EAECEF]' : 'bg-[#0f172a] text-white'}>Date</option>
                                <option value="total" className={isLightMode ? 'bg-white text-slate-850' : isBinance ? 'bg-[#1E2329] text-[#EAECEF]' : 'bg-[#0f172a] text-white'}>Revenue</option>
                                <option value="customer" className={isLightMode ? 'bg-white text-slate-850' : isBinance ? 'bg-[#1E2329] text-[#EAECEF]' : 'bg-[#0f172a] text-white'}>Customer</option>
                            </select>
                        </div>
                        <div className={`w-px h-3 ${isLightMode ? 'bg-slate-200' : isBinance ? 'bg-[#2B3139]' : 'bg-white/10'}`}></div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold ${isLightMode ? 'text-slate-400' : isBinance ? 'text-[#848E9C]' : 'text-gray-500'} uppercase tracking-wider`}>Group</span>
                            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className={`bg-transparent border-none text-[10px] font-bold ${isLightMode ? 'text-purple-600' : isBinance ? 'text-[#EAECEF]' : 'text-purple-400'} focus:ring-0 cursor-pointer`}>
                                <option value="none" className={isLightMode ? 'bg-white text-slate-850' : isBinance ? 'bg-[#1E2329] text-[#EAECEF]' : 'bg-[#0f172a] text-white'}>None</option>
                                <option value="Page" className={isLightMode ? 'bg-white text-slate-850' : isBinance ? 'bg-[#1E2329] text-[#EAECEF]' : 'bg-[#0f172a] text-white'}>Page</option>
                                <option value="Team" className={isLightMode ? 'bg-white text-slate-850' : isBinance ? 'bg-[#1E2329] text-[#EAECEF]' : 'bg-[#0f172a] text-white'}>Team</option>
                                <option value="Fulfillment Store" className={isLightMode ? 'bg-white text-slate-850' : isBinance ? 'bg-[#1E2329] text-[#EAECEF]' : 'bg-[#0f172a] text-white'}>Warehouse</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Row 3: Warehouse Quick Filters */}
                <div className="flex items-center gap-3 mb-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider ${
                        isLightMode 
                            ? 'bg-slate-100 text-slate-600 border-slate-200' 
                            : isBinance 
                                ? 'bg-[#1E2329] text-[#848E9C] border-[#2B3139]' 
                                : 'bg-white/5 text-gray-450 border-white/5'
                    }`}>
                        <i className="fa-solid fa-warehouse"></i>
                        <span>{t.warehouse}</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        {Array.from(new Set(appData.stores?.map(s => s.StoreName) || [])).map(s => {
                            const sel = filters.fulfillmentStore.split(',').map(v => v.trim().toLowerCase()).includes(s.toLowerCase());
                            return (
                                <button
                                    key={s}
                                    onClick={() => {
                                        const cur = filters.fulfillmentStore.split(',').map(v => v.trim()).filter(v => v);
                                        const nxt = sel ? cur.filter(v => v.toLowerCase() !== s.toLowerCase()) : [...cur, s];
                                        setFilters(prev => ({...prev, fulfillmentStore: nxt.join(',')}));
                                        setCurrentPage(1);
                                    }}
                                    className={`px-3.5 py-1.5 text-[10px] font-black uppercase transition-all whitespace-nowrap border ${
                                        isLightMode
                                        ? (sel 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800')
                                        : isBinance
                                            ? (sel 
                                                ? 'bg-[#FCD535] text-[#181A20] border-[#FCD535] font-black' 
                                                : 'bg-transparent border-[#2B3139] text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139]')
                                            : (sel
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500/50 shadow-[0_4px_15px_rgba(37,99,235,0.3)]'
                                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10')
                                    }`}
                                    style={isBinance && !isLightMode ? { borderRadius: '4px' } : { borderRadius: '12px' }}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                    <div className={`ml-auto text-[10px] ${isLightMode ? 'text-slate-400' : isBinance ? 'text-[#848E9C]' : 'text-gray-500'} tabular-nums font-medium`}>
                        <span className={isLightMode ? 'text-slate-800 font-bold' : isBinance ? 'text-[#EAECEF]' : 'text-white'}>{totalCount}</span> {language === 'km' ? 'ការកម្មង់សរុប' : 'total orders'}
                    </div>
                </div>
            </div>

            <div className={`flex-1 overflow-hidden ${isBinance ? 'px-3 pb-3' : 'px-6 pb-6'} relative`}>
                {isOrdersLoading && orders.length > 0 && (
                    <div className="absolute inset-0 z-50 bg-black/10 backdrop-blur-[1px] flex items-center justify-center">
                        <Spinner size="sm" />
                    </div>
                )}
                
                <OrdersList 
                    orders={filteredOrders} 
                    onEdit={o => setEditingOrderId(o['Order ID'])} 
                    onView={o => setViewingOrderId(o['Order ID'])} 
                    showActions={true} 
                    visibleColumns={visibleColumns} 
                    selectedIds={selectedIds} 
                    onToggleSelect={id => setSelectedIds(prev => { 
                        const next = new Set(prev); 
                        if (next.has(id)) next.delete(id); 
                        else next.add(id); 
                        return next; 
                    })} 
                    showBorders={showBorders} 
                    groupBy={groupBy} 
                    viewMode="list" 
                    onOptimisticUpdate={cb => optimisticUpdateRef.current = cb}
                />
            </div>

            <BulkActionManager 
                orders={enrichedOrders} 
                selectedIds={selectedIds} 
                onComplete={() => { setSelectedIds(new Set()); refreshData(); }} 
                onClearSelection={() => setSelectedIds(new Set())} 
                onOptimisticUpdate={(ids, status) => optimisticUpdateRef.current?.(ids, status)}
            />
            {isPdfModalOpen && <PdfExportModal isOpen={true} onClose={() => setIsPdfModalOpen(false)} orders={filteredOrders} appData={appData} />}
            {viewingOrderId && <OrderDetailModal order={viewingOrder!} onClose={() => setViewingOrderId(null)} />}
        </div>
    );
};

export default DesktopOrdersDashboard;

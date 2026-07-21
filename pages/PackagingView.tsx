import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { WEB_APP_URL } from '@/constants';
import Spinner from '@/components/common/Spinner';
import { ParsedOrder } from '@/types';
import { CacheService, CACHE_KEYS } from '@/services/cacheService';
import FastPackTerminal from '@/components/admin/packaging/fastpack/FastPackTerminal';
import { convertGoogleDriveUrl, getOptimisticPackagePhoto, fileToDataUrl } from '@/utils/fileUtils';
import { compressImage } from '@/utils/imageCompressor';
import Modal from '@/components/common/Modal';
import { CameraCapture } from '@/components/common/CameraCapture';
import MobilePackagingHub from '@/components/admin/packaging/MobilePackagingHub';
import TabletPackagingHub from '@/components/admin/packaging/TabletPackagingHub';
import DesktopPackagingHub from '@/components/admin/packaging/DesktopPackagingHub';
import OrderDetailModal from '@/components/orders/OrderDetailModal';
import PdfExportModal from '@/components/admin/PdfExportModal';
import { Shift } from '@/types';
import DateRangeFilter, { DateRangePreset } from '@/components/common/DateRangeFilter';
import DeliveryListGeneratorModal from '@/components/orders/DeliveryListGeneratorModal';

const bClasses = {
    surface: 'bg-[#1E2329] border border-[#2B3139]',
    surfaceHover: 'hover:bg-[#2B3139] transition-colors duration-200',
    btnYellow: 'bg-[#FCD535] hover:bg-[#FCD535]/90 text-[#0B0E11] font-bold rounded-[4px] px-4 py-2 transition-all active:scale-[0.98]',
};

const statusMap: Record<string, string> = {
    'Pending': 'Pending,Scheduled',
    'Ready to Ship': 'Ready to Ship',
    'Shipped': 'Shipped',
    'Returned': 'Returned',
    'Cancelled': 'Cancelled'
};

const packagingTabMap: Record<string, string> = {
    'Pending': 'pending',
    'Ready to Ship': 'ready',
    'Shipped': 'shipped',
    'Returned': 'returned',
    'Cancelled': 'cancelled'
};

const parseApiOrders = (rawList: any[]): ParsedOrder[] => {
    return rawList
        .filter((o: any) => o && o['Order ID'] && o['Order ID'] !== 'Opening_Balance')
        .map((o: any) => {
            let products: any[] = [];
            try {
                const rawProducts = o['Products (JSON)'] || o.Products;
                const parsed = typeof rawProducts === 'string' ? JSON.parse(rawProducts) : (rawProducts || []);
                products = (Array.isArray(parsed) ? parsed : []).map((p: any) => ({
                    ...p,
                    name: p.name || p.productName || p.ProductName || '',
                    quantity: Number(p.quantity ?? p.Quantity ?? 1) || 1,
                    image: p.image || p.imageUrl || p.ImageURL || '',
                    cost: Number(p.cost ?? p.Cost ?? 0),
                    finalPrice: Number(p.finalPrice ?? p.FinalPrice ?? p.price ?? p.Price ?? 0),
                }));
            } catch (e) {
                products = [];
            }

            return {
                ...o,
                Products: products,
                FulfillmentStatus: (o['Fulfillment Status'] || o.FulfillmentStatus || 'Pending') as any,
                IsVerified: String(o.IsVerified).toUpperCase() === 'TRUE' || o.IsVerified === 'A'
            } as ParsedOrder;
        });
};

const PackagingView: React.FC<{ orders?: ParsedOrder[], onExit?: () => void }> = ({ orders: propOrders, onExit }) => {
    // 1. Context & States
    const { appData, refreshData, refreshTimestamp, currentUser, setMobilePageTitle, appState, setAppState, setIsShiftOpener, setActiveShiftStore, logout, lastMessage, ordersFetchError } = useContext(AppContext);

    const [selectedStore, setSelectedStore] = useState<string>(() => {
        return localStorage.getItem('selectedStore') || '';
    });
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftStep, setShiftStep] = useState<'options' | 'login' | 'photo' | 'closing'>('options');
    const [shiftLogin, setShiftLogin] = useState({ username: '', password: '' });
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [isShiftLoading, setIsShiftLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<'Pending' | 'Ready to Ship' | 'Shipped' | 'Returned' | 'Cancelled'>(() => {
        return (localStorage.getItem('activePackagingTab') as any) || 'Pending';
    });

    useEffect(() => {
        if (selectedStore) {
            localStorage.setItem('selectedStore', selectedStore);
        } else {
            localStorage.removeItem('selectedStore');
        }
    }, [selectedStore]);

    useEffect(() => {
        localStorage.setItem('activePackagingTab', activeTab);
    }, [activeTab]);
    const [packingOrder, setPackingOrder] = useState<ParsedOrder | null>(null);
    const [returningOrder, setReturningOrder] = useState<ParsedOrder | null>(null);
    const [isReturnPhotoModalOpen, setIsReturnPhotoModalOpen] = useState(false);
    const [returnPhoto, setReturnPhoto] = useState<string | null>(null);
    const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
    const [returnReason, setReturnReason] = useState('');

    const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [viewingOrder, setViewingOrder] = useState<ParsedOrder | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [shippingFilter, setShippingFilter] = useState<string>('');
    const [teamFilter, setTeamFilter] = useState<string>('');
    const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [deliveryOrders, setDeliveryOrders] = useState<ParsedOrder[]>([]);
    const [isDispatchLoading, setIsDispatchLoading] = useState(false);
    const [undoTarget, setUndoConfirmation] = useState<{ order: ParsedOrder, type: 'pending' | 'ready', isOpen: boolean } | null>(null);
    const [undoPassword, setUndoPassword] = useState('');
    const [isUndoVerifying, setIsUndoVerifying] = useState(false);
    
    // Close Shift Modal State
    const [isCloseShiftConfirmOpen, setIsCloseShiftConfirmOpen] = useState(false);
    const [closeShiftStats, setCloseShiftStats] = useState<{ packed: number, shipped: number, shippingCounts: Record<string, number>, summaryText: string } | null>(null);

    // Export PDF States
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportOrders, setExportOrders] = useState<ParsedOrder[]>([]);
    const [isExportLoading, setIsExportLoading] = useState(false);

    // --- Pagination and server-side states ---
    const [localOrders, setLocalOrders] = useState<ParsedOrder[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalOrdersCount, setTotalOrdersCount] = useState(0);
    const [serverShippingCounts, setServerShippingCounts] = useState<Record<string, number>>({});
    const [serverProgressStats, setServerProgressStats] = useState({ packedByUserToday: 0, storeTotalToday: 0, progressPercentage: 0 });
    const [serverTabCounts, setServerTabCounts] = useState({ pending: 0, ready: 0, shipped: 0, returned: 0, cancelled: 0 });
    const [isLocalOrdersLoading, setIsLocalOrdersLoading] = useState(false);
    const [localOrdersFetchError, setLocalOrdersFetchError] = useState<'permission_denied' | 'network_error' | null>(null);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [localRefreshTick, setLocalRefreshTick] = useState(0);
    const wsRefreshThrottleRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const packagingRequestSeqRef = React.useRef(0);

    // For "Ready to Ship", load all orders at once (up to 500) so Select All / Bulk Ship works correctly
    const effectivePageSize = activeTab === 'Ready to Ship' ? 500 : pageSize;
    const totalPages = activeTab === 'Ready to Ship' ? 1 : (Math.ceil(totalOrdersCount / pageSize) || 1);

    // Debounce search term to avoid hammering backend
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset pagination page and clear data on filter/tab/store/search changes to prevent showing stale data
    useEffect(() => {
        setCurrentPage(1);
        setLocalOrders([]);
        setTotalOrdersCount(0);
        setSelectedOrderIds(new Set());
    }, [activeTab, teamFilter, shippingFilter, selectedStore, debouncedSearchTerm, datePreset, startDate, endDate]);

    useEffect(() => {
        setSelectedOrderIds(new Set());
    }, [currentPage, pageSize]);

    useEffect(() => {
        if (activeTab !== 'Ready to Ship' && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [activeTab, currentPage, totalPages]);

    const buildPackagingOrderParams = (limit: number, offset: number, search: string): Record<string, string | number> => {
        const params: Record<string, string | number> = {
            limit,
            offset,
            search,
            fulfillmentStore: selectedStore,
            fulfillmentStatus: statusMap[activeTab] || activeTab,
            packagingTab: packagingTabMap[activeTab] || activeTab.toLowerCase(),
            datePreset: datePreset,
            view: 'compact'
        };

        if (datePreset === 'custom') {
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
        }

        if (teamFilter) {
            params.team = teamFilter;
        }
        if (shippingFilter) {
            params.internalShippingMethod = shippingFilter;
        }

        return params;
    };

    const fetchPackagingOrders = async (
        params: Record<string, string | number>,
        signal?: AbortSignal,
        canApplyResult: () => boolean = () => true
    ) => {
        const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
        const token = session?.token || localStorage.getItem('token') || '';
        if (!token) {
            if (canApplyResult()) setLocalOrdersFetchError('network_error');
            return null;
        }

        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                queryParams.append(key, String(val));
            }
        });

        const response = await fetch(`${WEB_APP_URL}/api/admin/orders?${queryParams.toString()}`, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            cache: 'no-store',
            signal
        });

        if (response.status === 401) {
            if (canApplyResult()) logout();
            return null;
        }

        if (response.status === 403) {
            if (canApplyResult()) setLocalOrdersFetchError('permission_denied');
            return null;
        }

        if (!response.ok) {
            if (canApplyResult()) setLocalOrdersFetchError('network_error');
            return null;
        }

        const result = await response.json();
        if (canApplyResult()) setLocalOrdersFetchError(null);
        return {
            orders: parseApiOrders(result.data || result.orders || result.Data || []),
            total: result.total || 0,
            limit: result.limit,
            offset: result.offset,
            shippingCounts: result.shippingCounts,
            progressStats: result.progressStats,
            tabCounts: result.tabCounts
        };
    };

    // Fetch packaging orders with pagination & filters
    useEffect(() => {
        if (!selectedStore) return;
        const requestId = ++packagingRequestSeqRef.current;
        const controller = new AbortController();
        let isMounted = true;

        const loadOrders = async () => {
            setIsLocalOrdersLoading(true);
            try {
                const params = buildPackagingOrderParams(
                    effectivePageSize,
                    activeTab === 'Ready to Ship' ? 0 : (currentPage - 1) * effectivePageSize,
                    debouncedSearchTerm
                );
                const result = await fetchPackagingOrders(
                    params,
                    controller.signal,
                    () => isMounted && requestId === packagingRequestSeqRef.current
                );
                if (isMounted && requestId === packagingRequestSeqRef.current && result) {
                    setLocalOrders(result.orders || []);
                    setTotalOrdersCount(result.total || 0);
                    if (result.shippingCounts) {
                        setServerShippingCounts(result.shippingCounts);
                    }
                    if (result.progressStats) {
                        const packed = result.progressStats.packedByUserToday || 0;
                        const total = result.progressStats.storeTotalToday || 0;
                        const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
                        setServerProgressStats({
                            packedByUserToday: packed,
                            storeTotalToday: total,
                            progressPercentage: percentage
                        });
                    }
                    if (result.tabCounts) {
                        setServerTabCounts({
                            pending: result.tabCounts.pending || 0,
                            ready: result.tabCounts.ready || 0,
                            shipped: result.tabCounts.shipped || 0,
                            returned: result.tabCounts.returned || 0,
                            cancelled: result.tabCounts.cancelled || 0
                        });
                    }
                }
            } catch (error: any) {
                if (error?.name === 'AbortError') return;
                console.error("Failed to fetch paginated packaging orders:", error);
                if (isMounted && requestId === packagingRequestSeqRef.current) {
                    setLocalOrdersFetchError('network_error');
                }
            } finally {
                if (isMounted && requestId === packagingRequestSeqRef.current) setIsLocalOrdersLoading(false);
            }
        };
        
        loadOrders();
        
        return () => {
            isMounted = false;
            controller.abort();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStore, activeTab, debouncedSearchTerm, teamFilter, shippingFilter, datePreset, startDate, endDate, currentPage, effectivePageSize, localRefreshTick]);

    // Keep viewingOrder in sync when localOrders reloads (from WebSocket or manual refresh)
    useEffect(() => {
        if (viewingOrder && localOrders.length > 0) {
            const updated = localOrders.find(o => o['Order ID'] === viewingOrder['Order ID']);
            if (updated && JSON.stringify(updated) !== JSON.stringify(viewingOrder)) {
                setViewingOrder(updated);
            }
        }
    }, [localOrders, viewingOrder]);

    // 2. Memos
    const allOrdersMapped = useMemo(() => {
        return localOrders
            .filter((o: any) => o && o['Order ID'] && o['Order ID'] !== 'Opening_Balance')
            .map((o: any) => ({ 
                ...o, 
                Products: Array.isArray(o.Products) ? o.Products : [], 
                FulfillmentStatus: (o['Fulfillment Status'] || o.FulfillmentStatus || 'Pending') as any
            })) as ParsedOrder[];
    }, [localOrders]);

    const availableStores = useMemo(() => appData.stores ? appData.stores.map((s: any) => s.StoreName) : [], [appData.stores]);
    
    const availableTeams = useMemo(() => {
        const teams = new Set<string>();
        if (Array.isArray(appData.pages)) {
            appData.pages.forEach((p: any) => {
                if (p.Team) teams.add(p.Team);
            });
        }
        // Fallback: also check orders in case pages are not yet loaded or configured
        allOrdersMapped.forEach(o => {
            if (o.Team) teams.add(o.Team);
        });
        return Array.from(teams).sort();
    }, [appData.pages, allOrdersMapped]);

    const allFilteredOrdersBase = allOrdersMapped;
    const allFilteredOrders = allOrdersMapped;
    const filteredOrdersForCounts = allOrdersMapped;
    const filteredOrders = allOrdersMapped;

    const tabCounts = serverTabCounts;
    const progressStats = serverProgressStats;
    const shippingCounts = serverShippingCounts;

    // 3. Effects
    useEffect(() => {
        const openedBy = (activeShift?.OpenedBy || '').trim().toLowerCase();
        const me = (currentUser?.FullName || '').trim().toLowerCase();
        const isOpener = !!activeShift && openedBy === me;

        setIsShiftOpener(isOpener);
        if (isOpener && activeShift?.StoreName) {
            setActiveShiftStore(activeShift.StoreName);
        } else if (!isOpener) {
            setActiveShiftStore('');
        }
    }, [activeShift, setIsShiftOpener, setActiveShiftStore, currentUser?.FullName]);

    useEffect(() => {
        const checkActiveShift = async (store: string) => {
            setIsShiftLoading(true);
            try {
                const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
                const token = session?.token || '';
                const res = await fetch(`${WEB_APP_URL}/api/admin/shifts/active/${encodeURIComponent(store)}`, {
                    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
                });
                const data = await res.json();
                if (data.status === 'success') {
                    setActiveShift(data.shift);
                    const openedBy = (data.shift.OpenedBy || '').trim().toLowerCase();
                    const me = (currentUser?.FullName || '').trim().toLowerCase();
                    setIsViewOnly(openedBy !== me);
                } else {
                    setActiveShift(null);
                    setIsViewOnly(false);
                    setIsShiftModalOpen(true);
                    setShiftStep('options');
                }
            } catch (error) {
                console.error("Failed to check active shift", error);
            } finally {
                setIsShiftLoading(false);
            }
        };

        if (selectedStore) {
            checkActiveShift(selectedStore);
        } else {
            setActiveShift(null);
            setIsViewOnly(false);
            setIsShiftModalOpen(false);
        }
    }, [selectedStore, currentUser?.FullName]);

    useEffect(() => {
        const title = selectedStore ? `PACK: ${selectedStore}` : 'Packaging Hub';
        setMobilePageTitle(title);
        return () => setMobilePageTitle(null);
    }, [setMobilePageTitle, selectedStore]);

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            if (w < 768) setDeviceType('mobile');
            else if (w < 1024) setDeviceType('tablet');
            else setDeviceType('desktop');
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!lastMessage) return;
        
        // Listen to WebSocket order updates or Google Sheets webhook updates
        if (
            lastMessage.type === 'new_order' ||
            lastMessage.type === 'update_order' ||
            lastMessage.type === 'delete_order' ||
            lastMessage.type === 'sheet_webhook_sync' ||
            lastMessage.type === 'update_sheet' ||
            lastMessage.type === 'add_row' ||
            lastMessage.type === 'delete_row'
        ) {
            // For sheet webhook updates, only refresh if it involves AllOrders
            if (
                (lastMessage.type === 'sheet_webhook_sync' || lastMessage.type === 'update_sheet') && 
                lastMessage.sheetName !== 'AllOrders' && 
                !lastMessage.sheetName?.startsWith('Orders_')
            ) {
                return;
            }
            
            // Throttle WS-triggered refreshes to at most once every 3 seconds
            // to prevent hammering the server during reconnect storms
            if (wsRefreshThrottleRef.current) return;
            wsRefreshThrottleRef.current = setTimeout(() => {
                wsRefreshThrottleRef.current = null;
            }, 3000);

            console.log(`[PackagingView] Real-time message detected (${lastMessage.type}). Refreshing local orders...`);
            setLocalRefreshTick(t => t + 1);
        }
    }, [lastMessage]);

    // Also refresh when global refreshTimestamp changes (triggered by other parts of the app)
    useEffect(() => {
        if (refreshTimestamp && selectedStore) {
            setLocalRefreshTick(t => t + 1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTimestamp]);

    // 4. Helper Functions (Callables)
    const handleOpenShift = async () => {
        setIsShiftLoading(true);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token || '';
            const res = await fetch(`${WEB_APP_URL}/api/admin/shifts/open`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    userName: shiftLogin.username,
                    password: shiftLogin.password,
                    storeName: selectedStore,
                    photo: capturedPhoto || ""
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setActiveShift(data.shift);
                setIsViewOnly(false);
                setIsShiftModalOpen(false);
                setShiftStep('options');
                setActiveTab('Pending');
                setSearchTerm('');
                setShippingFilter('');
                alert("បើកវេនជោគជ័យ!");
            } else {
                alert(data.message || "មិនអាចបើកវេនបានទេ");
            }
        } catch (error) {
            alert("មានបញ្ហាពេលបើកវេន");
        } finally {
            setIsShiftLoading(false);
        }
    };

    const handleCloseShift = async () => {
        if (!activeShift) return;
        const todayStr = new Date().toLocaleDateString('km-KH').split(',')[0];
        
        const myPackedOrders = allFilteredOrdersBase.filter(o => {
            const isMe = o['Packed By'] === currentUser?.FullName;
            const isToday = (o['Packed Time'] || '').startsWith(todayStr);
            return isMe && isToday && (o.FulfillmentStatus === 'Ready to Ship' || o.FulfillmentStatus === 'Shipped');
        });

        const shippedOrders = myPackedOrders.filter(o => o.FulfillmentStatus === 'Shipped');
        
        const shippingCountsMap: Record<string, number> = {};
        myPackedOrders.forEach(o => {
            const method = o['Internal Shipping Method'] || 'ផ្សេងៗ (Other)';
            shippingCountsMap[method] = (shippingCountsMap[method] || 0) + 1;
        });

        const lines = Object.entries(shippingCountsMap).map(([method, count]) => `• ${method}: *${count}*`);
        const summary = `📦 វេចខ្ចប់សរុប៖ *${myPackedOrders.length}* កញ្ចប់\n🚚 បញ្ជូនចេញរួច៖ *${shippedOrders.length}* កញ្ចប់\n\n📋 *តាមក្រុមហ៊ុនដឹកជញ្ជូន៖*\n${lines.join('\n')}`;

        setCloseShiftStats({
            packed: myPackedOrders.length,
            shipped: shippedOrders.length,
            shippingCounts: shippingCountsMap,
            summaryText: summary
        });
        setIsCloseShiftConfirmOpen(true);
    };

    const confirmCloseShift = async () => {
        if (!activeShift || !closeShiftStats) return;
        setIsShiftLoading(true);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token || '';
            const res = await fetch(`${WEB_APP_URL}/api/admin/shifts/close`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    shiftId: activeShift.ID,
                    summary: closeShiftStats.summaryText
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setActiveShift(null);
                setSelectedStore('');
                setIsShiftModalOpen(false);
                setIsCloseShiftConfirmOpen(false);
                alert("បិទវេនជោគជ័យ!");
                // Stay logged in — user returns to store selection
            } else {
                alert(data.message || "មិនអាចបិទវេនបានទេ");
            }
        } catch (error) {
            alert("មានបញ្ហាពេលបិទវេន");
        } finally {
            setIsShiftLoading(false);
        }
    };

    const handleUndoConfirm = async () => {
        if (!undoTarget || !activeShift) return;
        if (!undoPassword) {
            alert("សូមបញ្ចូលលេខសម្ងាត់");
            return;
        }
        setIsUndoVerifying(true);
        try {
            const shiftOwner = appData.users?.find(u => u.FullName === activeShift.OpenedBy);
            const verifyUsername = shiftOwner?.UserName || activeShift.OpenedBy;
            const res = await fetch(`${WEB_APP_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: verifyUsername, password: undoPassword })
            });
            const data = await res.json();
            if (data.status === 'success') {
                const { order, type } = undoTarget;
                if (type === 'pending') {
                    await executeAction(order, 'Pending', { 'Packed By': '', 'Packed Time': '', 'Package Photo': '' });
                } else {
                    await executeAction(order, 'Ready to Ship', { 'Dispatched Time': '', 'Dispatched By': '' });
                }
                setUndoConfirmation(null);
                setUndoPassword('');
            } else {
                alert("លេខសម្ងាត់មិនត្រឹមត្រូវ! មិនអាច Undo បានទេ។");
            }
        } catch (error) {
            console.error("Undo verification error:", error);
            alert("មានបញ្ហាពេលផ្ទៀងផ្ទាត់លេខសម្ងាត់");
        } finally {
            setIsUndoVerifying(false);
        }
    };

    const onToggleSelectAll = (ordersToSelect: ParsedOrder[]) => {
        if (ordersToSelect.length === 0) return;
        const allSelected = ordersToSelect.every(o => selectedOrderIds.has(o['Order ID']));
        setSelectedOrderIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                ordersToSelect.forEach(o => next.delete(o['Order ID']));
            } else {
                ordersToSelect.forEach(o => next.add(o['Order ID']));
            }
            return next;
        });
    };

    const onBulkShip = async () => {
        if (selectedOrderIds.size === 0) return;
        const confirmed = window.confirm(`Are you sure you want to ship ${selectedOrderIds.size} orders?`);
        if (!confirmed) return;

        setIsBulkProcessing(true);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token || '';
            const ids = Array.from(selectedOrderIds);
            await Promise.all(ids.map(async (id) => {
                const order = allOrdersMapped.find(o => o['Order ID'] === id);
                if (!order) return;
                return fetch(`${WEB_APP_URL}/api/admin/update-order`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
                    },
                    body: JSON.stringify({ 
                        orderId: id, team: order.Team, userName: currentUser?.FullName || 'System', 
                        newData: { 
                            'Fulfillment Status': 'Shipped', 
                            'Dispatched Time': new Date().toLocaleString('km-KH'), 
                            'Dispatched By': currentUser?.FullName || 'Packer' 
                        } 
                    })
                });
            }));
            setSelectedOrderIds(new Set());
            setLocalRefreshTick(t => t + 1);
        } catch (error) {
            console.error("Bulk ship failed", error);
            alert("Some orders failed to ship. Please try again.");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const executeAction = async (order: ParsedOrder, newStatus: string, extraData: any = {}) => {
        setLoadingActionId(order['Order ID']);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token || '';
            if (extraData['Package Photo'] === '') {
                localStorage.removeItem(`package_photo_${order['Order ID']}`);
            }
            await fetch(`${WEB_APP_URL}/api/admin/update-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                body: JSON.stringify({ orderId: order['Order ID'], team: order.Team, userName: currentUser?.FullName || 'System', newData: { 'Fulfillment Status': newStatus, ...extraData } })
            });
            setLocalRefreshTick(t => t + 1);
        } finally { setLoadingActionId(null); }
    };

    const handleConfirmReturnReceipt = async (photo: string) => {
        if (!returningOrder) return;
        if (!returnReason.trim()) {
            alert("សូមបញ្ចូលមូលហេតុ Return (Please enter return reason)");
            return;
        }
        setIsSubmittingReturn(true);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const authToken = session?.token;
            if (!authToken) throw new Error("Session expired");

            // Prepare metadata for order update
            const metadata = {
                'Fulfillment Status': 'Returned',
                'Return Received By': currentUser?.FullName || 'Staff',
                'Return Received Time': new Date().toISOString().slice(0, 19).replace('T', ' ')
            };

            // Call backend upload-image endpoint
            const response = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    fileData: photo,
                    fileName: `return_${returningOrder['Order ID']}_${Date.now()}.webp`,
                    mimeType: "image/webp",
                    orderId: returningOrder['Order ID'],
                    team: returningOrder.Team,
                    userName: currentUser?.UserName || 'System',
                    targetColumn: "Return Photo",
                    newData: {
                        ...metadata,
                        'Return Reason': returnReason
                    }
                })
            });

            const result = await response.json();
            if (!response.ok || result.status !== 'success') {
                throw new Error(result.message || 'ការផ្ញើរូបភាពបរាជ័យ (Image upload failed)');
            }

            setIsReturnPhotoModalOpen(false);
            setReturningOrder(null);
            setReturnPhoto(null);
            setReturnReason('');
            
            // Refresh data immediately
            await refreshData();
            setLocalRefreshTick(t => t + 1);
        } catch (error: any) { 
            alert("មានបញ្ហាពេលបញ្ជាក់ការទទួល: " + error.message); 
        } finally {
            setIsSubmittingReturn(false);
        }
    };

    // 5. Early Return for Store Selection
    if (!selectedStore) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 bg-[#0B0E11] font-sans relative overflow-hidden">
                <div className="absolute top-0 left-0 p-6 z-50">
                    <button 
                        onClick={() => {
                            if (onExit) onExit();
                            else setAppState('role_selection');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-[0.98] group"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm font-bold uppercase tracking-wider">Back</span>
                    </button>
                </div>
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#FCD535]/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#FCD535]/[0.02] rounded-full blur-[150px] translate-x-1/2 translate-y-1/2"></div>
                <div className="w-full max-w-md space-y-12 text-center relative z-10 animate-fade-in">
                    <div className="space-y-4">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-[2rem] bg-[#FCD535]/10 border border-[#FCD535]/20 flex items-center justify-center shadow-[0_0_50px_rgba(252,213,53,0.1)]">
                                <svg className="w-10 h-10 text-[#FCD535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-[0.2em] drop-shadow-2xl">Packaging Hub</h2>
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-[1px] w-8 bg-white/10"></div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Initialize secure protocol</p>
                            <div className="h-[1px] w-8 bg-white/10"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {availableStores.map((store, idx) => (
                            <button 
                                key={store} 
                                onClick={() => setSelectedStore(store)} 
                                className="group relative overflow-hidden bg-white/[0.03] hover:bg-[#FCD535] border border-white/5 hover:border-[#FCD535] w-full p-8 flex justify-between items-center transition-all duration-500 rounded-2xl active:scale-[0.98] shadow-2xl"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex flex-col items-start gap-1 relative z-10">
                                    <span className="text-[10px] font-black text-gray-500 group-hover:text-black/40 uppercase tracking-widest transition-colors">Select Node</span>
                                    <span className="text-xl font-black text-white group-hover:text-black uppercase tracking-[0.1em] transition-colors">{store}</span>
                                </div>
                                <div className="relative z-10 w-12 h-12 rounded-xl bg-white/5 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                    <span className="text-[#FCD535] group-hover:text-black group-hover:translate-x-1 transition-all text-2xl">→</span>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        ))}
                        {availableStores.length === 0 && (
                            <div className="p-12 rounded-2xl border border-dashed border-white/10 text-gray-600">
                                <p className="text-sm font-bold uppercase tracking-widest">No Active Nodes Found</p>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] pt-8">Authorized Access Only</p>
                </div>
            </div>
        );
    }

    // 6. Hub Props & Main Render
    const fetchAllFilteredOrders = async () => {
        try {
            const result = await fetchPackagingOrders(buildPackagingOrderParams(10000, 0, debouncedSearchTerm));
            if (result && result.orders) {
                return result.orders;
            }
        } catch (error) {
            console.error("Failed to fetch all orders for export/print:", error);
        }
        return [];
    };

    const hubProps = {
        orders: filteredOrders, 
        shippingCounts,
        activeTab, 
        setActiveTab: (tab: any) => {
            setActiveTab(tab);
            if (tab === 'Pending') {
                setSearchTerm('');
                setShippingFilter('');
            }
        }, 
        searchTerm, 
        setSearchTerm,
        onPack: async (order: ParsedOrder) => {
            if (isViewOnly) return;
            setPackingOrder(order);
            try {
                const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
                const token = session?.token || '';
                await fetch(`${WEB_APP_URL}/api/admin/update-order`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
                    },
                    body: JSON.stringify({ 
                        orderId: order['Order ID'], 
                        team: order.Team, 
                        userName: currentUser?.FullName || 'System', 
                        newData: { 
                            'PackingStartTime': 'NOW',
                            'Packed By': currentUser?.FullName || 'Packer'
                        } 
                    })
                });
            } catch (err) {
                console.error("Failed to set packing start time:", err);
            }
        },
        onShip: (order: ParsedOrder) => !isViewOnly && executeAction(order, 'Shipped', { 'Dispatched Time': new Date().toISOString().slice(0, 19).replace('T', ' '), 'Dispatched By': currentUser?.FullName || 'Packer' }),
        onDeliver: (order: ParsedOrder) => {
            if (isViewOnly) return;
            const extra: any = { 'Delivered Time': new Date().toISOString().slice(0, 19).replace('T', ' ') };
            if (!order['Driver Name'] && !order['Internal Shipping Details']) {
                extra['Internal Shipping Details'] = order['Internal Shipping Method'] || 'Hub Operation';
            }
            executeAction(order, 'Delivered', extra);
        },
        onUndo: (o: ParsedOrder) => !isViewOnly && setUndoConfirmation({ order: o, type: 'pending', isOpen: true }),
        onUndoShipped: (o: ParsedOrder) => !isViewOnly && setUndoConfirmation({ order: o, type: 'ready', isOpen: true }),
        onUnpack: (order: ParsedOrder, skipConfirm = false) => {
            if (isViewOnly) return;
            if (skipConfirm || window.confirm("តើអ្នកប្រាកដថាបានហែកកញ្ចប់ និងទុកឥវ៉ាន់ចូលស្តុកវិញរួចរាល់ហើយមែនទេ?")) {
                executeAction(order, 'Cancelled', { 
                    'Return Received By': currentUser?.FullName || 'Staff',
                    'Return Received Time': new Date().toISOString().slice(0, 19).replace('T', ' '),
                    'Cancel Reason': order['Return Reason'] || 'Returned and Unpacked'
                });
            }
        },
        onView: (order: ParsedOrder) => setViewingOrder(order),
        onConfirmReturn: (order: ParsedOrder) => {
            if (isViewOnly) return;
            setReturningOrder(order);
            setReturnReason('');
            setIsReturnPhotoModalOpen(true);
        },
        onPrintManifest: async () => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert("សូមអនុញ្ញាតឲ្យបើក Popups ដើម្បីបោះពុម្ព Manifest");
                return;
            }
            printWindow.document.write('<html><head><title>Loading Manifest...</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0B0E11;color:#fff;}</style></head><body><div><h2>កំពុងទាញយកទិន្នន័យ Manifest... (Loading...)</h2></div></body></html>');
            
            const allOrders = await fetchAllFilteredOrders();
            if (allOrders.length === 0) {
                printWindow.document.body.innerHTML = '<h2>មិនមានទិន្នន័យត្រូវបោះពុម្ពទេ (No orders to print)</h2>';
                setTimeout(() => printWindow.close(), 2000);
                return;
            }

            const html = `<html><head><title>Dispatch Manifest - ${selectedStore}</title><style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; } th { background-color: #f2f2f2; } h1 { font-size: 18px; margin-bottom: 5px; } .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; }</style></head><body><div class="header"><h1>Dispatch Manifest: ${selectedStore}</h1><p>Date: ${new Date().toLocaleString('km-KH')}</p></div><table><thead><tr><th>#</th><th>Order ID</th><th>Customer</th><th>Phone</th><th>Location</th><th>Driver</th><th>Total</th></tr></thead><tbody>${allOrders.map((o, i) => `<tr><td>${i + 1}</td><td>${o['Order ID']}</td><td>${o['Customer Name']}</td><td>${o['Customer Phone']}</td><td>${o.Location}</td><td>${o['Driver Name'] || 'TBD'}</td><td>$${(Number(o['Grand Total']) || 0).toFixed(2)}</td></tr>`).join('')}</tbody></table><script>window.onload = () => { window.print(); window.close(); }</script></body></html>`;
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        },
        onExportPdf: async () => {
            setIsExportLoading(true);
            const allOrders = await fetchAllFilteredOrders();
            setExportOrders(allOrders);
            setIsExportLoading(false);
            if (allOrders.length > 0) {
                setIsExportModalOpen(true);
            } else {
                alert("មិនមានទិន្នន័យសម្រាប់ទាញយកទេ (No data to export)");
            }
        },
        isExportLoading,
        onSwitchHub: () => setSelectedStore(''),
        onExit: () => {
            if (onExit) onExit();
            else setAppState('role_selection');
        },
        onCloseShift: handleCloseShift,
        shippingFilter, setShippingFilter, teamFilter, setTeamFilter,
        selectedStore, tabCounts, viewMode, setViewMode, loadingActionId: isShiftLoading ? 'shift-loading' : (isLocalOrdersLoading ? 'orders-loading' : loadingActionId),
        selectedOrderIds, toggleOrderSelection: (id: string) => !isViewOnly && setSelectedOrderIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }),
        clearSelection: () => setSelectedOrderIds(new Set()),
        onToggleSelectAll: (orders: ParsedOrder[]) => !isViewOnly && onToggleSelectAll(orders),
        onBulkShip: () => !isViewOnly && onBulkShip(),
        isBulkProcessing, progressStats, isFilterModalOpen, setIsFilterModalOpen, isViewOnly, activeShift,
        currentPage, totalPages, setCurrentPage, pageSize, setPageSize, totalOrdersCount,
        onGenerateDispatchList: async () => {
            setIsDispatchLoading(true);
            const allOrders = await fetchAllFilteredOrders();
            setDeliveryOrders(allOrders);
            setIsDispatchLoading(false);
            if (allOrders.length > 0) {
                setIsDeliveryModalOpen(true);
            } else {
                alert("មិនមានទិន្នន័យដើម្បីបង្កើត Dispatch List ទេ / No orders found");
            }
        },
        isDispatchLoading
    };

    return (
        <div className="fixed inset-0 z-[150] bg-[#0B0E11] overflow-hidden flex flex-col font-sans">
            {(ordersFetchError || localOrdersFetchError) && (
                <div className="absolute top-0 inset-x-0 z-[210] bg-[#F6465D] text-white py-3.5 px-6 flex items-center justify-between shadow-2xl border-b border-[#F6465D] animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <div className="text-sm font-bold tracking-wide">
                            {(ordersFetchError || localOrdersFetchError) === 'permission_denied' 
                                ? 'គ្មានសិទ្ធិចូលប្រើប្រាស់ទិន្នន័យនេះទេ (Permission Denied)' 
                                : 'មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេ (Network Connection Error)'}
                        </div>
                    </div>
                    <button 
                        onClick={() => setLocalRefreshTick(t => t + 1)}
                        className="px-4 py-1.5 bg-white text-[#F6465D] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-md"
                    >
                        ព្យាយាមម្តងទៀត (Retry)
                    </button>
                </div>
            )}



            {deviceType === 'mobile' && <MobilePackagingHub {...hubProps} />}
            {deviceType === 'tablet' && <TabletPackagingHub {...hubProps} />}
            {deviceType === 'desktop' && <DesktopPackagingHub {...hubProps} />}

            {isShiftModalOpen && (
                <Modal isOpen={true} onClose={() => {/* prevent accidental close */}} maxWidth="max-w-md">
                    <div className="bg-[#1E2329] border border-[#2B3139] p-8 space-y-8 rounded-2xl animate-in fade-in zoom-in duration-300">
                        {shiftStep === 'options' && (
                            <div className="space-y-6 text-center">
                                <div className="w-20 h-20 bg-[#FCD535]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-[#FCD535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-wider">{selectedStore}</h3>
                                <p className="text-gray-400 text-sm">សូមជ្រើសរើសជម្រើសខាងក្រោម៖</p>
                                <div className="grid grid-cols-1 gap-4 pt-4">
                                    <button onClick={() => { setIsViewOnly(true); setIsShiftModalOpen(false); }} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10">👀 ចូលមើល (View Only)</button>
                                    <button 
                                        onClick={handleOpenShift} 
                                        disabled={isShiftLoading} 
                                        className="w-full py-4 bg-[#FCD535] hover:bg-[#FCD535]/90 text-black font-bold rounded-xl transition-all shadow-xl shadow-[#FCD535]/10 flex items-center justify-center"
                                    >
                                        {isShiftLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                                <span>កំពុងបើកវេន...</span>
                                            </div>
                                        ) : (
                                            '🔑 បើកវេន (Open Shift)'
                                        )}
                                    </button>
                                    <button onClick={() => { setIsShiftModalOpen(false); setSelectedStore(''); }} className="w-full py-3 bg-transparent text-gray-500 hover:text-gray-300 font-bold rounded-xl transition-all border border-white/5 hover:border-white/10 text-sm">← ត្រឡប់ (ជ្រើសឃ្លាំងផ្សេង)</button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {undoTarget && undoTarget.isOpen && (
                <Modal isOpen={true} onClose={() => { setUndoConfirmation(null); setUndoPassword(''); }} maxWidth="max-w-md">
                    <div className="bg-[#1E2329] border border-[#2B3139] p-8 space-y-8 rounded-2xl animate-in fade-in zoom-in duration-300">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto"><svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                            <h3 className="text-xl font-black text-white uppercase tracking-wider">បញ្ជាក់ការ Undo</h3>
                            <p className="text-gray-400 text-sm">សូមបញ្ចូលលេខសម្ងាត់របស់ <span className="text-[#FCD535] font-bold">@{activeShift?.OpenedBy}</span> ដើម្បីបន្ត។</p>
                        </div>
                        <div className="space-y-4">
                            <input type="password" placeholder="លេខសម្ងាត់ (Shift Password)" value={undoPassword} onChange={e => setUndoPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUndoConfirm()} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl px-5 py-4 text-white focus:border-[#FCD535] outline-none transition-all font-mono" autoFocus />
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => { setUndoConfirmation(null); setUndoPassword(''); }} className="flex-1 py-4 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition-all">បោះបង់</button>
                                <button onClick={handleUndoConfirm} disabled={isUndoVerifying} className="flex-grow py-4 bg-[#FCD535] text-black font-bold rounded-xl hover:bg-[#FCD535]/90 transition-all shadow-lg flex items-center justify-center">{isUndoVerifying ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div><span>កំពុងផ្ទៀងផ្ទាត់...</span></div> : 'បញ្ជាក់ Undo'}</button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {packingOrder && (
                <FastPackTerminal 
                    order={packingOrder} 
                    onClose={async () => {
                        const targetOrder = packingOrder;
                        setPackingOrder(null);
                        try {
                            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
                            const token = session?.token || '';
                            await fetch(`${WEB_APP_URL}/api/admin/update-order`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json', 
                                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
                                },
                                body: JSON.stringify({ 
                                    orderId: targetOrder['Order ID'], 
                                    team: targetOrder.Team, 
                                    userName: currentUser?.FullName || 'System', 
                                    newData: { 
                                        'PackingStartTime': '',
                                        'Packed By': ''
                                    } 
                                })
                            });
                        } catch (err) {
                            console.error("Failed to clear packing start time:", err);
                        }
                    }} 
                    onSuccess={() => { setPackingOrder(null); setActiveTab('Ready to Ship'); setLocalRefreshTick(t => t + 1); }} 
                />
            )}
            
            {viewingOrder && <OrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}

             {isReturnPhotoModalOpen && returningOrder && (
                 <Modal isOpen={true} onClose={() => { if (!isSubmittingReturn) { setIsReturnPhotoModalOpen(false); setReturningOrder(null); setReturnReason(''); } }} maxWidth="max-w-xl" plain={true}>
                     <div className="bg-[#1E2329] border border-[#2B3139] overflow-hidden rounded-[3rem] border-white/10 p-6 space-y-6 animate-fade-in">
                         {/* Header with Order Info */}
                         <div className="flex items-center justify-between border-b border-[#2B3139] pb-4 bg-[#0B0E11] -mx-6 -mt-6 p-5">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                     <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                 </div>
                                 <div className="min-w-0">
                                     <h3 className="text-sm font-black text-[#EAECEF] uppercase tracking-wider truncate">បញ្ជាក់ការទទួល Return</h3>
                                     <p className="text-[10px] font-mono text-[#FCD535] mt-0.5">#{returningOrder['Order ID']}</p>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-widest">អតិថិជន (Customer)</p>
                                 <p className="text-xs font-bold text-[#EAECEF] truncate max-w-[150px]">{returningOrder['Customer Name']}</p>
                             </div>
                         </div>
 
                         {isSubmittingReturn ? (
                             <div className="flex flex-col items-center justify-center space-y-4 py-12">
                                 <Spinner size="lg" />
                                 <p className="text-sm font-bold text-[#EAECEF]">កំពុងបញ្ជាក់ការទទួល Return... (Saving...)</p>
                             </div>
                         ) : (
                             <div className="space-y-4">
                                 {/* Return Reason Input & Recommendations */}
                                 <div className="space-y-3 bg-[#0B0E11] p-4 rounded-xl border border-[#2B3139]">
                                     <label className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                         <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                         មូលហេតុ Return (Return Reason) <span className="text-red-500">*</span>
                                     </label>
                                     
                                     <textarea
                                         value={returnReason}
                                         onChange={(e) => setReturnReason(e.target.value)}
                                         placeholder="សូមបញ្ចូលមូលហេតុនៃការត្រឡប់មកវិញ..."
                                         className="w-full bg-[#12161A] border border-[#2B3139] text-[#EAECEF] rounded-xl p-3 text-xs outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 min-h-[70px] resize-none transition-all placeholder:text-gray-600"
                                     />
                                     
                                     {/* Predefined Recommendations */}
                                     <div className="space-y-2">
                                         <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-wider">អនុសាសន៍ (Recommended Reasons):</p>
                                         <div className="flex flex-wrap gap-1.5">
                                             {['អតិថិជនមិនទទួលកញ្ចប់', 'ឥវ៉ាន់មានបញ្ហា/ខូចខាត', 'ឥវ៉ាន់មិនត្រឹមត្រូវ/ផ្ញើខុស', 'ទាក់ទងមិនបានពេលដឹក', 'ដឹកយូរពេក អតិថិជនមិនចាំ'].map((recReason) => (
                                                 <button
                                                     key={recReason}
                                                     type="button"
                                                     onClick={() => setReturnReason(recReason)}
                                                     className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all duration-300 border flex items-center justify-center active:scale-95 ${
                                                         returnReason === recReason
                                                             ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                                                             : 'bg-[#12161A] border-[#2B3139] text-gray-400 hover:border-purple-500/40 hover:text-purple-300 hover:scale-[1.02]'
                                                     }`}
                                                 >
                                                     {recReason}
                                                 </button>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
 
                                 <CameraCapture 
                                     onCapture={handleConfirmReturnReceipt}
                                     onCancel={() => { setIsReturnPhotoModalOpen(false); setReturningOrder(null); setReturnReason(''); }}
                                     orderId={returningOrder['Order ID']}
                                     customerName={returningOrder['Customer Name']}
                                     theme="purple"
                                 />
                             </div>
                         )}
                     </div>
                 </Modal>
             )}

            {isFilterModalOpen && (
                <Modal isOpen={true} onClose={() => setIsFilterModalOpen(false)} maxWidth="max-w-lg">
                    <div className="bg-[#1E2329] border border-[#2B3139] p-6 space-y-6 rounded-2xl">
                        <div className="flex justify-between items-center border-b border-[#2B3139] pb-4">
                            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#FCD535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                OPS FILTERS
                            </h3>
                            <button onClick={() => setIsFilterModalOpen(false)} className="text-[#848E9C] hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Team Selection */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em]">Select Team</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                    <button 
                                        onClick={() => setTeamFilter('')}
                                        className={`py-3 rounded-xl text-xs font-bold uppercase transition-all border ${!teamFilter ? 'bg-[#FCD535] border-[#FCD535] text-black shadow-lg shadow-[#FCD535]/10' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:border-[#FCD535]/50'}`}
                                    >
                                        All Teams
                                    </button>
                                    {availableTeams.map(team => (
                                        <button 
                                            key={team}
                                            onClick={() => setTeamFilter(team)}
                                            className={`py-3 rounded-xl text-xs font-bold uppercase transition-all border ${teamFilter === team ? 'bg-[#FCD535] border-[#FCD535] text-black shadow-lg shadow-[#FCD535]/10' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:border-[#FCD535]/50'}`}
                                        >
                                            Team {team}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Carrier Selection */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em]">Shipping Carrier</p>
                                <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                                    <button 
                                        onClick={() => setShippingFilter('')}
                                        className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all border ${!shippingFilter ? 'bg-[#FCD535] border-[#FCD535] text-black shadow-lg shadow-[#FCD535]/10' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:border-[#FCD535]/50'}`}
                                    >
                                        All Carriers
                                    </button>
                                    {appData.shippingMethods?.filter((m: any) => m.Status !== 'Inactive').map((method: any) => (
                                        <button
                                            key={method.MethodName}
                                            onClick={() => setShippingFilter(method.MethodName)}
                                            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all border flex items-center gap-2 ${shippingFilter === method.MethodName ? 'bg-[#FCD535] border-[#FCD535] text-black shadow-lg shadow-[#FCD535]/10' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:border-[#FCD535]/50'}`}
                                        >
                                            {method.LogoURL && <img src={convertGoogleDriveUrl(method.LogoURL)} alt="" className="w-4 h-4 object-contain" />}
                                            <span className="truncate">{method.MethodName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Filter */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em]">Date Range</p>
                                <DateRangeFilter
                                    dateRange={datePreset}
                                    onRangeChange={setDatePreset}
                                    customStart={startDate}
                                    onCustomStartChange={setStartDate}
                                    customEnd={endDate}
                                    onCustomEndChange={setEndDate}
                                />
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em]">Quick Actions</p>
                                <button 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setShippingFilter('');
                                        setTeamFilter('');
                                        setDatePreset('all');
                                        setStartDate('');
                                        setEndDate('');
                                        setIsFilterModalOpen(false);
                                    }}
                                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Reset All Filters
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={() => setIsFilterModalOpen(false)}
                                className="w-full py-4 bg-[#FCD535] hover:bg-[#FCD535]/90 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-[#FCD535]/10 transition-all active:scale-[0.98]"
                            >
                                Apply Configuration
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Close Shift Confirmation Modal */}
            {isCloseShiftConfirmOpen && closeShiftStats && (
                <Modal isOpen={true} onClose={() => setIsCloseShiftConfirmOpen(false)} maxWidth="max-w-md">
                    <div className="bg-[#181A20] rounded-xl border border-[#2B3139] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex-shrink-0 p-5 border-b border-[#2B3139] bg-[#0B0E11] flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-[#EAECEF] uppercase tracking-wider">បិទវេន (Close Shift)</h3>
                                    <p className="text-[11px] text-[#848E9C] font-bold mt-0.5">ផ្ទៀងផ្ទាត់ទិន្នន័យវេចខ្ចប់</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCloseShiftConfirmOpen(false)} className="p-2 text-[#848E9C] hover:text-[#EAECEF] bg-[#2B3139]/50 hover:bg-[#2B3139] rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 bg-gradient-to-b from-[#0B0E11] to-[#181A20]">
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#2B3139]/30 border border-[#2B3139] rounded-xl p-4 flex flex-col items-center text-center shadow-inner">
                                    <span className="text-[10px] font-black text-[#848E9C] uppercase tracking-widest mb-2">វេចខ្ចប់សរុប (Packed)</span>
                                    <span className="text-4xl font-mono font-black text-[#FCD535]">{closeShiftStats.packed}</span>
                                </div>
                                <div className="bg-[#2B3139]/30 border border-[#2B3139] rounded-xl p-4 flex flex-col items-center text-center shadow-inner">
                                    <span className="text-[10px] font-black text-[#848E9C] uppercase tracking-widest mb-2">បញ្ជូនចេញ (Shipped)</span>
                                    <span className="text-4xl font-mono font-black text-[#0ECB81]">{closeShiftStats.shipped}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <span className="text-[10px] font-black text-[#848E9C] uppercase tracking-widest block mb-2 px-1">បែងចែកតាមក្រុមហ៊ុនដឹកជញ្ជូន</span>
                                <div className="border border-[#2B3139] rounded-xl divide-y divide-[#2B3139] bg-[#0B0E11]/40 overflow-hidden">
                                    {Object.entries(closeShiftStats.shippingCounts).map(([method, count]) => (
                                        <div key={method} className="flex justify-between items-center p-3.5 hover:bg-[#2B3139]/20 transition-colors">
                                            <span className="text-xs text-[#EAECEF] font-bold">{method}</span>
                                            <span className="text-xs font-mono font-bold text-[#FCD535] bg-[#FCD535]/15 border border-[#FCD535]/20 px-2 py-0.5 rounded-md">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(closeShiftStats.shippingCounts).length === 0 && (
                                        <div className="p-4 text-center text-[#848E9C] text-xs">មិនមានទិន្នន័យដឹកជញ្ជូនទេ</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 p-5 bg-[#0B0E11] border-t border-[#2B3139] flex gap-3 sticky bottom-0 z-10">
                            <button 
                                onClick={() => setIsCloseShiftConfirmOpen(false)}
                                className="flex-1 py-3.5 bg-[#2B3139] hover:bg-[#3B424A] text-[#EAECEF] font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                            >
                                បោះបង់ (Cancel)
                            </button>
                            <button 
                                onClick={confirmCloseShift}
                                disabled={isShiftLoading}
                                className="flex-[1.5] py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-70 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isShiftLoading ? (
                                    <>
                                        <Spinner size="sm" /> កំពុងដំណើរការ...
                                    </>
                                ) : (
                                    'បញ្ជាក់ការបិទវេន'
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {isExportModalOpen && (
                <PdfExportModal 
                    isOpen={true} 
                    onClose={() => setIsExportModalOpen(false)} 
                    orders={exportOrders} 
                    appData={appData} 
                />
            )}

            <DeliveryListGeneratorModal 
                isOpen={isDeliveryModalOpen} 
                onClose={() => setIsDeliveryModalOpen(false)} 
                orders={deliveryOrders} 
                appData={appData}
                initialStore={selectedStore} 
            />
        </div>
    );
};

export default PackagingView;

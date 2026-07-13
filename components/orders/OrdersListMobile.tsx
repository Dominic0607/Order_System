import React, { useContext, useState, useMemo, memo } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { translations } from '../../translations';
import Spinner from '../common/Spinner';
import { MobileGrandTotalCard } from './OrderGrandTotal';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { getValidDate } from '../../utils/dateUtils';
import { Edit2, Check, Truck, Warehouse, MapPin, Clock, Globe, Package } from 'lucide-react';

interface OrdersListMobileProps {
    orders: ParsedOrder[];
    totals: { grandTotal: number; internalCost: number; count: number; paidCount: number; unpaidCount: number };
    visibleColumns?: Set<string>;
    selectedIds: Set<string>;
    isSelectionMode?: boolean;
    onToggleSelect?: (id: string) => void;
    onEdit?: (order: ParsedOrder) => void;
    onView?: (order: ParsedOrder) => void;
    handlePrint: (order: ParsedOrder) => void;
    handleCopy: (id: string) => void;
    handleCopyTemplate: (order: ParsedOrder) => void;
    copiedId: string | null;
    copiedTemplateId: string | null;
    toggleOrderVerified: (id: string, currentStatus: boolean) => void;
    handleUpdateFulfillmentStatus: (id: string, newStatus: string) => void;
    handleSendTelegram: (id: string) => void;
    updatingIds: Set<string>;
    groupBy?: string;
    viewMode?: 'card' | 'list';
}

// --- Sub-components ---

const FulfillmentBadge = memo(({ status }: { status: string }) => {
    const fsC: Record<string, string> = { 
        'Pending': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 
        'Scheduled': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
        'Ready to Ship': 'bg-blue-500/10 text-blue-500 border-blue-500/20', 
        'Shipped': 'bg-purple-500/10 text-purple-500 border-purple-500/20', 
        'Delivered': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', 
        'Cancelled': 'bg-red-500/10 text-red-500 border-red-500/20',
        'Returned': 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    };
    
    return (
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border uppercase tracking-wider ${fsC[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
            {status}
        </span>
    );
});

const TelegramStatusIcon = memo(({ 
    order, 
    handleSendTelegram, 
    isUpdating, 
    isBinance, 
    t 
}: { 
    order: ParsedOrder, 
    handleSendTelegram: (id: string) => void, 
    isUpdating: boolean, 
    isBinance: boolean, 
    t: any 
}) => {
    const id1 = order['Telegram Message ID 1'];
    const id2 = order['Telegram Message ID 2'];
    const isChecking = id1 === 'CHECKING';
    const isSent = (id1 && id2) && !isChecking;

    if (isSent) {
        return (
            <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase tracking-tighter" title={t.msg_sent}>
                <Check size={10} strokeWidth={4}/> {t.msg_sent}
            </div>
        );
    }

    if (isChecking) {
        return (
            <div className="flex items-center gap-1 text-blue-400 text-[9px] font-black uppercase tracking-tighter animate-pulse">
                <Spinner size="xs" className="scale-75" /> 
                <span className="hidden xs:inline">Checking...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 text-red-500 text-[9px] font-black uppercase tracking-tighter italic">
            {t.msg_not_sent}
        </div>
    );
});

const TelegramSendButton = memo(({ 
    orderId, 
    handleSendTelegram, 
    isUpdating, 
    isBinance,
    isLightMode
}: { 
    orderId: string, 
    handleSendTelegram: (id: string) => void, 
    isUpdating: boolean, 
    isBinance: boolean,
    isLightMode: boolean
}) => {
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); handleSendTelegram(orderId); }} 
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all active:scale-90 ${
                isBinance 
                ? 'bg-[#FCD535] border-[#FCD535] text-[#181A20]' 
                : (isLightMode ? 'bg-blue-55 text-blue-600 border-blue-200 hover:bg-blue-100/50' : 'bg-blue-600/10 text-blue-500 border-blue-500/20 active:bg-blue-600 active:text-white')
            }`}
        >
            {isUpdating ? <Spinner size="xs" /> : <Globe size={13} strokeWidth={2.5} />}
        </button>
    );
});

// --- Main Component ---

const OrdersListMobile: React.FC<OrdersListMobileProps> = ({
    orders, totals, visibleColumns, selectedIds, isSelectionMode, onToggleSelect, onEdit, onView,
    handlePrint, handleCopy, handleCopyTemplate, copiedId, copiedTemplateId, toggleOrderVerified, 
    handleUpdateFulfillmentStatus, handleSendTelegram, updatingIds, groupBy = 'none', viewMode = 'card'
}) => {
    const { currentUser, hasPermission, advancedSettings, language, appData } = useContext(AppContext);
    const t = translations[language];
    const [displayCount, setDisplayCount] = useState(20);

    const isLightMode = advancedSettings?.themeMode === 'light';
    const isBinance = advancedSettings?.uiTheme === 'binance';
    
    const visibleOrders = useMemo(() => orders.slice(0, displayCount), [orders, displayCount]);
    
    const groupedData = useMemo(() => {
        if (groupBy === 'none') return [{ label: '', orders: visibleOrders }];
        const groups: Record<string, ParsedOrder[]> = {};
        visibleOrders.forEach(o => { 
            const key = String((o as any)[groupBy] || 'Unassigned'); 
            if (!groups[key]) groups[key] = []; 
            groups[key].push(o); 
        });
        return Object.entries(groups).map(([label, items]) => ({ label, orders: items }));
    }, [visibleOrders, groupBy]);

    const handleLoadMore = () => setDisplayCount(prev => prev + 20);

    const canEditOrder = (order: ParsedOrder) => {
        if (!currentUser) return false;
        const isVerified = order.IsVerified === true || String(order.IsVerified).toUpperCase() === 'TRUE' || order.IsVerified === 'A';
        if (isVerified) return currentUser.IsSystemAdmin || currentUser.Role === 'Admin';
        if (currentUser.IsSystemAdmin) return true;
        if (!hasPermission('edit_order')) return false;

        // If they have edit_order_global permission, they can view and edit all orders without team or time limit
        if (hasPermission('edit_order_global')) return true;

        const userTeams = (currentUser.Team || '').split(',').map(t => t.trim());
        if (!userTeams.includes(order.Team)) return false;
        const orderTime = getValidDate(order.Timestamp).getTime();
        return (Date.now() - orderTime) < 43200000; // 12 hours
    };

    const isVisible = (key: string) => !visibleColumns || visibleColumns.has(key);
    const showVerify = isVisible('check');

    const formatPhone = (val: string) => {
        let phone = (val || '').replace(/[^0-9]/g, '');
        if (phone.length > 0) phone = '0' + phone.replace(/^0+/, '');
        return phone;
    };

    const renderOrderCard = (order: ParsedOrder, idx: number) => {
        const isVerified = order.IsVerified === true || String(order.IsVerified).toUpperCase() === 'TRUE' || order.IsVerified === 'A';
        const isSelected = selectedIds.has(order['Order ID']);
        const isPaid = order['Payment Status'] === 'Paid';
        const orderTotal = Number(order['Grand Total']) || 0;
        const displayIndex = idx + 1;

        const products = Array.isArray(order.Products) ? order.Products : [];
        const mainProduct = products[0];
        const productCount = products.length;

        const fs = (order as any).FulfillmentStatus || (order as any)['Fulfillment Status'] || 'Pending';
        const isCancelled = fs === 'Cancelled';
        const isReturned = fs === 'Returned';

        const id1 = order['Telegram Message ID 1'];
        const id2 = order['Telegram Message ID 2'];
        const isChecking = id1 === 'CHECKING';
        const isSent = (id1 && id2) && !isChecking;

        const displayPhone = formatPhone(order['Customer Phone']);
        const carrier = appData?.phoneCarriers?.find(c =>
            String(c.Prefixes || '').split(',').map(p => p.trim()).filter(Boolean).includes(displayPhone.substring(0, 3))
        );
        const carrierLogo = carrier?.CarrierLogoURL;

        const shippingMethod = appData?.shippingMethods?.find(m => m.MethodName === order['Internal Shipping Method']);
        const shippingLogo = shippingMethod?.LogoURL;

        const packagePhoto = order['Package Photo'];

        return (
            <div 
                key={order['Order ID']}
                onClick={() => (selectedIds.size > 0 || isSelectionMode) ? onToggleSelect?.(order['Order ID']) : onView?.(order)}
                className={`relative group border rounded-xl p-3 transition-all duration-300 active:scale-[0.99] overflow-hidden ${
                    isLightMode ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-[#0f172a]/60 border-white/5 shadow-lg'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isCancelled || isReturned ? 'opacity-70' : ''}`}
            >
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${isPaid ? 'bg-emerald-500' : 'bg-red-500'}`} />

                {/* Watermark for special statuses */}
                {(isCancelled || isReturned) && (
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] pointer-events-none z-10 opacity-10 font-black text-5xl tracking-[0.2em] whitespace-nowrap select-none ${isCancelled ? 'text-red-500' : 'text-purple-500'}`}>
                        {isCancelled ? 'CANCELLED' : 'RETURNED'}
                    </div>
                )}

                {/* Card Header */}
                <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <div 
                                onClick={(e) => { e.stopPropagation(); onToggleSelect?.(order['Order ID']); }}
                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                    isSelected ? 'bg-blue-600 border-blue-600' : (isLightMode ? 'border-slate-300 bg-slate-50' : 'border-white/10 bg-black/20')
                                }`}
                            >
                                {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                            </div>
                        ) : isVisible('index') && (
                            <span className={`text-[10px] font-mono font-black ${isLightMode ? 'text-slate-400' : 'text-gray-500'} opacity-50`}>#{displayIndex}</span>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {isVisible('status') && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border ${
                                    isPaid 
                                        ? (isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20') 
                                        : (isLightMode ? 'bg-red-50 text-red-700 border-red-200/50' : 'bg-red-500/10 text-red-500 border-red-500/20')
                                }`}>
                                    {isPaid ? 'PAID' : 'UNPAID'}
                                </span>
                            )}
                            {isVisible('fulfillmentStatus') && <FulfillmentBadge status={fs} />}
                            {(order['Cancel Reason'] || order['Return Reason']) && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border uppercase tracking-tight flex items-center gap-1 ${
                                    isCancelled 
                                        ? (isLightMode ? 'bg-red-50 text-red-700 border-red-200/50' : 'bg-red-500/10 text-red-500 border-red-500/20') 
                                        : (isLightMode ? 'bg-purple-50 text-purple-700 border-purple-200/50' : 'bg-purple-500/10 text-purple-400 border-purple-500/20')
                                }`}>
                                    <Clock size={8} /> {order['Cancel Reason'] || order['Return Reason']}
                                </span>
                            )}
                            {showVerify && isVerified && (
                                <div className="flex items-center gap-0.5 text-emerald-500 text-[9px] font-black uppercase">
                                    <Check size={9} strokeWidth={4}/> VERIFIED
                                </div>
                            )}
                            {isVisible('telegramStatus') && (
                                <TelegramStatusIcon 
                                    order={order} 
                                    handleSendTelegram={handleSendTelegram} 
                                    isUpdating={updatingIds.has(order['Order ID'])}
                                    isBinance={isBinance}
                                    t={t}
                                />
                            )}
                        </div>
                    </div>
                    {isVisible('total') && (
                        <div className="text-right">
                            <div className={`text-[18px] font-black ${isLightMode ? 'text-slate-900' : 'text-white'} tabular-nums leading-none tracking-tighter flex items-center justify-end`}>
                                <span className={`text-[11px] ${isLightMode ? 'text-blue-600' : 'text-blue-400'} mr-0.5 opacity-80`}>$</span>
                                {orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className={`flex gap-3 mb-2.5 pb-2.5 border-b border-dashed ${isLightMode ? 'border-slate-200/80' : 'border-white/5'}`}>
                    {isVisible('productInfo') && (
                        <div className={`w-14 h-14 rounded-lg shrink-0 relative overflow-hidden border ${
                            isLightMode ? 'bg-slate-100 border-slate-200/80' : 'bg-black/20 border-white/5'
                        }`}>
                            {mainProduct?.image ? (
                                <img 
                                    src={convertGoogleDriveUrl(mainProduct.image)} 
                                    className="w-full h-full object-cover" 
                                    alt={mainProduct.name || "Product"} 
                                    loading="lazy"
                                />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center text-[8px] font-black ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>NO IMAGE</div>
                            )}
                            {productCount > 1 && (
                                <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-tl-md shadow-sm">
                                    +{productCount - 1}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {isVisible('customerName') && (
                            <h3 className={`text-[14px] font-black truncate uppercase tracking-tight mb-0.5 transition-colors ${
                                isLightMode ? 'text-slate-800 hover:text-blue-600' : 'text-white hover:text-blue-400'
                            }`}>
                                {order['Customer Name'] || 'Unknown Customer'}
                            </h3>
                        )}
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold mb-1 ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>
                            {carrierLogo && (
                                <img src={convertGoogleDriveUrl(carrierLogo)} className="w-3.5 h-3.5 object-contain" alt="" />
                            )}
                            <span>{order['Customer Phone']}</span>
                        </div>
                        {isVisible('location') && (
                            <div className={`flex items-start gap-1 text-[9.5px] font-medium ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                <MapPin size={10} className="text-red-500 shrink-0 mt-0.5 opacity-80" />
                                <span className="line-clamp-1">{order.Location || 'No location provided'}</span>
                            </div>
                        )}
                    </div>
                    {packagePhoto && (
                        <div className={`w-14 h-14 rounded-lg shrink-0 relative overflow-hidden flex-none border ${isLightMode ? 'border-blue-200' : 'border-blue-500/30'}`}>
                            <img 
                                src={convertGoogleDriveUrl(packagePhoto)} 
                                className="w-full h-full object-cover" 
                                alt="Package" 
                                loading="lazy"
                            />
                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-tl-md shadow-sm flex items-center gap-0.5">
                                <Package size={8} /> PKG
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Metadata & Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0 mr-2">
                        {isVisible('fulfillment') && order['Fulfillment Store'] && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                isLightMode ? 'bg-slate-100 text-slate-600 border border-slate-200/60' : 'bg-white/5 text-gray-400 border border-white/5'
                            }`}>
                                <Warehouse size={8} /> {order['Fulfillment Store']}
                            </span>
                        )}
                        {isVisible('shippingService') && order['Internal Shipping Method'] && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                isLightMode ? 'bg-slate-100 text-slate-600 border border-slate-200/60' : 'bg-white/5 text-gray-400 border border-white/5'
                            }`}>
                                <Truck size={8} /> {order['Internal Shipping Method']}
                            </span>
                        )}
                        {isVisible('pageInfo') && order.Page && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                isLightMode ? 'bg-slate-100 text-slate-600 border border-slate-200/60' : 'bg-white/5 text-gray-400 border border-white/5'
                            }`}>
                                <Globe size={8} /> {order.Page}
                            </span>
                        )}
                        {isVisible('date') && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                isLightMode ? 'bg-slate-100 text-slate-600 border border-slate-200/60' : 'bg-white/5 text-gray-400 border border-white/5'
                            }`}>
                                <Clock size={8} /> {getValidDate(order.Timestamp).toLocaleDateString('km-KH', { day: '2-digit', month: 'short' })}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {isVisible('telegramStatus') && !isSent && (
                            <TelegramSendButton 
                                orderId={order['Order ID']}
                                handleSendTelegram={handleSendTelegram}
                                isUpdating={updatingIds.has(order['Order ID'])}
                                isBinance={isBinance}
                                isLightMode={isLightMode}
                            />
                        )}
                        {isVisible('actions') && canEditOrder(order) && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit?.(order); }} 
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all active:scale-90 ${
                                    isLightMode ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-white/5 border-white/5 text-gray-400'
                                }`}
                            >
                                <Edit2 size={13} strokeWidth={2.5} />
                            </button>
                        )}
                        {isVisible('print') && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handlePrint(order); }} 
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all active:scale-90 ${
                                    isLightMode ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-white/5 border-white/5 text-gray-400'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeWidth={2.5}/></svg>
                            </button>
                        )}
                        {isVisible('check') && showVerify && !isSelectionMode && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleOrderVerified(order['Order ID'], isVerified); }} 
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all active:scale-90 ${
                                    isVerified 
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                        : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200' : 'bg-white/5 border-white/5 text-gray-500')
                                }`}
                            >
                                <Check size={14} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderOrderListRow = (order: ParsedOrder, idx: number) => {
        const isSelected = selectedIds.has(order['Order ID']);
        const isPaid = order['Payment Status'] === 'Paid';
        const orderTotal = Number(order['Grand Total']) || 0;
        const displayIndex = idx + 1;

        const id1 = order['Telegram Message ID 1'];
        const id2 = order['Telegram Message ID 2'];
        const isChecking = id1 === 'CHECKING';
        const isSent = (id1 && id2) && !isChecking;

        const displayPhone = formatPhone(order['Customer Phone']);
        const carrier = appData?.phoneCarriers?.find(c =>
            String(c.Prefixes || '').split(',').map(p => p.trim()).filter(Boolean).includes(displayPhone.substring(0, 3))
        );
        const carrierLogo = carrier?.CarrierLogoURL;

        const shippingMethod = appData?.shippingMethods?.find(m => m.MethodName === order['Internal Shipping Method']);
        const shippingLogo = shippingMethod?.LogoURL;

        const packagePhoto = order['Package Photo'];
        
        // Products logic for thumbnail
        const products = Array.isArray(order.Products) ? order.Products : [];
        const mainProduct = products[0];
        const productCount = products.length;

        return (
            <div 
                key={order['Order ID']} 
                onClick={() => (isSelectionMode || selectedIds.size > 0) ? onToggleSelect?.(order['Order ID']) : onView?.(order)}
                className={`relative flex items-center gap-3 px-4 py-3 border-b transition-colors active:bg-slate-100 ${
                    isLightMode 
                        ? (isSelected ? 'bg-blue-50/50 border-slate-100' : 'bg-white border-slate-100 hover:bg-slate-50/40') 
                        : (isSelected ? 'bg-[var(--cm-accent-light)]' : 'bg-[var(--cm-card-bg)] border-[var(--cm-border)]')
                }`}
            >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPaid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                
                <div className="w-6 shrink-0 flex justify-center">
                    {isSelectionMode ? (
                        <div 
                            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(order['Order ID']); }}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                isSelected ? 'bg-blue-600 border-blue-600' : (isLightMode ? 'border-slate-300 bg-slate-50' : 'border-[var(--cm-border)] bg-black/20')
                            }`}
                        >
                            {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                    ) : isVisible('index') && (
                        <span className={`text-[10px] font-mono font-bold opacity-30 ${isLightMode ? 'text-slate-400' : 'text-[var(--cm-text-muted)]'}`}>{displayIndex}</span>
                    )}
                </div>

                {/* Product Thumbnail (Replacing Customer/Carrier Logo logic here as requested by user context) */}
                <div className={`w-10 h-10 rounded-md shrink-0 relative overflow-hidden hidden xs:block border ${
                    isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-[var(--cm-card-bg2)] border-[var(--cm-border)]'
                }`}>
                    {mainProduct?.image ? (
                        <img 
                            src={convertGoogleDriveUrl(mainProduct.image)} 
                            className="w-full h-full object-cover" 
                            alt={mainProduct.name || "Product"} 
                            loading="lazy"
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center text-[8px] font-black text-center leading-tight ${
                            isLightMode ? 'text-slate-400' : 'text-[var(--cm-text-muted)]'
                        }`}>NO<br/>IMG</div>
                    )}
                    {productCount > 1 && (
                        <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[8px] font-black px-1 rounded-tl-sm shadow-sm">
                            +{productCount - 1}
                        </div>
                    )}
                </div>

                {packagePhoto && (
                    <div className={`w-10 h-10 rounded-md overflow-hidden shrink-0 hidden xs:block relative border ${
                        isLightMode ? 'border-slate-200' : 'border-[var(--cm-border)] bg-black/20'
                    }`}>
                        <img src={convertGoogleDriveUrl(packagePhoto)} className="w-full h-full object-cover" alt="PKG" />
                        <div className="absolute bottom-0 right-0 bg-blue-500 text-white text-[7px] font-black px-1 rounded-tl-sm">PKG</div>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        {isVisible('customerName') && (
                            <h3 className={`text-[13px] font-black truncate uppercase tracking-tight ${isLightMode ? 'text-slate-800' : 'text-[var(--cm-text-primary)]'}`}>
                                {order['Customer Name']}
                            </h3>
                        )}
                        {isVisible('status') && (
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded-sm ${
                                isPaid 
                                    ? (isLightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-500') 
                                    : (isLightMode ? 'bg-red-50 text-red-700' : 'bg-red-500/10 text-red-500')
                            }`}>
                                {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                        )}
                        {(order['Cancel Reason'] || order['Return Reason']) && (
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded-sm border uppercase tracking-tighter flex items-center gap-0.5 ${
                                order.FulfillmentStatus === 'Cancelled' 
                                    ? (isLightMode ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 text-red-500 border-red-500/20') 
                                    : (isLightMode ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-500/10 text-purple-400 border-purple-500/20')
                            }`}>
                                <Clock size={7} /> {order['Cancel Reason'] || order['Return Reason']}
                            </span>
                        )}
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] font-bold ${isLightMode ? 'text-slate-400' : 'text-[var(--cm-text-muted)]'}`}>
                        <div className={`flex items-center gap-1 ${isLightMode ? 'text-blue-600' : 'text-[var(--cm-accent)]'}`}>
                            {carrierLogo && <img src={convertGoogleDriveUrl(carrierLogo)} className="w-3 h-3 object-contain" alt="" />}
                            <span>{order['Customer Phone']}</span>
                        </div>
                        {isVisible('location') && (
                            <>
                                <span className="opacity-20">•</span>
                                <span className="truncate flex-1">{order.Location || 'N/A'}</span>
                            </>
                        )}
                    </div>

                    {isVisible('shippingService') && (
                        <div className={`flex items-center gap-1 text-[9px] font-medium mt-1 ${isLightMode ? 'text-slate-400' : 'text-[var(--cm-text-muted)]'}`}>
                            {shippingLogo && <img src={convertGoogleDriveUrl(shippingLogo)} className="w-2.5 h-2.5 object-contain opacity-70" alt="" />}
                            <span className="truncate">{order['Internal Shipping Method']}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {isVisible('total') && (
                        <div className="text-right">
                            <div className={`text-[14px] font-black italic tabular-nums leading-none ${isLightMode ? 'text-slate-900' : 'text-[var(--cm-text-primary)]'}`}>
                                <span className={`text-[10px] ${isLightMode ? 'text-blue-600' : 'text-[var(--cm-accent)]'} mr-0.5`}>$</span>
                                {orderTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {isVisible('actions') && canEditOrder(order) && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit?.(order); }} 
                                className={`w-8 h-8 flex items-center justify-center rounded-md border active:scale-90 transition-all ${
                                    isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-[var(--cm-card-bg2)] border-[var(--cm-border)] text-[var(--cm-text-muted)]'
                                }`}
                            >
                                <Edit2 size={13} />
                            </button>
                        )}
                        {isVisible('telegramStatus') && (
                            isSent ? (
                                <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 shadow-sm" title={t.msg_sent}>
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            ) : isChecking ? (
                                <div className="flex flex-col items-center gap-0.5 animate-pulse">
                                    <Spinner size="xs" />
                                    <span className="text-[7px] font-black text-blue-400 uppercase">Checking</span>
                                </div>
                            ) : (
                                <TelegramSendButton 
                                    orderId={order['Order ID']}
                                    handleSendTelegram={handleSendTelegram}
                                    isUpdating={updatingIds.has(order['Order ID'])}
                                    isBinance={isBinance}
                                    isLightMode={isLightMode}
                                />
                            )
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col space-y-6 animate-fade-in">
            {groupedData.length === 0 || (groupedData.length === 1 && groupedData[0].orders.length === 0) ? (
                <div className={`flex flex-col items-center justify-center py-20 opacity-50 ${isLightMode ? 'text-slate-400' : 'text-[var(--cm-text-muted)]'}`}>
                    <div className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center border ${
                        isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-[var(--cm-card-bg2)] border-[var(--cm-border)]'
                    }`}>
                        <Clock size={32} strokeWidth={1} />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest">{t.no_orders || 'No Orders Found'}</p>
                </div>
            ) : (
                groupedData.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-4">
                        {group.label && (
                            <div className="flex items-center gap-3 px-4">
                                {isBinance ? (
                                    <>
                                        <div className="w-1 h-4 bg-[#FCD535] rounded-full shadow-[0_0_8px_rgba(252,213,53,0.4)]"></div>
                                        <span className="text-[10px] font-bold text-[#848E9C] uppercase tracking-tighter">{group.label}</span>
                                        <div className="h-[1px] flex-1 bg-[#2B3139]"></div>
                                    </>
                                ) : (
                                    <>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLightMode ? 'text-blue-600' : 'text-[var(--cm-accent)]'}`}>{group.label}</span>
                                        <div className={`h-px flex-1 bg-gradient-to-r ${isLightMode ? 'from-slate-200 to-transparent' : 'from-[var(--cm-border)] to-transparent'}`}></div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        <div className={viewMode === 'card' ? "grid grid-cols-1 gap-4 px-4" : `flex flex-col border-y shadow-xl ${isLightMode ? 'border-slate-100 bg-white' : 'border-[var(--cm-border)] bg-[var(--cm-card-bg)]'}`}>
                            {group.orders.map((order, idx) => 
                                viewMode === 'card' ? renderOrderCard(order, idx) : renderOrderListRow(order, idx)
                            )}
                        </div>
                    </div>
                ))
            )}
            
            {displayCount < orders.length && (
                <div className="flex justify-center pt-4 pb-2 px-4">
                    <button 
                        onClick={handleLoadMore} 
                        className={`w-full py-4 rounded-lg text-[11px] font-black uppercase tracking-[0.3em] border active:scale-[0.98] transition-all ${
                            isLightMode 
                                ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-blue-600' 
                                : 'bg-[var(--cm-card-bg2)] text-[var(--cm-text-muted)] border-[var(--cm-border)] active:bg-[var(--cm-card-bg)] shadow-lg hover:border-[var(--cm-accent)] hover:text-[var(--cm-accent)]'
                        }`}
                    >
                        Load More Records
                    </button>
                </div>
            )}
            
            <div className="px-4 pb-12">
                <MobileGrandTotalCard totals={totals} />
            </div>
        </div>
    );
};

export default memo(OrdersListMobile);



import React, { useContext, useState, useMemo } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import Spinner from '../common/Spinner';
import { MobileGrandTotalCard } from './OrderGrandTotal';

interface OrdersListMobileProps {
    orders: ParsedOrder[];
    totals: { grandTotal: number; internalCost: number; count: number; paidCount: number; unpaidCount: number };
    visibleColumns?: Set<string>;
    selectedIds: Set<string>;
    onToggleSelect?: (id: string) => void;
    onEdit?: (order: ParsedOrder) => void;
    handlePrint: (order: ParsedOrder) => void;
    handleCopy: (id: string) => void;
    copiedId: string | null;
    toggleOrderVerified: (id: string, currentStatus: boolean) => void;
    updatingIds: Set<string>;
}

const OrdersListMobile: React.FC<OrdersListMobileProps> = ({
    orders,
    totals,
    visibleColumns,
    selectedIds,
    onToggleSelect,
    onEdit,
    handlePrint,
    handleCopy,
    copiedId,
    toggleOrderVerified,
    updatingIds
}) => {
    const { appData, previewImage } = useContext(AppContext);
    
    // View Mode State - Default to 'table'
    const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
        const saved = localStorage.getItem('mobile_view_preference');
        return (saved === 'card' || saved === 'table') ? saved : 'table';
    });

    const handleViewChange = (mode: 'card' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('mobile_view_preference', mode);
    };

    // Pagination State for Infinite Scroll
    const [displayCount, setDisplayCount] = useState(20);
    
    const visibleOrders = useMemo(() => {
        return orders.slice(0, displayCount);
    }, [orders, displayCount]);

    // Handle "Load More" logic
    const handleLoadMore = () => {
        setDisplayCount(prev => prev + 20);
    };

    // Visibility defaults
    const isProductInfoVisible = !visibleColumns || visibleColumns.has('productInfo');
    const isActionsVisible = !visibleColumns || visibleColumns.has('actions');
    const isPrintVisible = !visibleColumns || visibleColumns.has('print');
    const isCheckVisible = !visibleColumns || visibleColumns.has('check');
    const isFulfillmentVisible = !visibleColumns || visibleColumns.has('fulfillment');

    const getCarrierLogo = (phoneNumber: string) => {
        if (!phoneNumber || !appData.phoneCarriers) return null;
        const cleanPhone = phoneNumber.replace(/\s/g, '');
        const prefix = cleanPhone.substring(0, 3);
        const carrier = appData.phoneCarriers.find(c => c.Prefixes.split(',').map(p => p.trim()).includes(prefix));
        return carrier ? convertGoogleDriveUrl(carrier.CarrierLogoURL) : null;
    };

    const getShippingLogo = (methodName: string) => {
        if (!methodName || !appData.shippingMethods) return null;
        const method = appData.shippingMethods.find(m => m.MethodName === methodName);
        return method ? convertGoogleDriveUrl(method.LogosURL) : null;
    };

    const formatPhone = (val: string) => {
        let phone = (val || '').replace(/[^0-9]/g, '');
        if (phone.length > 0) phone = '0' + phone.replace(/^0+/, '');
        return phone;
    };

    return (
        <div className="space-y-5 pb-40">
            {/* Grand Total Summary */}
            <MobileGrandTotalCard totals={totals} />

            {/* View Switcher Controls */}
            <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{orders.length} Entries</span>
                <div className="flex bg-gray-800 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => handleViewChange('card')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                        title="Card View"
                    >
                        {/* New Grid/Card Icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" /></svg>
                    </button>
                    <button 
                        onClick={() => handleViewChange('table')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                        title="Table View"
                    >
                        {/* List/Table Icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    </button>
                </div>
            </div>

            {viewMode === 'table' ? (
                // --- TABLE VIEW ---
                <div className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-fade-in relative">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#0f172a] border-b border-white/10 text-[10px] text-gray-400 font-black uppercase tracking-wider">
                                    <th className="p-3 sticky left-0 z-20 bg-[#0f172a] border-r border-white/10 min-w-[130px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                                        Customer
                                    </th>
                                    {isFulfillmentVisible && (
                                        <th className="p-3 min-w-[100px] text-gray-400">Store</th>
                                    )}
                                    <th className="p-3 text-right min-w-[80px]">Total</th>
                                    <th className="p-3 text-center min-w-[90px]">Status</th>
                                    <th className="p-3 text-center min-w-[50px]">Act</th>
                                    <th className="p-3 min-w-[100px]">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {visibleOrders.map((order) => {
                                    const isSelected = selectedIds.has(order['Order ID']);
                                    const isVerified = order.IsVerified === true || String(order.IsVerified).toUpperCase() === 'TRUE';
                                    
                                    return (
                                        <tr key={order['Order ID']} className={`${isSelected ? 'bg-blue-900/20' : isVerified ? 'bg-emerald-900/5' : 'hover:bg-white/5'} transition-colors`}>
                                            <td className="p-3 sticky left-0 z-20 bg-gray-900 border-r border-white/10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white truncate max-w-[110px]">{order['Customer Name']}</span>
                                                    <span className="text-[9px] text-gray-500 font-mono">{order['Customer Phone']}</span>
                                                </div>
                                            </td>
                                            {isFulfillmentVisible && (
                                                <td className="p-3 text-gray-300 font-bold text-[10px]">
                                                    {order['Fulfillment Store']}
                                                </td>
                                            )}
                                            <td className="p-3 text-right font-black text-blue-400">
                                                ${order['Grand Total'].toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${order['Payment Status'] === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {order['Payment Status']}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                {onEdit && (
                                                    <button onClick={() => onEdit(order)} className="text-gray-400 hover:text-white">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-3 text-[9px] text-gray-500 font-bold">
                                                {new Date(order.Timestamp).toLocaleDateString('km-KH')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // --- CARD VIEW (Existing Logic) ---
                visibleOrders.map((order) => {
                    const pageInfo = appData.pages?.find((p: any) => p.PageName === order.Page);
                    const logoUrl = pageInfo ? convertGoogleDriveUrl(pageInfo.PageLogoURL) : '';
                    const displayPhone = formatPhone(order['Customer Phone']);
                    const carrierLogo = getCarrierLogo(displayPhone);
                    const isVerified = order.IsVerified === true || String(order.IsVerified).toUpperCase() === 'TRUE';
                    const isUpdating = updatingIds.has(order['Order ID']);
                    const isSelected = selectedIds.has(order['Order ID']);
                    const shippingLogo = getShippingLogo(order['Internal Shipping Method']);
                    const isThisCopied = copiedId === order['Order ID'];

                    return (
                        <div 
                            key={order['Order ID']} 
                            className={`
                                relative rounded-[2.5rem] p-5 shadow-2xl transition-all duration-300 overflow-hidden group
                                ${isSelected 
                                    ? 'bg-blue-900/20 border-2 border-blue-500/50 shadow-blue-900/30' 
                                    : isVerified 
                                        ? 'bg-emerald-900/10 border border-emerald-500/20 shadow-emerald-900/10' 
                                        : 'bg-[#1e293b]/70 border border-white/5 shadow-black/40 backdrop-blur-xl'
                                }
                            `}
                        >
                            {/* Background Selection Glow */}
                            {isSelected && (
                                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
                            )}

                            {/* Top Row: ID, Date, Selection */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {onToggleSelect && (
                                        <div className="relative z-10">
                                            <input 
                                                type="checkbox" 
                                                className="h-6 w-6 rounded-xl border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/20 cursor-pointer transition-all"
                                                checked={isSelected}
                                                onChange={() => onToggleSelect(order['Order ID'])}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <button 
                                            onClick={() => handleCopy(order['Order ID'])}
                                            className={`
                                                flex items-center gap-2 px-3 py-1 rounded-xl border transition-all active:scale-95
                                                ${isThisCopied 
                                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                                    : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                                                }
                                            `}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                                                #{order['Order ID'].substring(0, 8)}
                                            </span>
                                            {isThisCopied && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-end">
                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${order['Payment Status'] === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {order['Payment Status']}
                                    </span>
                                    <span className="text-[9px] text-gray-600 font-bold mt-1">
                                        {new Date(order.Timestamp).toLocaleDateString('km-KH')}
                                    </span>
                                </div>
                            </div>

                            {/* Customer & Page Section */}
                            <div className="flex items-start gap-4 mb-5">
                                <div className="relative w-14 h-14 rounded-2xl bg-black/40 border border-white/10 p-1 flex-shrink-0">
                                    {logoUrl ? (
                                        <img src={logoUrl} className="w-full h-full object-cover rounded-xl" alt="page logo" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-black">N/A</div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-lg p-0.5 border border-gray-700">
                                        {carrierLogo && <img src={carrierLogo} className="w-4 h-4 object-contain" alt="carrier" />}
                                    </div>
                                </div>
                                
                                <div className="flex-grow min-w-0">
                                    <h3 className="text-white font-black text-sm truncate leading-tight mb-1">{order['Customer Name']}</h3>
                                    <p className="text-blue-400 font-mono font-bold text-xs tracking-wide mb-1">{displayPhone}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold truncate">
                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="truncate">{order.Location || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Product List (Scrollable if many) */}
                            {isProductInfoVisible && order.Products && order.Products.length > 0 && (
                                <div className="bg-black/20 rounded-2xl p-3 border border-white/5 mb-5 shadow-inner">
                                    <div className="flex overflow-x-auto gap-3 pb-2 snap-x no-scrollbar">
                                        {order.Products.map((p, i) => {
                                            const masterProd = appData.products?.find(mp => mp.ProductName === p.name);
                                            const displayImg = p.image || masterProd?.ImageURL || '';
                                            return (
                                                <div key={i} className="flex-shrink-0 w-[200px] snap-center bg-gray-800/50 rounded-xl p-2 border border-white/5 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-black/50 flex-shrink-0 overflow-hidden border border-white/5" onClick={() => previewImage(convertGoogleDriveUrl(displayImg))}>
                                                        <img src={convertGoogleDriveUrl(displayImg)} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-bold text-gray-200 truncate">{p.name}</p>
                                                        <div className="flex justify-between items-center mt-0.5">
                                                            <span className="text-[9px] text-gray-500 font-bold">Qty: <span className="text-white">{p.quantity}</span></span>
                                                            {p.colorInfo && <span className="text-[8px] bg-purple-500/10 text-purple-400 px-1.5 rounded uppercase font-bold">{p.colorInfo}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Amount</p>
                                    <p className="text-lg font-black text-white tracking-tight">${order['Grand Total'].toFixed(2)}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Shipping</p>
                                            <div className="flex items-center gap-1.5">
                                                {shippingLogo && <img src={shippingLogo} className="w-3.5 h-3.5 object-contain" alt="" />}
                                                <p className="text-xs font-bold text-orange-400 truncate max-w-[80px]">{order['Internal Shipping Method']}</p>
                                            </div>
                                        </div>
                                        {order['Internal Cost'] > 0 && (
                                            <span className="text-[9px] font-mono text-gray-600 font-bold bg-black/20 px-1.5 py-0.5 rounded">
                                                -${order['Internal Cost']}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                {isActionsVisible && (
                                    <button 
                                        onClick={() => onEdit && onEdit(order)} 
                                        className="flex-1 py-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                                    >
                                        Edit
                                    </button>
                                )}
                                
                                {isPrintVisible && (
                                    <button 
                                        onClick={() => handlePrint(order)} 
                                        className="w-12 h-12 flex items-center justify-center bg-gray-800 text-gray-400 rounded-xl border border-white/10 hover:text-white active:scale-90 transition-all"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    </button>
                                )}

                                {isCheckVisible && (
                                    <div className="ml-auto relative">
                                        <input 
                                            type="checkbox" 
                                            checked={isVerified} 
                                            onChange={() => toggleOrderVerified(order['Order ID'], isVerified)} 
                                            className={`w-12 h-12 rounded-xl appearance-none border transition-all cursor-pointer ${isVerified ? 'bg-emerald-500 border-emerald-400' : 'bg-gray-800 border-gray-600'}`}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            {isUpdating ? (
                                                <Spinner size="sm" />
                                            ) : isVerified ? (
                                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <span className="text-[9px] font-black text-gray-500 uppercase">Check</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
            
            {/* Load More Trigger */}
            {displayCount < orders.length && (
                <div className="flex justify-center pt-4">
                    <button 
                        onClick={handleLoadMore}
                        className="px-8 py-3 bg-gray-800 text-white rounded-full text-xs font-black uppercase tracking-widest border border-white/10 shadow-lg active:scale-95 transition-all"
                    >
                        Load More ({orders.length - displayCount} remaining)
                    </button>
                </div>
            )}
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default OrdersListMobile;

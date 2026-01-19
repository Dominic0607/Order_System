
import React, { useContext } from 'react';
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

    // Visibility defaults
    const isProductInfoVisible = !visibleColumns || visibleColumns.has('productInfo');
    const isActionsVisible = !visibleColumns || visibleColumns.has('actions');
    const isPrintVisible = !visibleColumns || visibleColumns.has('print');
    const isCheckVisible = !visibleColumns || visibleColumns.has('check');

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

            {orders.map((order) => {
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
            })}
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default OrdersListMobile;


import React, { useContext } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import Spinner from '../common/Spinner';
import { DesktopGrandTotalRow } from './OrderGrandTotal';

interface OrdersListDesktopProps {
    orders: ParsedOrder[];
    totals: { grandTotal: number; internalCost: number; count: number; paidCount: number; unpaidCount: number };
    visibleColumns?: Set<string>;
    selectedIds: Set<string>;
    onToggleSelect?: (id: string) => void;
    onToggleSelectAll?: (ids: string[]) => void;
    onEdit?: (order: ParsedOrder) => void;
    handlePrint: (order: ParsedOrder) => void;
    handleCopy: (id: string) => void;
    copiedId: string | null;
    toggleOrderVerified: (id: string, currentStatus: boolean) => void;
    updatingIds: Set<string>;
}

const OrdersListDesktop: React.FC<OrdersListDesktopProps> = ({
    orders,
    totals,
    visibleColumns,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    handlePrint,
    handleCopy,
    copiedId,
    toggleOrderVerified,
    updatingIds
}) => {
    const { appData, previewImage } = useContext(AppContext);

    const isVisible = (key: string) => {
        return !visibleColumns || visibleColumns.has(key);
    };

    const isAllSelected = orders.length > 0 && orders.every(o => selectedIds.has(o['Order ID']));

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
        <div className="page-card !p-0 shadow-2xl border-white/5 min-h-[1500px] overflow-visible bg-gray-900/60 backdrop-blur-3xl rounded-[2.5rem]">
            <table className="admin-table w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead>
                    <tr className="bg-gray-800/80 border-b border-white/10">
                        {onToggleSelectAll && (
                            <th className="px-4 py-6 w-12 text-center">
                                <input 
                                    type="checkbox" 
                                    className="h-5 w-5 rounded-md border-gray-600 bg-gray-900 text-blue-500 cursor-pointer focus:ring-blue-500/20"
                                    checked={isAllSelected}
                                    onChange={() => onToggleSelectAll(orders.map(o => o['Order ID']))}
                                />
                            </th>
                        )}
                        {isVisible('index') && <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center text-gray-500 w-12">#</th>}
                        {isVisible('orderId') && <th className="px-2 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center text-gray-500 w-16">Node ID</th>}
                        {isVisible('customerName') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-56">Merchant/Client</th>}
                        {isVisible('productInfo') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-44">Assets</th>}
                        {isVisible('location') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-52">Geography</th>}
                        {isVisible('pageInfo') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-44">Source Page</th>}
                        {isVisible('fulfillment') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-32">Fulfillment</th>}
                        {isVisible('total') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-32">Valuation</th>}
                        {isVisible('shippingService') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-48">Logistics</th>}
                        {isVisible('shippingCost') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-28">Exp. Cost</th>}
                        {isVisible('status') && <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-32">Status</th>}
                        {isVisible('date') && <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-left text-gray-500 w-24">Time</th>}
                        {isVisible('print') && <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center text-gray-500 w-16">P</th>}
                        {isVisible('actions') && <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center text-gray-500 w-24">Command</th>}
                        {isVisible('check') && <th className="px-2 py-6 text-[9px] font-normal uppercase tracking-[0.15em] text-center text-emerald-500/80 w-14">VERIFIED</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {/* GRAND TOTAL ROW */}
                    <DesktopGrandTotalRow 
                        totals={totals} 
                        isVisible={isVisible} 
                        showSelection={!!onToggleSelect} 
                    />

                    {orders.map((order, idx) => {
                        const pageInfo = appData.pages?.find((p: any) => p.PageName === order.Page);
                        const logoUrl = pageInfo ? convertGoogleDriveUrl(pageInfo.PageLogoURL) : '';
                        const displayPhone = formatPhone(order['Customer Phone']);
                        const carrierLogo = getCarrierLogo(displayPhone);
                        const isThisCopied = copiedId === order['Order ID'];
                        const shippingLogo = getShippingLogo(order['Internal Shipping Method']);
                        const orderId = order['Order ID'];
                        const isVerified = order.IsVerified === true || String(order.IsVerified).toUpperCase() === 'TRUE';
                        const isUpdating = updatingIds.has(orderId);
                        const isSelected = selectedIds.has(orderId);

                        const isNearBottom = idx > orders.length - 3 && orders.length > 4;
                        const tooltipPosClass = isNearBottom ? "bottom-full mb-3" : "top-full mt-3";
                        const tooltipArrowClass = isNearBottom ? "-bottom-2 border-r border-b" : "-top-2 border-t border-l";

                        return (
                            <tr key={orderId} className={`${isVerified ? 'bg-emerald-500/[0.03]' : isSelected ? 'bg-blue-500/10' : 'hover:bg-white/[0.02]'} transition-all group relative`}>
                                {onToggleSelect && (
                                    <td className="px-4 py-5 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="h-5 w-5 rounded-md border-gray-700 bg-gray-950 text-blue-500 cursor-pointer transition-all"
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(orderId)}
                                        />
                                    </td>
                                )}
                                {isVisible('index') && <td className="px-4 py-5 text-center text-[11px] font-bold text-gray-600">{idx + 1}</td>}
                                {isVisible('orderId') && <td className="px-2 py-5 text-center"><button onClick={() => handleCopy(order['Order ID'])} className={`p-2 rounded-xl transition-all border ${isThisCopied ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-gray-800 border-white/5 text-gray-500 hover:text-blue-400 active:scale-90'}`}><span className="text-[9px] font-black uppercase tracking-widest">{isThisCopied ? '✓' : 'ID'}</span></button></td>}
                                
                                {isVisible('customerName') && (
                                    <td className="px-6 py-5">
                                        <div className="text-[16px] font-black text-gray-100 truncate mb-1 leading-tight tracking-tight">
                                            {order['Customer Name']}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {carrierLogo && <img src={carrierLogo} className="w-4 h-4 object-contain opacity-80" alt="carrier" />}
                                            <div className="text-[13px] text-blue-400/80 font-mono font-black tracking-tighter">
                                                {displayPhone}
                                            </div>
                                        </div>
                                    </td>
                                )}
                                
                                {isVisible('productInfo') && (
                                    <td className="px-6 py-5 relative overflow-visible">
                                        <div className="group/prod flex flex-col gap-1 cursor-help">
                                            {order.Products.slice(0, 2).map((p, i) => (
                                                <div key={i} className="text-[10px] bg-black/40 p-1.5 rounded-lg border border-white/5 flex flex-col">
                                                    <span className="font-bold text-gray-300 line-clamp-1">{p.name}</span>
                                                    <span className="text-blue-400/80 font-black mt-0.5">x{p.quantity}</span>
                                                </div>
                                            ))}
                                            {order.Products.length > 2 && <p className="text-[8px] text-gray-600 font-black ml-1 uppercase tracking-widest">+ {order.Products.length - 2} items</p>}
                                            
                                            {/* Tooltip Popup */}
                                            <div className={`invisible group-hover/prod:visible opacity-0 group-hover/prod:opacity-100 absolute z-[200] left-1/2 -translate-x-1/2 ${tooltipPosClass} w-80 p-5 bg-[#1a2235] border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all duration-300 pointer-events-none backdrop-blur-3xl`}>
                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-3">Operational Asset Data</p>
                                                <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                                    {order.Products.map((p, i) => {
                                                        const masterProd = appData.products?.find(mp => mp.ProductName === p.name);
                                                        const displayImg = p.image || masterProd?.ImageURL || '';
                                                        return (
                                                            <div key={i} className="flex items-center gap-4 text-left p-2.5 bg-black/30 rounded-2xl border border-white/5">
                                                                <div className="w-14 h-14 flex-shrink-0 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-inner">
                                                                    <img src={convertGoogleDriveUrl(displayImg)} className="w-full h-full object-cover" alt={p.name} onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100/1f2937/4b5563?text=N/A')}/>
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[12px] font-black text-white leading-tight mb-1 line-clamp-2">{p.name}</p>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/10">x{p.quantity}</span>
                                                                        {p.colorInfo && <span className="text-[9px] text-purple-400 font-bold uppercase">Node: {p.colorInfo}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className={`absolute ${tooltipArrowClass} left-1/2 -translate-x-1/2 w-5 h-5 bg-[#1a2235] border-white/10 rotate-45`}></div>
                                            </div>
                                        </div>
                                    </td>
                                )}

                                {isVisible('location') && (
                                    <td className="px-6 py-5 relative overflow-visible">
                                        <div className="group/loc cursor-help">
                                            <div className="text-[12px] font-black text-gray-200 leading-tight truncate">{order.Location}</div>
                                            <div className="text-[10px] font-bold text-gray-600 mt-1 line-clamp-1">{order['Address Details']}</div>
                                            
                                            <div className={`invisible group-hover/loc:visible opacity-0 group-hover/loc:opacity-100 absolute z-[200] left-1/2 -translate-x-1/2 ${tooltipPosClass} w-72 p-5 bg-[#1a2235] border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all duration-300 pointer-events-none backdrop-blur-3xl`}>
                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] mb-3 border-b border-white/5 pb-2">Geographic Assignment</p>
                                                <div className="space-y-4 text-left">
                                                    <div>
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Region Node</span>
                                                        <p className="text-sm font-black text-white mt-0.5">{order.Location}</p>
                                                    </div>
                                                    <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
                                                        <span className="text-[8px] font-black text-gray-600 uppercase block mb-1.5 tracking-widest">Local Matrix</span>
                                                        <p className="text-[11px] text-gray-300 leading-relaxed font-bold">{order['Address Details'] || 'No precise location data'}</p>
                                                    </div>
                                                </div>
                                                <div className={`absolute ${tooltipArrowClass} left-1/2 -translate-x-1/2 w-5 h-5 bg-[#1a2235] border-white/10 rotate-45`}></div>
                                            </div>
                                        </div>
                                    </td>
                                )}

                                {isVisible('pageInfo') && <td className="px-6 py-5"><div className="flex items-center gap-3">{logoUrl ? <img src={logoUrl} className="w-8 h-8 rounded-full border border-white/10 shadow-sm object-cover" alt="logo" /> : <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/5 flex items-center justify-center text-[7px] text-gray-600 font-bold uppercase">Null</div>}<div className="min-w-0"><span className="text-[12px] font-black text-gray-300 block truncate leading-none mb-1">{order.Page}</span><span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{order.Team}</span></div></div></td>}
                                {isVisible('fulfillment') && <td className="px-6 py-5"><span className="text-[11px] font-bold text-gray-300 bg-gray-800 px-2 py-1 rounded border border-white/5">{order['Fulfillment Store']}</span></td>}
                                {isVisible('total') && <td className="px-6 py-5 font-black text-blue-400 text-base tracking-tighter">${order['Grand Total'].toFixed(2)}</td>}
                                {isVisible('shippingService') && <td className="px-6 py-5"><div className="flex items-center gap-2.5">{shippingLogo && <img src={shippingLogo} className="w-5 h-5 rounded-lg object-contain bg-gray-950 p-0.5 border border-white/5" alt="shipping" />}<span className="text-[10px] text-orange-400/80 font-black uppercase truncate tracking-tight">{order['Internal Shipping Method'] || '-'}</span></div></td>}
                                {isVisible('shippingCost') && <td className="px-6 py-5 text-[11px] text-gray-500 font-mono font-black tracking-tighter">${(Number(order['Internal Cost']) || 0).toFixed(2)}</td>}
                                {isVisible('status') && <td className="px-6 py-5"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${order['Payment Status'] === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{order['Payment Status']}</span></td>}
                                
                                {isVisible('date') && (
                                    <td className="px-4 py-5">
                                        <div className="flex flex-col items-start">
                                            <span className="text-[11px] font-bold text-gray-400">{new Date(order.Timestamp).toLocaleDateString('km-KH')}</span>
                                            <span className="text-[10px] font-mono text-blue-500/80 font-black">{new Date(order.Timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                        </div>
                                    </td>
                                )}
                                
                                {isVisible('print') && <td className="px-4 py-5 text-center"><button onClick={() => handlePrint(order)} className="text-emerald-400/60 hover:text-white bg-emerald-400/5 hover:bg-emerald-600 p-2.5 rounded-xl transition-all border border-emerald-400/10 active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button></td>}
                                {isVisible('actions') && <td className="px-4 py-5 text-center"><button onClick={() => onEdit && onEdit(order)} className="text-blue-400/80 hover:text-white bg-blue-400/5 hover:bg-blue-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-400/10 active:scale-95 shadow-md">Edit</button></td>}
                                {isVisible('check') && <td className="px-2 py-5 text-center"><div className="relative flex items-center justify-center"><input type="checkbox" checked={isVerified} onChange={() => toggleOrderVerified(orderId, isVerified)} className={`h-6 w-6 rounded-lg border-gray-700 bg-gray-950 text-emerald-500 focus:ring-emerald-500/10 transition-all ${isUpdating ? 'opacity-20' : 'hover:scale-110 active:scale-150 cursor-pointer'}`} />{isUpdating && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Spinner size="sm" /></div>}</div></td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default OrdersListDesktop;

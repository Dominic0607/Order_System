
import React, { useContext, useRef, useState, useMemo } from 'react';
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
    
    // Virtual Scroll State
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    
    // Constants for Virtualization
    const ROW_HEIGHT = 88; // Approximate height of a row in pixels
    const OVERSCAN = 5; // Number of rows to render outside visible area

    const isVisible = (key: string) => {
        return !visibleColumns || visibleColumns.has(key);
    };

    const isAllSelected = orders.length > 0 && orders.every(o => selectedIds.has(o['Order ID']));

    // --- Virtual Scroll Logic ---
    const { virtualItems, totalHeight, paddingTop } = useMemo(() => {
        const totalHeight = orders.length * ROW_HEIGHT;
        const containerHeight = containerRef.current?.clientHeight || 800; // Default or measured
        
        let startIndex = Math.floor(scrollTop / ROW_HEIGHT);
        let endIndex = Math.min(
            orders.length - 1,
            Math.floor((scrollTop + containerHeight) / ROW_HEIGHT)
        );

        // Add overscan
        startIndex = Math.max(0, startIndex - OVERSCAN);
        endIndex = Math.min(orders.length - 1, endIndex + OVERSCAN);

        const virtualItems = [];
        for (let i = startIndex; i <= endIndex; i++) {
            virtualItems.push({
                index: i,
                data: orders[i]
            });
        }

        const paddingTop = startIndex * ROW_HEIGHT;

        return { virtualItems, totalHeight, paddingTop };
    }, [orders, scrollTop]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

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

    // Safe Date Parsing for iOS
    const getSafeDateObj = (dateStr: string) => {
        try {
            if (!dateStr) return new Date();
            const safeStr = dateStr.replace(' ', 'T');
            const date = new Date(safeStr);
            if (isNaN(date.getTime())) return new Date(); // Fallback
            return date;
        } catch (e) {
            return new Date();
        }
    };

    return (
        <div className="page-card !p-0 shadow-2xl border-white/5 bg-gray-900/60 backdrop-blur-3xl rounded-[2.5rem] flex flex-col h-[calc(100vh-220px)]">
            {/* Header Table (Sticky) */}
            <div className="flex-shrink-0 z-20 bg-gray-900 rounded-t-[2.5rem] border-b border-white/10">
                <table className="admin-table w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr className="bg-gray-800/80">
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
                            {/* Dynamic Font Sizes for Headers using clamp */}
                            {isVisible('index') && <th className="px-4 py-6 font-black uppercase tracking-[0.2em] text-center text-gray-500 w-12 text-[clamp(10px,0.8vw,12px)]">#</th>}
                            {isVisible('actions') && <th className="px-4 py-6 font-black uppercase tracking-[0.2em] text-center text-gray-500 w-24 text-[clamp(10px,0.8vw,12px)]">Command</th>}
                            {isVisible('customerName') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-56 text-[clamp(10px,0.8vw,12px)]">Merchant/Client</th>}
                            {isVisible('productInfo') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-44 text-[clamp(10px,0.8vw,12px)]">Assets</th>}
                            {isVisible('location') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-52 text-[clamp(10px,0.8vw,12px)]">Geography</th>}
                            {isVisible('pageInfo') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-44 text-[clamp(10px,0.8vw,12px)]">Source Page</th>}
                            {isVisible('fulfillment') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-32 text-[clamp(10px,0.8vw,12px)]">Fulfillment</th>}
                            {isVisible('total') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-32 text-[clamp(10px,0.8vw,12px)]">Valuation</th>}
                            {isVisible('shippingService') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-48 text-[clamp(10px,0.8vw,12px)]">Logistics</th>}
                            {isVisible('shippingCost') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-28 text-[clamp(10px,0.8vw,12px)]">Exp. Cost</th>}
                            {isVisible('status') && <th className="px-6 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-32 text-[clamp(10px,0.8vw,12px)]">Status</th>}
                            {isVisible('date') && <th className="px-4 py-6 font-black uppercase tracking-[0.2em] text-left text-gray-500 w-24 text-[clamp(10px,0.8vw,12px)]">Time</th>}
                            {isVisible('print') && <th className="px-4 py-6 font-black uppercase tracking-[0.2em] text-center text-gray-500 w-16 text-[clamp(10px,0.8vw,12px)]">P</th>}
                            {isVisible('check') && <th className="px-2 py-6 font-normal uppercase tracking-[0.15em] text-center text-emerald-500/80 w-14 text-[9px]">VERIFIED</th>}
                            {isVisible('orderId') && <th className="px-2 py-6 font-black uppercase tracking-[0.2em] text-center text-gray-500 w-16 text-[clamp(10px,0.8vw,12px)]">Node ID</th>}
                        </tr>
                    </thead>
                    {/* Render Grand Total Here (Sticky beneath header) */}
                    <tbody className="bg-[#0f172a]">
                         <DesktopGrandTotalRow 
                            totals={totals} 
                            isVisible={isVisible} 
                            showSelection={!!onToggleSelect} 
                        />
                    </tbody>
                </table>
            </div>

            {/* Scrollable Body */}
            <div 
                ref={containerRef}
                className="flex-grow overflow-y-auto custom-scrollbar"
                onScroll={handleScroll}
            >
                <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                    <table 
                        className="admin-table w-full border-collapse" 
                        style={{ 
                            tableLayout: 'fixed',
                            transform: `translateY(${paddingTop}px)`,
                        }}
                    >
                        {/* Hidden Header to maintain column widths */}
                        <thead className="invisible h-0">
                            <tr>
                                {onToggleSelectAll && <th className="w-12"></th>}
                                {isVisible('index') && <th className="w-12"></th>}
                                {isVisible('actions') && <th className="w-24"></th>}
                                {isVisible('customerName') && <th className="w-56"></th>}
                                {isVisible('productInfo') && <th className="w-44"></th>}
                                {isVisible('location') && <th className="w-52"></th>}
                                {isVisible('pageInfo') && <th className="w-44"></th>}
                                {isVisible('fulfillment') && <th className="w-32"></th>}
                                {isVisible('total') && <th className="w-32"></th>}
                                {isVisible('shippingService') && <th className="w-48"></th>}
                                {isVisible('shippingCost') && <th className="w-28"></th>}
                                {isVisible('status') && <th className="w-32"></th>}
                                {isVisible('date') && <th className="w-24"></th>}
                                {isVisible('print') && <th className="w-16"></th>}
                                {isVisible('check') && <th className="w-14"></th>}
                                {isVisible('orderId') && <th className="w-16"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {virtualItems.map(({ index, data: order }) => {
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

                                const isNearBottom = index > orders.length - 3 && orders.length > 4;
                                const tooltipPosClass = isNearBottom ? "bottom-full mb-3" : "top-full mt-3";
                                const tooltipArrowClass = isNearBottom ? "-bottom-2 border-r border-b" : "-top-2 border-t border-l";
                                
                                const orderDate = getSafeDateObj(order.Timestamp);

                                return (
                                    <tr key={orderId} className={`${isVerified ? 'bg-emerald-500/[0.03]' : isSelected ? 'bg-blue-500/10' : 'hover:bg-white/[0.02]'} transition-all group relative`} style={{ height: `${ROW_HEIGHT}px` }}>
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
                                        {isVisible('index') && <td className="px-4 py-5 text-center font-bold text-gray-600 text-[clamp(11px,0.8vw,13px)]">{index + 1}</td>}
                                        
                                        {isVisible('actions') && <td className="px-4 py-5 text-center"><button onClick={() => onEdit && onEdit(order)} className="text-blue-400/80 hover:text-white bg-blue-400/5 hover:bg-blue-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-400/10 active:scale-95 shadow-md">Edit</button></td>}
                                        
                                        {isVisible('customerName') && (
                                            <td className="px-6 py-5">
                                                <div className="font-black text-gray-100 truncate mb-1 leading-tight tracking-tight text-[clamp(14px,1.1vw,16px)]">
                                                    {order['Customer Name']}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {carrierLogo && <img src={carrierLogo} className="w-4 h-4 object-contain opacity-80" alt="carrier" />}
                                                    <div className="text-blue-400/80 font-mono font-black tracking-tighter text-[clamp(12px,0.9vw,14px)]">
                                                        {displayPhone}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        
                                        {isVisible('productInfo') && (
                                            <td className="px-6 py-5 relative overflow-visible">
                                                <div className="group/prod flex flex-col gap-1 cursor-help">
                                                    {order.Products.slice(0, 2).map((p, i) => (
                                                        <div key={i} className="bg-black/40 p-1.5 rounded-lg border border-white/5 flex flex-col">
                                                            <span className="font-bold text-gray-300 line-clamp-1 text-[clamp(11px,0.8vw,12px)]">{p.name}</span>
                                                            <span className="text-blue-400/80 font-black mt-0.5 text-[clamp(10px,0.7vw,11px)]">x{p.quantity}</span>
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
                                                                            <p className="font-black text-white leading-tight mb-1 line-clamp-2 text-xs">{p.name}</p>
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
                                                    <div className="font-black text-gray-200 leading-tight truncate text-[clamp(12px,0.9vw,14px)]">{order.Location}</div>
                                                    <div className="font-bold text-gray-600 mt-1 line-clamp-1 text-[clamp(10px,0.7vw,12px)]">{order['Address Details']}</div>
                                                    
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

                                        {isVisible('pageInfo') && <td className="px-6 py-5"><div className="flex items-center gap-3">{logoUrl ? <img src={logoUrl} className="w-8 h-8 rounded-full border border-white/10 shadow-sm object-cover" alt="logo" /> : <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/5 flex items-center justify-center text-[7px] text-gray-600 font-bold uppercase">Null</div>}<div className="min-w-0"><span className="font-black text-gray-300 block truncate leading-none mb-1 text-[clamp(12px,0.9vw,13px)]">{order.Page}</span><span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{order.Team}</span></div></div></td>}
                                        {isVisible('fulfillment') && <td className="px-6 py-5"><span className="font-bold text-gray-300 bg-gray-800 px-2 py-1 rounded border border-white/5 text-[clamp(11px,0.8vw,12px)]">{order['Fulfillment Store']}</span></td>}
                                        {isVisible('total') && <td className="px-6 py-5 font-black text-blue-400 tracking-tighter text-[clamp(16px,1.2vw,18px)]">${order['Grand Total'].toFixed(2)}</td>}
                                        {isVisible('shippingService') && <td className="px-6 py-5"><div className="flex items-center gap-2.5">{shippingLogo && <img src={shippingLogo} className="w-5 h-5 rounded-lg object-contain bg-gray-950 p-0.5 border border-white/5" alt="shipping" />}<span className="text-orange-400/80 font-black uppercase truncate tracking-tight text-[clamp(10px,0.8vw,12px)]">{order['Internal Shipping Method'] || '-'}</span></div></td>}
                                        {isVisible('shippingCost') && <td className="px-6 py-5 text-gray-400 font-mono font-black tracking-tighter text-[clamp(13px,0.9vw,15px)]">${(Number(order['Internal Cost']) || 0).toFixed(2)}</td>}
                                        {isVisible('status') && <td className="px-6 py-5"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${order['Payment Status'] === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{order['Payment Status']}</span></td>}
                                        
                                        {isVisible('date') && (
                                            <td className="px-4 py-5">
                                                <div className="flex flex-col items-start">
                                                    <span className="font-bold text-gray-400 text-[clamp(11px,0.8vw,12px)]">{orderDate.toLocaleDateString('km-KH')}</span>
                                                    <span className="font-mono text-blue-500/80 font-black text-[clamp(10px,0.7vw,11px)]">{orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                            </td>
                                        )}
                                        
                                        {isVisible('print') && <td className="px-4 py-5 text-center"><button onClick={() => handlePrint(order)} className="text-emerald-400/60 hover:text-white bg-emerald-400/5 hover:bg-emerald-600 p-2.5 rounded-xl transition-all border border-emerald-400/10 active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button></td>}
                                        
                                        {isVisible('check') && <td className="px-2 py-5 text-center"><div className="relative flex items-center justify-center"><input type="checkbox" checked={isVerified} onChange={() => toggleOrderVerified(orderId, isVerified)} className={`h-6 w-6 rounded-lg border-gray-700 bg-gray-950 text-emerald-500 focus:ring-emerald-500/10 transition-all ${isUpdating ? 'opacity-20' : 'hover:scale-110 active:scale-150 cursor-pointer'}`} />{isUpdating && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Spinner size="sm" /></div>}</div></td>}
                                        
                                        {isVisible('orderId') && <td className="px-2 py-5 text-center"><button onClick={() => handleCopy(order['Order ID'])} className={`p-2 rounded-xl transition-all border ${isThisCopied ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-gray-800 border-white/5 text-gray-500 hover:text-blue-400 active:scale-90'}`}><span className="text-[9px] font-black uppercase tracking-widest">{isThisCopied ? '✓' : 'ID'}</span></button></td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrdersListDesktop;

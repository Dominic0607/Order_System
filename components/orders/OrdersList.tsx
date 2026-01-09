
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { LABEL_PRINTER_URL_BASE, WEB_APP_URL } from '../../constants';
import Spinner from '../common/Spinner';

interface OrdersListProps {
    orders: ParsedOrder[];
    onEdit?: (order: ParsedOrder) => void;
    showActions: boolean;
    visibleColumns?: Set<string>;
    // Selection Props
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    onToggleSelectAll?: (ids: string[]) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ 
    orders, onEdit, showActions, visibleColumns,
    selectedIds = new Set(), onToggleSelect, onToggleSelectAll
}) => {
    const { appData, refreshData, previewImage } = useContext(AppContext);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    
    const [localOrders, setLocalOrders] = useState<ParsedOrder[]>(orders);

    useEffect(() => {
        setLocalOrders(orders);
    }, [orders]);

    const isVisible = (key: string) => {
        if (key === 'actions' && !showActions) return false;
        return !visibleColumns || visibleColumns.has(key);
    };

    const isAllSelected = orders.length > 0 && orders.every(o => selectedIds.has(o['Order ID']));

    const toggleOrderVerified = async (orderId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setLocalOrders(prev => prev.map(o => o['Order ID'] === orderId ? { ...o, IsVerified: newStatus } : o));
        setUpdatingIds(prev => new Set(prev).add(orderId));
        try {
            const response = await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetName: 'AllOrders', primaryKey: { 'Order ID': orderId }, newData: { 'IsVerified': newStatus } })
            });
            if (!response.ok) throw new Error("Failed to save");
            refreshData();
        } catch (e) {
            console.error("Verification toggle failed:", e);
            setLocalOrders(prev => prev.map(o => o['Order ID'] === orderId ? { ...o, IsVerified: currentStatus } : o));
            alert("រក្សាទុកស្ថានភាពមិនបានសម្រេច!");
        } finally {
            setUpdatingIds(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    };

    const formatPhone = (val: string) => {
        let phone = (val || '').replace(/[^0-9]/g, '');
        if (phone.length > 0) phone = '0' + phone.replace(/^0+/, '');
        return phone;
    };

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handlePrint = (order: ParsedOrder) => {
        if (!LABEL_PRINTER_URL_BASE || !order) return;
        const validatedPhone = formatPhone(order['Customer Phone']);
        const queryParams = new URLSearchParams({
            id: order['Order ID'],
            name: order['Customer Name'] || '',
            phone: validatedPhone,
            location: order.Location || '',
            address: order['Address Details'] || '',
            total: (order['Grand Total'] || 0).toString(),
            payment: order['Payment Status'] || 'Unpaid',
            shipping: order['Internal Shipping Method'] || 'N/A',
            page: order.Page || '',
            user: order.User || '',
        });
        const note = order.Note || '';
        const mapMatch = note.match(/https?:\/\/(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)\/[^\s]+/);
        if (mapMatch) queryParams.set('map', mapMatch[0]);
        window.open(`${LABEL_PRINTER_URL_BASE}?${queryParams.toString()}`, '_blank');
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

    return (
        <div className="w-full flex flex-col">
            <div className="flex-grow space-y-4">
                {/* Desktop View Table */}
                <div className="hidden md:block page-card !p-0 shadow-2xl border-gray-700/50 min-h-[1500px] overflow-visible">
                    <table className="admin-table w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="bg-gray-800/80 border-b border-gray-700">
                                {onToggleSelectAll && (
                                    <th className="px-4 py-4 w-12 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-500 cursor-pointer"
                                            checked={isAllSelected}
                                            onChange={() => onToggleSelectAll(orders.map(o => o['Order ID']))}
                                        />
                                    </th>
                                )}
                                {isVisible('index') && <th className="px-4 py-4 text-xs font-black uppercase tracking-wider text-center text-gray-400 w-12">#</th>}
                                {isVisible('orderId') && <th className="px-2 py-4 text-xs font-black uppercase tracking-wider text-center text-gray-400 w-16">ID</th>}
                                {isVisible('customerName') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-44">ឈ្មោះអតិថិជន</th>}
                                {isVisible('productInfo') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-36">ព័ត៌មាន Product</th>}
                                {isVisible('location') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-48">ទីតាំង</th>}
                                {isVisible('pageInfo') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-40">Page</th>}
                                {isVisible('total') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-28">សរុបទឹកប្រាក់</th>}
                                {isVisible('shippingService') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-44">សេវាដឹក</th>}
                                {isVisible('shippingCost') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-24">តម្លៃដឹកដើម</th>}
                                {isVisible('status') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-28">ស្ថានភាព</th>}
                                {isVisible('date') && <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-left text-gray-400 w-32">កាលបរិច្ឆេទ</th>}
                                {isVisible('print') && <th className="px-4 py-4 text-xs font-black uppercase tracking-wider text-center text-gray-400 w-16">ព្រីន</th>}
                                {isVisible('actions') && <th className="px-4 py-4 text-xs font-black uppercase tracking-wider text-center text-gray-400 w-24">សកម្មភាព</th>}
                                {isVisible('check') && <th className="px-4 py-4 text-xs font-black uppercase tracking-wider text-center text-emerald-500 w-28">VERIFIED</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {localOrders.map((order, idx) => {
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

                                const isNearBottom = idx > localOrders.length - 3 && localOrders.length > 4;
                                const tooltipPosClass = isNearBottom ? "bottom-full mb-3" : "top-full mt-3";
                                const tooltipArrowClass = isNearBottom ? "-bottom-2 border-r border-b" : "-top-2 border-t border-l";

                                return (
                                    <tr key={orderId} className={`${isVerified ? 'bg-emerald-500/5' : isSelected ? 'bg-blue-500/10' : 'hover:bg-gray-700/20'} transition-all group relative`}>
                                        {onToggleSelect && (
                                            <td className="px-4 py-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-500 cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={() => onToggleSelect(orderId)}
                                                />
                                            </td>
                                        )}
                                        {isVisible('index') && <td className="px-4 py-4 text-center text-xs font-bold text-gray-500">{idx + 1}</td>}
                                        {isVisible('orderId') && <td className="px-2 py-4 text-center"><button onClick={() => handleCopy(order['Order ID'])} className={`p-2 rounded-lg transition-all border ${isThisCopied ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-blue-400'}`}><span className="text-[9px] font-black uppercase tracking-widest">{isThisCopied ? '✓' : 'ID'}</span></button></td>}
                                        {isVisible('customerName') && <td className="px-5 py-4"><div className="font-bold text-gray-100 truncate mb-1">{order['Customer Name']}</div><div className="flex items-center gap-1.5">{carrierLogo && <img src={carrierLogo} className="w-4 h-4 object-contain" alt="carrier" />}<div className="text-[11px] text-gray-400 font-mono tracking-tighter">{displayPhone}</div></div></td>}
                                        
                                        {isVisible('productInfo') && (
                                            <td className="px-5 py-4 relative overflow-visible">
                                                <div className="group/prod flex flex-col gap-1 cursor-help">
                                                    {order.Products.slice(0, 2).map((p, i) => (
                                                        <div key={i} className="text-[11px] bg-gray-900/50 p-1.5 rounded border border-white/5 flex flex-col">
                                                            <span className="font-black text-gray-200 line-clamp-1">{p.name}</span>
                                                            <div className="flex justify-between items-center mt-0.5">
                                                                <span className="text-blue-400 font-bold">Qty: {p.quantity}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {order.Products.length > 2 && <p className="text-[9px] text-gray-500 font-bold ml-1">+ {order.Products.length - 2} items more...</p>}
                                                    
                                                    {/* Tooltip Popup */}
                                                    <div className={`invisible group-hover/prod:visible opacity-0 group-hover/prod:opacity-100 absolute z-[200] left-1/2 -translate-x-1/2 ${tooltipPosClass} w-80 p-5 bg-gray-800 border border-gray-600 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] transition-all duration-300 pointer-events-none`}>
                                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-3">ព័ត៌មានទំនិញពេញលេញ</p>
                                                        <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                                            {order.Products.map((p, i) => {
                                                                const masterProd = appData.products?.find(mp => mp.ProductName === p.name);
                                                                const displayImg = p.image || masterProd?.ImageURL || '';
                                                                return (
                                                                    <div key={i} className="flex items-center gap-4 text-left p-2 bg-black/20 rounded-2xl border border-white/5">
                                                                        <div className="w-14 h-14 flex-shrink-0 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-inner">
                                                                            <img src={convertGoogleDriveUrl(displayImg)} className="w-full h-full object-cover" alt={p.name} onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100/1f2937/4b5563?text=N/A')}/>
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[12px] font-black text-white leading-tight mb-1 line-clamp-2">{p.name}</p>
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/10">x{p.quantity}</span>
                                                                                {p.colorInfo && <span className="text-[9px] text-purple-400 font-bold">ពណ៌៖ {p.colorInfo}</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={`absolute ${tooltipArrowClass} left-1/2 -translate-x-1/2 w-5 h-5 bg-gray-800 border-gray-600 rotate-45`}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        )}

                                        {isVisible('location') && (
                                            <td className="px-5 py-4 relative overflow-visible">
                                                <div className="group/loc cursor-help">
                                                    <div className="text-[13px] font-black text-gray-100 leading-tight">{order.Location}</div>
                                                    <div className="text-[11px] font-bold text-gray-500 mt-1 line-clamp-1">{order['Address Details']}</div>
                                                    
                                                    <div className={`invisible group-hover/loc:visible opacity-0 group-hover/loc:opacity-100 absolute z-[200] left-1/2 -translate-x-1/2 ${tooltipPosClass} w-72 p-5 bg-gray-800 border border-gray-600 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] transition-all duration-300 pointer-events-none`}>
                                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2">ទីតាំង និងអាសយដ្ឋាន</p>
                                                        <div className="space-y-3 text-left">
                                                            <div>
                                                                <span className="text-[9px] font-black text-gray-500 uppercase">Province / City</span>
                                                                <p className="text-sm font-black text-white">{order.Location}</p>
                                                            </div>
                                                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                                <span className="text-[9px] font-black text-gray-500 uppercase block mb-1">Details</span>
                                                                <p className="text-[12px] text-gray-300 leading-relaxed font-medium">{order['Address Details'] || 'មិនមានអាសយដ្ឋានលម្អិត'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={`absolute ${tooltipArrowClass} left-1/2 -translate-x-1/2 w-5 h-5 bg-gray-800 border-gray-600 rotate-45`}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        )}

                                        {isVisible('pageInfo') && <td className="px-5 py-4"><div className="flex items-center gap-2">{logoUrl ? <img src={logoUrl} className="w-7 h-7 rounded-full border border-gray-700 shadow-sm object-cover" alt="logo" /> : <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[7px] text-gray-600 font-bold">Log</div>}<div className="min-w-0"><span className="text-[13px] font-bold text-gray-200 block truncate">{order.Page}</span><span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{order.Team}</span></div></div></td>}
                                        {isVisible('total') && <td className="px-5 py-4 font-black text-blue-400 text-base tracking-tight">${order['Grand Total'].toFixed(2)}</td>}
                                        {isVisible('shippingService') && <td className="px-5 py-4 text-[11px] text-yellow-500/80 font-bold uppercase"><div className="flex items-center gap-2">{shippingLogo && <img src={shippingLogo} className="w-5 h-5 rounded-full object-contain" alt="shipping" />}<span className="truncate">{order['Internal Shipping Method'] || '-'}</span></div></td>}
                                        {isVisible('shippingCost') && <td className="px-5 py-4 text-[11px] text-orange-400 font-mono font-bold">${(Number(order['Internal Cost']) || 0).toFixed(2)}</td>}
                                        {isVisible('status') && <td className="px-5 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${order['Payment Status'] === 'Paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{order['Payment Status']}</span></td>}
                                        {isVisible('date') && <td className="px-5 py-4 text-[10px] text-gray-500 font-bold">{new Date(order.Timestamp).toLocaleDateString('km-KH')}</td>}
                                        {isVisible('print') && <td className="px-4 py-4 text-center"><button onClick={() => handlePrint(order)} className="text-emerald-400 hover:text-white bg-emerald-400/5 hover:bg-emerald-600 p-2 rounded-lg transition-all border border-emerald-400/20 shadow-sm active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button></td>}
                                        {isVisible('actions') && <td className="px-4 py-4 text-center"><button onClick={() => onEdit && onEdit(order)} className="text-blue-400 hover:text-white bg-blue-400/5 hover:bg-blue-600 px-4 py-1.5 rounded-lg text-xs font-black transition-all border border-blue-400/20 shadow-sm active:scale-95">Edit</button></td>}
                                        {isVisible('check') && <td className="px-4 py-4 text-center"><div className="relative flex items-center justify-center"><input type="checkbox" checked={isVerified} onChange={() => toggleOrderVerified(orderId, isVerified)} className={`h-6 w-6 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer transition-all active:scale-150 ${isUpdating ? 'opacity-30' : 'hover:scale-110'}`} />{isUpdating && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Spinner size="sm" /></div>}</div></td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Card List */}
                <div className="md:hidden space-y-4 min-h-[1200px] pb-64">
                    {localOrders.map((order, idx) => {
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
                            <div key={order['Order ID']} className={`bg-gray-800/40 border ${isSelected ? 'border-blue-500 shadow-blue-500/10' : isVerified ? 'border-emerald-500/50' : 'border-gray-700'} rounded-[2rem] p-5 shadow-lg space-y-4 animate-fade-in relative`}>
                                {onToggleSelect && (
                                    <div className="absolute top-5 left-5 z-10">
                                        <input 
                                            type="checkbox" 
                                            className="h-6 w-6 rounded-lg border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(order['Order ID'])}
                                        />
                                    </div>
                                )}
                                <div className={`flex justify-between items-start ${onToggleSelect ? 'pl-10' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden shadow-inner">
                                            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="logo" /> : <span className="text-[10px] font-black text-gray-500">Log</span>}
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-black text-white leading-none">{order['Customer Name']}</h4>
                                            <p className="text-[10px] text-gray-500 uppercase font-black mt-1.5">{order.Page} ({order.Team})</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <button 
                                            onClick={() => handleCopy(order['Order ID'])}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${isThisCopied ? 'bg-green-600 text-white border-green-500' : 'bg-gray-900 text-gray-400 border-gray-700'}`}
                                        >
                                            {copiedId === order['Order ID'] ? 'Copied' : order['Order ID'].substring(0, 8)}
                                        </button>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${order['Payment Status'] === 'Paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {order['Payment Status']}
                                        </span>
                                    </div>
                                </div>

                                {isVisible('productInfo') && order.Products && order.Products.length > 0 && (
                                    <div className="bg-black/20 rounded-[1.5rem] p-3 border border-white/5 space-y-2">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                            ទំនិញដែលបានកម្មង់
                                        </p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                            {order.Products.map((p, i) => {
                                                const masterProd = appData.products?.find(mp => mp.ProductName === p.name);
                                                const displayImg = p.image || masterProd?.ImageURL || '';
                                                return (
                                                    <div key={i} className="flex items-center gap-3 bg-gray-900/40 p-2 rounded-xl border border-white/5">
                                                        <div className="w-10 h-10 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden" onClick={() => previewImage(convertGoogleDriveUrl(displayImg))}>
                                                            <img src={convertGoogleDriveUrl(displayImg)} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <p className="text-[12px] font-bold text-gray-200 truncate leading-tight">{p.name}</p>
                                                                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-1.5 rounded-lg flex-shrink-0">x{p.quantity}</span>
                                                            </div>
                                                            {p.colorInfo && <p className="text-[9px] text-gray-500 italic mt-1 truncate">ពណ៌៖ {p.colorInfo}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 text-[12px]">
                                    <div className="space-y-1">
                                        <p className="text-gray-500 font-black uppercase text-[9px] tracking-widest">លេខទូរស័ព្ទ</p>
                                        <div className="flex items-center gap-1.5">
                                            {carrierLogo && <img src={carrierLogo} className="w-4 h-4 object-contain" alt="" />}
                                            <span className="text-white font-mono font-bold tracking-tight">{displayPhone}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-gray-500 font-black uppercase text-[9px] tracking-widest">សរុបទឹកប្រាក់</p>
                                        <p className="text-blue-400 font-black text-base">${order['Grand Total'].toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-gray-500 font-black uppercase text-[9px] tracking-widest">ទីតាំង</p>
                                        <p className="text-white font-bold truncate max-w-[140px]">{order.Location}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-gray-500 font-black uppercase text-[9px] tracking-widest">ដឹកជញ្ជូន</p>
                                        <div className="flex items-center justify-end gap-1.5">
                                            {shippingLogo && <img src={shippingLogo} className="w-3.5 h-3.5 object-contain" alt="" />}
                                            <span className="text-white truncate max-w-[100px] font-bold">{order['Internal Shipping Method']}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        {isVisible('actions') && (
                                            <button 
                                                onClick={() => onEdit && onEdit(order)} 
                                                className="p-3 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 active:scale-90 transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        )}
                                        {isVisible('print') && (
                                            <button 
                                                onClick={() => handlePrint(order)} 
                                                className="p-3 bg-emerald-600/10 text-emerald-400 rounded-2xl border border-emerald-500/20 active:scale-90 transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] text-gray-500 font-bold italic">{new Date(order.Timestamp).toLocaleDateString('km-KH')}</span>
                                        {isVisible('check') && (
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isVerified} 
                                                    onChange={() => toggleOrderVerified(order['Order ID'], isVerified)} 
                                                    className={`h-9 w-9 rounded-xl border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500/20 transition-all ${isUpdating ? 'opacity-20' : 'active:scale-125'}`} 
                                                />
                                                {isUpdating && <div className="absolute inset-0 flex items-center justify-center"><Spinner size="sm" /></div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hidden Spacer for page-level scroll aesthetics */}
            <div className="h-64 md:h-[400px] w-full pointer-events-none opacity-0 shrink-0" aria-hidden="true"></div>
        </div>
    );
};

export default OrdersList;

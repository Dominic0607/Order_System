
import React, { useMemo } from 'react';
import { ParsedOrder } from '../../types';

// --- Hook for Calculation ---
export const useOrderTotals = (orders: ParsedOrder[]) => {
    return useMemo(() => {
        return orders.reduce((acc, curr) => ({
            grandTotal: acc.grandTotal + (Number(curr['Grand Total']) || 0),
            internalCost: acc.internalCost + (Number(curr['Internal Cost']) || 0),
            count: acc.count + 1,
            paidCount: acc.paidCount + (curr['Payment Status'] === 'Paid' ? 1 : 0),
            unpaidCount: acc.unpaidCount + (curr['Payment Status'] === 'Unpaid' ? 1 : 0)
        }), { grandTotal: 0, internalCost: 0, count: 0, paidCount: 0, unpaidCount: 0 });
    }, [orders]);
};

// --- Desktop Row Component ---
interface DesktopGrandTotalRowProps {
    totals: { grandTotal: number; internalCost: number; count: number; paidCount: number; unpaidCount: number };
    isVisible: (key: string) => boolean;
    showSelection: boolean;
}

export const DesktopGrandTotalRow: React.FC<DesktopGrandTotalRowProps> = ({ totals, isVisible, showSelection }) => {
    if (totals.count === 0) return null;

    return (
        <tr className="bg-blue-900/30 border-b-2 border-blue-500/20 sticky top-0 z-20 backdrop-blur-md shadow-lg">
            {showSelection && <td className="px-4 py-4"></td>}
            
            {isVisible('index') && (
                <td className="px-4 py-4 text-center font-black text-blue-400 text-[clamp(12px,0.9vw,14px)]">
                    {totals.count}
                </td>
            )}
            
            {/* Moved Actions Here (2nd Position) */}
            {isVisible('actions') && <td className="px-4 py-4"></td>}
            
            {isVisible('customerName') && (
                <td className="px-6 py-4">
                    <span className="font-black text-white uppercase tracking-widest text-[clamp(11px,0.8vw,13px)]">
                        Grand Total (សរុបរួម)
                    </span>
                </td>
            )}
            
            {isVisible('productInfo') && <td className="px-6 py-4"></td>}
            {isVisible('location') && <td className="px-6 py-4"></td>}
            {isVisible('pageInfo') && <td className="px-6 py-4"></td>}
            {isVisible('fulfillment') && <td className="px-6 py-4"></td>}
            
            {isVisible('total') && (
                <td className="px-6 py-4">
                    <span className="font-black text-emerald-400 tracking-tighter shadow-emerald-500/20 drop-shadow-sm text-[clamp(16px,1.2vw,20px)]">
                        ${totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </td>
            )}
            
            {isVisible('shippingService') && <td className="px-6 py-4"></td>}
            
            {isVisible('shippingCost') && (
                <td className="px-6 py-4">
                    <span className="font-black text-orange-400 font-mono text-[clamp(13px,0.9vw,15px)]">
                        ${totals.internalCost.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                </td>
            )}
            
            {isVisible('status') && (
                <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                        {totals.paidCount > 0 && (
                            <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider whitespace-nowrap text-[clamp(10px,0.7vw,12px)]">
                                Paid: {totals.paidCount}
                            </span>
                        )}
                        {totals.unpaidCount > 0 && (
                            <span className="font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wider whitespace-nowrap text-[clamp(10px,0.7vw,12px)]">
                                Unpaid: {totals.unpaidCount}
                            </span>
                        )}
                    </div>
                </td>
            )}

            {isVisible('date') && <td className="px-4 py-4"></td>}
            {isVisible('print') && <td className="px-4 py-4"></td>}
            {isVisible('check') && <td className="px-2 py-4"></td>}
            
            {/* Moved Order ID (Node ID) to Last Position */}
            {isVisible('orderId') && <td className="px-2 py-4"></td>}
        </tr>
    );
};

// --- Mobile Card Component ---
interface MobileGrandTotalCardProps {
    totals: { grandTotal: number; internalCost: number; count: number; paidCount: number; unpaidCount: number };
}

export const MobileGrandTotalCard: React.FC<MobileGrandTotalCardProps> = ({ totals }) => {
    if (totals.count === 0) return null;

    return (
        <div className="bg-blue-900/20 backdrop-blur-xl border border-blue-500/30 rounded-[2.2rem] p-5 shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                    Grand Total
                </h3>
                <span className="text-[10px] font-bold text-gray-400 bg-black/30 px-3 py-1 rounded-full">
                    {totals.count} Orders
                </span>
            </div>
            
            {/* Financial Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Total Revenue</p>
                    <p className="text-xl font-black text-emerald-400 tracking-tighter">
                        ${totals.grandTotal.toLocaleString()}
                    </p>
                </div>
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Total Cost</p>
                    <p className="text-lg font-black text-orange-400 tracking-tighter">
                        ${totals.internalCost.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </p>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="flex gap-2">
                <div className="flex-1 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 flex justify-between items-center px-3">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">PAID</span>
                    <span className="text-sm font-black text-white">{totals.paidCount}</span>
                </div>
                <div className="flex-1 bg-red-500/10 p-2 rounded-xl border border-red-500/20 flex justify-between items-center px-3">
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">UNPAID</span>
                    <span className="text-sm font-black text-white">{totals.unpaidCount}</span>
                </div>
            </div>
        </div>
    );
};

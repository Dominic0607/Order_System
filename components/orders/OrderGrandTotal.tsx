
import React, { useMemo } from 'react';
import { ParsedOrder } from '../../types';

export const useOrderTotals = (orders: ParsedOrder[]) => {
    return useMemo(() => {
        const totals = {
            grandTotal: 0,
            internalCost: 0,
            count: orders.length
        };

        orders.forEach(o => {
            totals.grandTotal += Number(o['Grand Total']) || 0;
            totals.internalCost += Number(o['Internal Cost']) || 0;
        });

        return totals;
    }, [orders]);
};

interface DesktopGrandTotalRowProps {
    totals: { grandTotal: number; internalCost: number; count: number };
    isVisible: (key: string) => boolean;
    showSelection: boolean;
}

export const DesktopGrandTotalRow: React.FC<DesktopGrandTotalRowProps> = ({ totals, isVisible, showSelection }) => {
    // Only show if there are orders
    if (totals.count === 0) return null;

    return (
        <tr className="bg-blue-600/10 border-b-2 border-blue-500/20 sticky top-[69px] z-20 backdrop-blur-md shadow-lg">
            {showSelection && <td className="px-4 py-4"></td>}
            {isVisible('index') && <td className="px-4 py-4 text-center font-black text-blue-300">Σ</td>}
            {isVisible('orderId') && <td className="px-2 py-4 text-center text-[10px] font-black uppercase text-blue-300 tracking-widest">{totals.count}</td>}
            
            {isVisible('customerName') && <td className="px-6 py-4"></td>}
            {isVisible('productInfo') && <td className="px-6 py-4"></td>}
            {isVisible('location') && <td className="px-6 py-4"></td>}
            {isVisible('pageInfo') && <td className="px-6 py-4 text-right text-[10px] font-black uppercase text-blue-300 tracking-widest">TOTALS:</td>}
            
            {isVisible('total') && (
                <td className="px-6 py-4">
                    <div className="font-black text-blue-400 text-lg tracking-tighter shadow-blue-500/20 drop-shadow-sm">
                        ${totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </td>
            )}
            
            {isVisible('shippingService') && <td className="px-6 py-4"></td>}
            
            {isVisible('shippingCost') && (
                <td className="px-6 py-4">
                    <div className="text-[12px] font-black font-mono text-orange-300 tracking-tighter">
                        ${totals.internalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </td>
            )}
            
            {isVisible('status') && <td className="px-6 py-4"></td>}
            {isVisible('date') && <td className="px-4 py-4"></td>}
            {isVisible('print') && <td className="px-4 py-4"></td>}
            {isVisible('actions') && <td className="px-4 py-4"></td>}
            {isVisible('check') && <td className="px-2 py-4"></td>}
        </tr>
    );
};

interface MobileGrandTotalCardProps {
    totals: { grandTotal: number; internalCost: number; count: number };
}

export const MobileGrandTotalCard: React.FC<MobileGrandTotalCardProps> = ({ totals }) => {
    if (totals.count === 0) return null;

    return (
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-[2rem] p-5 border border-blue-500/20 shadow-lg mb-4 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/30">
                        {totals.count}
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-wider text-sm">Total Orders</h3>
                        <p className="text-blue-300 text-[10px] font-bold">Summary View</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Grand Total</p>
                    <p className="text-xl font-black text-white tracking-tighter shadow-black drop-shadow-md">
                        ${totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Exp. Cost</p>
                    <p className="text-xl font-black text-orange-400 tracking-tighter font-mono">
                        ${totals.internalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
        </div>
    );
};


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

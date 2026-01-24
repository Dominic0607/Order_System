
import React, { useMemo } from 'react';

interface StoreStat {
    name: string;
    revenue: number;
    orders: number;
}

interface FulfillmentStoreTableProps {
    stats: StoreStat[];
    onStatClick: (storeName: string) => void;
}

const FulfillmentStoreTable: React.FC<FulfillmentStoreTableProps> = ({ stats, onStatClick }) => {
    const grandTotals = useMemo(() => {
        return stats.reduce((acc, curr) => ({
            revenue: acc.revenue + curr.revenue,
            orders: acc.orders + curr.orders
        }), { revenue: 0, orders: 0 });
    }, [stats]);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center px-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                ឃ្លាំងបញ្ចេញទំនិញ (Stock)
            </h3>
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-gray-500 font-black uppercase tracking-widest bg-gray-900/50 border-b border-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">ឈ្មោះឃ្លាំង (Store)</th>
                                <th className="px-6 py-4 text-center">ចំនួន Orders</th>
                                <th className="px-6 py-4 text-right">ចំណូល</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/30">
                            {stats.map((store, idx) => (
                                <tr key={store.name} className="hover:bg-orange-600/5 transition-colors group cursor-pointer" onClick={() => onStatClick(store.name)}>
                                    <td className="px-6 py-4 font-bold text-gray-100 flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-lg bg-gray-700 text-gray-400 flex items-center justify-center text-[10px] border border-gray-600">#{idx + 1}</span>
                                        <span className="group-hover:text-orange-300 transition-colors">{store.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-blue-400 font-black group-hover:underline">
                                        {store.orders}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-green-400 group-hover:text-green-300 transition-colors">
                                        ${store.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500 italic">មិនទាន់មានទិន្នន័យ</td>
                                </tr>
                            )}
                        </tbody>
                        {stats.length > 0 && (
                            <tfoot className="bg-gray-900/80 font-black border-t-2 border-gray-700">
                                <tr>
                                    <td className="px-6 py-4 uppercase tracking-widest text-gray-500 text-[10px]">សរុបរួម</td>
                                    <td className="px-6 py-4 text-center text-blue-300 text-base">{grandTotals.orders}</td>
                                    <td className="px-6 py-4 text-right text-green-400 text-base">
                                        ${grandTotals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FulfillmentStoreTable;

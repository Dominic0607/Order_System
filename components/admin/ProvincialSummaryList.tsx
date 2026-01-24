
import React from 'react';

interface ProvinceStat {
    name: string;
    revenue: number;
    orders: number;
}

interface ProvincialSummaryListProps {
    stats: ProvinceStat[];
    onProvinceClick?: (provinceName: string) => void;
}

const ProvincialSummaryList: React.FC<ProvincialSummaryListProps> = ({ stats, onProvinceClick }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center px-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                សង្ខេបតាមខេត្ត/រាជធានី
            </h3>
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl h-[450px] lg:h-[550px] xl:h-[600px]">
                <div className="overflow-y-auto h-full custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-gray-500 font-black uppercase tracking-widest bg-gray-900/50 border-b border-gray-700 sticky top-0 z-20">
                            <tr>
                                <th className="px-4 py-4">ខេត្ត/រាជធានី</th>
                                <th className="px-4 py-4 text-right">ចំណូលសរុប</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/30">
                            {stats.map((prov, idx) => (
                                <tr 
                                    key={prov.name} 
                                    className="hover:bg-blue-600/5 transition-colors cursor-pointer group"
                                    onClick={() => onProvinceClick?.(prov.name)}
                                >
                                    <td className="px-4 py-3 font-bold text-gray-200 group-hover:text-blue-300 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-gray-700 text-[9px] text-gray-500 flex items-center justify-center border border-gray-600">
                                                {idx + 1}
                                            </span>
                                            <span className="truncate max-w-[150px]">{prov.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-blue-400 font-black block group-hover:text-blue-300">
                                            ${prov.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-tighter group-hover:text-gray-400">
                                            {prov.orders} orders
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500 italic">មិនទាន់មានទិន្នន័យ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProvincialSummaryList;

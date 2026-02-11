
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
            <h3 className="text-lg font-black text-slate-100 flex items-center px-1 tracking-tight">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                សង្ខេបតាមខេត្ត/រាជធានី
            </h3>
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl h-[450px] lg:h-[550px] xl:h-[600px]">
                <div className="overflow-y-auto h-full custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-950/80 border-b border-slate-700/50 sticky top-0 z-20 backdrop-blur-md">
                            <tr>
                                <th className="px-5 py-4">ខេត្ត/រាជធានី</th>
                                <th className="px-5 py-4 text-right">ចំណូលសរុប</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {stats.map((prov, idx) => (
                                <tr 
                                    key={prov.name} 
                                    className="hover:bg-indigo-500/10 transition-colors cursor-pointer group"
                                    onClick={() => onProvinceClick?.(prov.name)}
                                >
                                    <td className="px-5 py-3.5 font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border shadow-sm
                                                ${idx < 3 
                                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-400/50 text-white' 
                                                    : 'bg-slate-800 border-slate-700 text-slate-500'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                            <span className="truncate max-w-[150px] font-medium tracking-wide">{prov.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <span className="text-cyan-400 font-black block group-hover:text-cyan-300 drop-shadow-sm text-base">
                                            ${prov.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold group-hover:text-slate-400">
                                            {prov.orders} orders
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-slate-500 italic">មិនទាន់មានទិន្នន័យ</td>
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


import React from 'react';
import StatCard from './StatCard';
import GaugeChart from '../common/GaugeChart';
import SimpleLineChart from '../common/SimpleLineChart';

interface PerformanceOverviewProps {
    summary: any;
    monthlyTrend: any[];
}

const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ summary, monthlyTrend }) => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard label="ចំណូលសរុប (Revenue)" value={`$${summary.totalRevenue.toLocaleString()}`} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} colorClass="from-blue-600 to-blue-400" />
                <StatCard label="ប្រាក់ចំណេញ (Profit)" value={`$${summary.totalProfit.toLocaleString()}`} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} colorClass="from-emerald-600 to-green-400" />
                <StatCard label="ការកម្មង់សរុប (Orders)" value={summary.totalOrders} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} colorClass="from-purple-600 to-pink-400" />
                <StatCard label="គោលដៅសរុប (Overall Target)" value={summary.overallTarget > 0 ? `$${summary.overallTarget.toLocaleString()}` : 'N/A'} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} colorClass="from-orange-500 to-yellow-400" />
            </div>
            <div className="glass-card p-6 rounded-2xl shadow-xl border border-gray-700/50">
                <SimpleLineChart data={monthlyTrend} title="និន្នាការចំណូល (Revenue Trend)" />
            </div>
        </div>
        <div className="lg:col-span-4">
            <div className="glass-card p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center h-full min-h-[400px]">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-8">វឌ្ឍនភាពគោលដៅរួម</h3>
                <GaugeChart value={summary.overallAchievement} label="Overall Achievement" />
                <div className="mt-10 grid grid-cols-1 gap-4 w-full">
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">នៅខ្វះ (To Target)</p>
                        <p className="text-2xl font-black text-white">${Math.max(0, summary.overallTarget - summary.totalRevenue).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default PerformanceOverview;

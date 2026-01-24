
import React from 'react';
import { User, ParsedOrder } from '../../types';
import StatCard from '../performance/StatCard';
import TeamRevenueTable from './TeamRevenueTable';
import ProvincialMap from './ProvincialMap';
import ProvincialSummaryList from './ProvincialSummaryList';

interface DashboardOverviewProps {
    currentUser: User | null;
    parsedOrders: ParsedOrder[];
    revenueBreakdownPeriod: 'today' | 'this_month' | 'this_year';
    setRevenueBreakdownPeriod: (period: 'today' | 'this_month' | 'this_year') => void;
    teamRevenueStats: any[];
    provinceStats: any[];
    onTeamClick: (team: string) => void;
    onProvinceClick: (province: string) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    currentUser, parsedOrders, revenueBreakdownPeriod, setRevenueBreakdownPeriod,
    teamRevenueStats, provinceStats, onTeamClick, onProvinceClick
}) => {
    const metrics = {
        revenue: parsedOrders.filter(o => {
            const d = new Date(o.Timestamp);
            const now = new Date();
            if (revenueBreakdownPeriod === 'today') return d.toDateString() === now.toDateString();
            if (revenueBreakdownPeriod === 'this_month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            return d.getFullYear() === now.getFullYear();
        }).reduce((sum, o) => sum + (Number(o['Grand Total']) || 0), 0),
        orders: parsedOrders.filter(o => {
            const d = new Date(o.Timestamp);
            const now = new Date();
            if (revenueBreakdownPeriod === 'today') return d.toDateString() === now.toDateString();
            if (revenueBreakdownPeriod === 'this_month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            return d.getFullYear() === now.getFullYear();
        }).length,
        unpaid: parsedOrders.filter(o => o['Payment Status'] === 'Unpaid').length
    };

    return (
        <div className="space-y-6 lg:space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800/10 p-5 rounded-[2rem] border border-white/5 backdrop-blur-md">
                <div>
                    <h2 className="text-xl lg:text-2xl 2xl:text-3xl font-black text-white leading-tight">សួស្តី, {currentUser?.FullName} 👋</h2>
                    <p className="text-gray-500 text-xs lg:text-sm font-bold uppercase tracking-widest mt-1.5">
                        {new Date().toLocaleDateString('km-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {(['today', 'this_month', 'this_year'] as const).map(p => (
                        <button key={p} onClick={() => setRevenueBreakdownPeriod(p)} className={`px-4 py-1.5 text-[11px] lg:text-xs font-black uppercase rounded-lg transition-all ${revenueBreakdownPeriod === p ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                            {p === 'today' ? 'ថ្ងៃនេះ' : p === 'this_month' ? 'ខែនេះ' : 'ឆ្នាំនេះ'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics - Adaptive Grid for 13" (2 cols) vs 15"+ (3 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                <StatCard label="ចំណូលសរុប" value={`$${metrics.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon="💰" colorClass="from-blue-600 to-blue-400" />
                <StatCard label="ចំនួនការកម្មង់" value={metrics.orders} icon="📦" colorClass="from-emerald-600 to-emerald-400" />
                <StatCard label="មិនទាន់ទូទាត់" value={metrics.unpaid} icon="⏳" colorClass="from-orange-500 to-yellow-400" />
            </div>
            
            {/* Main Tables */}
            {/* Use xl:grid-cols-12 to trigger side-by-side only on larger screens (15"+ or 13" with sidebar collapsed) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
                <div className="xl:col-span-12">
                    <TeamRevenueTable stats={teamRevenueStats} onStatClick={onTeamClick} />
                </div>
                <div className="xl:col-span-8">
                    <ProvincialMap data={provinceStats} />
                </div>
                <div className="xl:col-span-4">
                    <ProvincialSummaryList stats={provinceStats} onProvinceClick={onProvinceClick} />
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;

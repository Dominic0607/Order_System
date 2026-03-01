
import React, { useState, useMemo, useContext } from 'react';
import { ParsedOrder, User } from '../../types';
import { AppContext } from '../../context/AppContext';
import { analyzeReportData } from '../../services/geminiService';
import GeminiButton from '../common/GeminiButton';
import SimpleLineChart from '../common/SimpleLineChart';
import StatCard from '../performance/StatCard';
import ShippingReport from '../reports/ShippingReport';
import { FilterState } from '../orders/OrderFilters';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';

interface ReportsViewProps {
    orders: ParsedOrder[];
    allOrders: ParsedOrder[];
    reportType: 'overview' | 'performance' | 'profitability' | 'forecasting' | 'shipping';
    dateFilter: string;
    startDate?: string;
    endDate?: string;
    onNavigate?: (filters: any) => void;
    contextFilters?: FilterState;
}

const ReportsView: React.FC<ReportsViewProps> = ({ orders, reportType, dateFilter, startDate, endDate, onNavigate, contextFilters }) => {
    const { appData } = useContext(AppContext);
    const [analysis, setAnalysis] = useState<string>('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    // Handle Shipping Report separately via component
    if (reportType === 'shipping') {
        return <ShippingReport orders={orders} appData={appData} dateFilter={dateFilter} startDate={startDate} endDate={endDate} onNavigate={onNavigate} contextFilters={contextFilters} />;
    }

    const stats = useMemo(() => {
        const revenue = orders.reduce((sum, o) => sum + (Number(o['Grand Total']) || 0), 0);
        const productCost = orders.reduce((sum, o) => sum + (Number(o['Total Product Cost ($)']) || 0), 0);
        const shippingCost = orders.reduce((sum, o) => sum + (Number(o['Internal Cost']) || 0), 0);
        const totalProfit = revenue - productCost - shippingCost;
        const margin = revenue > 0 ? (totalProfit / revenue) * 100 : 0;
        
        // Breakdown by User
        const userMap: Record<string, { revenue: number, orders: number, name: string, avatar: string }> = {};
        // Breakdown by Team
        const teamMap: Record<string, { revenue: number, orders: number }> = {};
        // Breakdown by Payment Status
        const paymentMap: Record<string, number> = { Paid: 0, Unpaid: 0 };
        // Revenue over time (Daily)
        const dateMap: Record<string, number> = {};

        orders.forEach(o => {
            // User stats
            const username = o.User || 'Unknown';
            if (!userMap[username]) {
                const userObj = appData.users?.find(u => u.UserName === username);
                userMap[username] = { 
                    revenue: 0, 
                    orders: 0, 
                    name: userObj?.FullName || username,
                    avatar: userObj?.ProfilePictureURL || ''
                };
            }
            userMap[username].revenue += Number(o['Grand Total']) || 0;
            userMap[username].orders += 1;

            // Team stats
            const team = o.Team || 'Unassigned';
            if (!teamMap[team]) teamMap[team] = { revenue: 0, orders: 0 };
            teamMap[team].revenue += Number(o['Grand Total']) || 0;
            teamMap[team].orders += 1;

            // Payment stats
            const status = o['Payment Status'] || 'Unpaid';
            paymentMap[status] = (paymentMap[status] || 0) + 1;

            // Date stats
            if (o.Timestamp) {
                const d = new Date(o.Timestamp);
                const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const sortKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
                
                if (!dateMap[sortKey]) {
                    // @ts-ignore
                    dateMap[sortKey] = { label: dateKey, value: 0 };
                }
                // @ts-ignore
                dateMap[sortKey].value += Number(o['Grand Total']) || 0;
            }
        });

        const topUsers = Object.values(userMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const teamStats = Object.entries(teamMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);
        
        // Sort chart data by the YYYY-MM-DD key
        const chartData = Object.keys(dateMap)
            .sort()
            .map(key => ({ 
                // @ts-ignore
                label: dateMap[key].label, 
                // @ts-ignore
                value: dateMap[key].value 
            }));

        return { 
            revenue, totalOrders: orders.length, totalProfit, margin, shippingCost,
            topUsers, teamStats, paymentMap, chartData 
        };
    }, [orders, appData.users]);

    const handleAnalyze = async () => {
        setLoadingAnalysis(true);
        try {
            const dataToAnalyze = {
                revenue: stats.revenue,
                orders: stats.totalOrders,
                profit: stats.totalProfit,
                margin: stats.margin,
                topPerformers: stats.topUsers.map(u => ({ name: u.name, revenue: u.revenue }))
            };
            const result = await analyzeReportData(dataToAnalyze, { reportType });
            setAnalysis(result);
        } catch (e) { setAnalysis("AI Analysis error."); } finally { setLoadingAnalysis(false); }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="ចំណូលសរុប" value={`$${stats.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon="💰" colorClass="from-blue-600 to-blue-400" />
                <StatCard label="ការកម្មង់" value={stats.totalOrders} icon="📦" colorClass="from-indigo-600 to-indigo-400" />
                <StatCard label="ប្រាក់ចំណេញ" value={`$${stats.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon="📈" colorClass="from-emerald-600 to-emerald-400" />
                <StatCard label="Margin (%)" value={`${stats.margin.toFixed(1)}%`} icon="⚖️" colorClass="from-amber-500 to-orange-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Main Revenue Chart */}
                <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                    <div className="page-card p-4 sm:!p-8 bg-gray-900/40 border-white/5 h-full min-h-[300px] sm:min-h-[400px] flex flex-col justify-center">
                        <SimpleLineChart data={stats.chartData} title="និន្នាការចំណូល (Revenue Trends)" />
                    </div>

                    {/* Breakdown Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {/* Team Performance */}
                        <div className="page-card !p-6 bg-gray-900/40 border-white/5">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                                Performance by Team
                            </h3>
                            <div className="space-y-4">
                                {stats.teamStats.map(team => (
                                    <div key={team.name} className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-white uppercase">{team.name}</span>
                                            <span className="text-xs font-mono font-bold text-blue-400">${team.revenue.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                                                style={{ width: `${(team.revenue / stats.revenue) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                            <span>{team.orders} Orders</span>
                                            <span>{((team.revenue / stats.revenue) * 100).toFixed(1)}% of Total</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Status Breakdown */}
                        <div className="page-card !p-6 bg-gray-900/40 border-white/5 flex flex-col">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                                Payment Status
                            </h3>
                            <div className="flex-grow flex flex-col justify-center gap-8">
                                <div className="flex justify-around items-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-emerald-400">{stats.paymentMap.Paid || 0}</div>
                                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Paid Orders</div>
                                    </div>
                                    <div className="h-10 w-px bg-gray-800"></div>
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-orange-400">{stats.paymentMap.Unpaid || 0}</div>
                                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Unpaid Orders</div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex h-3 w-full rounded-full overflow-hidden border border-white/5">
                                        <div className="bg-emerald-500" style={{ width: `${(stats.paymentMap.Paid / stats.totalOrders) * 100}%` }}></div>
                                        <div className="bg-orange-500" style={{ width: `${(stats.paymentMap.Unpaid / stats.totalOrders) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-emerald-500">Paid: {((stats.paymentMap.Paid / stats.totalOrders) * 100 || 0).toFixed(1)}%</span>
                                        <span className="text-orange-500">Unpaid: {((stats.paymentMap.Unpaid / stats.totalOrders) * 100 || 0).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: AI & Top Performers */}
                <div className="lg:col-span-4 space-y-6 lg:space-y-8">
                    {/* Top Performers (Users) */}
                    <div className="page-card !p-6 bg-gray-900/40 border-white/5">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                            Top Performers
                        </h3>
                        <div className="space-y-5">
                            {stats.topUsers.map((user, idx) => (
                                <div key={user.name} className="flex items-center gap-4 group">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 group-hover:border-purple-500/50 transition-colors bg-black/40">
                                            {user.avatar ? (
                                                <img src={convertGoogleDriveUrl(user.avatar)} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-600 uppercase">{user.name.substring(0, 2)}</div>
                                            )}
                                        </div>
                                        <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-900 rounded-lg border border-white/10 flex items-center justify-center text-[10px] font-black text-purple-400">
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-black text-white truncate">{user.name}</h4>
                                            <span className="text-xs font-mono font-black text-purple-400">${user.revenue.toLocaleString()}</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{user.orders} Orders Completed</p>
                                    </div>
                                </div>
                            ))}
                            {stats.topUsers.length === 0 && <p className="text-[10px] text-gray-600 text-center py-4 italic">No sales data recorded</p>}
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="page-card !p-6 bg-gray-900/40 border-white/5 flex flex-col min-h-[300px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">AI Intelligence</h3>
                            <GeminiButton onClick={handleAnalyze} isLoading={loadingAnalysis}>Analyze</GeminiButton>
                        </div>
                        <div className="flex-grow bg-black/40 rounded-[2rem] p-5 border border-white/5 overflow-y-auto custom-scrollbar">
                            {analysis ? (
                                <div className="text-sm text-gray-300 leading-relaxed font-medium">{analysis}</div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    <p className="text-[10px] text-center uppercase font-black tracking-[0.3em]">Ready for Analysis</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsView;

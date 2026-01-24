
import React, { useState, useMemo, useContext } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { analyzeReportData } from '../../services/geminiService';
import GeminiButton from '../common/GeminiButton';
import SimpleLineChart from '../common/SimpleLineChart';
import StatCard from '../performance/StatCard';
import ShippingReport from '../reports/ShippingReport';
import { FilterState } from '../orders/OrderFilters';

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
        
        return { revenue, totalOrders: orders.length, totalProfit, margin, shippingCost };
    }, [orders]);

    const handleAnalyze = async () => {
        setLoadingAnalysis(true);
        try {
            const dataToAnalyze = stats;
            const result = await analyzeReportData(dataToAnalyze, { reportType });
            setAnalysis(result);
        } catch (e) { setAnalysis("AI Analysis error."); } finally { setLoadingAnalysis(false); }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="ចំណូលសរុប" value={`$${stats.revenue.toLocaleString()}`} icon="💰" colorClass="from-blue-600 to-blue-400" />
                <StatCard label="ការកម្មង់" value={stats.totalOrders} icon="📦" colorClass="from-indigo-600 to-indigo-400" />
                <StatCard label="ប្រាក់ចំណេញ" value={`$${stats.totalProfit.toLocaleString()}`} icon="📈" colorClass="from-emerald-600 to-emerald-400" />
                <StatCard label="Margin (%)" value={`${stats.margin.toFixed(1)}%`} icon="⚖️" colorClass="from-amber-500 to-orange-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div className="page-card !p-8 bg-gray-900/40 border-white/5 h-full min-h-[400px]">
                        <SimpleLineChart data={[]} title="និន្នាការចំណូល (Revenue Over Time)" />
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <div className="page-card !p-8 bg-gray-900/40 border-white/5 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Insights</h3>
                            <GeminiButton onClick={handleAnalyze} isLoading={loadingAnalysis}>Analyze</GeminiButton>
                        </div>
                        <div className="flex-grow bg-black/40 rounded-3xl p-6 border border-white/5 overflow-y-auto">
                            {analysis ? <div className="text-sm text-gray-300">{analysis}</div> : <p className="text-[10px] opacity-20 text-center uppercase font-black">Ready for Analysis</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsView;

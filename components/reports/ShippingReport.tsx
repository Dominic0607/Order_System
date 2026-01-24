
import React, { useState, useMemo } from 'react';
import { ParsedOrder, AppData } from '../../types';
import { analyzeReportData } from '../../services/geminiService';
import GeminiButton from '../common/GeminiButton';
import StatCard from '../performance/StatCard';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { FilterState } from '../orders/OrderFilters';

interface ShippingReportProps {
    orders: ParsedOrder[];
    appData: AppData;
    dateFilter: string;
    startDate?: string;
    endDate?: string;
    onNavigate?: (filters: any) => void;
    contextFilters?: FilterState;
}

const ShippingReport: React.FC<ShippingReportProps> = ({ orders, appData, dateFilter, startDate, endDate, onNavigate, contextFilters }) => {
    const [analysis, setAnalysis] = useState<string>('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    // Filter Navigation Handler
    const handleFilterNavigation = (key: string, value: string) => {
        if (onNavigate) {
            // Start with base context filters to preserve state (Team, Store, Payment, etc.)
            const filters: any = {};
            
            // Map known context filters to simple object
            if (contextFilters) {
                if (contextFilters.team) filters.team = contextFilters.team;
                if (contextFilters.store) filters.store = contextFilters.store; // Brand Store
                if (contextFilters.paymentStatus) filters.paymentStatus = contextFilters.paymentStatus;
                if (contextFilters.user) filters.user = contextFilters.user;
                if (contextFilters.page) filters.page = contextFilters.page;
                if (contextFilters.bank) filters.bank = contextFilters.bank;
                if (contextFilters.product) filters.product = contextFilters.product;
                if (contextFilters.internalCost) filters.internalCost = contextFilters.internalCost;
                
                // Be careful with overlapping concepts
                if (contextFilters.fulfillmentStore) filters.fulfillmentStore = contextFilters.fulfillmentStore; 
                if (contextFilters.location) filters.location = contextFilters.location;
            }

            // Apply Specific Drill-Down Overrides
            if (key === 'shippingFilter') filters.shipping = value; // Maps to 'shippingService'
            if (key === 'driverFilter') filters.driver = value;     // Maps to 'driver'
            
            // If the user clicked specifically on a store in the report table, that overrides the context
            // Note: In ShippingReport, the "Store" column refers to Fulfillment Store (Stock)
            if (key === 'fulfillmentStore') filters.fulfillmentStore = value; 
            
            // Pass current date context to keep the timeframe consistent
            filters.datePreset = dateFilter;
            filters.startDate = startDate;
            filters.endDate = endDate;
            
            onNavigate(filters);
        }
    };

    // គណនាទិន្នន័យសម្រាប់ Shipping Report
    const shippingStats = useMemo(() => {
        const totalInternalCost = orders.reduce((sum, o) => sum + (Number(o['Internal Cost']) || 0), 0);
        const totalCustomerFee = orders.reduce((sum, o) => sum + (Number(o['Shipping Fee (Customer)']) || 0), 0);
        const netShipping = totalCustomerFee - totalInternalCost;
        
        const methods: Record<string, { name: string, cost: number, orders: number, logo: string }> = {};
        const drivers: Record<string, { name: string, cost: number, orders: number, photo: string }> = {};
        const stores: Record<string, { name: string, cost: number, orders: number }> = {};

        orders.forEach(o => {
            // 1. Methods Logic
            const mName = o['Internal Shipping Method'] || 'Other';
            if (!methods[mName]) {
                const info = appData.shippingMethods?.find(sm => sm.MethodName === mName);
                methods[mName] = { name: mName, cost: 0, orders: 0, logo: info?.LogosURL || '' };
            }
            methods[mName].cost += (Number(o['Internal Cost']) || 0);
            methods[mName].orders += 1;

            // 2. Drivers Logic
            const dName = o['Internal Shipping Details'] || 'N/A';
            if (dName !== 'N/A') {
                if (!drivers[dName]) {
                    const info = appData.drivers?.find(d => d.DriverName === dName);
                    drivers[dName] = { name: dName, cost: 0, orders: 0, photo: info?.ImageURL || '' };
                }
                drivers[dName].cost += (Number(o['Internal Cost']) || 0);
                drivers[dName].orders += 1;
            }

            // 3. Fulfillment Store Logic
            const sName = o['Fulfillment Store'] || 'Unassigned';
            if (!stores[sName]) {
                stores[sName] = { name: sName, cost: 0, orders: 0 };
            }
            stores[sName].cost += (Number(o['Internal Cost']) || 0);
            stores[sName].orders += 1;
        });

        return {
            totalInternalCost,
            totalCustomerFee,
            netShipping,
            totalOrders: orders.length,
            methods: Object.values(methods).sort((a, b) => b.cost - a.cost),
            drivers: Object.values(drivers).sort((a, b) => b.cost - a.cost),
            stores: Object.values(stores).sort((a, b) => b.cost - a.cost)
        };
    }, [orders, appData]);

    const handleAnalyze = async () => {
        setLoadingAnalysis(true);
        try {
            const result = await analyzeReportData(shippingStats, { reportType: 'shipping' });
            setAnalysis(result);
        } catch (e) { setAnalysis("AI Analysis error."); } finally { setLoadingAnalysis(false); }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="ចំណាយដឹកជញ្ជូនសរុប" value={`$${shippingStats.totalInternalCost.toLocaleString()}`} icon="🚚" colorClass="from-orange-600 to-red-500" />
                <StatCard label="ថ្លៃដឹកពីអតិថិជន" value={`$${shippingStats.totalCustomerFee.toLocaleString()}`} icon="💰" colorClass="from-blue-600 to-indigo-500" />
                <StatCard label="តុល្យភាព (Net)" value={`$${shippingStats.netShipping.toLocaleString()}`} icon="⚖️" colorClass={shippingStats.netShipping >= 0 ? "from-emerald-600 to-teal-500" : "from-red-600 to-pink-500"} />
                <StatCard label="ចំនួនកញ្ចប់សរុប" value={shippingStats.totalOrders} icon="📦" colorClass="from-purple-600 to-blue-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* Table 1: Methods (Shipping Companies) */}
                    <div className="page-card !p-6 bg-gray-900/40 border-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">សង្ខេបតាមក្រុមហ៊ុនដឹកជញ្ជូន</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-500 font-black uppercase tracking-widest border-b border-gray-800">
                                    <tr><th className="px-4 py-3">ក្រុមហ៊ុន</th><th className="px-4 py-3 text-center">ចំនួន Orders</th><th className="px-4 py-3 text-right">ទឹកប្រាក់បង់ ($)</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {shippingStats.methods.map((m, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="px-4 py-3 font-bold text-gray-200 flex items-center gap-3">
                                                <img src={convertGoogleDriveUrl(m.logo)} className="w-8 h-8 rounded-lg object-contain bg-gray-800 p-1 border border-gray-700" alt="" />
                                                {m.name}
                                            </td>
                                            {/* Clickable Order Count */}
                                            <td 
                                                className="px-4 py-3 text-center font-black text-blue-400 cursor-pointer hover:underline hover:text-blue-300 transition-colors"
                                                onClick={() => handleFilterNavigation('shippingFilter', m.name)}
                                            >
                                                {m.orders}
                                            </td>
                                            {/* Clickable Cost Amount */}
                                            <td 
                                                className="px-4 py-3 text-right font-black text-white cursor-pointer hover:underline hover:text-gray-300 transition-colors"
                                                onClick={() => handleFilterNavigation('shippingFilter', m.name)}
                                            >
                                                ${m.cost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-white/5 border-t-2 border-white/10">
                                    <tr>
                                        <td className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400 tracking-widest">Grand Total</td>
                                        <td className="px-4 py-3 text-center font-black text-blue-300 text-base">
                                            {shippingStats.methods.reduce((sum, m) => sum + m.orders, 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-400 text-base">
                                            ${shippingStats.methods.reduce((sum, m) => sum + m.cost, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Table 2: Drivers */}
                    <div className="page-card !p-6 bg-gray-900/40 border-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">សង្ខេបតាមអ្នកដឹក (Drivers)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-500 font-black uppercase tracking-widest border-b border-gray-800">
                                    <tr><th className="px-4 py-3">អ្នកដឹក</th><th className="px-4 py-3 text-center">ចំនួន Orders</th><th className="px-4 py-3 text-right">ទឹកប្រាក់បង់ ($)</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {shippingStats.drivers.map((d, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="px-4 py-3 font-bold text-gray-200 flex items-center gap-3">
                                                <img src={convertGoogleDriveUrl(d.photo)} className="w-8 h-8 rounded-full object-cover bg-gray-800 border border-gray-700" alt="" />
                                                {d.name}
                                            </td>
                                            {/* Clickable Order Count */}
                                            <td 
                                                className="px-4 py-3 text-center font-black text-blue-400 cursor-pointer hover:underline hover:text-blue-300 transition-colors"
                                                onClick={() => handleFilterNavigation('driverFilter', d.name)}
                                            >
                                                {d.orders}
                                            </td>
                                            {/* Clickable Cost Amount */}
                                            <td 
                                                className="px-4 py-3 text-right font-black text-white cursor-pointer hover:underline hover:text-gray-300 transition-colors"
                                                onClick={() => handleFilterNavigation('driverFilter', d.name)}
                                            >
                                                ${d.cost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-white/5 border-t-2 border-white/10">
                                    <tr>
                                        <td className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400 tracking-widest">Grand Total</td>
                                        <td className="px-4 py-3 text-center font-black text-blue-300 text-base">
                                            {shippingStats.drivers.reduce((sum, d) => sum + d.orders, 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-400 text-base">
                                            ${shippingStats.drivers.reduce((sum, d) => sum + d.cost, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Table 3: Fulfillment Stores (Stock) */}
                    <div className="page-card !p-6 bg-gray-900/40 border-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">សង្ខេបតាម Fulfillment Store (Stock)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-500 font-black uppercase tracking-widest border-b border-gray-800">
                                    <tr>
                                        <th className="px-4 py-3">ឈ្មោះឃ្លាំង (Store)</th>
                                        <th className="px-4 py-3 text-center">ចំនួន Orders</th>
                                        <th className="px-4 py-3 text-right">ទឹកប្រាក់បង់ ($)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {shippingStats.stores.map((s, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="px-4 py-3 font-bold text-gray-200 flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center text-[10px] border border-gray-700">#{i + 1}</span>
                                                {s.name}
                                            </td>
                                            {/* Clickable Order Count */}
                                            <td 
                                                className="px-4 py-3 text-center font-black text-blue-400 cursor-pointer hover:underline hover:text-blue-300 transition-colors"
                                                onClick={() => handleFilterNavigation('fulfillmentStore', s.name)}
                                            >
                                                {s.orders}
                                            </td>
                                            {/* Clickable Cost Amount */}
                                            <td 
                                                className="px-4 py-3 text-right font-black text-white cursor-pointer hover:underline hover:text-gray-300 transition-colors"
                                                onClick={() => handleFilterNavigation('fulfillmentStore', s.name)}
                                            >
                                                ${s.cost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-white/5 border-t-2 border-white/10">
                                    <tr>
                                        <td className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400 tracking-widest">Grand Total</td>
                                        <td className="px-4 py-3 text-center font-black text-blue-300 text-base">
                                            {shippingStats.stores.reduce((sum, s) => sum + s.orders, 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-400 text-base">
                                            ${shippingStats.stores.reduce((sum, s) => sum + s.cost, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className="page-card !p-6 bg-gray-900/40 border-white/5 h-full flex flex-col shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div><h3 className="text-sm font-black text-white uppercase tracking-widest">ការវិភាគដោយ AI</h3></div>
                            <GeminiButton onClick={handleAnalyze} isLoading={loadingAnalysis}>Analyze</GeminiButton>
                        </div>
                        <div className="flex-grow bg-black/40 rounded-3xl p-6 border border-white/5 overflow-y-auto custom-scrollbar min-h-[300px] relative z-10">
                            {analysis ? (<div className="text-sm text-gray-300 whitespace-pre-wrap">{analysis}</div>) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 text-center"><p className="text-[10px] font-black uppercase tracking-[0.2em]">ចុច "Analyze" ដើម្បីវិភាគ</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShippingReport;


import React, { useState, useMemo } from 'react';
import { ParsedOrder, AppData } from '../../types';
import { analyzeReportData } from '../../services/geminiService';
import GeminiButton from '../common/GeminiButton';
import StatCard from '../performance/StatCard';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { FilterState } from '../orders/OrderFilters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_LOGO_URL } from '../../constants';
import Spinner from '../common/Spinner';

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
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [storeFilter, setStoreFilter] = useState<string>('All');

    // Filter Navigation Handler
    const handleFilterNavigation = (key: string, value: string) => {
        if (onNavigate) {
            const filters: any = {};
            if (contextFilters) {
                if (contextFilters.team) filters.team = contextFilters.team;
                if (contextFilters.store) filters.store = contextFilters.store; 
                if (contextFilters.paymentStatus) filters.paymentStatus = contextFilters.paymentStatus;
                if (contextFilters.user) filters.user = contextFilters.user;
                if (contextFilters.page) filters.page = contextFilters.page;
                if (contextFilters.bank) filters.bank = contextFilters.bank;
                if (contextFilters.product) filters.product = contextFilters.product;
                if (contextFilters.internalCost) filters.internalCost = contextFilters.internalCost;
                if (contextFilters.location) filters.location = contextFilters.location;
            }

            if (key === 'shippingFilter') filters.shipping = value;
            if (key === 'driverFilter') filters.driver = value;     
            if (key === 'fulfillmentStore') filters.fulfillmentStore = value; 
            
            if (storeFilter !== 'All' && key !== 'fulfillmentStore') {
                filters.fulfillmentStore = storeFilter;
            }

            filters.datePreset = dateFilter;
            filters.startDate = startDate;
            filters.endDate = endDate;
            
            onNavigate(filters);
        }
    };

    // 1. Filter Orders based on Store Selection
    const filteredOrders = useMemo(() => {
        if (storeFilter === 'All') return orders;
        return orders.filter(o => o['Fulfillment Store'] === storeFilter);
    }, [orders, storeFilter]);

    // 2. Calculate Stats based on Filtered Orders
    const shippingStats = useMemo(() => {
        const totalInternalCost = filteredOrders.reduce((sum, o) => sum + (Number(o['Internal Cost']) || 0), 0);
        const totalCustomerFee = filteredOrders.reduce((sum, o) => sum + (Number(o['Shipping Fee (Customer)']) || 0), 0);
        const netShipping = totalCustomerFee - totalInternalCost;
        
        const methods: Record<string, { name: string, cost: number, orders: number, logo: string }> = {};
        const drivers: Record<string, { name: string, cost: number, orders: number, photo: string }> = {};
        const stores: Record<string, { name: string, cost: number, orders: number }> = {};

        filteredOrders.forEach(o => {
            const mName = o['Internal Shipping Method'] || 'Other';
            if (!methods[mName]) {
                const info = appData.shippingMethods?.find(sm => sm.MethodName === mName);
                methods[mName] = { name: mName, cost: 0, orders: 0, logo: info?.LogosURL || '' };
            }
            methods[mName].cost += (Number(o['Internal Cost']) || 0);
            methods[mName].orders += 1;

            const dName = o['Internal Shipping Details'] || 'N/A';
            if (dName !== 'N/A') {
                if (!drivers[dName]) {
                    const info = appData.drivers?.find(d => d.DriverName === dName);
                    drivers[dName] = { name: dName, cost: 0, orders: 0, photo: info?.ImageURL || '' };
                }
                drivers[dName].cost += (Number(o['Internal Cost']) || 0);
                drivers[dName].orders += 1;
            }

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
            totalOrders: filteredOrders.length,
            methods: Object.values(methods).sort((a, b) => b.cost - a.cost),
            drivers: Object.values(drivers).sort((a, b) => b.cost - a.cost),
            stores: Object.values(stores).sort((a, b) => b.cost - a.cost)
        };
    }, [filteredOrders, appData]);

    const handleAnalyze = async () => {
        setLoadingAnalysis(true);
        try {
            const result = await analyzeReportData(shippingStats, { reportType: 'shipping' });
            setAnalysis(result);
        } catch (e) { setAnalysis("AI Analysis error."); } finally { setLoadingAnalysis(false); }
    };

    const handleExportExcel = () => {
        let csvContent = "\uFEFF"; 
        csvContent += "SHIPPING COST REPORT SUMMARY\n";
        csvContent += `Generated Date,${new Date().toLocaleDateString()}\n`;
        csvContent += `Period,${dateFilter === 'custom' ? `${startDate} to ${endDate}` : dateFilter}\n`;
        csvContent += `Filter Store,${storeFilter}\n\n`;
        
        csvContent += "Metric,Value\n";
        csvContent += `Total Internal Cost,${shippingStats.totalInternalCost.toFixed(2)}\n`;
        csvContent += `Total Customer Fee,${shippingStats.totalCustomerFee.toFixed(2)}\n`;
        csvContent += `Net Shipping,${shippingStats.netShipping.toFixed(2)}\n`;
        csvContent += `Total Orders,${shippingStats.totalOrders}\n\n`;

        csvContent += "SHIPPING METHODS (COMPANIES)\n";
        csvContent += "Company Name,Total Orders,Total Cost ($)\n";
        shippingStats.methods.forEach(m => {
            csvContent += `"${m.name}",${m.orders},${m.cost.toFixed(2)}\n`;
        });
        csvContent += "\n";

        csvContent += "DRIVERS\n";
        csvContent += "Driver Name,Total Orders,Total Cost ($)\n";
        shippingStats.drivers.forEach(d => {
            csvContent += `"${d.name}",${d.orders},${d.cost.toFixed(2)}\n`;
        });
        csvContent += "\n";

        csvContent += "FULFILLMENT STORES (STOCK)\n";
        csvContent += "Store Name,Total Orders,Total Cost ($)\n";
        shippingStats.stores.forEach(s => {
            csvContent += `"${s.name}",${s.orders},${s.cost.toFixed(2)}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Shipping_Report_${storeFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Helper: Load Khmer Font with Robust Fallbacks ---
    const loadKhmerFont = async (doc: jsPDF) => {
        const fontUrls = [
            // CDN 1: jsDelivr (Main)
            'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/kantumruypro/KantumruyPro-Regular.ttf',
            // CDN 2: Raw GitHub (Fallback)
            'https://raw.githubusercontent.com/google/fonts/main/ofl/kantumruypro/KantumruyPro-Regular.ttf',
            // CDN 3: Statically (Alternative)
            'https://cdn.statically.io/gh/google/fonts/main/ofl/kantumruypro/KantumruyPro-Regular.ttf'
        ];

        for (const url of fontUrls) {
            try {
                console.log(`Attempting to fetch font from: ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                
                const buffer = await response.arrayBuffer();
                const fontBase64 = arrayBufferToBase64(buffer);
                
                doc.addFileToVFS('Kantumruy.ttf', fontBase64);
                doc.addFont('Kantumruy.ttf', 'Kantumruy', 'normal');
                doc.setFont('Kantumruy');
                
                console.log("Font loaded successfully");
                return true;
            } catch (e) {
                console.warn(`Failed to fetch font from ${url}`, e);
                // Continue to next URL
            }
        }
        
        console.error("All font fetch attempts failed");
        alert("បរាជ័យក្នុងការទាញយក Font ខ្មែរ។ PDF នឹងមិនបង្ហាញអក្សរខ្មែរត្រឹមត្រូវទេ។ (Failed to load Khmer font)");
        return false;
    };

    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    // --- PDF Export with Khmer Support ---
    const handleExportPDF = async () => {
        if (isExportingPdf) return;
        setIsExportingPdf(true);
        
        try {
            const doc = new jsPDF();
            
            // 1. Load Font (Must await success)
            // Even if it fails, we proceed, but with a warning shown in loadKhmerFont
            await loadKhmerFont(doc);

            // 2. Header
            doc.setFontSize(18);
            doc.setTextColor(40);
            doc.text("របាយការណ៍ដឹកជញ្ជូន (Shipping Report)", 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            const periodText = dateFilter === 'custom' ? `${startDate} to ${endDate}` : dateFilter.toUpperCase();
            doc.text(`Period: ${periodText}`, 14, 26);
            doc.text(`Store Filter: ${storeFilter}`, 14, 31);
            doc.text(`Generated: ${new Date().toLocaleString('km-KH')}`, 14, 36);

            // 3. Summary Metrics
            const summaryData = [
                ['Total Internal Cost', 'Customer Fees', 'Net Balance'],
                [`$${shippingStats.totalInternalCost.toLocaleString()}`, `$${shippingStats.totalCustomerFee.toLocaleString()}`, `$${shippingStats.netShipping.toLocaleString()}`]
            ];
            
            autoTable(doc, {
                startY: 42,
                head: [summaryData[0]],
                body: [summaryData[1]],
                theme: 'grid',
                styles: { font: 'Kantumruy', fontStyle: 'normal' }, // Apply Khmer Font
                headStyles: { fillColor: [240, 240, 240], textColor: [60, 60, 60], fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 12, halign: 'center', minCellHeight: 12, valign: 'middle' },
                columnStyles: {
                    0: { textColor: [220, 38, 38] }, // Red
                    1: { textColor: [22, 163, 74] }, // Green
                    2: { textColor: [0, 0, 0] }      // Black
                }
            });

            // 4. Table 1: Shipping Methods
            doc.setFontSize(14);
            doc.setTextColor(0);
            // @ts-ignore
            let finalY = doc.lastAutoTable.finalY + 15;
            doc.text("1. ក្រុមហ៊ុនដឹកជញ្ជូន (Shipping Companies)", 14, finalY);

            autoTable(doc, {
                startY: finalY + 5,
                head: [['ក្រុមហ៊ុន', 'ចំនួន (Orders)', 'ទឹកប្រាក់បង់ ($)']],
                body: [
                    ...shippingStats.methods.map(m => [m.name, m.orders, m.cost.toFixed(2)]),
                    ['សរុប (TOTAL)', shippingStats.methods.reduce((s,i)=>s+i.orders,0), shippingStats.methods.reduce((s,i)=>s+i.cost,0).toFixed(2)]
                ],
                theme: 'striped',
                styles: { font: 'Kantumruy' }, // Apply Khmer Font
                headStyles: { fillColor: [41, 128, 185] },
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.row.index === shippingStats.methods.length) {
                        data.row.styles.fontStyle = 'bold';
                        data.row.styles.fillColor = [240, 240, 240];
                    }
                },
                columnStyles: {
                    1: { halign: 'center' },
                    2: { halign: 'right' }
                }
            });

            // 5. Table 2: Drivers
            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 15;
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            
            doc.text("2. អ្នកដឹក (Drivers)", 14, finalY);

            autoTable(doc, {
                startY: finalY + 5,
                head: [['ឈ្មោះអ្នកដឹក', 'ចំនួន (Orders)', 'ទឹកប្រាក់បង់ ($)']],
                body: [
                    ...shippingStats.drivers.map(d => [d.name, d.orders, d.cost.toFixed(2)]),
                    ['សរុប (TOTAL)', shippingStats.drivers.reduce((s,i)=>s+i.orders,0), shippingStats.drivers.reduce((s,i)=>s+i.cost,0).toFixed(2)]
                ],
                theme: 'striped',
                styles: { font: 'Kantumruy' }, // Apply Khmer Font
                headStyles: { fillColor: [39, 174, 96] },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.row.index === shippingStats.drivers.length) {
                        data.row.styles.fontStyle = 'bold';
                        data.row.styles.fillColor = [240, 240, 240];
                    }
                },
                columnStyles: {
                    1: { halign: 'center' },
                    2: { halign: 'right' }
                }
            });

            // 6. Table 3: Fulfillment Stores
            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 15;
            if (finalY > 250) { doc.addPage(); finalY = 20; }

            doc.text("3. ឃ្លាំង (Fulfillment Stores)", 14, finalY);

            autoTable(doc, {
                startY: finalY + 5,
                head: [['ឈ្មោះឃ្លាំង', 'ចំនួន (Orders)', 'ទឹកប្រាក់បង់ ($)']],
                body: [
                    ...shippingStats.stores.map(s => [s.name, s.orders, s.cost.toFixed(2)]),
                    ['សរុប (TOTAL)', shippingStats.stores.reduce((s,i)=>s+i.orders,0), shippingStats.stores.reduce((s,i)=>s+i.cost,0).toFixed(2)]
                ],
                theme: 'striped',
                styles: { font: 'Kantumruy' }, // Apply Khmer Font
                headStyles: { fillColor: [243, 156, 18] },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.row.index === shippingStats.stores.length) {
                        data.row.styles.fontStyle = 'bold';
                        data.row.styles.fillColor = [240, 240, 240];
                    }
                },
                columnStyles: {
                    1: { halign: 'center' },
                    2: { halign: 'right' }
                }
            });

            doc.save(`Shipping_Report_${storeFilter}_${new Date().toISOString().slice(0, 10)}.pdf`);

        } catch (err) {
            console.error("PDF Export Error:", err);
            // Alert already handled in loadKhmerFont if that was the cause, otherwise generic alert
            if (String(err).includes("Font")) {
                // already alerted
            } else {
                alert("បរាជ័យក្នុងការបង្កើត PDF ។");
            }
        } finally {
            setIsExportingPdf(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/40 p-4 rounded-3xl border border-white/5">
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">របាយការណ៍ដឹកជញ្ជូន</h2>
                    <p className="text-xs text-gray-500 font-bold mt-1">Shipping & Fulfillment Cost Analysis</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                    {/* Store Filter Dropdown */}
                    <div className="bg-gray-800 p-1 rounded-xl border border-white/10 flex items-center w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-gray-500 uppercase px-3 whitespace-nowrap">View:</span>
                        <select 
                            value={storeFilter} 
                            onChange={(e) => setStoreFilter(e.target.value)}
                            className="bg-transparent border-none text-xs font-black text-white focus:ring-0 cursor-pointer py-1.5 pr-8 pl-1 w-full"
                        >
                            <option value="All">All Stores</option>
                            {appData.stores?.map(s => (
                                <option key={s.StoreName} value={s.StoreName}>{s.StoreName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            onClick={handleExportExcel}
                            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Excel
                        </button>
                        <button 
                            onClick={handleExportPDF}
                            disabled={isExportingPdf}
                            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-red-600/10 border border-red-500/30 text-red-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isExportingPdf ? <Spinner size="sm" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                            PDF
                        </button>
                    </div>
                </div>
            </div>

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

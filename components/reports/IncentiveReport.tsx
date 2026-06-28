import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { getIncentiveResults, getIncentiveProjects, notifyIncentiveUser } from '../../services/incentiveService';
import { IncentiveResult, IncentiveProject } from '../../types';
import { Search, Calendar, Trophy, Users, Coins, Download, Cpu, Send, CheckCircle, XCircle } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import Spinner from '../common/Spinner';

interface IncentiveReportProps {
    onBack: () => void;
}

const IncentiveReport: React.FC<IncentiveReportProps> = ({ onBack }) => {
    const { appData, advancedSettings, language } = useContext(AppContext);
    const [results, setResults] = useState<IncentiveResult[]>([]);
    const [projects, setProjects] = useState<IncentiveProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        return new Date().toISOString().substring(0, 7); // Format: YYYY-MM
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [sendingUser, setSendingUser] = useState<string | null>(null);
    const [notifyConfirm, setNotifyConfirm] = useState<IncentiveResult | null>(null);
    const [notifyStatus, setNotifyStatus] = useState<Record<string, 'sent' | 'error'>>({});

    const uiTheme = advancedSettings?.uiTheme || 'default';
    const isLightMode = advancedSettings?.themeMode === 'light';

    // Theme-specific styles matching the main ReportsView styles
    const getThemeStyles = () => {
        switch (uiTheme) {
            case 'binance':
                return {
                    cardBg: 'bg-[#1E2329] border-[#2B3139] shadow-[0_4px_20px_rgba(0,0,0,0.15)]',
                    innerBg: 'bg-[#0B0E11]',
                    inputText: 'text-[#EAECEF]',
                    inputBg: 'bg-[#0B0E11] border-[#2B3139]',
                    accentText: 'text-[#FCD535]',
                    primaryBtn: 'bg-[#FCD535] text-[#1E2329] hover:bg-[#f0c51d]',
                    tableHeaderBg: 'bg-[#1E2329] text-[#848E9C]',
                    textPrimary: 'text-[#EAECEF]',
                    textSecondary: 'text-[#848E9C]',
                    border: 'border-[#2B3139]',
                    rowHover: 'hover:bg-white/[0.02] border-[#2B3139]',
                    monthIconColor: 'text-[#FCD535]'
                };
            case 'netflix':
                return {
                    cardBg: 'bg-[#181818] border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.3)]',
                    innerBg: 'bg-black/20',
                    inputText: 'text-white',
                    inputBg: 'bg-[#141414] border-white/5',
                    accentText: 'text-[#e50914]',
                    primaryBtn: 'bg-[#e50914] text-white hover:bg-[#b9090b]',
                    tableHeaderBg: 'bg-[#181818] text-gray-400',
                    textPrimary: 'text-white',
                    textSecondary: 'text-gray-500',
                    border: 'border-white/5',
                    rowHover: 'hover:bg-white/5 border-white/5',
                    monthIconColor: 'text-[#e50914]'
                };
            default:
                return {
                    cardBg: isLightMode 
                        ? 'bg-white border-slate-200 shadow-sm' 
                        : 'bg-white/[0.03] border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.25)]',
                    innerBg: isLightMode ? 'bg-slate-50/50' : 'bg-black/20',
                    inputText: isLightMode ? 'text-slate-800' : 'text-white',
                    inputBg: isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10',
                    accentText: isLightMode ? 'text-blue-600' : 'text-blue-400',
                    primaryBtn: isLightMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/15'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/15',
                    tableHeaderBg: isLightMode ? 'bg-slate-50 text-slate-500' : 'bg-white/[0.01] text-white/40',
                    textPrimary: isLightMode ? 'text-slate-900' : 'text-white',
                    textSecondary: isLightMode ? 'text-slate-500' : 'text-white/20',
                    border: isLightMode ? 'border-slate-200' : 'border-white/5',
                    rowHover: isLightMode ? 'hover:bg-slate-50/50 border-slate-200' : 'hover:bg-white/[0.01] border-white/5',
                    monthIconColor: 'text-blue-500'
                };
        }
    };

    const styles = getThemeStyles();

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [allResults, allProjects] = await Promise.all([
                    getIncentiveResults(),
                    getIncentiveProjects()
                ]);
                setResults(allResults || []);
                setProjects(allProjects || []);
                // Auto-select the first available project
                if (allProjects && allProjects.length > 0) {
                    setSelectedProjectId(String(allProjects[0].id));
                } else if (allResults && allResults.length > 0) {
                    // Fallback: pick the first project from results (may be a deleted project)
                    setSelectedProjectId(String(allResults[0].projectId));
                }
            } catch (e: any) {
                console.error("Failed to load incentive report data", e);
                setError(e.message || "Failed to fetch data from backend API");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter results by month, project, and search query
    const filteredResults = useMemo(() => {
        const currentMonthStr = new Date().toISOString().substring(0, 7);
        return results.filter(r => {
            // Check month (Timestamp contains YYYY-MM, fallback to current month if empty)
            const recordMonth = r.Timestamp ? r.Timestamp.substring(0, 7) : currentMonthStr;
            if (recordMonth !== selectedMonth) return false;

            // Check project (always filter by selected project)
            if (selectedProjectId && String(r.projectId) !== selectedProjectId) return false;

            // Check search query
            if (!searchQuery) return true;
            
            const user = appData.users?.find(u => u.UserName === r.userName);
            const fullName = (user?.FullName || r.userName).toLowerCase();
            const project = projects.find(p => p.id === r.projectId);
            const projectName = (project?.projectName || '').toLowerCase();

            return fullName.includes(searchQuery.toLowerCase()) || 
                   r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   projectName.includes(searchQuery.toLowerCase());
        });
    }, [results, selectedMonth, selectedProjectId, searchQuery, appData.users, projects]);

    // Send individual incentive notification to a user via the backend
    const handleNotifyUser = async (result: IncentiveResult) => {
        setSendingUser(result.userName);
        setNotifyConfirm(null);
        try {
            const project = dropdownProjects.find(p => p.id === result.projectId);
            const projectName = project?.projectName || `Project #${result.projectId}`;
            const ok = await notifyIncentiveUser({
                userName: result.userName,
                projectId: result.projectId,
                month: result.Timestamp || selectedMonth,
                projectName,
                calculatedValue: result.calculatedValue,
                totalRevenue: result.totalRevenue,
                totalOrders: result.totalOrders,
                breakdownJson: result.breakdownJson
            });
            setNotifyStatus(prev => ({ ...prev, [result.userName]: ok ? 'sent' : 'error' }));
        } catch (_) {
            setNotifyStatus(prev => ({ ...prev, [result.userName]: 'error' }));
        } finally {
            setSendingUser(null);
        }
    };

    // Find all months that have calculations in the database
    const availableMonths = useMemo(() => {
        if (results.length === 0) return [];
        const currentMonthStr = new Date().toISOString().substring(0, 7);
        const months = results.map(r => {
            return (r.Timestamp ? r.Timestamp.substring(0, 7) : currentMonthStr) as string;
        }).filter(Boolean);
        return Array.from(new Set(months)).sort((a, b) => (b as string).localeCompare(a as string)); // Sort descending (newest first)
    }, [results]);

    // Compute complete project list for dropdown, including deleted projects that have results
    const dropdownProjects = useMemo(() => {
        const list = [...projects];
        results.forEach(r => {
            if (!list.some(p => p.id === r.projectId)) {
                list.push({
                    id: r.projectId,
                    projectName: language === 'km' 
                        ? `គម្រោងដែលលុប #${r.projectId}` 
                        : `Deleted Project #${r.projectId}`,
                    colorCode: '#94a3b8'
                } as any);
            }
        });
        return list;
    }, [projects, results, language]);

    // Summary Metrics
    const metrics = useMemo(() => {
        let totalPayout = 0;
        let topReward = 0;
        let topPerformer = 'N/A';
        const uniqueRecipients = new Set<string>();

        filteredResults.forEach(r => {
            totalPayout += r.calculatedValue;
            uniqueRecipients.add(r.userName);
            
            if (r.calculatedValue > topReward) {
                topReward = r.calculatedValue;
                const user = appData.users?.find(u => u.UserName === r.userName);
                topPerformer = user?.FullName || r.userName;
            }
        });

        return {
            totalPayout,
            topReward,
            topPerformer,
            recipientCount: uniqueRecipients.size
        };
    }, [filteredResults, appData.users]);

    // Excel Export (.xls via XML — opens natively in Excel, no extra library needed)
    const handleExportExcel = () => {
        const project = dropdownProjects.find(p => String(p.id) === selectedProjectId);
        const projectName = project?.projectName || `Project #${selectedProjectId}`;

        const headers = [
            language === 'km' ? 'ឈ្មោះបុគ្គលិក' : 'Staff Name',
            language === 'km' ? 'គណនី' : 'Username',
            language === 'km' ? 'ក្រុម' : 'Team',
            language === 'km' ? 'គម្រោង' : 'Project',
            language === 'km' ? 'ខែ' : 'Month',
            language === 'km' ? 'ចំនួនលក់ (USD)' : 'Total Revenue (USD)',
            language === 'km' ? 'ចំនួនកុម្ម៉ង់' : 'Total Orders',
            language === 'km' ? 'ប្រាក់រង្វាន់ (USD)' : 'Reward (USD)'
        ];

        const rows = filteredResults.map(r => {
            const user = appData.users?.find(u => u.UserName === r.userName);
            const proj = dropdownProjects.find(p => p.id === r.projectId);
            return [
                user?.FullName || r.userName,
                r.userName,
                user?.Team || '',
                proj?.projectName || `Project #${r.projectId}`,
                r.Timestamp || selectedMonth,
                r.totalRevenue,
                r.totalOrders,
                r.calculatedValue
            ];
        });

        // Build XML-based Excel sheet (opens in Excel without extra libraries)
        const xmlRows = [
            `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>`,
            ...rows.map(row => 
                `<Row>${row.map((v, i) => {
                    const type = i >= 5 ? 'Number' : 'String';
                    return `<Cell><Data ss:Type="${type}">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`;
                }).join('')}</Row>`
            )
        ].join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Incentive Report">
    <Table>${xmlRows}</Table>
  </Worksheet>
</Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Incentive_Report_${projectName}_${selectedMonth}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // PDF Export (via jspdf + jspdf-autotable)
    const handleExportPDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

        const project = dropdownProjects.find(p => String(p.id) === selectedProjectId);
        const projectName = project?.projectName || `Project #${selectedProjectId}`;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Incentive Payout Report', 14, 18);

        // Subtitle row
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Project: ${projectName}   |   Month: ${selectedMonth}   |   Generated: ${new Date().toLocaleDateString()}`, 14, 26);

        // Summary row
        doc.setFontSize(9);
        doc.text(`Total Recipients: ${filteredResults.length}   |   Total Payout: $${metrics.totalPayout.toFixed(2)}   |   Top Performer: ${metrics.topPerformer || '-'}`, 14, 32);

        const headers = ['#', 'Staff Name', 'Username', 'Team', 'Revenue (USD)', 'Orders', 'Reward (USD)', 'Breakdown'];

        const tableRows = filteredResults.map((r, idx) => {
            const user = appData.users?.find(u => u.UserName === r.userName);
            let breakdownList: any[] = [];
            try { if (r.breakdownJson) breakdownList = JSON.parse(r.breakdownJson); } catch (_) {}
            const breakdownSummary = breakdownList.map(b => `${b.name}: $${Number(b.amount).toFixed(2)}`).join(' | ');
            return [
                idx + 1,
                user?.FullName || r.userName,
                r.userName,
                user?.Team || '',
                `$${r.totalRevenue.toLocaleString()}`,
                r.totalOrders,
                `$${r.calculatedValue.toFixed(2)}`,
                breakdownSummary
            ];
        });

        autoTable(doc, {
            head: [headers],
            body: tableRows,
            startY: 38,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 7: { cellWidth: 60 } },
            margin: { left: 14, right: 14 }
        });

        doc.save(`Incentive_Report_${projectName}_${selectedMonth}.pdf`);
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Toolbar / Filters */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${styles.cardBg} border rounded-3xl p-5 transition-all`}>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Month Picker wrapper */}
                    <div className={`flex items-center gap-2.5 ${styles.inputBg} border rounded-2xl px-4 py-2.5 transition-all`}>
                        <Calendar className={`w-4 h-4 ${styles.monthIconColor}`} />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            onClick={e => {
                                try {
                                    (e.target as any).showPicker();
                                } catch (err) {
                                    console.error(err);
                                }
                            }}
                            className={`bg-transparent border-none p-0 text-xs font-bold focus:ring-0 cursor-pointer outline-none w-28 report-month-input ${styles.inputText}`}
                        />
                    </div>

                    {/* Project Selector dropdown */}
                    <div className={`flex items-center gap-2.5 ${styles.inputBg} border rounded-2xl px-4 py-2.5 transition-all`}>
                        <Trophy className={`w-4 h-4 ${styles.monthIconColor}`} />
                        <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className={`bg-transparent border-none p-0 text-xs font-bold focus:ring-0 cursor-pointer outline-none w-36 ${styles.inputText}`}
                        >
                            {dropdownProjects.map(p => (
                                <option key={p.id} value={String(p.id)} className={isLightMode ? 'bg-white text-slate-800' : 'bg-[#121212] text-white'}>
                                    {p.projectName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search Field */}
                    <div className="relative flex-1 md:w-64 min-w-[200px]">
                        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${styles.textSecondary}`} />
                        <input
                            type="text"
                            placeholder={language === 'km' ? 'ស្វែងរកបុគ្គលិក ឬគម្រោង...' : 'Search staff or project...'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`w-full ${styles.inputBg} border rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all ${styles.inputText}`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Excel Export */}
                    <button
                        onClick={handleExportExcel}
                        disabled={filteredResults.length === 0}
                        className={`flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-2xl px-4 py-2.5 text-xs font-bold tracking-wide shadow-lg shadow-emerald-600/20 transition-all active:scale-95 shrink-0`}
                    >
                        <Download className="w-4 h-4" />
                        {language === 'km' ? 'Excel' : 'Excel'}
                    </button>

                    {/* PDF Export */}
                    <button
                        onClick={handleExportPDF}
                        disabled={filteredResults.length === 0}
                        className={`flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 rounded-2xl px-4 py-2.5 text-xs font-bold tracking-wide shadow-lg shadow-rose-600/20 transition-all active:scale-95 shrink-0`}
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Summary Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Total Payout */}
                <div className={`${styles.cardBg} border rounded-3xl p-5 flex items-center justify-between transition-all`}>
                    <div className="space-y-1.5 min-w-0">
                        <p className={`text-[10px] font-bold ${styles.textSecondary} uppercase tracking-wider`}>
                            {language === 'km' ? 'ការទូទាត់សរុប' : 'Total Payout'}
                        </p>
                        <h3 className={`text-xl font-black ${styles.accentText} font-mono truncate`}>
                            ${metrics.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div className={`w-11 h-11 rounded-2xl bg-amber-500/10 border ${uiTheme === 'binance' ? 'border-amber-500/25' : 'border-amber-500/20'} flex items-center justify-center shrink-0`}>
                        <Coins className="w-5 h-5 text-amber-500" />
                    </div>
                </div>

                {/* Top Earner */}
                <div className={`${styles.cardBg} border rounded-3xl p-5 flex items-center justify-between transition-all`}>
                    <div className="space-y-1.5 min-w-0">
                        <p className={`text-[10px] font-bold ${styles.textSecondary} uppercase tracking-wider`}>
                            {language === 'km' ? 'អ្នកទទួលបានខ្ពស់ជាងគេ' : 'Top Performer'}
                        </p>
                        <h3 className={`text-sm font-black ${styles.textPrimary} truncate`}>
                            {metrics.topPerformer}
                        </h3>
                        {metrics.topReward > 0 && (
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                                +${metrics.topReward.toFixed(2)}
                            </p>
                        )}
                    </div>
                    <div className={`w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0`}>
                        <Trophy className="w-5 h-5 text-blue-500" />
                    </div>
                </div>

                {/* Qualified Staff */}
                <div className={`${styles.cardBg} border rounded-3xl p-5 flex items-center justify-between transition-all`}>
                    <div className="space-y-1.5 min-w-0">
                        <p className={`text-[10px] font-bold ${styles.textSecondary} uppercase tracking-wider`}>
                            {language === 'km' ? 'ចំនួនបុគ្គលិកទទួលបាន' : 'Qualified Recipients'}
                        </p>
                        <h3 className={`text-xl font-black ${styles.textPrimary} font-mono`}>
                            {metrics.recipientCount} {language === 'km' ? 'នាក់' : 'Staff'}
                        </h3>
                    </div>
                    <div className={`w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0`}>
                        <Users className="w-5 h-5 text-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Results Table Card */}
            <div className={`${styles.cardBg} border rounded-[32px] overflow-hidden transition-all`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className={`${styles.tableHeaderBg} border-b ${styles.border} text-xs font-bold uppercase tracking-wider`}>
                                <th className="px-6 py-4.5">{language === 'km' ? 'បុគ្គលិក' : 'Staff'}</th>
                                <th className="px-6 py-4.5">{language === 'km' ? 'គម្រោង' : 'Project'}</th>
                                <th className="px-6 py-4.5">{language === 'km' ? 'ចំនួនលក់សរុប (Grand Total)' : 'Performance Volume'}</th>
                                <th className="px-6 py-4.5">{language === 'km' ? 'ការគណនាស្អិតរមួត' : 'Calculations Breakdown'}</th>
                                <th className="px-6 py-4.5 text-right">{language === 'km' ? 'ប្រាក់រង្វាន់ទទួលបាន' : 'Reward (USD)'}</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${uiTheme === 'binance' ? 'divide-[#2B3139]' : 'divide-slate-100 dark:divide-white/5'} ${styles.textPrimary}`}>
                            {filteredResults.map((r) => {
                                const user = appData.users?.find(u => u.UserName === r.userName);
                                const project = projects.find(p => p.id === r.projectId);
                                
                                let breakdownList: any[] = [];
                                if (r.breakdownJson) {
                                    try {
                                        const parsed = JSON.parse(r.breakdownJson);
                                        if (Array.isArray(parsed)) breakdownList = parsed;
                                    } catch (e) {
                                        console.error('Failed to parse breakdownJson', e);
                                    }
                                }

                                const metricType = String(breakdownList[0]?.metricType || '').toLowerCase();
                                const isAmountMetric = ['sales amount', 'revenue', 'profit'].includes(metricType);
                                
                                let performance = 0;
                                if (metricType === 'profit') performance = r.totalProfit || 0;
                                else if (isAmountMetric) performance = r.totalRevenue || 0;
                                else performance = r.totalOrders || 0;

                                return (
                                    <tr key={r.id} className={`${styles.rowHover} transition-all border-b`}>
                                        {/* User profile */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar avatarUrl={user?.ProfilePictureURL} name={user?.FullName || r.userName} size="sm" className={`border ${styles.border}`} />
                                                <div className="min-w-0">
                                                    <p className={`font-bold ${styles.textPrimary} text-xs truncate uppercase tracking-wide`}>{user?.FullName || r.userName}</p>
                                                    <p className={`text-[10px] ${styles.textSecondary} mt-0.5 font-medium`}>{r.userName} · {user?.Role || 'Staff'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Project info */}
                                        <td className="px-6 py-4">
                                            <span 
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border"
                                                style={{ 
                                                    backgroundColor: `${project?.colorCode || '#3b82f6'}10`,
                                                    color: project?.colorCode || (isLightMode ? '#2563eb' : '#60a5fa'),
                                                    borderColor: `${project?.colorCode || '#3b82f6'}20`
                                                }}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project?.colorCode || '#3b82f6' }}></span>
                                                {project?.projectName || `Project #${r.projectId}`}
                                            </span>
                                        </td>

                                        {/* Performance Volume */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-0.5">
                                                <p className={`font-mono font-bold text-xs ${styles.textPrimary}`}>
                                                    {isAmountMetric ? '$' : ''}{performance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </p>
                                                <p className={`text-[9px] font-bold ${styles.textSecondary} uppercase tracking-wider`}>
                                                    {isAmountMetric 
                                                        ? (metricType === 'profit' ? (language === 'km' ? 'ប្រាក់ចំណេញ' : 'Profit') : (language === 'km' ? 'ចំនួនលក់' : 'Revenue'))
                                                        : `${r.totalOrders} ${language === 'km' ? 'កុម្ម៉ង់' : 'Orders'}`}
                                                </p>
                                            </div>
                                        </td>

                                        {/* Calculations Breakdown */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {breakdownList.map((b: any, i: number) => {
                                                    const isMarathonComponent = String(b.name || b.calculatorName).toLowerCase().includes('marathon');
                                                    return (
                                                        <div 
                                                            key={i} 
                                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border flex items-center gap-1.5 transition-all ${
                                                                isMarathonComponent 
                                                                    ? (isLightMode 
                                                                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400')
                                                                    : (isLightMode
                                                                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                                                                        : 'bg-white/5 border-white/5 text-slate-300')
                                                            }`}
                                                            title={b.description || b.name}
                                                        >
                                                            {isMarathonComponent ? <Trophy className="w-2.5 h-2.5 text-amber-500 animate-pulse" style={isLightMode ? { color: '#b45309' } : {}} /> : <Cpu className="w-2.5 h-2.5 text-slate-400" />}
                                                            <span className="uppercase tracking-wider">
                                                                {isMarathonComponent ? 'Marathon' : (b.name || b.calculatorName || 'Bonus')}
                                                            </span>
                                                            <span className={`w-px h-2.5 ${isLightMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                                                            <span className={`${isLightMode ? 'text-emerald-700' : 'text-emerald-400'} font-mono font-bold`}>
                                                                +${(b.amount || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {breakdownList.length === 0 && (
                                                    <span className={`text-[10px] ${styles.textSecondary} tracking-wide font-medium`}>
                                                        {language === 'km' ? 'គ្មានទិន្នន័យគណនា' : 'No calculations'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Payout amount */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="space-y-0.5">
                                                <p className={`font-mono font-black text-sm ${styles.textPrimary}`}>
                                                    ${r.calculatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                {r.isCustom && (
                                                    <span className="inline-block px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-bold uppercase tracking-wider rounded border border-blue-500/15">
                                                        {language === 'km' ? 'កែសម្រួល' : 'Custom'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredResults.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400">
                                                <Coins className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h4 className={`text-sm font-bold ${styles.textPrimary}`}>
                                                    {language === 'km' ? 'រកមិនឃើញទិន្នន័យប្រាក់លើកទឹកចិត្តសម្រាប់ខែនេះទេ' : 'No results found for this month'}
                                                </h4>
                                                <p className={`text-xs ${styles.textSecondary} leading-relaxed`}>
                                                    {error ? (
                                                        <span className="text-red-500 font-mono">Error: {error}</span>
                                                    ) : results.length === 0 ? (
                                                        language === 'km' 
                                                            ? 'មិនទាន់មានទិន្នន័យប្រាក់លើកទឹកចិត្តត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធនៅឡើយទេ។ សូមទៅកាន់ផ្នែក "Incentives" គណនាប្រាក់រង្វាន់ រួចចុច "Commit Payout" ដើម្បីចាក់សោនិងរក្សាទុក។'
                                                            : 'No incentive calculation results have been locked or saved to the database yet. Please run a calculation in the "Incentives" dashboard and click "Commit Payout".'
                                                    ) : (
                                                        language === 'km'
                                                            ? 'ទិន្នន័យប្រាក់លើកទឹកចិត្តត្រូវបានរកឃើញនៅក្នុងខែផ្សេងទៀត។ សូមជ្រើសរើសខែខាងក្រោមដើម្បីពិនិត្យ៖'
                                                            : 'Incentive calculation records were found in other months. Choose a month below to view:'
                                                    )}
                                                </p>
                                            </div>

                                            {/* Available Months Links */}
                                            {results.length > 0 && availableMonths.length > 0 && (
                                                <div className="flex flex-wrap gap-2 justify-center pt-2">
                                                    {availableMonths.map(m => {
                                                        const [yr, mn] = m.split('-');
                                                        const monthName = new Date(Number(yr), Number(mn) - 1).toLocaleString(language === 'km' ? 'km-KH' : 'en-US', { month: 'long', year: 'numeric' });
                                                        return (
                                                            <button
                                                                key={m}
                                                                onClick={() => setSelectedMonth(m)}
                                                                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold transition-all border border-blue-500/15"
                                                            >
                                                                {monthName}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IncentiveReport;

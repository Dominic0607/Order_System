import React, { useState, useMemo, useContext, useEffect, useCallback, useRef } from 'react';
import { IncentiveProject, ParsedOrder, IncentiveResult, IncentiveManualData } from '../../types';
import { AppContext } from '../../context/AppContext';
import { translations } from '../../translations';
import UserAvatar from '../common/UserAvatar';
import { getProjectById, calculateIncentive, getIncentiveManualData, saveIncentiveManualData, getIncentiveCustomPayouts, saveIncentiveCustomPayout, lockIncentivePayout } from '../../services/incentiveService';
import IncentivePdfExportModal from './IncentivePdfExportModal';
import {
    ChevronLeft, FileText, Lock, Unlock, Search, CheckCircle, RefreshCw, Save,
    AlertCircle, Activity, Coins, TrendingUp, ShieldCheck, MousePointer2,
    Trophy, Calendar, Target, Layout, Cpu, Zap, ArrowRight, Layers
} from 'lucide-react';

const formatMonthKhmer = (monthStr: string, lang: 'en' | 'km') => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthsKh = [
        "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
        "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
    ];
    const monthsEn = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const mIndex = parseInt(month, 10) - 1;
    if (lang === 'km') {
        const yearKh = year.split('').map(char => {
            const digits: Record<string, string> = {
                '0': '០', '1': '១', '2': '២', '3': '៣', '4': '៤',
                '5': '៥', '6': '៦', '7': '៧', '8': '៨', '9': '៩'
            };
            return digits[char] || char;
        }).join('');
        return `${monthsKh[mIndex]} ${yearKh}`;
    }
    return `${monthsEn[mIndex]} ${year}`;
};

interface IncentiveExecutionViewProps {
    projectId: string;
    orders: ParsedOrder[];
    onBack: () => void;
}

const IncentiveExecutionView: React.FC<IncentiveExecutionViewProps> = ({ projectId, orders, onBack }) => {
    const { language, appData, currentUser } = useContext(AppContext);
    const t = translations[language];

    const canViewLogic = useCallback((userTeam?: string) => {
        if (!currentUser) return false;
        if (currentUser.IsSystemAdmin || (currentUser.Role || '').toLowerCase().includes('admin')) return true;
        const myTeams = (currentUser.Team || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const theirTeams = (userTeam || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        return myTeams.some(t => theirTeams.includes(t));
    }, [currentUser]);

    // Teams Identification
    const allTeams = useMemo(() => {
        const teams = new Set<string>();
        appData.users?.forEach(u => u.Team?.split(',').forEach(tn => teams.add(tn.trim())));
        appData.pages?.forEach(p => p.Team?.split(',').forEach(tn => teams.add(tn.trim())));
        return Array.from(teams).filter(Boolean).sort();
    }, [appData.users, appData.pages]);

    // State
    const [project, setProject] = useState<IncentiveProject | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [manualDataMap, setManualDataMap] = useState<Record<string, Record<string, number>>>({});
    const [customPayouts, setCustomPayouts] = useState<Record<string, number>>({});
    const [calculationResults, setCalculationResults] = useState<IncentiveResult[]>([]);

    const [showInputPanel, setShowInputPanel] = useState(false);
    const [entryMode, setEntryMode] = useState<'team' | 'user'>('team');
    const [isAdjustMode, setIsAdjustMode] = useState(false);
    const [activeMetricTab, setActiveMetricTab] = useState<string>('');
    const [isLocked, setIsLocked] = useState(false);
    const [editorSearch, setEditorSearch] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isAutoSave, setIsAutoSave] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Separate timers: saveTimer debounces API writes, recalcTimer debounces recalculation
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const recalcTimer = useRef<NodeJS.Timeout | null>(null);
    const pendingManual = useRef<Record<string, Record<string, number>>>({});
    const unsavedManualChanges = useRef<Record<string, Record<string, number>>>({});
    const unsavedCustomPayouts = useRef<Record<string, number>>({});
    const monthInputRef = useRef<HTMLInputElement>(null);
    const lastTabRef = useRef<string>('');

    useEffect(() => {
        const fetchProject = async () => {
            const p = await getProjectById(Number(projectId));
            if (p) {
                setProject(p);
                const activeCalcs = p.calculators?.filter(c => c.status === 'Active' && c.metricType !== 'Face-showing Videos') || [];
                if (activeCalcs.length > 0) {
                    if (!activeMetricTab || !activeCalcs.find(c => String(c.id) === activeMetricTab)) {
                        setActiveMetricTab(String(activeCalcs[0].id));
                    }
                }
            } else {
                onBack();
            }
        };
        fetchProject();
    }, [projectId, onBack]);

    useEffect(() => {
        if (!activeMetricTab || !project?.calculators) return;
        if (activeMetricTab !== lastTabRef.current) {
            lastTabRef.current = activeMetricTab;
            const calc = project.calculators.find(c => String(c.id) === activeMetricTab);
            if (calc) {
                const level = calc.calculationLevel || 'Individual';
                setEntryMode(level === 'Team' ? 'team' : 'user');
            }
        }
    }, [activeMetricTab, project?.calculators]);

    const loadDataAndCalculate = useCallback(async (isSilent = false) => {
        if (!project?.id) return;
        if (!isSilent) setIsCalculating(true);
        try {
            const [manualData, customData, results] = await Promise.all([
                getIncentiveManualData(project.id, selectedMonth),
                getIncentiveCustomPayouts(project.id, selectedMonth),
                calculateIncentive(project.id, selectedMonth)
            ]);
            const mdMap: Record<string, Record<string, number>> = {};
            manualData.forEach((item: IncentiveManualData) => {
                if (!mdMap[item.metricType]) mdMap[item.metricType] = {};
                mdMap[item.metricType][item.dataKey] = item.value;
            });
            setManualDataMap(mdMap);
            const cpMap: Record<string, number> = {};
            customData.forEach((item: any) => { cpMap[item.userName] = item.value; });
            setCustomPayouts(cpMap);
            setCalculationResults(results);

            // Clear any unsaved changes on fresh load
            unsavedManualChanges.current = {};
            unsavedCustomPayouts.current = {};
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error loading incentive data', error);
            setSaveStatus('error');
        } finally {
            setIsCalculating(false);
        }
    }, [project?.id, selectedMonth]);

    useEffect(() => { loadDataAndCalculate(); }, [loadDataAndCalculate]);

    const toggleLock = async () => {
        if (!project?.id) return;
        if (isLocked) { setIsLocked(false); return; }
        if (!window.confirm(t.confirm_lock_payout || 'តើអ្នកចង់ចាក់សោររបាយការណ៍ខែនេះមែនទេ?')) return;
        setSaveStatus('saving');
        const success = await lockIncentivePayout(project.id, selectedMonth, calculationResults);
        if (success) { setIsLocked(true); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }
        else { alert('Failed to lock and save results.'); setSaveStatus('idle'); }
    };

    const handleManualDataChange = (metric: string, tid: string, val: string, pk: string) => {
        if (isLocked || !project?.id) return;
        const valNum = Number(val) || 0;
        const cellKey = `${pk}_${entryMode === 'team' ? 'team:' : 'user:'}${tid}`;

        setManualDataMap(prev => ({ ...prev, [metric]: { ...(prev[metric] || {}), [cellKey]: valNum } }));

        if (isAutoSave) {
            if (!pendingManual.current[metric]) pendingManual.current[metric] = {};
            pendingManual.current[metric][cellKey] = valNum;
            setSaveStatus('saving');

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(async () => {
                const latestVal = pendingManual.current[metric]?.[cellKey] ?? valNum;
                const success = await saveIncentiveManualData({
                    projectId: project.id,
                    month: selectedMonth,
                    metricType: metric,
                    dataKey: cellKey,
                    value: latestVal
                });
                if (success) {
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 1500);
                    if (recalcTimer.current) clearTimeout(recalcTimer.current);
                    recalcTimer.current = setTimeout(() => loadDataAndCalculate(true), 3000);
                } else {
                    setSaveStatus('error');
                }
            }, 800);
        } else {
            if (!unsavedManualChanges.current[metric]) unsavedManualChanges.current[metric] = {};
            unsavedManualChanges.current[metric][cellKey] = valNum;
            setHasUnsavedChanges(true);
        }
    };

    const handleManualDataIncrement = (metric: string, tid: string, p: string, delta: number) => {
        if (isLocked || !project?.id) return;
        const keyWithPrefix = `${p}_${entryMode === 'team' ? 'team:' : 'user:'}${tid}`;
        const currentVal = (isAutoSave ? pendingManual.current[metric]?.[keyWithPrefix] : unsavedManualChanges.current[metric]?.[keyWithPrefix])
            ?? (manualDataMap[metric] || {})[keyWithPrefix]
            ?? (manualDataMap[metric] || {})[`${p}_${tid}`]
            ?? 0;
        handleManualDataChange(metric, tid, String(Math.max(0, currentVal + delta)), p);
    };

    const pendingPayout = useRef<Record<string, number>>({});

    const handleCustomPayoutChange = (un: string, val: string) => {
        if (isLocked || !project?.id) return;
        const valNum = Number(val) || 0;
        
        setCustomPayouts(prev => ({ ...prev, [un]: valNum }));

        if (isAutoSave) {
            pendingPayout.current[un] = valNum;
            setSaveStatus('saving');
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(async () => {
                const latest = pendingPayout.current[un] ?? valNum;
                const success = await saveIncentiveCustomPayout({
                    projectId: project.id,
                    month: selectedMonth,
                    userName: un,
                    value: latest
                });
                if (success) {
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 1500);
                    if (recalcTimer.current) clearTimeout(recalcTimer.current);
                    recalcTimer.current = setTimeout(() => loadDataAndCalculate(true), 3000);
                } else {
                    setSaveStatus('error');
                }
            }, 800);
        } else {
            unsavedCustomPayouts.current[un] = valNum;
            setHasUnsavedChanges(true);
        }
    };

    const handleManualSave = async () => {
        if (isLocked || !project?.id || isCalculating) return;
        setSaveStatus('saving');
        setIsCalculating(true);

        try {
            const savePromises: Promise<boolean>[] = [];

            Object.entries(unsavedManualChanges.current).forEach(([metric, keys]) => {
                Object.entries(keys).forEach(([cellKey, value]) => {
                    savePromises.push(
                        saveIncentiveManualData({
                            projectId: project.id,
                            month: selectedMonth,
                            metricType: metric,
                            dataKey: cellKey,
                            value
                        })
                    );
                });
            });

            Object.entries(unsavedCustomPayouts.current).forEach(([un, value]) => {
                savePromises.push(
                    saveIncentiveCustomPayout({
                        projectId: project.id,
                        month: selectedMonth,
                        userName: un,
                        value
                    })
                );
            });

            if (savePromises.length === 0) {
                setSaveStatus('idle');
                setIsCalculating(false);
                return;
            }

            const results = await Promise.all(savePromises);
            const allSuccess = results.every(res => res === true);

            if (allSuccess) {
                unsavedManualChanges.current = {};
                unsavedCustomPayouts.current = {};
                setHasUnsavedChanges(false);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
                await loadDataAndCalculate(false);
            } else {
                setSaveStatus('error');
                alert(language === 'km' ? 'កំហុសក្នុងការរក្សាទុកទិន្នន័យមួយចំនួន!' : 'Error saving some changes!');
            }
        } catch (error) {
            console.error('Error in manual save:', error);
            setSaveStatus('error');
        } finally {
            setIsCalculating(false);
        }
    };

    const toggleAutoSave = async () => {
        const nextVal = !isAutoSave;
        setIsAutoSave(nextVal);
        if (nextVal && hasUnsavedChanges) {
            await handleManualSave();
        }
    };

    const preparedResults = useMemo(() => {
        return (calculationResults || []).map(cr => {
            const u = appData.users?.find(x => x.UserName === cr.userName);
            let breakdown: any[] = [];
            if (cr.breakdownJson) {
                try { 
                    const parsed = JSON.parse(cr.breakdownJson);
                    if (Array.isArray(parsed)) breakdown = parsed;
                }
                catch (e) { console.error('Failed to parse breakdownJson', e); }
            }
            const metricType = String(breakdown[0]?.metricType || '').toLowerCase();
            const isAmountMetric = ['sales amount', 'revenue', 'profit'].includes(metricType);
            
            let performance = 0;
            if (metricType === 'profit') performance = cr.totalProfit || 0;
            else if (isAmountMetric) performance = cr.totalRevenue || 0;
            else performance = cr.totalOrders || 0;

            return {
                username: cr.userName,
                fullName: u?.FullName || cr.userName,
                avatar: u?.ProfilePictureURL,
                role: u?.Role,
                team: u?.Team,
                performance,
                performanceMetric: breakdown[0]?.metricType || (isAmountMetric ? 'Revenue' : 'Orders'),
                isAmountMetric,
                reward: cr.calculatedValue,
                baseReward: cr.calculatedValue,
                isCustom: cr.isCustom || false,
                breakdown
            };
        }).sort((a, b) => b.reward - a.reward || b.performance - a.performance);
    }, [calculationResults, appData.users]);

    const totalPayout = useMemo(() => preparedResults.reduce((sum, u) => sum + u.reward, 0), [preparedResults]);
    const topStaff = preparedResults.length > 0 ? preparedResults[0] : null;
    const maxPerformance = useMemo(() => Math.max(...preparedResults.map(r => r.performance), 1), [preparedResults]);

    if (!project) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
    );

    return (
        <div className="incentive-surface w-full h-screen bg-[#050505] text-[#EAECEF] font-sans selection:bg-primary/30 flex flex-col overflow-hidden">
            
            {/* Header */}
            <header className="bg-[#121212] border-b border-white/5 px-6 py-4 shrink-0 relative overflow-hidden group/header">
                <div 
                    className="absolute -top-16 -left-16 w-32 h-32 rounded-full blur-[60px] opacity-[0.05] group-hover/header:opacity-[0.1] transition-all duration-700"
                    style={{ backgroundColor: project.colorCode || '#F0B90B' }}
                ></div>

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6 min-w-0">
                        <button onClick={onBack} className="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-[#B7BDC6] hover:text-white shrink-0 active:scale-90" title={language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}>
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="h-10 w-px bg-white/10 hidden sm:block" />
                        <div className="flex items-center gap-5 min-w-0">
                            <div 
                                className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shrink-0 relative overflow-hidden shadow-lg"
                                style={{ boxShadow: `0 0 15px ${project.colorCode || '#F0B90B'}10` }}
                            >
                                <div className="absolute inset-0 opacity-10 blur-xl" style={{ backgroundColor: project.colorCode || '#F0B90B' }}></div>
                                <Activity className="w-5 h-5 relative z-10" style={{ color: project.colorCode || '#F0B90B' }} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1.5 truncate">{project.projectName}</h1>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-white/20" />
                                        <span className="text-[10px] font-bold text-white/40 tracking-wide">
                                            {language === 'km' 
                                                ? `វដ្តទូទាត់៖ ${formatMonthKhmer(selectedMonth, 'km')}` 
                                                : `Payout Cycle: ${formatMonthKhmer(selectedMonth, 'en')}`}
                                        </span>
                                    </div>
                                    {saveStatus !== 'idle' && (
                                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold tracking-wide ${
                                            saveStatus === 'saving' ? 'bg-primary/10 border-primary/20 text-primary' : 
                                            saveStatus === 'saved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                                            'bg-red-500/10 border-red-500/20 text-red-500'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-primary animate-pulse' : saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            {saveStatus === 'saving' 
                                                ? (language === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') 
                                                : saveStatus === 'saved' 
                                                    ? (language === 'km' ? 'រក្សាទុកហើយ ✓' : 'Saved ✓') 
                                                    : (language === 'km' ? 'កំហុស!' : 'Error!')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
                        {/* Month Picker */}
                        <div 
                            onClick={() => monthInputRef.current?.showPicker()}
                            className="flex items-center gap-2.5 bg-violet-500/5 border border-violet-500/15 rounded-2xl p-1 px-3 h-11 shrink-0 month-picker-wrapper hover:border-violet-500/30 transition-colors cursor-pointer"
                        >
                            <Calendar className="w-4 h-4 text-violet-400" />
                            <input
                                ref={monthInputRef}
                                type="month"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="bg-transparent border-none p-0 text-white font-bold text-[11px] tracking-wide focus:ring-0 cursor-pointer outline-none min-w-[120px] month-picker-input"
                            />
                        </div>

                        {/* Cycle Status Badge */}
                        <div className={`h-11 px-4 rounded-2xl text-[10px] font-bold tracking-wide border transition-all duration-500 flex items-center gap-2 shrink-0 cycle-status-badge ${
                            isLocked ? 'bg-red-500/10 border-red-500/20 text-red-400 status-locked' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 status-open'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {isLocked 
                                ? (language === 'km' ? 'បានចាក់សោ' : 'Locked') 
                                : (language === 'km' ? 'កំពុងបើក' : 'Open')}
                        </div>

                        {/* Auto Save Toggle */}
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 h-11 shrink-0 select-none">
                            <span className="text-[10px] font-black text-white/40 tracking-wider uppercase">
                                {language === 'km' ? 'រក្សាទុកស្វ័យប្រវត្ត' : 'Auto Save'}
                            </span>
                            <button
                                type="button"
                                onClick={toggleAutoSave}
                                className={`w-9 h-5.5 rounded-full p-0.5 transition-all duration-300 relative ${
                                    isAutoSave ? 'bg-[#F0B90B]' : 'bg-white/10'
                                }`}
                                title={language === 'km' ? 'បិទ/បើក ការរក្សាទុកស្វ័យប្រវត្ត' : 'Toggle Auto Save'}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full bg-black shadow-md transition-all duration-300 ${
                                        isAutoSave ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Manual Save Button */}
                        {!isAutoSave && (
                            <button
                                type="button"
                                onClick={handleManualSave}
                                disabled={!hasUnsavedChanges || isCalculating}
                                className={`h-11 px-5 rounded-2xl text-[11px] font-bold tracking-wide transition-all border flex items-center gap-2.5 active:scale-95 shrink-0 ${
                                    hasUnsavedChanges
                                        ? 'bg-[#F0B90B] text-black border-[#F0B90B] shadow-lg shadow-[#F0B90B]/20 hover:bg-[#F0B90B]/90'
                                        : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                                }`}
                            >
                                <Save className="w-4 h-4 shrink-0" />
                                {language === 'km' ? 'រក្សាទុកទិន្នន័យ' : 'Save Changes'}
                                {hasUnsavedChanges && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                )}
                            </button>
                        )}

                        {/* Divider */}
                        <div className="h-7 w-px bg-white/10 shrink-0 hidden lg:block" />

                        {/* Export PDF */}
                        <button 
                            onClick={() => setIsPdfModalOpen(true)} 
                            className="h-11 px-5 rounded-2xl text-[11px] font-bold tracking-wide bg-violet-500/8 border border-violet-500/20 text-violet-300 hover:text-violet-200 hover:bg-violet-500/15 transition-all flex items-center gap-2.5 active:scale-95 shrink-0 hover:border-violet-500/30"
                        >
                            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                            {language === 'km' ? 'នាំចេញ PDF' : 'Export PDF'}
                        </button>

                        {/* Commit / Unlock */}
                        <button 
                            onClick={toggleLock} 
                            className={`h-11 px-5 rounded-2xl text-[11px] font-bold tracking-wide transition-all border flex items-center gap-2.5 active:scale-95 shrink-0 ${
                                isLocked 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30'
                            }`}
                        >
                            {isLocked 
                                ? <><Lock className="w-4 h-4 shrink-0" /> {language === 'km' ? 'ដោះសោ' : 'Unlock'}</> 
                                : <><Unlock className="w-4 h-4 shrink-0" /> {language === 'km' ? 'បញ្ជាក់ការទូទាត់' : 'Commit Payout'}</>}
                        </button>

                        {/* Manual Data Input Toggle */}
                        {project.dataSource === 'manual' && (
                            <button 
                                onClick={() => setShowInputPanel(!showInputPanel)} 
                                className={`h-11 px-5 rounded-2xl text-[11px] font-bold tracking-wide transition-all border flex items-center gap-2.5 active:scale-95 shrink-0 ${
                                    showInputPanel 
                                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-500 shadow-lg shadow-violet-500/25' 
                                        : 'bg-violet-500/8 border-violet-500/20 text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/30'
                                }`}
                            >
                                <Layout className="w-4 h-4 shrink-0" />
                                {showInputPanel 
                                    ? (language === 'km' ? 'បិទការបញ្ចូល' : 'Close Input') 
                                    : (language === 'km' ? 'បញ្ចូលទិន្នន័យ' : 'Data Input')}
                            </button>
                        )}

                        {/* Refresh / Recalculate */}
                        <button 
                            onClick={() => loadDataAndCalculate()} 
                            disabled={isCalculating} 
                            className="w-11 h-11 bg-violet-500/8 hover:bg-violet-500/15 disabled:opacity-50 text-violet-300 hover:text-violet-200 rounded-2xl border border-violet-500/15 flex items-center justify-center transition-all shrink-0 active:scale-90 group hover:border-violet-500/30" 
                            title={language === 'km' ? 'គណនាឡើងវិញ' : 'Recalculate'}
                        >
                            <RefreshCw className={`w-5 h-5 group-hover:text-violet-300 ${isCalculating ? 'animate-spin text-violet-400' : 'text-violet-400/60'}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto custom-scrollbar bg-[#050505] p-6 lg:p-8">
                
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    {[
                        { 
                            label: language === 'km' ? 'ការទូទាត់សរុប' : 'Total Payout', 
                            value: `$${totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 
                            color: 'text-amber-400', accent: 'bg-amber-400', icon: Coins, 
                            borderGlow: 'hover:border-amber-500/20',
                            iconBg: 'bg-amber-500/10 border-amber-500/15',
                            detail: language === 'km' ? `${preparedResults.length} នាក់មានសិទ្ធិទទួល` : `${preparedResults.length} qualified staff` 
                        },
                        { 
                            label: language === 'km' ? 'អ្នកឈានមុខគេ' : 'Top Performer', 
                            value: topStaff?.fullName || 'N/A', 
                            detail: topStaff 
                                ? (language === 'km' ? `ទទួលបាន $${topStaff.reward.toFixed(2)}` : `Earned $${topStaff.reward.toFixed(2)}`) 
                                : (language === 'km' ? 'រង់ចាំទិន្នន័យ' : 'Pending data'), 
                            color: 'text-violet-400', accent: 'bg-violet-400', icon: Trophy,
                            borderGlow: 'hover:border-violet-500/20',
                            iconBg: 'bg-violet-500/10 border-violet-500/15'
                        },
                        { 
                            label: language === 'km' ? 'ការទូទាត់មធ្យម' : 'Average Payout', 
                            value: `$${(totalPayout / (preparedResults.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 
                            color: 'text-purple-300', accent: 'bg-purple-400', icon: TrendingUp, 
                            borderGlow: 'hover:border-purple-500/20',
                            iconBg: 'bg-purple-500/10 border-purple-500/15',
                            detail: language === 'km' ? 'ក្នុងមួយនាក់' : 'Per person' 
                        },
                        { 
                            label: language === 'km' ? 'ចំនួនបុគ្គលិក' : 'Active Staff', 
                            value: String(preparedResults.length), 
                            color: 'text-fuchsia-400', accent: 'bg-fuchsia-400', icon: ShieldCheck, 
                            borderGlow: 'hover:border-fuchsia-500/20',
                            iconBg: 'bg-fuchsia-500/10 border-fuchsia-500/15',
                            detail: isLocked 
                                ? (language === 'km' ? 'ត្រូវបានចាក់សោ' : 'Locked') 
                                : (language === 'km' ? 'អាចកែប្រែបាន' : 'Editable') 
                        },
                    ].map((s, i) => (
                        <div key={i} className={`bg-[#121212] border border-white/5 rounded-[32px] p-6 flex flex-col justify-between gap-6 group ${s.borderGlow} transition-all shadow-xl`}>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{s.label}</p>
                                    <h3 className={`text-2xl font-mono font-black ${s.color} truncate`}>{s.value}</h3>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl ${s.iconBg} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                    <s.icon className={`w-6 h-6 ${s.color}`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${s.accent} opacity-40`} />
                                <p className="text-[10px] font-medium text-white/25 tracking-wide">{s.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Data Entry Panel (Manual Override) */}
                {showInputPanel && project.dataSource === 'manual' && (
                    <div className="mb-10 bg-[#121212] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none">
                            <Cpu className="w-64 h-64 text-white" />
                        </div>

                        <div className="px-8 py-6 bg-white/[0.02] border-b border-white/5 flex flex-col xl:flex-row xl:items-center gap-6 relative z-10">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-white/20" />
                                    <span className="text-[10px] font-bold text-white/40 tracking-wide">{language === 'km' ? 'ម៉ូឌុលសកម្ម' : 'Active Module'}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-black p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                                    {project.calculators?.filter(c => c.status === 'Active' && c.metricType !== 'Face-showing Videos').map(calc => (
                                        <button
                                            key={calc.id}
                                            onClick={() => setActiveMetricTab(String(calc.id))}
                                            className={`h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border ${
                                                activeMetricTab === String(calc.id)
                                                    ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20'
                                                    : 'bg-transparent border-transparent text-white/30 hover:text-white hover:bg-white/5'
                                            }`}
                                        >{calc.name}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-white/20" />
                                    <span className="text-[10px] font-bold text-white/40 tracking-wide">{language === 'km' ? 'កម្រិត' : 'Scale'}</span>
                                </div>
                                <div className="flex items-center gap-1 bg-black p-1 rounded-2xl border border-white/5">
                                    {(['team', 'user'] as const).map(mode => (
                                        <button 
                                            key={mode} 
                                            onClick={() => setEntryMode(mode)} 
                                            className={`h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                                entryMode === mode 
                                                    ? 'bg-white/10 text-white border border-white/10 shadow-lg' 
                                                    : 'text-white/20 hover:text-white/40'
                                            }`}
                                        >
                                            {mode === 'team' 
                                                ? (language === 'km' ? 'ក្រុម' : 'Teams') 
                                                : (language === 'km' ? 'បុគ្គល' : 'Individual')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative xl:ml-auto w-full xl:w-80 group">
                                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder={language === 'km' ? 'ស្វែងរក...' : 'Search...'}
                                    value={editorSearch}
                                    onChange={e => setEditorSearch(e.target.value)}
                                    className="w-full h-11 bg-black border border-white/10 rounded-2xl pl-11 pr-11 text-[11px] font-black text-white placeholder:text-white/10 focus:border-primary/50 focus:bg-white/[0.02] outline-none transition-all uppercase tracking-widest"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                            {project.calculators?.filter(c => c.status === 'Active' && String(c.id) === activeMetricTab).map(calc => {
                                const definedSubPeriods = Array.from(new Set(
                                    (calc.achievementTiers || [])
                                        .map(t => t.subPeriod)
                                        .filter(sp => sp && sp.trim() !== "")
                                )).sort() as string[];

                                let subPeriods = definedSubPeriods;
                                if (subPeriods.length === 0) {
                                    subPeriods = (calc.calculationPeriod === 'Weekly' || calc.isMarathon) 
                                        ? ['W1', 'W2', 'W3', 'W4', 'W5'] 
                                        : ['month'];
                                }

                                const eligibleUsers = entryMode === 'user'
                                    ? (appData.users || []).filter(u => {
                                        if (!calc.applyTo || calc.applyTo.length === 0) return true;
                                        return calc.applyTo.some(rule => {
                                            if (rule.startsWith('Role:')) return u.Role === rule.replace('Role:', '');
                                            if (rule.startsWith('Team:')) {
                                                const tgt = rule.replace('Team:', '').trim().toLowerCase();
                                                return (u.Team || '').split(',').some(t => t.trim().toLowerCase() === tgt);
                                            }
                                            if (rule.startsWith('User:')) return u.UserName === rule.replace('User:', '');
                                            return false;
                                        });
                                    }).sort((a, b) => a.FullName.localeCompare(b.FullName))
                                    : [];
                                const targets = (entryMode === 'team' ? allTeams : eligibleUsers).filter(t => {
                                    const label = typeof t === 'string' ? t : t.FullName;
                                    return label.toLowerCase().includes(editorSearch.toLowerCase());
                                });
                                return (
                                    <div key={calc.id} className="relative">
                                        {calc.isMarathon && (
                                            <div className="px-8 py-3 bg-primary/5 border-y border-primary/10 flex items-center gap-4">
                                                <Trophy className="w-4 h-4 text-primary" />
                                                <span className="text-[10px] font-bold text-primary tracking-wide">
                                                    {language === 'km' 
                                                        ? '🏆 Marathon សកម្ម: រង្វាន់បញ្ចូលគ្នាតាមអំឡុងពេល' 
                                                        : '🏆 Marathon Active: Cumulative rewards per interval'}
                                                </span>
                                            </div>
                                        )}
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead className="sticky top-0 z-20">
                                                <tr className="bg-black/80 backdrop-blur-xl border-b border-white/10 text-[10px] text-white/30 font-bold tracking-wider">
                                                    <th className="px-8 py-4 min-w-[220px] border-r border-white/5">{language === 'km' ? 'ឈ្មោះ' : 'Name'}</th>
                                                    {subPeriods.map(p => {
                                                        if (calc.metricType === 'Number of Videos') {
                                                            return (
                                                                <React.Fragment key={p}>
                                                                    <th className="px-4 py-4 text-center border-r border-white/5 min-w-[140px]">
                                                                        {p} ({language === 'km' ? 'សរុប' : 'Total'})
                                                                    </th>
                                                                    <th className="px-4 py-4 text-center border-r border-white/5 min-w-[140px]">
                                                                        {p} ({language === 'km' ? 'បង្ហាញមុខ' : 'Face'})
                                                                    </th>
                                                                </React.Fragment>
                                                            );
                                                        }
                                                        return (
                                                            <th key={p} className="px-4 py-4 text-center border-r border-white/5 min-w-[180px]">
                                                                {p === 'month' ? (language === 'km' ? 'ប្រចាំខែ' : 'Monthly') : p}
                                                            </th>
                                                        );
                                                    })}
                                                    <th className="px-8 py-4 text-right text-primary bg-primary/5">{language === 'km' ? 'សរុប' : 'Total'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {targets.map(t => {
                                                    const id = typeof t === 'string' ? t : t.UserName;
                                                    const label = typeof t === 'string' ? t : t.FullName;
                                                    const rowData = manualDataMap[calc.metricType || ''] || {};
                                                    const faceRowData = manualDataMap['Face-showing Videos'] || {};
                                                    const rowTotal = subPeriods.reduce((sum, p) => {
                                                        const keyWithPrefix = `${p}_${entryMode === 'team' ? 'team:' : 'user:'}${id}`;
                                                        return sum + (rowData[keyWithPrefix] ?? rowData[`${p}_${id}`] ?? 0);
                                                    }, 0);
                                                    const faceRowTotal = subPeriods.reduce((sum, p) => {
                                                        const keyWithPrefix = `${p}_${entryMode === 'team' ? 'team:' : 'user:'}${id}`;
                                                        return sum + (faceRowData[keyWithPrefix] ?? faceRowData[`${p}_${id}`] ?? 0);
                                                    }, 0);
                                                    
                                                    const isVideoMetric = calc.metricType === 'Number of Videos';

                                                    return (
                                                        <tr key={id} className="hover:bg-white/[0.02] transition-colors group">
                                                            <td className="px-8 py-5 border-r border-white/5 font-black text-white text-xs italic tracking-tight group-hover:text-primary transition-colors">
                                                                {label}
                                                                {entryMode === 'user' && typeof t !== 'string' && (
                                                                    <div className="text-[9px] text-white/20 font-medium tracking-wide mt-1">{t.Team || (language === 'km' ? 'គ្មានក្រុម' : 'No Team')}</div>
                                                                )}
                                                            </td>
                                                            {subPeriods.map(p => {
                                                                const keyWithPrefix = `${p}_${entryMode === 'team' ? 'team:' : 'user:'}${id}`;
                                                                const cellVal = rowData[keyWithPrefix] ?? rowData[`${p}_${id}`] ?? 0;
                                                                const faceCellVal = faceRowData[keyWithPrefix] ?? faceRowData[`${p}_${id}`] ?? 0;
                                                                
                                                                let displayReward = 0;
                                                                let displayTierName = "";

                                                                if (calc.metricType === 'Number of Videos') {
                                                                    if (cellVal >= 15) {
                                                                        if (faceCellVal >= 5) {
                                                                            displayReward = 15;
                                                                            displayTierName = language === 'km' ? 'សម្រេច ១៥ វីដេអូ (បង្ហាញមុខ ៥)' : 'Reached 15 Videos (Face 5)';
                                                                        } else {
                                                                            displayReward = 10;
                                                                            displayTierName = language === 'km' ? 'សម្រេច ១៥ វីដេអូ' : 'Reached 15 Videos';
                                                                        }
                                                                    } else if (cellVal >= 10) {
                                                                        displayReward = 5;
                                                                        displayTierName = language === 'km' ? 'សម្រេច ១០ វីដេអូ' : 'Reached 10 Videos';
                                                                    }
                                                                } else if (calc.achievementTiers) {
                                                                    const tiers = [...calc.achievementTiers]
                                                                        .filter(tier => !tier.subPeriod || tier.subPeriod === p)
                                                                        .sort((a, b) => b.target - a.target);
                                                                    const tier = tiers.find(t => cellVal >= t.target);
                                                                    if (tier) {
                                                                        displayReward = tier.rewardAmount;
                                                                        displayTierName = tier.name || (language === 'km' ? 'គោលដៅសម្រេច' : 'Target Reached');
                                                                    }
                                                                }

                                                                if (calc.metricType === 'Number of Videos') {
                                                                    return (
                                                                        <React.Fragment key={p}>
                                                                            {/* Total Videos Input */}
                                                                            <td className="px-4 py-4 border-r border-white/5">
                                                                                <div className="flex flex-col gap-2">
                                                                                    <div className="flex items-center gap-1.5 justify-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={isLocked || cellVal <= 0}
                                                                                            onClick={() => handleManualDataIncrement(calc.metricType || '', id, p, -1)}
                                                                                            className="w-8 h-10 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all disabled:opacity-20 active:scale-90 shrink-0 text-base font-black"
                                                                                        >−</button>
                                                                                        <input
                                                                                            type="number"
                                                                                            value={cellVal || ''}
                                                                                            disabled={isLocked}
                                                                                            onChange={e => handleManualDataChange(calc.metricType || '', id, e.target.value, p)}
                                                                                            className="w-16 h-10 bg-black border border-white/10 text-center font-mono text-[13px] font-black text-white focus:border-primary/50 focus:bg-primary/[0.02] rounded-lg outline-none transition-all disabled:opacity-30"
                                                                                            placeholder="0"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={isLocked}
                                                                                            onClick={() => handleManualDataIncrement(calc.metricType || '', id, p, 1)}
                                                                                            className="w-8 h-10 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-20 active:scale-90 shrink-0 text-base font-black"
                                                                                        >+</button>
                                                                                    </div>
                                                                                    {displayReward > 0 && (
                                                                                        <div className="flex flex-col gap-0.5 px-2 py-1 bg-emerald-500/5 rounded border border-emerald-500/10 max-w-[120px] mx-auto text-center">
                                                                                            <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter truncate">
                                                                                                {displayTierName}
                                                                                            </span>
                                                                                            <span className="text-[9px] font-mono font-black text-emerald-400">
                                                                                                +${displayReward.toFixed(0)}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </td>

                                                                            {/* Face-showing Videos Input */}
                                                                            <td className="px-4 py-4 border-r border-white/5">
                                                                                <div className="flex items-center gap-1.5 justify-center">
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={isLocked || faceCellVal <= 0}
                                                                                        onClick={() => handleManualDataIncrement('Face-showing Videos', id, p, -1)}
                                                                                        className="w-8 h-10 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all disabled:opacity-20 active:scale-90 shrink-0 text-base font-black"
                                                                                    >−</button>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={faceCellVal || ''}
                                                                                        disabled={isLocked}
                                                                                        onChange={e => handleManualDataChange('Face-showing Videos', id, e.target.value, p)}
                                                                                        className="w-16 h-10 bg-black border border-white/10 text-center font-mono text-[13px] font-black text-white focus:border-primary/50 focus:bg-primary/[0.02] rounded-lg outline-none transition-all disabled:opacity-30"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={isLocked}
                                                                                        onClick={() => handleManualDataIncrement('Face-showing Videos', id, p, 1)}
                                                                                        className="w-8 h-10 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-20 active:scale-90 shrink-0 text-base font-black"
                                                                                    >+</button>
                                                                                </div>
                                                                            </td>
                                                                        </React.Fragment>
                                                                    );
                                                                }

                                                                return (
                                                                    <td key={p} className="px-4 py-4 border-r border-white/5">
                                                                        <div className="flex flex-col gap-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isLocked || cellVal <= 0}
                                                                                    onClick={() => handleManualDataIncrement(calc.metricType || '', id, p, -1)}
                                                                                    className="w-9 h-11 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all disabled:opacity-20 active:scale-90 shrink-0 text-lg font-black"
                                                                                >−</button>
                                                                                <input
                                                                                    type="number"
                                                                                    value={cellVal || ''}
                                                                                    disabled={isLocked}
                                                                                    onChange={e => handleManualDataChange(calc.metricType || '', id, e.target.value, p)}
                                                                                    className="flex-1 h-11 bg-black border border-white/10 text-center font-mono text-[14px] font-black text-white focus:border-primary/50 focus:bg-primary/[0.02] rounded-xl outline-none transition-all disabled:opacity-30"
                                                                                    placeholder="0"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isLocked}
                                                                                    onClick={() => handleManualDataIncrement(calc.metricType || '', id, p, 1)}
                                                                                    className="w-9 h-11 flex items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-20 active:scale-90 shrink-0 text-lg font-black"
                                                                                >+</button>
                                                                            </div>
                                                                            {displayReward > 0 ? (
                                                                                <div className="flex items-center justify-between px-2 py-1 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                                                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                                                                                        {displayTierName}
                                                                                    </span>
                                                                                    <span className="text-[10px] font-mono font-black text-emerald-400">
                                                                                        +${displayReward.toFixed(0)}
                                                                                    </span>
                                                                                </div>
                                                                            ) : cellVal > 0 ? (
                                                                                <div className="px-2">
                                                                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                                        <div className="h-full bg-white/20 animate-pulse" style={{width: '40%'}}></div>
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-8 py-5 text-right bg-primary/[0.02]">
                                                                <span className="font-mono text-[16px] text-primary font-black tracking-tight">{rowTotal.toLocaleString()}</span>
                                                                <div className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mt-1">{calc.metricType || 'KPI'}</div>
                                                                {isVideoMetric && (
                                                                    <div className="mt-2 pt-2 border-t border-white/5">
                                                                        <span className="font-mono text-[13px] text-emerald-400 font-black tracking-tight">{faceRowTotal.toLocaleString()}</span>
                                                                        <div className="text-[8px] text-white/20 font-black uppercase tracking-wider mt-0.5">{language === 'km' ? 'បង្ហាញមុខសរុប' : 'Face Total'}</div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Payout Ledger Table */}
                <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-5 min-w-0">
                            <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(252,213,53,0.3)]" />
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-1.5">
                                    {language === 'km' ? 'តារាងការទូទាត់' : 'Payout Ledger'}
                                </h2>
                                <p className="text-xs text-white/30 font-medium tracking-wide mt-1">
                                    {project?.calculators?.some(c => c.isMarathon) 
                                        ? (language === 'km' ? 'ការគណនា Marathon និងផ្ទៀងផ្ទាត់ចុងក្រោយ' : 'Marathon credits & final verification') 
                                        : (language === 'km' ? 'រង្វាន់ដែលបានផ្ទៀងផ្ទាត់ និងការកែសម្រួល' : 'Verified rewards & manual adjustments')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsAdjustMode(!isAdjustMode)}
                            disabled={isLocked}
                            className={`h-11 px-6 text-[11px] font-bold tracking-wide rounded-2xl border transition-all flex items-center justify-center gap-2.5 active:scale-95 shadow-lg ${
                                isLocked
                                    ? 'bg-white/5 text-white/20 border-white/5 opacity-50 cursor-not-allowed'
                                    : isAdjustMode
                                        ? 'bg-primary text-black border-primary shadow-primary/20'
                                        : 'bg-white/5 text-white/40 hover:text-white border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <MousePointer2 className="w-4 h-4" />
                            {isAdjustMode 
                                ? (language === 'km' ? 'រួចរាល់' : 'Done') 
                                : (language === 'km' ? 'កែសម្រួលការទូទាត់' : 'Adjust Payouts')}
                        </button>
                    </div>

                    <div className="bg-[#121212] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/5 text-xs text-white/30 font-bold tracking-wider">
                                        <th className="px-8 py-5 w-20 text-center border-r border-white/5">{language === 'km' ? 'ចំណាត់' : 'Rank'}</th>
                                        <th className="px-8 py-5 min-w-[280px] border-r border-white/5">{language === 'km' ? 'បុគ្គលិក' : 'Staff'}</th>
                                        <th className="px-8 py-5 border-r border-white/5">{language === 'km' ? 'សមិទ្ធផល' : 'Performance'}</th>
                                        <th className="px-8 py-5 border-r border-white/5">{language === 'km' ? 'ការគណនា' : 'Breakdown'}</th>
                                        <th className="px-8 py-5 text-right">{language === 'km' ? 'រង្វាន់ (USD)' : 'Reward (USD)'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {preparedResults.map((u, idx) => (
                                        <tr key={u.username} className={`hover:bg-white/[0.03] transition-all duration-300 group ${idx === 0 ? 'bg-primary/[0.01]' : ''}`}>
                                            <td className="px-8 py-6 text-center border-r border-white/5">
                                                <span className={`font-mono font-black text-lg ${idx === 0 ? 'text-primary' : 'text-white/10'}`}>
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </span>
                                            </td>

                                            <td className="px-8 py-6 border-r border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative shrink-0">
                                                        <UserAvatar avatarUrl={u.avatar} name={u.fullName} size="md" className="border-2 border-white/5 group-hover:border-primary/40 transition-all duration-500 scale-90 group-hover:scale-100" />
                                                        {idx === 0 && (
                                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-[#121212] shadow-lg">
                                                                <Trophy className="w-3 h-3 text-black" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-white text-sm uppercase italic tracking-tight truncate group-hover:text-primary transition-colors">{u.fullName}</p>
                                                        <p className="text-[11px] text-white/20 font-medium tracking-wide mt-1">{u.username} · {u.role || (language === 'km' ? 'បុគ្គលិក' : 'Staff')}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6 border-r border-white/5">
                                                <p className="font-mono font-black text-white text-base">
                                                    {u.isAmountMetric ? '$' : ''}{u.performance.toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <div className="h-1.5 flex-grow bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(252,213,53,0.4)]"
                                                            style={{ width: `${Math.min(100, Math.round((u.performance / maxPerformance) * 100))}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-white/30 font-black uppercase tracking-wider">
                                                        {Math.round((u.performance / maxPerformance) * 100)}% {u.performanceMetric}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6 border-r border-white/5">
                                                {canViewLogic(u.team) ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {u.breakdown?.map((b: any, i: number) => {
                                                            const calc = project?.calculators?.find(c => c.id === b.calculatorId);
                                                            const isMarathonComponent = calc?.isMarathon;
                                                            return (
                                                                <div key={i} className={`px-3 py-1.5 bg-black/40 border rounded-xl text-[11px] flex flex-col gap-1 transition-all duration-300 hover:scale-105 ${isMarathonComponent ? 'border-primary/40 bg-primary/5' : 'border-white/5 hover:border-white/20'}`} title={b.description}>
                                                                    <div className="flex items-center gap-2.5">
                                                                        {isMarathonComponent ? <Trophy className="w-3 h-3 text-primary" /> : <Cpu className="w-3 h-3 text-white/20" />}
                                                                        <span className={`uppercase tracking-wider font-black text-[10px] ${isMarathonComponent ? 'text-primary' : 'text-white/40'}`}>
                                                                            {isMarathonComponent ? 'Marathon' : (b.name || b.calculatorName || (language === 'km' ? 'ប្រាក់រង្វាន់' : 'Bonus'))}
                                                                        </span>
                                                                        <div className="w-px h-3 bg-white/10" />
                                                                        <span className="text-emerald-400 font-mono font-black text-[11px]">${(b.amount || 0).toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {u.breakdown.length === 0 && (
                                                            <span className="text-[9px] font-medium text-white/10 tracking-wide">{language === 'km' ? 'គ្មានទិន្នន័យ' : 'No breakdown'}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="w-3 h-3 text-white/20" />
                                                        <span className="text-[9px] font-medium text-white/20 tracking-wide">{language === 'km' ? 'មិនអាចមើលបាន' : 'Restricted'}</span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-8 py-6 text-right">
                                                {canViewLogic(u.team) ? (
                                                    isAdjustMode ? (
                                                        <div className="flex flex-col items-end gap-2">
                                                            <div className="flex items-center gap-2 bg-black border border-white/10 p-1 rounded-2xl">
                                                                <button
                                                                    type="button"
                                                                    disabled={isLocked}
                                                                    onClick={() => {
                                                                        const cur = customPayouts[u.username] !== undefined ? customPayouts[u.username] : u.reward;
                                                                        handleCustomPayoutChange(u.username, String(Math.max(0, cur - 1)));
                                                                    }}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-500 transition-all active:scale-90 font-black"
                                                                >−</button>
                                                                <div className="flex items-center px-2">
                                                                    <span className="text-white/20 font-mono text-sm mr-1.5">$</span>
                                                                    <input
                                                                        type="number"
                                                                        value={customPayouts[u.username] !== undefined ? customPayouts[u.username] : u.reward}
                                                                        onChange={e => handleCustomPayoutChange(u.username, e.target.value)}
                                                                        disabled={isLocked}
                                                                        className="w-24 bg-transparent border-none p-0 text-base text-right font-mono font-black text-primary focus:ring-0 outline-none"
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    disabled={isLocked}
                                                                    onClick={() => {
                                                                        const cur = customPayouts[u.username] !== undefined ? customPayouts[u.username] : u.reward;
                                                                        handleCustomPayoutChange(u.username, String(cur + 1));
                                                                    }}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition-all active:scale-90 font-black"
                                                                >+</button>
                                                            </div>
                                                            {customPayouts[u.username] !== undefined && (
                                                                <button
                                                                    disabled={isLocked}
                                                                    onClick={() => handleCustomPayoutChange(u.username, String(u.baseReward))}
                                                                    className="text-[9px] font-black text-white/20 hover:text-primary uppercase tracking-[0.2em] transition-all"
                                                                >
                                                                    {language === 'km' ? `កំណត់ដើម $${u.baseReward.toFixed(2)}` : `Reset to $${u.baseReward.toFixed(2)}`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="group/val">
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-mono font-black text-[22px] text-primary group-hover/val:scale-110 transition-transform duration-300 origin-right">
                                                                    ${u.reward.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                                {u.isCustom && (
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                                                        <span className="text-[9px] font-medium text-white/30 tracking-wide">{language === 'km' ? 'បានកែសម្រួល' : 'Custom adjusted'}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono font-black text-xl text-white/10">
                                                            $***.**
                                                        </span>
                                                        <span className="text-[9px] font-medium text-white/20 tracking-wide mt-1">{language === 'km' ? 'មិនអាចមើលបាន' : 'Restricted'}</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {preparedResults.length === 0 && !isCalculating && (
                            <div className="py-32 text-center group/empty">
                                <div className="w-20 h-20 rounded-[32px] bg-black border border-white/5 flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover/empty:scale-110 transition-transform">
                                    <Search className="w-10 h-10 text-white/10" />
                                </div>
                                <p className="text-xl font-bold text-white tracking-tight mb-2">
                                    {language === 'km' ? 'មិនមានទិន្នន័យ' : 'No Data Found'}
                                </p>
                                <p className="text-sm font-medium text-white/20 tracking-wide">
                                    {language === 'km' ? 'មិនមានការទូទាត់សម្រាប់វដ្តនេះទេ' : 'No payout records found for this cycle'}
                                </p>
                            </div>
                        )}
                        {isCalculating && (
                            <div className="py-20 text-center">
                                <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                                <p className="text-[11px] font-bold text-primary tracking-wide animate-pulse">
                                    {language === 'km' ? 'កំពុងគណនា...' : 'Calculating...'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* PDF Modal */}
            {isPdfModalOpen && project && (
                <IncentivePdfExportModal
                    isOpen={isPdfModalOpen}
                    onClose={() => setIsPdfModalOpen(false)}
                    project={project}
                    period={selectedMonth}
                    results={preparedResults}
                    language={language}
                />
            )}
        </div>
    );
};

export default IncentiveExecutionView;

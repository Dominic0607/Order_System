import React, { useState, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../../../context/AppContext';
import { WEB_APP_URL } from '../../../constants';
import { CacheService, CACHE_KEYS } from '../../../services/cacheService';
import { convertGoogleDriveUrl } from '../../../utils/fileUtils';
import { configSections, getArrayCaseInsensitive } from '../../../constants/settingsConfig';
import ConfigEditModal from './ConfigEditModal';
import Spinner from '../../common/Spinner';
import ToggleSwitch from '../../common/ToggleSwitch';
import { ShippingMethod } from '../../../types';

export const ShippingMethodsManagement: React.FC = () => {
    const { appData, refreshData, showNotification, advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingMethod, setUpdatingMethod] = useState<string | null>(null);
    const [modal, setModal] = useState<{ isOpen: boolean; item: ShippingMethod | null }>({ isOpen: false, item: null });

    const rawMethods = useMemo(() => {
        return getArrayCaseInsensitive(appData, 'shippingMethods') as ShippingMethod[];
    }, [appData]);

    const activeSection = useMemo(() => {
        return configSections.find(s => s.id === 'shippingMethods');
    }, []);

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = rawMethods.length;
        const disabled = rawMethods.filter(m => m.IsDisabled).length;
        const active = total - disabled;
        const requireDriver = rawMethods.filter(m => m.RequireDriverSelection).length;

        return { total, active, disabled, requireDriver };
    }, [rawMethods]);

    // Filtered methods list
    const filteredMethods = useMemo(() => {
        return rawMethods.filter(m => {
            // Status filter
            if (statusFilter === 'active' && m.IsDisabled) return false;
            if (statusFilter === 'disabled' && !m.IsDisabled) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const nameMatch = (m.MethodName || '').toLowerCase().includes(q);
                const shortcutsMatch = (m.CostShortcuts || '').toLowerCase().includes(q);
                return nameMatch || shortcutsMatch;
            }

            return true;
        });
    }, [rawMethods, statusFilter, searchQuery]);

    // Quick Update API call for boolean toggles (IsDisabled, AllowManualDriver, etc.)
    const handleUpdateField = useCallback(async (method: ShippingMethod, fieldName: keyof ShippingMethod, newValue: boolean) => {
        setUpdatingMethod(method.MethodName);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token || localStorage.getItem('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const updatedData = {
                ...method,
                [fieldName]: newValue
            };

            const payload = {
                sheetName: 'ShippingMethods',
                primaryKey: { MethodName: method.MethodName },
                newData: updatedData
            };

            const response = await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'ធ្វើបច្ចុប្បន្នភាពមិនបានជោគជ័យ');

            await refreshData();
            
            if (fieldName === 'IsDisabled') {
                const actionMsg = newValue ? `បានបិទសេវា "${method.MethodName}" ជោគជ័យ!` : `បានបើកសេវា "${method.MethodName}" ជោគជ័យ!`;
                showNotification(actionMsg, newValue ? 'warning' : 'success', newValue ? 'Disabled' : 'Enabled');
            } else {
                showNotification(`កែប្រែព័ត៌មាន "${method.MethodName}" ជោគជ័យ!`, 'success');
            }
        } catch (err: any) {
            showNotification(err.message || 'មានបញ្ហាក្នុងការធ្វើបច្ចុប្បន្នភាព', 'error');
        } finally {
            setUpdatingMethod(null);
        }
    }, [refreshData, showNotification]);

    // Handle Delete Shipping Method
    const handleDelete = useCallback(async (method: ShippingMethod) => {
        if (!window.confirm(`តើអ្នកប្រាកដទេថាចង់លុបសេវាដឹកជញ្ជូន "${method.MethodName}"?`)) return;

        setUpdatingMethod(method.MethodName);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token || localStorage.getItem('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const payload = {
                sheetName: 'ShippingMethods',
                primaryKey: { MethodName: method.MethodName }
            };

            const response = await fetch(`${WEB_APP_URL}/api/admin/delete-row`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'លុបមិនបានជោគជ័យ');

            await refreshData();
            showNotification(`បានលុបសេវា "${method.MethodName}" រួចរាល់!`, 'success');
        } catch (err: any) {
            showNotification(err.message || 'មានបញ្ហាក្នុងការលុបសេវា', 'error');
        } finally {
            setUpdatingMethod(null);
        }
    }, [refreshData, showNotification]);

    return (
        <div className="w-full flex-grow flex flex-col gap-5 overflow-hidden p-1">
            {/* KPI Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 flex-shrink-0">
                {/* Total Services */}
                <div className={`p-4 rounded-2xl border transition-all ${
                    isLightMode 
                        ? 'bg-white border-slate-200/80 shadow-sm shadow-slate-100' 
                        : 'bg-gray-800/40 border-white/5 backdrop-blur-xl shadow-lg'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>សេវាដឹកសរុប</span>
                        <div className={`p-2 rounded-xl ${isLightMode ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16l4-4 4 4" /></svg>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{metrics.total}</span>
                        <span className={`text-[11px] font-medium ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>ក្រុមហ៊ុន</span>
                    </div>
                </div>

                {/* Active Services */}
                <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    statusFilter === 'active' 
                        ? (isLightMode ? 'ring-2 ring-emerald-500 bg-emerald-50/30' : 'ring-2 ring-emerald-500 bg-emerald-500/10')
                        : ''
                } ${
                    isLightMode 
                        ? 'bg-white border-slate-200/80 shadow-sm shadow-slate-100' 
                        : 'bg-gray-800/40 border-white/5 backdrop-blur-xl shadow-lg'
                }`} onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>កំពុងបើក (Active)</span>
                        <div className={`p-2 rounded-xl ${isLightMode ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`}>{metrics.active}</span>
                        <span className={`text-[11px] font-bold ${isLightMode ? 'text-emerald-600/70' : 'text-emerald-500/80'}`}>ដំណើរការ</span>
                    </div>
                </div>

                {/* Disabled Services */}
                <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    statusFilter === 'disabled' 
                        ? (isLightMode ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'ring-2 ring-rose-500 bg-rose-500/10')
                        : ''
                } ${
                    isLightMode 
                        ? 'bg-white border-slate-200/80 shadow-sm shadow-slate-100' 
                        : 'bg-gray-800/40 border-white/5 backdrop-blur-xl shadow-lg'
                }`} onClick={() => setStatusFilter(statusFilter === 'disabled' ? 'all' : 'disabled')}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isLightMode ? 'text-rose-700' : 'text-rose-400'}`}>បានបិទ (Disabled)</span>
                        <div className={`p-2 rounded-xl ${isLightMode ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-400'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${isLightMode ? 'text-rose-600' : 'text-rose-400'}`}>{metrics.disabled}</span>
                        <span className={`text-[11px] font-bold ${isLightMode ? 'text-rose-600/70' : 'text-rose-500/80'}`}>បិទផ្អាក</span>
                    </div>
                </div>

                {/* Require Driver Selection */}
                <div className={`p-4 rounded-2xl border transition-all ${
                    isLightMode 
                        ? 'bg-white border-slate-200/80 shadow-sm shadow-slate-100' 
                        : 'bg-gray-800/40 border-white/5 backdrop-blur-xl shadow-lg'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isLightMode ? 'text-amber-700' : 'text-amber-400'}`}>តម្រូវអ្នកដឹក</span>
                        <div className={`p-2 rounded-xl ${isLightMode ? 'bg-amber-50 text-amber-600' : 'bg-amber-500/10 text-amber-400'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`}>{metrics.requireDriver}</span>
                        <span className={`text-[11px] font-bold ${isLightMode ? 'text-amber-600/70' : 'text-amber-500/80'}`}>សេវា</span>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                {/* Left side: Status Filter Pills */}
                <div className={`flex items-center gap-1.5 p-1 rounded-2xl border w-full sm:w-auto ${
                    isLightMode ? 'bg-slate-100/80 border-slate-200' : 'bg-gray-900/60 border-white/5'
                }`}>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            statusFilter === 'all'
                                ? (isLightMode ? 'bg-white text-blue-600 shadow-sm' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20')
                                : (isLightMode ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white')
                        }`}
                    >
                        ទាំងអស់ ({metrics.total})
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                            statusFilter === 'active'
                                ? (isLightMode ? 'bg-white text-emerald-600 shadow-sm' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20')
                                : (isLightMode ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white')
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        កំពុងបើក ({metrics.active})
                    </button>
                    <button
                        onClick={() => setStatusFilter('disabled')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                            statusFilter === 'disabled'
                                ? (isLightMode ? 'bg-white text-rose-600 shadow-sm' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20')
                                : (isLightMode ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white')
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        បានបិទ ({metrics.disabled})
                    </button>
                </div>

                {/* Right side: Search & Add New Button */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <div className="relative flex-grow sm:w-64">
                        <div className={`absolute left-3.5 top-0 bottom-0 flex items-center pointer-events-none ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ស្វែងរកឈ្មោះសេវា..."
                            className={`w-full !pl-10 !pr-4 !py-2.5 rounded-2xl text-xs font-bold outline-none transition-all ${
                                isLightMode
                                    ? 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500/50 shadow-sm'
                                    : 'bg-gray-900/60 border border-white/5 text-white placeholder:text-gray-500 focus:border-blue-500/50'
                            }`}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-0 bottom-0 flex items-center text-gray-400 hover:text-gray-200">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setModal({ isOpen: true, item: null })}
                        className="btn btn-primary px-5 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-600/20 whitespace-nowrap flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        បន្ថែមសេវាថ្មី
                    </button>
                </div>
            </div>

            {/* Main Table / Container */}
            <div className={`border rounded-3xl overflow-hidden shadow-2xl flex flex-col flex-grow relative ${
                isLightMode 
                    ? 'bg-white border-slate-200/80 shadow-slate-100/50' 
                    : 'bg-gray-800/30 border-white/5 backdrop-blur-xl'
            }`}>
                {/* Desktop / Tablet Table View */}
                <div className="hidden md:block overflow-y-auto custom-scrollbar flex-grow">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className={`border-b text-[11px] font-black uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md ${
                                isLightMode 
                                    ? 'bg-slate-50/90 border-slate-200/80 text-slate-500' 
                                    : 'bg-gray-900/80 border-white/5 text-gray-400'
                            }`}>
                                <th className="py-4 px-4 text-center w-12">#</th>
                                <th className="py-4 px-4 text-left">ឈ្មោះសេវា (Method)</th>
                                <th className="py-4 px-4 text-center">ជ្រើសរើសអ្នកដឹក</th>
                                <th className="py-4 px-4 text-center"> Recommend Driver</th>
                                <th className="py-4 px-4 text-center">តម្លៃដើម ($)</th>
                                <th className="py-4 px-4 text-left">Shortcuts តម្លៃ</th>
                                <th className="py-4 px-4 text-center w-44">ស្ថានភាព (Disable / Enable)</th>
                                <th className="py-4 px-4 text-center w-28">សកម្មភាព</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y text-xs ${isLightMode ? 'divide-slate-100' : 'divide-white/5'}`}>
                            {filteredMethods.length > 0 ? (
                                filteredMethods.map((method, idx) => {
                                    const isUpdating = updatingMethod === method.MethodName;
                                    const isDisabled = !!method.IsDisabled;

                                    return (
                                        <tr key={method.MethodName || idx} className={`transition-colors group ${
                                            isDisabled 
                                                ? (isLightMode ? 'bg-slate-50/60 opacity-60' : 'bg-gray-950/40 opacity-50')
                                                : (isLightMode ? 'hover:bg-blue-50/40' : 'hover:bg-blue-500/5')
                                        }`}>
                                            {/* # Index */}
                                            <td className={`py-4 px-4 text-center font-extrabold text-[11px] ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                                {idx + 1}
                                            </td>

                                            {/* Service Logo & Name */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-11 h-11 rounded-2xl overflow-hidden border p-1 flex-shrink-0 flex items-center justify-center shadow-sm ${
                                                        isLightMode ? 'bg-white border-slate-200' : 'bg-gray-900 border-white/10'
                                                    }`}>
                                                        {method.LogoURL ? (
                                                            <img
                                                                src={convertGoogleDriveUrl(method.LogoURL)}
                                                                className="w-full h-full object-contain"
                                                                alt=""
                                                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <span className="text-lg">🚚</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={`font-black text-sm truncate flex items-center gap-2 ${
                                                            isLightMode ? 'text-slate-800' : 'text-white'
                                                        }`}>
                                                            {method.MethodName}
                                                        </h4>
                                                        {isDisabled && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 mt-0.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                សេវាបានបិទ (Disabled)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Driver Options (Manual / Required) */}
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <ToggleSwitch
                                                        size="sm"
                                                        variant="emerald"
                                                        checked={!!method.AllowManualDriver}
                                                        onChange={(val) => handleUpdateField(method, 'AllowManualDriver', val)}
                                                        disabled={isUpdating}
                                                        onLabel="ជ្រើសផ្ទាល់បាន"
                                                        offLabel="មិនអនុញ្ញាត"
                                                        isLightMode={isLightMode}
                                                    />
                                                    {method.RequireDriverSelection && (
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${
                                                            isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        }`}>
                                                            តម្រូវជ្រើសអ្នកដឹក
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Recommend Driver Toggle */}
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center">
                                                    <ToggleSwitch
                                                        size="sm"
                                                        variant="purple"
                                                        checked={!!method.EnableDriverRecommendation}
                                                        onChange={(val) => handleUpdateField(method, 'EnableDriverRecommendation', val)}
                                                        disabled={isUpdating}
                                                        onLabel="💡 ដំណើរការ"
                                                        offLabel="✕ បិទ"
                                                        isLightMode={isLightMode}
                                                    />
                                                </div>
                                            </td>

                                            {/* Internal Cost */}
                                            <td className="py-4 px-4 text-center">
                                                <span className={`font-mono font-bold text-sm ${
                                                    isLightMode ? 'text-slate-700' : 'text-gray-200'
                                                }`}>
                                                    {method.InternalCost !== undefined && method.InternalCost > 0 
                                                        ? `$${Number(method.InternalCost).toFixed(2)}`
                                                        : '-'
                                                    }
                                                </span>
                                            </td>

                                            {/* Cost Shortcuts */}
                                            <td className="py-4 px-4 text-left">
                                                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                    {method.CostShortcuts ? (
                                                        method.CostShortcuts.split(',').map((sc, i) => (
                                                            <span
                                                                key={i}
                                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                                                                    isLightMode 
                                                                        ? 'bg-slate-100 text-slate-700 border-slate-200' 
                                                                        : 'bg-gray-800 text-gray-300 border-white/10'
                                                                }`}
                                                            >
                                                                ${sc.trim()}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className={`text-[11px] italic ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>មិនមាន</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* STATUS TOGGLE SWITCH (Disable / Enable) */}
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center">
                                                    {isUpdating ? (
                                                        <Spinner size="sm" />
                                                    ) : (
                                                        <ToggleSwitch
                                                            size="md"
                                                            variant="emerald"
                                                            checked={!isDisabled}
                                                            onChange={(val) => handleUpdateField(method, 'IsDisabled', !val)}
                                                            onLabel="កំពុងបើក"
                                                            offLabel="បានបិទ"
                                                            isLightMode={isLightMode}
                                                        />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={() => setModal({ isOpen: true, item: method })}
                                                        className={`p-2 rounded-xl border transition-all ${
                                                            isLightMode 
                                                                ? 'bg-amber-50 text-amber-600 border-amber-200/60 hover:bg-amber-500 hover:text-white' 
                                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-white'
                                                        }`}
                                                        title="កែប្រែ"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleDelete(method)}
                                                        className={`p-2 rounded-xl border transition-all ${
                                                            isLightMode 
                                                                ? 'bg-rose-50 text-rose-600 border-rose-200/60 hover:bg-rose-500 hover:text-white' 
                                                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white'
                                                        }`}
                                                        title="លុប"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <div className={`text-base font-black mb-1 ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>
                                            មិនមានទិន្នន័យសេវាដឹកជញ្ជូនទេ
                                        </div>
                                        <p className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                            {searchQuery ? 'សូមសាកល្បងស្វែងរកពាក្យផ្សេង' : 'ចុចប៊ូតុង "បន្ថែមសេវាថ្មី" ដើម្បីបង្កើតសេវាដឹកដំបូង'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className={`md:hidden divide-y overflow-y-auto custom-scrollbar flex-grow ${
                    isLightMode ? 'divide-slate-100' : 'divide-white/5'
                }`}>
                    {filteredMethods.length > 0 ? (
                        filteredMethods.map((method, idx) => {
                            const isDisabled = !!method.IsDisabled;
                            const isUpdating = updatingMethod === method.MethodName;

                            return (
                                <div key={idx} className={`p-4 flex flex-col gap-3 transition-colors ${
                                    isDisabled ? (isLightMode ? 'bg-slate-50/70' : 'bg-gray-950/40') : ''
                                }`}>
                                    <div className="flex items-center justify-between gap-3">
                                        {/* Logo + Title */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-11 h-11 rounded-2xl overflow-hidden border p-1 flex-shrink-0 flex items-center justify-center ${
                                                isLightMode ? 'bg-white border-slate-200' : 'bg-gray-900 border-white/10'
                                            }`}>
                                                {method.LogoURL ? (
                                                    <img src={convertGoogleDriveUrl(method.LogoURL)} className="w-full h-full object-contain" alt="" />
                                                ) : (
                                                    <span className="text-lg">🚚</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={`font-black text-sm truncate ${isLightMode ? 'text-slate-800' : 'text-white'}`}>
                                                    {method.MethodName}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {method.InternalCost !== undefined && method.InternalCost > 0 && (
                                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                                            isLightMode ? 'bg-slate-100 text-slate-600' : 'bg-gray-800 text-gray-400'
                                                        }`}>
                                                            ${Number(method.InternalCost).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Enable / Disable Quick Toggle Pill */}
                                        <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() => handleUpdateField(method, 'IsDisabled', !isDisabled)}
                                            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${
                                                isDisabled
                                                    ? (isLightMode ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/30')
                                                    : (isLightMode ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30')
                                            }`}
                                        >
                                            {isUpdating ? (
                                                <Spinner size="sm" />
                                            ) : (
                                                <>
                                                    <div className={`w-3 h-3 rounded-full ${isDisabled ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                    <span>{isDisabled ? 'បានបិទ' : 'កំពុងបើក'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Action row on mobile */}
                                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-500/20">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {method.AllowManualDriver && (
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                                                    isLightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                    ✓ ជ្រើសផ្ទាល់
                                                </span>
                                            )}
                                            {method.RequireDriverSelection && (
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                                                    isLightMode ? 'bg-amber-50 text-amber-700' : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                    តម្រូវអ្នកដឹក
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setModal({ isOpen: true, item: method })}
                                                className={`p-2 rounded-xl border ${
                                                    isLightMode ? 'bg-slate-50 text-amber-600 border-slate-200' : 'bg-gray-800 text-amber-400 border-white/5'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(method)}
                                                className={`p-2 rounded-xl border ${
                                                    isLightMode ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-gray-800 text-rose-400 border-white/5'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-16 text-center text-gray-500 font-bold">
                            មិនមានទិន្នន័យ
                        </div>
                    )}
                </div>
            </div>

            {/* Config Edit Modal integration */}
            {modal.isOpen && activeSection && (
                <ConfigEditModal
                    section={activeSection}
                    item={modal.item}
                    onClose={() => setModal({ isOpen: false, item: null })}
                    onSave={() => {
                        setModal({ isOpen: false, item: null });
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};

export default ShippingMethodsManagement;

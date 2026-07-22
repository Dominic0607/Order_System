
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../../context/AppContext';
import { WEB_APP_URL } from '../../../constants';

interface KeyStatus {
    isSet: boolean;
    masked: string;
    source: 'env' | 'database' | 'none';
    hasDBKey: boolean;
    hasEnvKey: boolean;
}

const GeminiKeyManagement: React.FC = () => {
    const { showNotification, advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    const [status, setStatus] = useState<KeyStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [showNewKey, setShowNewKey] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${WEB_APP_URL}/api/admin/gemini-key`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === 'success') {
                setStatus(data);
            }
        } catch (e) {
            console.error('Failed to fetch Gemini key status', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleSave = async () => {
        const trimmed = newKey.trim();
        if (trimmed && !trimmed.startsWith('AIza')) {
            showNotification?.('Gemini API Key ត្រូវចាប់ផ្តើមដោយ "AIza"', 'error');
            return;
        }
        setIsSaving(true);
        setTestResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${WEB_APP_URL}/api/admin/gemini-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ apiKey: trimmed })
            });
            const data = await res.json();
            if (data.status === 'success') {
                showNotification?.('Gemini API Key ត្រូវបានរក្សាទុករួចរាល់ ✅', 'success');
                setNewKey('');
                setShowInput(false);
                await fetchStatus();
            } else {
                showNotification?.(data.message || 'មានបញ្ហា', 'error');
            }
        } catch (e) {
            showNotification?.('មានបញ្ហាក្នុងការភ្ជាប់ Server', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${WEB_APP_URL}/api/admin/gemini-key/value`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.apiKey) {
                setTestResult({ ok: false, message: 'មិនមាន API Key ត្រូវបានកំណត់ទេ' });
                return;
            }
            // Try a minimal Gemini API ping
            const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${data.apiKey}`);
            if (gemRes.ok) {
                setTestResult({ ok: true, message: 'API Key ត្រឹមត្រូវ ✅ — ការតភ្ជាប់ Gemini AI ជោគជ័យ' });
            } else {
                const errData = await gemRes.json().catch(() => ({}));
                setTestResult({ ok: false, message: `API Key មិនត្រឹមត្រូវ — ${errData?.error?.message || `HTTP ${gemRes.status}`}` });
            }
        } catch (e: any) {
            setTestResult({ ok: false, message: `មិនអាចភ្ជាប់ Gemini ​— ${e.message}` });
        } finally {
            setIsTesting(false);
        }
    };

    const handleRemove = async () => {
        if (!window.confirm('តើអ្នកចង់លុប API Key ចេញពី Database មែនទេ?')) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${WEB_APP_URL}/api/admin/gemini-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ apiKey: '' })
            });
            const data = await res.json();
            if (data.status === 'success') {
                showNotification?.('API Key ត្រូវបានលុបចេញពី Database', 'info');
                setTestResult(null);
                await fetchStatus();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const sourceColor = {
        env: 'text-blue-400',
        database: 'text-emerald-400',
        none: 'text-gray-500',
    };

    const sourceBadge = {
        env: { label: 'Environment Variable', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: '🔒' },
        database: { label: 'Database (Admin Settings)', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '🗄️' },
        none: { label: 'មិនទាន់កំណត់', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30', icon: '⚠️' },
    };

    return (
        <div className="flex-grow overflow-y-auto no-scrollbar p-4 md:p-6">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className={`rounded-2xl p-6 border ${isLightMode ? 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200' : 'bg-gradient-to-br from-violet-950/40 to-indigo-950/40 border-violet-800/30'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${isLightMode ? 'bg-white shadow-violet-200' : 'bg-[#1e2329] shadow-violet-900/50'}`}>
                            🤖
                        </div>
                        <div>
                            <h2 className={`text-xl font-black tracking-tight ${isLightMode ? 'text-slate-800' : 'text-white'}`}>
                                Gemini AI API Key
                            </h2>
                            <p className={`text-sm mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                គ្រប់គ្រង API Key សម្រាប់មុខងារ AI ដូចជា ការវិភាគ ការព្យាករណ៍ Sales
                            </p>
                        </div>
                    </div>
                </div>

                {/* Current Status Card */}
                <div className={`rounded-2xl border overflow-hidden ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1e2329] border-[#2b3139]'}`}>
                    <div className={`px-5 py-3 border-b font-bold text-xs uppercase tracking-widest ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#181a20] border-[#2b3139] text-[#848e9c]'}`}>
                        ស្ថានភាពបច្ចុប្បន្ន
                    </div>

                    {isLoading ? (
                        <div className="p-8 flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            <span className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-gray-500'}`}>កំពុងផ្ទុក...</span>
                        </div>
                    ) : (
                        <div className="p-5 space-y-4">
                            {/* Status row */}
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full shadow-lg ${status?.isSet ? 'bg-emerald-400 shadow-emerald-400/50 animate-pulse' : 'bg-red-400 shadow-red-400/50'}`} />
                                    <span className={`font-bold text-sm ${isLightMode ? 'text-slate-700' : 'text-gray-200'}`}>
                                        {status?.isSet ? 'API Key សកម្ម' : 'API Key មិនទាន់កំណត់'}
                                    </span>
                                </div>
                                {status?.source && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sourceBadge[status.source as keyof typeof sourceBadge]?.color}`}>
                                        {sourceBadge[status.source as keyof typeof sourceBadge]?.icon}{' '}
                                        {sourceBadge[status.source as keyof typeof sourceBadge]?.label}
                                    </span>
                                )}
                            </div>

                            {/* Masked Key display */}
                            {status?.isSet && status.masked && (
                                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 font-mono text-sm ${isLightMode ? 'bg-slate-100 text-slate-600' : 'bg-[#0b0e11] text-[#fcd535]'}`}>
                                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    <span className="flex-1 break-all tracking-wider">{status.masked}</span>
                                </div>
                            )}

                            {/* Env key note */}
                            {status?.hasEnvKey && (
                                <div className={`flex items-start gap-2 rounded-xl p-3 text-xs ${isLightMode ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        Key ត្រូវបានកំណត់ក្នុង <strong>Environment Variable</strong> (<code>GEMINI_API_KEY</code>)។
                                        Key ពី Env នឹង​ Override Key ក្នុង Database ជានិច្ច។
                                    </span>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 flex-wrap pt-1">
                                <button
                                    onClick={handleTest}
                                    disabled={isTesting || !status?.isSet}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isTesting || !status?.isSet ? 'opacity-40 cursor-not-allowed' : ''} ${isLightMode ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30'}`}
                                >
                                    {isTesting ? (
                                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    )}
                                    {isTesting ? 'Testing...' : 'ធ្វើ Test ភ្ជាប់'}
                                </button>

                                <button
                                    onClick={() => setShowInput(!showInput)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isLightMode ? 'bg-violet-50 text-violet-700 hover:bg-violet-500 hover:text-white border border-violet-200' : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500 hover:text-white border border-violet-500/30'}`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    {status?.hasDBKey ? 'ផ្លាស់ប្ដូរ Key' : 'បន្ថែម Key ថ្មី'}
                                </button>

                                {status?.hasDBKey && (
                                    <button
                                        onClick={handleRemove}
                                        disabled={isSaving}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isLightMode ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200' : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30'}`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        លុប Key ពី DB
                                    </button>
                                )}
                            </div>

                            {/* Test result */}
                            {testResult && (
                                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${testResult.ok
                                    ? (isLightMode ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
                                    : (isLightMode ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-red-500/10 text-red-400 border border-red-500/20')
                                }`}>
                                    <span>{testResult.ok ? '✅' : '❌'}</span>
                                    <span>{testResult.message}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input panel */}
                {showInput && (
                    <div className={`rounded-2xl border overflow-hidden animate-fadeIn ${isLightMode ? 'bg-white border-violet-200 shadow-sm shadow-violet-100' : 'bg-[#1e2329] border-violet-800/30'}`}>
                        <div className={`px-5 py-3 border-b font-bold text-xs uppercase tracking-widest ${isLightMode ? 'bg-violet-50 border-violet-200 text-violet-600' : 'bg-violet-950/30 border-violet-800/30 text-violet-400'}`}>
                            {status?.hasDBKey ? '🔄 ផ្លាស់ប្ដូរ Gemini API Key' : '➕ បន្ថែម Gemini API Key'}
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                    API Key ថ្មី
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewKey ? 'text' : 'password'}
                                        value={newKey}
                                        onChange={e => setNewKey(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className={`w-full rounded-xl px-4 py-3 pr-12 text-sm font-mono outline-none transition-all border ${isLightMode
                                            ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-400 placeholder:text-slate-400'
                                            : 'bg-[#0b0e11] border-[#2b3139] text-[#eaecef] focus:border-violet-500 placeholder:text-[#5e6673]'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewKey(!showNewKey)}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {showNewKey ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                                {newKey && !newKey.startsWith('AIza') && (
                                    <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                                        <span>⚠️</span> Key ត្រូវចាប់ផ្តើមដោយ "AIza"
                                    </p>
                                )}
                                {newKey.startsWith('AIza') && (
                                    <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                                        <span>✓</span> Format ត្រឹមត្រូវ
                                    </p>
                                )}
                            </div>

                            <div className={`rounded-xl p-3 text-xs space-y-1.5 ${isLightMode ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                                <p className="font-bold flex items-center gap-1.5">📌 របៀបទទួលបាន Gemini API Key:</p>
                                <p>1. ចូលទៅ <strong>aistudio.google.com</strong> ឬ <strong>console.cloud.google.com</strong></p>
                                <p>2. ចុច <strong>"Get API Key"</strong> → <strong>"Create API Key"</strong></p>
                                <p>3. Copy Key ហើយ Paste នៅទីនេះ</p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !newKey.trim()}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${isSaving || !newKey.trim() ? 'opacity-40 cursor-not-allowed' : ''} bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20`}
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                    )}
                                    {isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក API Key'}
                                </button>
                                <button
                                    onClick={() => { setShowInput(false); setNewKey(''); setShowNewKey(false); }}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isLightMode ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#2b3139] text-gray-400 hover:bg-[#363c46]'}`}
                                >
                                    បោះបង់
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info card */}
                <div className={`rounded-2xl border p-5 space-y-3 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#1e2329] border-[#2b3139]'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>
                        💡 មុខងារ AI ដែលប្រើ Gemini API Key
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                            { icon: '📝', label: 'សង្ខេប Note Order' },
                            { icon: '📦', label: 'បង្កើតការពណ៌នា Product' },
                            { icon: '📊', label: 'វិភាគ Sales Report' },
                            { icon: '🔮', label: 'ព្យាករណ៍ Sales ខែក្រោយ' },
                        ].map(item => (
                            <div key={item.label} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${isLightMode ? 'bg-white border border-slate-200' : 'bg-[#181a20] border border-[#2b3139]'}`}>
                                <span className="text-lg">{item.icon}</span>
                                <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-gray-300'}`}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        ⚠️ Key ក្នុង <code>GEMINI_API_KEY</code> Environment Variable នឹង Override Key ពី Database ជានិច្ច។
                        Key ដែលកំណត់ក្នុង Database ប្រើបាននៅពេល Env Key មិនមាន។
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GeminiKeyManagement;

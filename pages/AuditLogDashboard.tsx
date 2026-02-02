
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchAuditLogs } from '../services/auditService';
import { UserActivityLog, EditLog } from '../types';
import Spinner from '../components/common/Spinner';
import { translations } from '../translations';

interface AuditLogDashboardProps {
    onBack: () => void;
}

const AuditLogDashboard: React.FC<AuditLogDashboardProps> = ({ onBack }) => {
    const { language, setMobilePageTitle } = useContext(AppContext);
    const t = translations[language];
    
    const [activeTab, setActiveTab] = useState<'activity' | 'edit'>('activity');
    const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
    const [editLogs, setEditLogs] = useState<EditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Update Mobile Header Title
    useEffect(() => {
        setMobilePageTitle(t.audit);
        return () => setMobilePageTitle(null);
    }, [setMobilePageTitle, t.audit]);

    useEffect(() => {
        loadLogs();
    }, [activeTab]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            if (activeTab === 'activity') {
                const data = await fetchAuditLogs('activity');
                setActivityLogs(data as UserActivityLog[]);
            } else {
                const data = await fetchAuditLogs('edit');
                setEditLogs(data as EditLog[]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filterLogs = (logs: any[]) => {
        return logs.filter(log => {
            const logDate = new Date(log.Timestamp).toISOString().split('T')[0];
            const dateMatch = !selectedDate || logDate === selectedDate;
            const searchLower = searchTerm.toLowerCase();
            
            let searchMatch = false;
            
            if (activeTab === 'activity') {
                const l = log as UserActivityLog;
                searchMatch = !searchTerm || 
                    (l.User && l.User.toLowerCase().includes(searchLower)) ||
                    (l.Action && l.Action.toLowerCase().includes(searchLower)) ||
                    (l.Details && l.Details.toLowerCase().includes(searchLower));
            } else {
                const l = log as EditLog;
                searchMatch = !searchTerm ||
                    (l.OrderID && l.OrderID.toLowerCase().includes(searchLower)) ||
                    (l.Requester && l.Requester.toLowerCase().includes(searchLower)) ||
                    (l.Approver && l.Approver.toLowerCase().includes(searchLower)) ||
                    (l["Field Changed"] && l["Field Changed"].toLowerCase().includes(searchLower)) ||
                    (l["Old Value"] && String(l["Old Value"]).toLowerCase().includes(searchLower)) ||
                    (l["New Value"] && String(l["New Value"]).toLowerCase().includes(searchLower));
            }
            
            return dateMatch && searchMatch;
        });
    };

    const getActionColor = (action: string) => {
        const a = action.toUpperCase();
        if (a.includes('LOGIN')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (a.includes('DELETE')) return 'bg-red-500/10 text-red-400 border-red-500/20';
        if (a.includes('UPDATE') || a.includes('EDIT')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (a.includes('CREATE')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        return 'bg-gray-800 text-gray-400 border-gray-700';
    };

    const formatTime = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch(e) { return isoString; }
    };

    return (
        <div className="w-full max-w-[100rem] mx-auto p-4 lg:p-6 animate-fade-in space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-gray-800 text-gray-400 rounded-2xl border border-gray-700 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="hidden sm:flex text-2xl font-black text-white uppercase tracking-tighter italic items-center gap-3">
                            <span className="text-yellow-500">🛡️</span> {t.audit}
                        </h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Security & Data Integrity Log</p>
                    </div>
                </div>

                <div className="flex bg-gray-900 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setActiveTab('activity')} 
                        className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'activity' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {t.user_activity}
                    </button>
                    <button 
                        onClick={() => setActiveTab('edit')} 
                        className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'edit' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {t.edit_history}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-gray-900/40 p-4 rounded-2xl border border-white/5">
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">{t.search}</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder={t.search_placeholder} 
                            className="form-input !bg-gray-900 border-gray-800 !py-3 pl-10 rounded-xl"
                        />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">{t.date}</label>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)} 
                        className="form-input !bg-gray-900 border-gray-800 !py-3 rounded-xl w-full sm:w-auto"
                    />
                </div>
                <div className="flex items-end">
                    <button onClick={loadLogs} className="h-[46px] w-[46px] flex items-center justify-center bg-gray-800 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-gray-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px] relative">
                {loading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <Spinner size="lg" />
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#0f172a] border-b border-white/10 text-xs uppercase font-black text-gray-500 tracking-wider">
                            <tr>
                                <th className="p-4 w-28">{t.log_time}</th>
                                {activeTab === 'activity' ? (
                                    <>
                                        <th className="p-4 w-48">{t.log_user}</th>
                                        <th className="p-4 w-40">{t.log_action}</th>
                                        <th className="p-4">{t.log_details}</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-4 w-40">Order ID</th>
                                        <th className="p-4 w-32">{t.log_requester}</th>
                                        <th className="p-4 w-40">{t.log_field}</th>
                                        <th className="p-4 w-1/4">{t.log_old_value}</th>
                                        <th className="p-4 w-1/4">{t.log_new_value}</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {(activeTab === 'activity' ? filterLogs(activityLogs) : filterLogs(editLogs)).map((log, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-blue-400 font-bold whitespace-nowrap">{formatTime(log.Timestamp)}</td>
                                    
                                    {activeTab === 'activity' ? (
                                        <>
                                            <td className="p-4 font-bold text-white">{(log as UserActivityLog).User}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${(log as UserActivityLog).Action ? getActionColor((log as UserActivityLog).Action) : ''}`}>
                                                    {(log as UserActivityLog).Action}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-300">{(log as UserActivityLog).Details}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-4 font-mono text-orange-400 font-bold text-xs">
                                                {(log as EditLog).OrderID}
                                            </td>
                                            <td className="p-4 font-bold text-white text-xs">{(log as EditLog).Requester}</td>
                                            <td className="p-4 text-blue-300 font-bold text-xs">{(log as EditLog)["Field Changed"]}</td>
                                            <td className="p-4 text-red-300/80 text-xs font-mono break-all">
                                                {(log as EditLog)["Old Value"]}
                                            </td>
                                            <td className="p-4 text-emerald-300 text-xs font-mono break-all">
                                                {(log as EditLog)["New Value"]}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            
                            {(activeTab === 'activity' ? activityLogs : editLogs).length === 0 && !loading && (
                                <tr>
                                    <td colSpan={activeTab === 'activity' ? 4 : 6} className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest">
                                        {t.no_data}
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

export default AuditLogDashboard;

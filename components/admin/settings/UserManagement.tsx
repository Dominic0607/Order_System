
import React, { useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { AppContext } from '../../../context/AppContext';
import { WEB_APP_URL } from '../../../constants';
import { CacheService, CACHE_KEYS } from '../../../services/cacheService';
import { convertGoogleDriveUrl } from '../../../utils/fileUtils';
import { configSections, getArrayCaseInsensitive, getValueCaseInsensitive } from '../../../constants/settingsConfig';
import ConfigEditModal from './ConfigEditModal';
import Spinner from '../../common/Spinner';

const AVATAR_GRADIENTS = [
    'from-blue-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-violet-500 to-indigo-600',
    'from-cyan-500 to-blue-600',
    'from-amber-500 to-orange-600',
    'from-lime-500 to-green-600',
];

const RoleBadge: React.FC<{ value: string; isLightMode?: boolean }> = ({ value, isLightMode }) => (
    <div className="flex flex-wrap gap-1">
        {String(value).split(',').map((r, i) => r.trim() && (
            <span key={i} className={`px-2 py-0.5 text-[10px] font-black rounded-lg whitespace-nowrap border ${
                isLightMode 
                    ? 'bg-amber-50 text-amber-700 border-amber-200/60' 
                    : 'bg-[#fcd535]/10 text-[#fcd535] border-[#fcd535]/20'
            }`}>
                {r.trim()}
            </span>
        ))}
    </div>
);

const TeamBadge: React.FC<{ value: string; isLightMode?: boolean }> = ({ value, isLightMode }) => (
    <div className="flex flex-wrap gap-1">
        {String(value).split(',').map((tm, i) => tm.trim() && (
            <span key={i} className={`px-2 py-0.5 text-[10px] font-black rounded-lg whitespace-nowrap border ${
                isLightMode 
                    ? 'bg-blue-50 text-blue-600 border-blue-200/60' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
                {tm.trim()}
            </span>
        ))}
    </div>
);

const UserAvatar: React.FC<{ name: string; avatarUrl: string; gradientClass: string; isLightMode?: boolean }> = ({ name, avatarUrl, gradientClass, isLightMode }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const words = name.trim().split(/\s+/);
    const initials = (words.length >= 2
        ? words[0][0] + words[words.length - 1][0]
        : name.slice(0, 2)
    ).toUpperCase();

    if (avatarUrl && !imgFailed) {
        return (
            <img
                src={convertGoogleDriveUrl(avatarUrl)}
                className={`w-9 h-9 rounded-xl object-cover flex-shrink-0 border ${
                    isLightMode ? 'bg-slate-100 border-slate-200 shadow-sm' : 'bg-[#2b3139] border-[#3d4451]'
                }`}
                alt={name}
                onError={() => setImgFailed(true)}
            />
        );
    }
    return (
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-lg select-none`}>
            {initials || '?'}
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { appData, refreshData, showNotification, advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';
    const [searchQuery, setSearchQuery] = useState('');
    const [modal, setModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });
    const [isLoading, setIsLoading] = useState(false);
    const [localUsers, setLocalUsers] = useState<any[]>([]);
    const [fetchError, setFetchError] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    const userSection = configSections.find(s => s.id === 'users')!;

    // Fetch users: try appData first, fallback to direct API
    const loadUsers = useCallback(async (force = false) => {
        const fromAppData = getArrayCaseInsensitive(appData, 'users');
        if (!force && fromAppData.length > 0) {
            setLocalUsers(fromAppData);
            setFetchError(false);
            return;
        }
        setIsFetching(true);
        setFetchError(false);
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Retry up to 3 times for Render cold start
            let res: Response | null = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    res = await fetch(`${WEB_APP_URL}/api/users`, { headers });
                    if (res.status !== 503) break;
                } catch (e) {
                    if (attempt === 2) throw e;
                }
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            }
            if (res && res.ok) {
                const json = await res.json();
                if (json.status === 'success' && Array.isArray(json.data)) {
                    setLocalUsers(json.data);
                    return;
                }
            }
            // Fallback: use whatever appData has
            if (fromAppData.length > 0) {
                setLocalUsers(fromAppData);
            } else {
                setFetchError(true);
            }
        } catch (err) {
            const fromAppData2 = getArrayCaseInsensitive(appData, 'users');
            if (fromAppData2.length > 0) setLocalUsers(fromAppData2);
            else setFetchError(true);
        } finally {
            setIsFetching(false);
        }
    }, [appData]);

    // Load on mount
    useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync when appData updates externally (WebSocket push / refreshData call)
    useEffect(() => {
        const fromAppData = getArrayCaseInsensitive(appData, 'users');
        if (fromAppData.length > 0) setLocalUsers(fromAppData);
    }, [appData]);

    const allUsers: any[] = localUsers;

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return allUsers;
        const q = searchQuery.toLowerCase();
        return allUsers.filter(u =>
            String(getValueCaseInsensitive(u, 'FullName') || '').toLowerCase().includes(q) ||
            String(getValueCaseInsensitive(u, 'UserName') || '').toLowerCase().includes(q) ||
            String(getValueCaseInsensitive(u, 'Role') || '').toLowerCase().includes(q) ||
            String(getValueCaseInsensitive(u, 'Team') || '').toLowerCase().includes(q) ||
            String(getValueCaseInsensitive(u, 'TelegramUsername') || '').toLowerCase().includes(q)
        );
    }, [allUsers, searchQuery]);

    const handleRefresh = useCallback(async () => {
        await refreshData();
        await loadUsers(true);
    }, [refreshData, loadUsers]);

    const handleDelete = useCallback(async (user: any) => {
        const name = getValueCaseInsensitive(user, 'FullName') || getValueCaseInsensitive(user, 'UserName');
        if (!window.confirm(`តើអ្នកប្រាកដទេថាចង់លុប "${name}"?`)) return;
        setIsLoading(true);
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token;
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${WEB_APP_URL}/api/admin/delete-row`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ sheetName: 'Users', primaryKey: { UserName: getValueCaseInsensitive(user, 'UserName') } })
            });
            const result = await res.json();
            if (res.ok && result.status === 'success') {
                showNotification('លុបបានជោគជ័យ', 'success');
                await refreshData();
            } else {
                throw new Error(result.message || 'Delete failed');
            }
        } catch (err: any) {
            showNotification(`លុបមិនបានសម្រេច: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [refreshData, showNotification]);

    // Stats
    const adminCount = allUsers.filter(u => getValueCaseInsensitive(u, 'IsSystemAdmin')).length;
    const teamsCount = new Set(allUsers.map(u => getValueCaseInsensitive(u, 'Team')).filter(Boolean)).size;

    return (
        <div className="flex flex-col h-full gap-4">

            {/* ── Stats Cards ─────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                <div className={`rounded-2xl p-4 border transition-all ${isLightMode ? 'bg-white border-slate-200 shadow-sm shadow-slate-100/40' : 'bg-[#1e2329] border-[#2b3139]'}`}>
                    <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-slate-400' : 'text-[#848e9c]'}`}>អ្នកប្រើប្រាស់សរុប</p>
                    <p className={`text-3xl font-black mt-1 ${isLightMode ? 'text-slate-800' : 'text-[#eaecef]'}`}>{allUsers.length}</p>
                    <p className={`text-[10px] mt-1 font-bold ${isLightMode ? 'text-slate-500' : 'text-[#5e6673]'}`}>Total Accounts</p>
                </div>
                <div className={`rounded-2xl p-4 border transition-all ${isLightMode ? 'bg-white border-blue-200 shadow-sm shadow-blue-50/20' : 'bg-[#1e2329] border-[#fcd535]/20'}`}>
                    <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-blue-600' : 'text-[#fcd535]'}`}>System Admins</p>
                    <p className={`text-3xl font-black mt-1 ${isLightMode ? 'text-blue-600' : 'text-[#fcd535]'}`}>{adminCount}</p>
                    <p className={`text-[10px] mt-1 font-bold ${isLightMode ? 'text-blue-500/70' : 'text-[#5e6673]'}`}>Full Access</p>
                </div>
                <div className={`rounded-2xl p-4 border transition-all ${isLightMode ? 'bg-white border-slate-200 shadow-sm shadow-slate-100/40' : 'bg-[#1e2329] border-[#2b3139]'}`}>
                    <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-slate-400' : 'text-[#848e9c]'}`}>ចំនួនក្រុម</p>
                    <p className={`text-3xl font-black mt-1 ${isLightMode ? 'text-slate-800' : 'text-[#eaecef]'}`}>{teamsCount}</p>
                    <p className={`text-[10px] mt-1 font-bold ${isLightMode ? 'text-slate-500' : 'text-[#5e6673]'}`}>Active Teams</p>
                </div>
            </div>

            {/* ── Toolbar ──────────────────────────────────── */}
            <div className="flex gap-3 flex-shrink-0">
                <div className="relative flex-grow">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? 'text-slate-400' : 'text-[#848e9c]'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="ស្វែងរកតាមឈ្មោះ, Username, Role, ក្រុម, Telegram..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full py-3 pl-11 pr-4 border rounded-2xl text-sm font-bold outline-none transition-all ${
                            isLightMode 
                                ? 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500/50 shadow-sm shadow-slate-100/40' 
                                : 'bg-[#1e2329] border-[#2b3139] text-[#eaecef] placeholder:text-[#5e6673] focus:border-[#fcd535]/40'
                        }`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-[#848e9c] hover:text-[#eaecef]'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isFetching}
                    className={`p-3 border rounded-2xl transition-all disabled:opacity-50 ${
                        isLightMode 
                            ? 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 shadow-sm shadow-slate-100/40' 
                            : 'bg-[#1e2329] border-[#2b3139] text-[#848e9c] hover:text-[#eaecef] hover:border-[#3d4451]'
                    }`}
                    title="Refresh"
                >
                    <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={2} />
                    </svg>
                </button>
                <button
                    onClick={() => setModal({ isOpen: true, item: null })}
                    className="px-6 py-3 bg-[#fcd535] text-black rounded-2xl font-black text-sm hover:bg-[#f0c832] transition-all whitespace-nowrap active:scale-95 shadow-lg shadow-[#fcd535]/10"
                >
                    + បន្ថែម
                </button>
            </div>

            {/* ── Desktop Table ─────────────────────────────── */}
            <div className={`hidden md:flex border rounded-3xl overflow-hidden flex-col flex-grow relative ${
                isLightMode 
                    ? 'bg-white border-slate-200 shadow-sm shadow-slate-100/40' 
                    : 'bg-[#1e2329] border-[#2b3139]'
            }`}>
                {isLoading && (
                    <div className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm rounded-3xl ${
                        isLightMode ? 'bg-white/70' : 'bg-[#181a20]/70'
                    }`}>
                        <Spinner size="lg" />
                    </div>
                )}
                <div className="overflow-y-auto no-scrollbar flex-grow overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                        <thead>
                            <tr className={`border-b sticky top-0 z-10 ${
                                isLightMode ? 'bg-slate-50/90 border-slate-200 text-slate-800' : 'bg-[#181a20]/80 border-b border-[#2b3139]'
                            }`}>
                                <th className={`w-12 py-3.5 text-center text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>#</th>
                                <th className={`py-3.5 px-4 text-left text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>អ្នកប្រើប្រាស់</th>
                                <th className={`py-3.5 px-4 text-left text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>Username</th>
                                <th className={`py-3.5 px-4 text-left text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>តួនាទី</th>
                                <th className={`py-3.5 px-4 text-left text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>ក្រុម</th>
                                <th className={`py-3.5 px-4 text-left text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>Telegram</th>
                                <th className={`py-3.5 px-4 text-center text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>Admin</th>
                                <th className={`w-28 py-3.5 text-center text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isFetching ? (
                                <tr><td colSpan={8} className="py-20 text-center"><Spinner size="lg" /></td></tr>
                            ) : fetchError ? (
                                <tr><td colSpan={8} className="py-20 text-center">
                                    <p className={`font-bold mb-3 ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>មានបញ្ហាក្នុងការទាញទិន្នន័យ</p>
                                    <button onClick={() => loadUsers(true)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                        isLightMode 
                                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                            : 'bg-[#2b3139] text-[#eaecef] hover:bg-[#3d4451]'
                                    }`}>
                                        ចុចដើម្បីសាកល្បងម្ដងទៀត
                                    </button>
                                </td></tr>
                            ) : filteredUsers.length > 0 ? filteredUsers.map((user: any, idx: number) => {
                                const fullName  = String(getValueCaseInsensitive(user, 'FullName') || '');
                                const userName  = String(getValueCaseInsensitive(user, 'UserName') || '');
                                const role      = String(getValueCaseInsensitive(user, 'Role') || '');
                                const team      = String(getValueCaseInsensitive(user, 'Team') || '');
                                const avatar    = String(getValueCaseInsensitive(user, 'ProfilePictureURL') || '');
                                const isAdmin   = Boolean(getValueCaseInsensitive(user, 'IsSystemAdmin'));
                                const telegram  = String(getValueCaseInsensitive(user, 'TelegramUsername') || '');
                                const gradient  = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

                                return (
                                    <tr key={idx} className={`border-b hover:bg-blue-600/5 transition-colors group ${
                                        isLightMode ? 'border-slate-100' : 'border-[#2b3139]/50 hover:bg-[#2b3139]/25'
                                    }`}>
                                        <td className={`py-3.5 text-center font-bold text-xs ${isLightMode ? 'text-slate-400' : 'text-[#848e9c]'}`}>{idx + 1}</td>

                                        {/* Full Name + Avatar */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={fullName} avatarUrl={avatar} gradientClass={gradient} isLightMode={isLightMode} />
                                                <div className="min-w-0">
                                                    <p className={`font-bold text-sm truncate ${isLightMode ? 'text-slate-800' : 'text-[#eaecef]'}`}>{fullName || '—'}</p>
                                                    {isAdmin && (
                                                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${isLightMode ? 'text-blue-600' : 'text-[#fcd535]'}`}>System Admin</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Username */}
                                        <td className="py-3.5 px-4">
                                            <code className={`text-sm px-2 py-0.5 rounded-lg font-mono ${
                                                isLightMode ? 'text-slate-600 bg-slate-100' : 'text-[#848e9c] bg-[#2b3139]'
                                            }`}>
                                                {userName || '—'}
                                            </code>
                                        </td>

                                        {/* Role badges */}
                                        <td className="py-3.5 px-4">
                                            {role ? <RoleBadge value={role} isLightMode={isLightMode} /> : <span className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-[#5e6673]'}`}>—</span>}
                                        </td>

                                        {/* Team badges */}
                                        <td className="py-3.5 px-4">
                                            {team ? <TeamBadge value={team} isLightMode={isLightMode} /> : <span className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-[#5e6673]'}`}>—</span>}
                                        </td>

                                        {/* Telegram */}
                                        <td className="py-3.5 px-4">
                                            {telegram
                                                ? <span className={`text-sm font-mono ${isLightMode ? 'text-blue-600' : 'text-blue-300'}`}>@{telegram}</span>
                                                : <span className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-[#5e6673]'}`}>—</span>
                                            }
                                        </td>

                                        {/* Admin badge */}
                                        <td className="py-3.5 px-4 text-center">
                                            {isAdmin
                                                ? <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border whitespace-nowrap ${isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#fcd535]/10 text-[#fcd535] border-[#fcd535]/30'}`}>✦ ADMIN</span>
                                                : <span className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-[#5e6673]'}`}>—</span>
                                            }
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setModal({ isOpen: true, item: user })}
                                                    className={`p-2 rounded-lg transition-all ${
                                                        isLightMode 
                                                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white' 
                                                            : 'bg-[#fcd535]/10 text-[#fcd535] hover:bg-[#fcd535] hover:text-black'
                                                    }`}
                                                    title="កែសម្រួល"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2} /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className={`p-2 rounded-lg transition-all ${
                                                        isLightMode 
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white' 
                                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                                                    }`}
                                                    title="លុប"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} className={`py-20 text-center font-bold ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>
                                        {searchQuery ? `រកមិនឃើញអ្នកប្រើប្រាស់ "${searchQuery}"` : 'មិនទាន់មានអ្នកប្រើប្រាស់ត្រូវបានបន្ថែម'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Footer count */}
                <div className={`px-5 py-2.5 flex-shrink-0 ${
                    isLightMode ? 'border-t border-slate-200 bg-slate-50/50' : 'border-t border-[#2b3139] bg-[#181a20]/50'
                }`}>
                    <p className={`text-[11px] font-bold ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>
                        បង្ហាញ {filteredUsers.length} / {allUsers.length} នាក់
                        {searchQuery && ` · ស្វែងរក "${searchQuery}"`}
                    </p>
                </div>
            </div>

            {/* ── Mobile Cards ──────────────────────────────── */}
            <div className="md:hidden flex flex-col flex-grow overflow-y-auto no-scrollbar gap-3 pb-20 relative">
                {isLoading && (
                    <div className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${
                        isLightMode ? 'bg-white/70' : 'bg-[#181a20]/70'
                    }`}>
                        <Spinner size="lg" />
                    </div>
                )}
                {isFetching ? (
                    <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
                ) : fetchError ? (
                    <div className="py-20 text-center">
                        <p className={`font-bold mb-3 ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>មានបញ្ហាក្នុងការទាញទិន្នន័យ</p>
                        <button onClick={() => loadUsers(true)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            isLightMode 
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                : 'bg-[#2b3139] text-[#eaecef] hover:bg-[#3d4451]'
                        }`}>
                            ចុចដើម្បីសាកល្បងម្ដងទៀត
                        </button>
                    </div>
                ) : filteredUsers.length > 0 ? filteredUsers.map((user: any, idx: number) => {
                    const fullName  = String(getValueCaseInsensitive(user, 'FullName') || '');
                    const userName  = String(getValueCaseInsensitive(user, 'UserName') || '');
                    const role      = String(getValueCaseInsensitive(user, 'Role') || '');
                    const team      = String(getValueCaseInsensitive(user, 'Team') || '');
                    const avatar    = String(getValueCaseInsensitive(user, 'ProfilePictureURL') || '');
                    const isAdmin   = Boolean(getValueCaseInsensitive(user, 'IsSystemAdmin'));
                    const telegram  = String(getValueCaseInsensitive(user, 'TelegramUsername') || '');
                    const gradient  = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

                    return (
                        <div key={idx} className={`border rounded-2xl p-4 ${
                            isLightMode ? 'bg-white border-slate-200 shadow-sm shadow-slate-100/40' : 'bg-[#1e2329] border-[#2b3139]'
                        }`}>
                            <div className="flex items-start gap-3">
                                <UserAvatar name={fullName} avatarUrl={avatar} gradientClass={gradient} isLightMode={isLightMode} />
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`font-black text-sm truncate ${isLightMode ? 'text-slate-800' : 'text-[#eaecef]'}`}>{fullName || '—'}</p>
                                        {isAdmin && (
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg border whitespace-nowrap flex-shrink-0 ${isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#fcd535]/10 text-[#fcd535] border-[#fcd535]/30'}`}>✦ ADMIN</span>
                                        )}
                                    </div>
                                    <code className={`text-[11px] font-mono ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>{userName}</code>
                                    {role && <div className="mt-2"><RoleBadge value={role} isLightMode={isLightMode} /></div>}
                                    {team && <div className="mt-1"><TeamBadge value={team} isLightMode={isLightMode} /></div>}
                                    {telegram && (
                                        <p className={`mt-1.5 text-[11px] font-mono ${isLightMode ? 'text-blue-600' : 'text-blue-300'}`}>@{telegram}</p>
                                    )}
                                </div>
                            </div>
                            <div className={`flex gap-2 mt-3 border-t pt-3 ${isLightMode ? 'border-slate-100' : 'border-[#2b3139]'}`}>
                                <button
                                    onClick={() => setModal({ isOpen: true, item: user })}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                                        isLightMode 
                                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white' 
                                            : 'bg-[#fcd535]/10 text-[#fcd535] hover:bg-[#fcd535] hover:text-black'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2} /></svg>
                                    កែសម្រួល
                                </button>
                                <button
                                    onClick={() => handleDelete(user)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                                        isLightMode 
                                            ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white' 
                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} /></svg>
                                    លុប
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className={`py-20 text-center font-bold ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>
                        {searchQuery ? `រកមិនឃើញ "${searchQuery}"` : 'មិនទាន់មានអ្នកប្រើប្រាស់'}
                    </div>
                )}
            </div>

            {/* ── Modal ───────────────────────────────────── */}
            {modal.isOpen && (
                <ConfigEditModal
                    section={userSection}
                    item={modal.item}
                    onClose={() => setModal({ isOpen: false, item: null })}
                    onSave={() => { setModal({ isOpen: false, item: null }); refreshData(); }}
                />
            )}
        </div>
    );
};

export default UserManagement;


import React from 'react';
import { User } from '../../types';
import UserAvatar from '../common/UserAvatar';

interface ChatMembersProps {
    users: User[];
    loading: boolean;
    onRefresh: () => void;
    currentUsername?: string;
    onCallUser?: (user: User) => void;
    onVideoCallUser?: (user: User) => void;
}

const ChatMembers: React.FC<ChatMembersProps> = ({ users, loading, onRefresh, currentUsername, onCallUser, onVideoCallUser }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-500">Loading members...</span>
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                <p className="text-xs uppercase tracking-widest mb-2">(No members found)</p>
                <button 
                    onClick={onRefresh}
                    className="text-[10px] text-blue-400 hover:text-white underline"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-2.5 animate-fade-in">
            {users.map(u => {
                const isMe = u.UserName === currentUsername;
                const roleLower = (u.Role || '').toLowerCase();
                const isRoleAdmin = roleLower === 'admin';
                const isRoleSales = roleLower === 'sales';
                const isRoleFulfillment = roleLower === 'fulfillment';

                return (
                    <div 
                        key={u.UserName} 
                        className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0f172a]/45 border border-white/5 hover:bg-[#1e293b]/70 hover:border-white/10 hover:-translate-y-0.5 transition-all duration-300 shadow-md shadow-black/10 group"
                    >
                        {/* Avatar with absolute status dot */}
                        <div className="relative shrink-0">
                            <UserAvatar 
                                avatarUrl={u.ProfilePictureURL} 
                                name={u.FullName} 
                                size="md" 
                                className="ring-2 ring-white/5 group-hover:ring-blue-500/30 transition-all duration-300" 
                            />
                            <span 
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#020617] ${
                                    u.IsSystemAdmin 
                                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                                        : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                }`} 
                                title={u.IsSystemAdmin ? 'System Admin' : 'Online'}
                            />
                        </div>

                        {/* Name and Username/Role details */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors truncate">
                                {u.FullName}
                                {isMe && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-black uppercase tracking-wider">Me</span>}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] text-blue-400/90 font-semibold font-mono tracking-tight">@{u.UserName}</span>
                                {u.Role && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-slate-800 shrink-0" />
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border shrink-0 ${
                                            isRoleAdmin 
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                : isRoleSales
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : isRoleFulfillment
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        }`}>
                                            {u.Role}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Actions — hidden for self */}
                        {!isMe && (
                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                {/* Video Call */}
                                {onVideoCallUser && (
                                    <button
                                        onClick={() => onVideoCallUser(u)}
                                        id={`video-call-user-${u.UserName}`}
                                        title={`Video call ${u.FullName}`}
                                        className="w-8 h-8 rounded-xl bg-purple-500/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/10 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-md hover:shadow-purple-500/20 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/>
                                        </svg>
                                    </button>
                                )}

                                {/* Voice Call */}
                                {onCallUser && (
                                    <button
                                        onClick={() => onCallUser(u)}
                                        id={`call-user-${u.UserName}`}
                                        title={`Call ${u.FullName}`}
                                        className="w-8 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/10 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-md hover:shadow-emerald-500/20 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ChatMembers;

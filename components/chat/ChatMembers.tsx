
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
        <div className="p-4 space-y-3 animate-fade-in">
            {users.map(u => {
                const isMe = u.UserName === currentUsername;
                return (
                    <div key={u.UserName} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-800/40 border border-white/5 hover:bg-gray-800/70 transition-colors group">
                        <UserAvatar avatarUrl={u.ProfilePictureURL} name={u.FullName} size="md" className="ring-2 ring-blue-500/20 group-hover:ring-blue-500/50 transition-all" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{u.FullName}</p>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider truncate">
                                @{u.UserName} {u.Role && `· ${u.Role}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Status dot */}
                            <div className={`w-2 h-2 rounded-full ${u.IsSystemAdmin ? 'bg-yellow-500 shadow-[0_0_5px_#eab308]' : 'bg-blue-500 shadow-[0_0_5px_#3b82f6]'}`}></div>
                            
                            {/* Video call button — hidden for self */}
                            {!isMe && onVideoCallUser && (
                                <button
                                    onClick={() => onVideoCallUser(u)}
                                    id={`video-call-user-${u.UserName}`}
                                    title={`Video call ${u.FullName}`}
                                    className="w-8 h-8 rounded-xl bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white flex items-center justify-center transition-all active:scale-90 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-purple-500/30"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/>
                                    </svg>
                                </button>
                            )}

                            {/* Voice call button — hidden for self */}
                            {!isMe && onCallUser && (
                                <button
                                    onClick={() => onCallUser(u)}
                                    id={`call-user-${u.UserName}`}
                                    title={`Call ${u.FullName}`}
                                    className="w-8 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white flex items-center justify-center transition-all active:scale-90 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-emerald-500/30"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ChatMembers;

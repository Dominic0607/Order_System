
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import EditProfileModal from './EditProfileModal';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import UserAvatar from './UserAvatar';
import { APP_LOGO_URL } from '../../constants';
import Spinner from './Spinner';

interface HeaderProps {
    onBackToRoleSelect: () => void;
    appState: string;
}

const Header: React.FC<HeaderProps> = ({ onBackToRoleSelect, appState }) => {
    const { currentUser, logout, refreshData, originalAdminUser, previewImage, setIsChatOpen, unreadCount } = useContext(AppContext);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isSystemAdmin = !!currentUser?.IsSystemAdmin;
    const isHybridAdmin = isSystemAdmin && (currentUser?.Team || '').split(',').map(t => t.trim()).filter(Boolean).length > 0;
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleHomeClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isSystemAdmin) return;
        try {
            const params = new URLSearchParams();
            params.set('view', 'admin_dashboard');
            params.set('tab', 'admin');
            params.set('subview', 'dashboard');
            const newUrl = window.location.pathname + '?' + params.toString();
            window.history.pushState(null, '', newUrl);
            window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
        } catch (err) {
            console.warn("Navigation failed:", err);
            window.location.reload();
        }
    };

    if (!currentUser) return null;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-2xl border-b border-white/5 z-[60] p-2 sm:p-4 shadow-2xl transition-all duration-300"
                    style={originalAdminUser ? { top: '40px' } : {}}>
                <div className="w-full max-w-full mx-auto flex justify-between items-center px-1 sm:px-6">
                    {/* Branding Section */}
                    <div 
                        className={`flex items-center gap-2 sm:gap-4 select-none ${isSystemAdmin ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all transform' : 'cursor-default'}`}
                        onClick={handleHomeClick}
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl overflow-hidden flex-shrink-0 relative group">
                            <img 
                                src={convertGoogleDriveUrl(APP_LOGO_URL)} 
                                alt="Logo" 
                                className="w-full h-full object-contain p-1.5 relative z-10"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[11px] sm:text-lg font-black text-white leading-tight truncate uppercase tracking-tighter sm:tracking-normal italic">
                                O-SYSTEM
                            </h1>
                            <p className="text-[8px] sm:text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] opacity-80">
                                CORE ENGINE
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="hidden md:block text-right mr-2">
                            <p className="font-black text-white text-sm truncate">{currentUser.FullName}</p>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-70">{currentUser.Role}</p>
                        </div>
                        
                        <UserAvatar 
                            avatarUrl={currentUser.ProfilePictureURL}
                            name={currentUser.FullName}
                            className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-white/10 shadow-xl"
                            onClick={() => previewImage(convertGoogleDriveUrl(currentUser.ProfilePictureURL) || '')}
                        />

                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="p-2 sm:p-2.5 rounded-xl bg-gray-800 border border-white/10 hover:bg-gray-700 text-gray-400 hover:text-white transition-all active:scale-90 shadow-md">
                                <svg className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-4 w-64 bg-gray-800 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] py-2 z-50 animate-fade-in-scale backdrop-blur-xl">
                                    <div className="px-4 py-3 border-b border-white/5 mb-2 md:hidden">
                                        <p className="font-bold text-white text-sm truncate">{currentUser.FullName}</p>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{currentUser.Role}</p>
                                    </div>
                                    <button onClick={() => { setEditProfileModalOpen(true); setDropdownOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-3">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        កែសម្រួល Profile
                                    </button>
                                    <button onClick={async (e) => {
                                        setIsRefreshing(true);
                                        try {
                                            await refreshData();
                                            window.location.reload();
                                        } catch (err) { setIsRefreshing(false); }
                                    }} className="w-full text-left px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-700 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            ទាញទិន្នន័យថ្មី
                                        </div>
                                        {isRefreshing && <Spinner size="sm" />}
                                    </button>
                                    {isHybridAdmin && !originalAdminUser && (
                                         <button onClick={() => { onBackToRoleSelect(); setDropdownOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-700 transition-colors border-t border-white/5 mt-2 flex items-center gap-3">
                                            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                            ប្តូរតួនាទី
                                         </button>
                                    )}
                                    <button onClick={logout} className="w-full text-left px-5 py-3 text-sm font-black text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5 mt-2 flex items-center gap-3">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        ចាកចេញ
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Chat Button - Moved to the Far Right Position */}
                        <button 
                            onClick={() => setIsChatOpen(true)}
                            className="relative p-2 sm:p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-md"
                            aria-label="Open Chat"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-gray-900 animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>
            {editProfileModalOpen && <EditProfileModal onClose={() => setEditProfileModalOpen(false)} />}
        </>
    );
};

export default Header;

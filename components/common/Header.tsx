
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
    const { currentUser, logout, refreshData, originalAdminUser, previewImage } = useContext(AppContext);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
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

    const tooltipText = isSystemAdmin ? "ត្រឡប់ទៅផ្ទាំង Admin Dashboard" : "";

    return (
        <>
            <header className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-2xl border-b border-gray-800 z-[60] p-2 sm:p-4 shadow-2xl transition-all duration-300"
                    style={originalAdminUser ? { top: '40px' } : {}}>
                <div className="w-full max-w-full mx-auto flex justify-between items-center px-1 sm:px-6">
                    {/* Branding Section - Enlarged */}
                    <div 
                        className={`flex items-center gap-3 sm:gap-5 select-none ${isSystemAdmin ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all transform' : 'cursor-default'}`}
                        onClick={handleHomeClick}
                        title={tooltipText}
                    >
                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gray-800 rounded-2xl flex items-center justify-center border-2 border-gray-700 shadow-xl overflow-hidden flex-shrink-0 relative group">
                            <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors"></div>
                            {APP_LOGO_URL ? (
                                <img 
                                    src={convertGoogleDriveUrl(APP_LOGO_URL)} 
                                    alt="Logo" 
                                    className="w-full h-full object-contain p-1.5 relative z-10"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <svg className="w-7 h-7 text-blue-500 relative z-10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9H15V3H9V9H5L12 16L19 9ZM5 18V20H19V18H5Z"/></svg>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-xl font-black text-white leading-tight truncate uppercase tracking-tighter sm:tracking-normal">
                                កម្មវិធីទម្លាក់ការកម្មង់
                            </h1>
                            <p className="text-[9px] sm:text-xs text-blue-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 opacity-90">
                                ORDER MANAGEMENT
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-5">
                        {showSuccessToast && (
                            <div className="hidden lg:flex items-center bg-green-500/20 text-green-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/30 animate-fade-in">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                DATA REFRESHED
                            </div>
                        )}

                        <div className="text-right hidden md:block">
                            <p className="font-black text-white text-sm truncate">{currentUser.FullName}</p>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-70 mt-0.5">{currentUser.Role}</p>
                        </div>
                        
                        <UserAvatar 
                            avatarUrl={currentUser.ProfilePictureURL}
                            name={currentUser.FullName}
                            className="w-9 h-9 sm:w-12 sm:h-12 border-2 border-blue-600/40 shadow-xl hover:scale-105 transition-transform"
                            onClick={() => previewImage(convertGoogleDriveUrl(currentUser.ProfilePictureURL) || '')}
                        />

                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="p-2 sm:p-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-white transition-all shadow-md active:scale-90">
                                <svg className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-4 w-64 bg-gray-800 border border-gray-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 z-50 animate-fade-in-scale backdrop-blur-xl">
                                    <div className="px-4 py-3 border-b border-gray-700 mb-2 md:hidden">
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
                                            // បន្ទាប់ពីសម្អាត Cache រួច ធ្វើការ Refresh ទំព័រទាំងមូល
                                            window.location.reload();
                                        } catch (err) { 
                                            console.error("Refresh failed:", err);
                                            setIsRefreshing(false); 
                                        }
                                    }} className="w-full text-left px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-700 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            ទាញទិន្នន័យថ្មី
                                        </div>
                                        {isRefreshing && <Spinner size="sm" />}
                                    </button>
                                    {isHybridAdmin && !originalAdminUser && (
                                         <button onClick={() => { onBackToRoleSelect(); setDropdownOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-700 transition-colors border-t border-gray-700 mt-2 flex items-center gap-3">
                                            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                            ប្តូរតួនាទី
                                         </button>
                                    )}
                                    <button onClick={logout} className="w-full text-left px-5 py-3 text-sm font-black text-red-400 hover:bg-red-500/10 transition-colors border-t border-gray-700 mt-2 flex items-center gap-3">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        ចាកចេញ
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            {editProfileModalOpen && <EditProfileModal onClose={() => setEditProfileModalOpen(false)} />}
        </>
    );
};

export default Header;

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { User, AppData } from './types';
import { WEB_APP_URL } from './constants';
import { useUrlState } from './hooks/useUrlState';
import Spinner from './components/common/Spinner';
import Modal from './components/common/Modal';
import { AppContext } from './context/AppContext';
import BackgroundMusic from './components/common/BackgroundMusic';

// Lazy load pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RoleSelectionPage = React.lazy(() => import('./pages/RoleSelectionPage'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const UserJourney = React.lazy(() => import('./pages/UserJourney'));
const Header = React.lazy(() => import('./components/common/Header'));
const ImpersonationBanner = React.lazy(() => import('./components/common/ImpersonationBanner'));
const ChatWidget = React.lazy(() => import('./components/chat/ChatWidget'));

const initialAppData: AppData = {
    users: [],
    products: [],
    pages: [],
    locations: [],
    shippingMethods: [],
    drivers: [],
    bankAccounts: [],
    phoneCarriers: [],
    colors: [],
    stores: [],
    settings: [],
    targets: []
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [originalAdminUser, setOriginalAdminUser] = useState<User | null>(null);
    const [appData, setAppData] = useState<AppData>(initialAppData);
    const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    const [appState, setAppState] = useUrlState<'login' | 'role_selection' | 'admin_dashboard' | 'user_journey'>('view', 'login');
    
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatVisible, setChatVisible] = useState(true);

    // Mouse Tracking for Flare Light Effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            document.documentElement.style.setProperty('--x', `${e.clientX}px`);
            document.documentElement.style.setProperty('--y', `${e.clientY}px`);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Listen to screen resize to handle responsive Header visibility
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const sessionString = localStorage.getItem('orderAppSession');
        if (sessionString) {
            try {
                const session = JSON.parse(sessionString);
                if (session.user) {
                    setCurrentUser(session.user);
                    if (appState === 'login') {
                        determineAppState(session.user);
                    }
                }
            } catch (e) {
                localStorage.removeItem('orderAppSession');
            }
        }
    }, []);

    const fetchData = useCallback(async (force = false) => {
        const cacheKey = 'appDataCache';
        if (!force) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    // Updated: Cache duration set to 5 minutes to match backend cache logic
                    if (Date.now() - timestamp < 5 * 60 * 1000) { 
                        setAppData(data);
                        return;
                    }
                } catch (e) {}
            }
        }

        try {
            const response = await fetch(`${WEB_APP_URL}/api/static-data`);
            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success') {
                    // Data Normalization: Ensure keys match interface regardless of backend casing
                    const rawData = result.data || {};
                    const normalized: AppData = {
                        ...initialAppData,
                        ...rawData,
                        // Handle potential casing differences or missing keys
                        pages: rawData.pages || rawData.TeamsPages || rawData.teamsPages || [],
                        users: rawData.users || rawData.Users || [],
                        products: rawData.products || rawData.Products || [],
                        // Explicitly capture Stores data
                        stores: rawData.stores || rawData.Stores || [], 
                        // Settings might come as an array or object, frontend types expect any
                        settings: rawData.settings || rawData.Settings || {}, 
                        
                        shippingMethods: rawData.shippingMethods || rawData.ShippingMethods || [],
                        bankAccounts: rawData.bankAccounts || rawData.BankAccounts || [],
                        drivers: rawData.drivers || rawData.Drivers || [],
                    };
                    
                    setAppData(normalized);
                    localStorage.setItem(cacheKey, JSON.stringify({ data: normalized, timestamp: Date.now() }));
                }
            }
        } catch (e) {
            console.error("Critical Data Fetch Error:", e);
        }
    }, []);

    const determineAppState = useCallback((user: User) => {
        const teams = (user.Team || '').split(',').map(t => t.trim()).filter(Boolean);
        if (user.IsSystemAdmin) {
            if (teams.length > 0) setAppState('role_selection');
            else setAppState('admin_dashboard');
        } else {
            setAppState('user_journey');
        }
    }, [setAppState]);

    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser, fetchData]);

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('orderAppSession', JSON.stringify({ user, timestamp: Date.now() }));
        determineAppState(user);
    };

    const logout = () => {
        setCurrentUser(null);
        setAppState('login');
        localStorage.removeItem('orderAppSession');
        localStorage.removeItem('appDataCache');
    };

    const refreshData = async () => {
        localStorage.removeItem('appDataCache');
        await fetchData(true);
        setRefreshTimestamp(Date.now());
    };

    // Header logic: Show ALWAYS on User views, but ONLY on Mobile for Admin view
    const shouldShowHeader = useMemo(() => {
        if (appState !== 'admin_dashboard') return true;
        return isMobile; 
    }, [appState, isMobile]);

    // Container width logic: Full for Admin and Role Selection, centered container for User Journey
    const containerClass = useMemo(() => {
        if (appState === 'admin_dashboard' || appState === 'role_selection') return 'w-full';
        return 'container mx-auto px-4';
    }, [appState]);

    // Padding logic: No top padding for Role Selection to ensure 100vh height fits perfectly
    const paddingClass = useMemo(() => {
        if (appState === 'role_selection') return 'pt-0 pb-0';
        return `${shouldShowHeader ? (originalAdminUser ? 'pt-24' : 'pt-20') : 'pt-0'} pb-24 md:pb-8`;
    }, [appState, shouldShowHeader, originalAdminUser]);

    return (
        <AppContext.Provider value={{
            currentUser, appData, login, logout, refreshData, refreshTimestamp,
            originalAdminUser, returnToAdmin: () => {}, previewImage: (u) => setPreviewImageUrl(u),
            updateCurrentUser: (d) => currentUser && setCurrentUser({ ...currentUser, ...d }),
            setUnreadCount, updateProductInData: () => {}, apiKey: '',
            setAppState, setOriginalAdminUser, fetchData, setCurrentUser, setChatVisibility: setChatVisible,
            isSidebarCollapsed, setIsSidebarCollapsed
        }}>
            <div className={`min-h-screen relative z-10 ${originalAdminUser ? 'impersonating' : ''}`}>
                <BackgroundMusic />
                
                <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
                    {currentUser && appState !== 'login' ? (
                        <>
                            {originalAdminUser && <ImpersonationBanner />}
                            
                            {shouldShowHeader && (
                                <Header appState={appState} onBackToRoleSelect={() => setAppState('role_selection')} />
                            )}
                            
                            <main className={`${containerClass} ${paddingClass} transition-all duration-300`}>
                                {appState === 'admin_dashboard' && <AdminDashboard />}
                                {appState === 'user_journey' && <UserJourney onBackToRoleSelect={() => setAppState('role_selection')} />}
                                {appState === 'role_selection' && <RoleSelectionPage onSelect={(s) => setAppState(s as any)} />}
                            </main>

                            {isChatVisible && (
                                <button 
                                    onClick={() => setIsChatOpen(true)}
                                    className="chat-fab group"
                                    aria-label="Open Chat"
                                >
                                    <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                                </button>
                            )}
                            <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                        </>
                    ) : (
                        <LoginPage />
                    )}
                </Suspense>

                {previewImageUrl && (
                    <Modal isOpen={true} onClose={() => setPreviewImageUrl(null)} maxWidth="max-w-4xl">
                        <div className="relative group">
                            <img src={previewImageUrl} className="max-h-[85vh] w-full mx-auto object-contain rounded-xl shadow-2xl" alt="Preview" />
                            <button 
                                onClick={() => setPreviewImageUrl(null)}
                                className="absolute -top-4 -right-4 bg-gray-900 text-white rounded-full p-2 border border-gray-700 hover:bg-red-600 transition-colors shadow-xl"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </Modal>
                )}
            </div>
        </AppContext.Provider>
    );
};

export default App;
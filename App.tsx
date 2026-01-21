
import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { User, AppData } from './types';
import { WEB_APP_URL } from './constants';
import { useUrlState } from './hooks/useUrlState';
import Spinner from './components/common/Spinner';
import Modal from './components/common/Modal';
import { AppContext, Language } from './context/AppContext';
import BackgroundMusic from './components/common/BackgroundMusic';
import { CacheService, CACHE_KEYS } from './services/cacheService';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RoleSelectionPage = React.lazy(() => import('./pages/RoleSelectionPage'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const UserJourney = React.lazy(() => import('./pages/UserJourney'));
const Header = React.lazy(() => import('./components/common/Header'));
const ImpersonationBanner = React.lazy(() => import('./components/common/ImpersonationBanner'));
const ChatWidget = React.lazy(() => import('./components/chat/ChatWidget'));

const initialAppData: AppData = {
    users: [], products: [], pages: [], locations: [],
    shippingMethods: [], drivers: [], bankAccounts: [],
    phoneCarriers: [], colors: [], stores: [], settings: [], targets: []
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [originalAdminUser, setOriginalAdminUser] = useState<User | null>(null);
    const [appData, setAppData] = useState<AppData>(initialAppData);
    const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('appLanguage') as Language) || 'en');
    const [appState, setAppState] = useUrlState<'login' | 'role_selection' | 'admin_dashboard' | 'user_journey'>('view', 'login');
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatVisible, setChatVisible] = useState(true);
    const [isGlobalLoading, setIsGlobalLoading] = useState(true);

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('appLanguage', lang);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            document.documentElement.style.setProperty('--x', `${e.clientX}px`);
            document.documentElement.style.setProperty('--y', `${e.clientY}px`);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchData = useCallback(async (force = false) => {
        // 1. Optimistic Cache Load (Stale-While-Revalidate)
        if (!force) {
            const cachedData = CacheService.get<AppData>(CACHE_KEYS.APP_DATA);
            if (cachedData) {
                console.log("Loaded app data from cache");
                setAppData(cachedData);
                setIsGlobalLoading(false); // Unblock UI immediately if cache exists
            }
        }

        try {
            // 2. Fetch fresh data from API
            const response = await fetch(`${WEB_APP_URL}/api/static-data`);
            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success') {
                    const rawData = result.data || {};
                    const processedData = {
                        ...initialAppData,
                        ...rawData,
                        pages: rawData.pages || rawData.TeamsPages || [],
                        users: rawData.users || rawData.Users || [],
                        products: rawData.products || rawData.Products || [],
                    };
                    
                    setAppData(processedData);
                    // Update cache
                    CacheService.set(CACHE_KEYS.APP_DATA, processedData);
                    console.log("App data updated from network");
                }
            }
        } catch (e) {
            console.error("Data Fetch Error:", e);
            // If offline and no cache was loaded in step 1, UI will remain in loading state or show error if we handle it here.
            // But since step 1 handles existing cache, this catch block ensures we don't crash on network fail.
        } finally {
            setIsGlobalLoading(false);
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
        // Use CacheService for Session Management
        const session = CacheService.get<{ user: User, timestamp: number }>(CACHE_KEYS.SESSION);
        
        if (session && session.user) {
            setCurrentUser(session.user);
            fetchData();
            if (appState === 'login') determineAppState(session.user);
        } else {
            // Session expired or doesn't exist
            setIsGlobalLoading(false);
        }
    }, [fetchData]);

    const login = (user: User) => {
        setCurrentUser(user);
        // Save session using CacheService (48h default)
        CacheService.set(CACHE_KEYS.SESSION, { user, timestamp: Date.now() });
        fetchData(true); // Force fetch on login
        determineAppState(user);
    };

    const logout = () => {
        setCurrentUser(null);
        setAppState('login');
        CacheService.remove(CACHE_KEYS.SESSION);
        // Note: We keep APP_DATA cache to make next login faster
    };

    const refreshData = async () => {
        await fetchData(true); // Force fetch
        setRefreshTimestamp(Date.now());
    };

    const updateCurrentUser = (updatedData: Partial<User>) => {
        if (currentUser) {
            const newUser = { ...currentUser, ...updatedData };
            setCurrentUser(newUser);
            // Update session in cache
            CacheService.set(CACHE_KEYS.SESSION, { user: newUser, timestamp: Date.now() });
        }
    };

    const shouldShowHeader = useMemo(() => appState !== 'admin_dashboard' || isMobile, [appState, isMobile]);

    const containerClass = useMemo(() => 
        (appState === 'admin_dashboard' || appState === 'role_selection') ? 'w-full' : 'w-full px-2 sm:px-6', 
    [appState]);

    const paddingClass = useMemo(() => {
        if (appState === 'role_selection' || appState === 'login') return 'pt-0 pb-0';
        const basePadding = isMobile ? 'pt-14' : 'pt-20';
        return `${shouldShowHeader ? basePadding : 'pt-0'} pb-24 md:pb-8`;
    }, [appState, shouldShowHeader, isMobile]);

    if (isGlobalLoading) return <div className="flex h-screen items-center justify-center bg-gray-950"><Spinner size="lg" /></div>;

    return (
        <AppContext.Provider value={{
            currentUser, appData, login, logout, refreshData, refreshTimestamp,
            originalAdminUser, returnToAdmin: () => {}, previewImage: (u) => setPreviewImageUrl(u),
            updateCurrentUser, setUnreadCount, unreadCount, updateProductInData: () => {}, apiKey: '',
            setAppState, setOriginalAdminUser, fetchData, setCurrentUser, setChatVisibility: setChatVisible,
            isSidebarCollapsed, setIsSidebarCollapsed, setIsChatOpen,
            isMobileMenuOpen, setIsMobileMenuOpen,
            language, setLanguage: handleLanguageChange
        }}>
            <div className="min-h-screen relative z-10">
                <BackgroundMusic />
                <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
                    {currentUser && appState !== 'login' ? (
                        <>
                            {originalAdminUser && <ImpersonationBanner />}
                            {shouldShowHeader && <Header appState={appState} onBackToRoleSelect={() => setAppState('role_selection')} />}
                            <main className={`${containerClass} ${paddingClass} transition-all duration-300`}>
                                {appState === 'admin_dashboard' && <AdminDashboard />}
                                {appState === 'user_journey' && <UserJourney onBackToRoleSelect={() => setAppState('role_selection')} />}
                                {appState === 'role_selection' && <RoleSelectionPage onSelect={(s) => setAppState(s as any)} />}
                            </main>
                            <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                        </>
                    ) : (
                        <LoginPage />
                    )}
                </Suspense>
                {previewImageUrl && (
                    <Modal isOpen={true} onClose={() => setPreviewImageUrl(null)} maxWidth="max-w-4xl">
                        <div className="relative p-2"><img src={previewImageUrl} className="max-h-[85vh] w-full object-contain rounded-xl" alt="Preview" /></div>
                    </Modal>
                )}
            </div>
        </AppContext.Provider>
    );
};

export default App;

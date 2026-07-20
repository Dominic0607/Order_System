import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { User, AppData, ParsedOrder } from './types';
import { convertGoogleDriveUrl, syncPendingPackagePhotos } from './utils/fileUtils';
import { WEB_APP_URL, SOUND_URLS } from './constants';
import { useUrlState } from './hooks/useUrlState';
import { CacheService, CACHE_KEYS } from './services/cacheService';
import { useOrderNotifications } from './hooks/useOrderNotifications';
import { subscribeUserToPush } from './utils/notificationUtils';

// --- Lazy Load Pages for Better Performance ---
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const UserJourney = React.lazy(() => import('./pages/UserJourney'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const CreateOrderPage = React.lazy(() => import('./pages/CreateOrderPage'));
const FulfillmentPage = React.lazy(() => import('./pages/FulfillmentPage'));
const RoleSelectionPage = React.lazy(() => import('./pages/RoleSelectionPage'));
const SeriesPlayerPage = React.lazy(() => import('./pages/SeriesPlayerPage'));
const LongFilmPlayerPage = React.lazy(() => import('./pages/LongFilmPlayerPage'));
const ShortFilmPlayerPage = React.lazy(() => import('./pages/ShortFilmPlayerPage'));
const CambodiaMapPage = React.lazy(() => import('./pages/CambodiaMapPage'));
const PrintLabelPage = React.lazy(() => import('./pages/PrintLabelPage'));
const PromotionDashboard = React.lazy(() => import('./pages/PromotionDashboard'));

import OrderMetadataView from './components/orders/OrderMetadataView';
import NetflixEntertainment from './components/admin/netflix/NetflixEntertainment';
import Header from './components/common/Header';
import Spinner from './components/common/Spinner';
import ChatWidget from './components/chat/ChatWidget';
import Modal from './components/common/Modal';
import DeliveryAgentView from './components/orders/DeliveryAgentView';
import NotificationStack from './components/common/NotificationStack';

import ImpersonationBanner from './components/common/ImpersonationBanner';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';
import { AppContext, AdvancedSettings } from './context/AppContext';
import { UIProvider, useUI } from './context/UIContext';
import { UserProvider, useUser } from './context/UserContext';
import { OrderProvider, useOrder } from './context/OrderContext';
import { localDbService } from './services/localDbService';
import { translations } from './translations';
import { CLIENT_VERSION } from './constants/version';
import { needsAppIconUpdate } from './utils/appIconUtils';
import SystemUpdateModal from './components/common/SystemUpdateModal';
import { getRoleTransitionCleanup } from './utils/roleSelection';

const OrderNotificationTrigger: React.FC = () => {
    useOrderNotifications();
    return null;
};


const OtoChatView = ({ language, setAppState }: { language: string, setAppState: any }) => {
                                                const [iframeLoaded, setIframeLoaded] = React.useState(false);
                                                return (
                                                    <div className="absolute inset-0 flex flex-col z-[100]" style={{ animation: 'otoSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards' }}>
                                                        <style>{`
                                                            @keyframes otoSlideIn {
                                                                from { opacity: 0; transform: translateY(20px); }
                                                                to   { opacity: 1; transform: translateY(0); }
                                                            }
                                                            @keyframes otoPulse {
                                                                0%, 100% { opacity: 1; }
                                                                50% { opacity: 0.4; }
                                                            }
                                                            @keyframes otoShimmer {
                                                                0% { background-position: -200% 0; }
                                                                100% { background-position: 200% 0; }
                                                            }
                                                        `}</style>

                                                        {/* Premium Header */}
                                                        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 shrink-0 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)' }}>
                                                            {/* Back Button */}
                                                            <button
                                                                onClick={() => setAppState('role_selection')}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/8 text-xs font-semibold transition-all duration-200 active:scale-95"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                                </svg>
                                                                <span className="hidden sm:inline">{language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}</span>
                                                            </button>

                                                            {/* Center Brand */}
                                                            <div className="flex items-center gap-2">
                                                                {/* OTO Logo Icon */}
                                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                                                                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                                    </svg>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[13px] font-bold text-white leading-none tracking-tight">OTO Chat</span>
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'otoPulse 2s ease-in-out infinite' }}></div>
                                                                        <span className="text-[9px] text-emerald-400/80 font-semibold uppercase tracking-wider">Mini App</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Open External */}
                                                            <button
                                                                onClick={() => window.open('https://otochat.otokhmer.com/', '_blank', 'noopener,noreferrer')}
                                                                title="Open in new tab"
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/8 text-xs font-semibold transition-all duration-200 active:scale-95"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                                <span className="hidden sm:inline text-[11px]">{language === 'km' ? 'បើកក្រៅ' : 'Open'}</span>
                                                            </button>
                                                        </div>

                                                        {/* Iframe Area */}
                                                        <div className="flex-grow w-full relative bg-[#0d1117] overflow-hidden">
                                                            {/* Loading Skeleton - shown until iframe loads */}
                                                            {!iframeLoaded && (
                                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0d1117]">
                                                                    {/* Animated Logo */}
                                                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 relative" style={{ background: 'linear-gradient(135deg, #2563eb22, #7c3aed22)', border: '1px solid #2563eb33' }}>
                                                                        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #2563eb11, #7c3aed11)', animation: 'otoPulse 1.5s ease-in-out infinite' }}></div>
                                                                        <svg viewBox="0 0 24 24" className="w-8 h-8 relative z-10" style={{ fill: '#6366f1' }}>
                                                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                                        </svg>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-white/80 text-sm font-bold tracking-tight">OTO Chat</p>
                                                                        <p className="text-white/30 text-xs mt-0.5">{loadingTime > 5 ? (language === 'km' ? 'ម៉ាស៊ីនមេកំពុងបើកដំណើរការ សូមរង់ចាំ (អាចដល់ 50 វិនាទី)...' : 'Server is waking up, please wait (up to 50s)...') : (language === 'km' ? 'កំពុងបើក Mini App...' : 'Loading Mini App...')}</p>
                                                                    </div>
                                                                    {/* Loading bar */}
                                                                    <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                                        <div className="h-full rounded-full" style={{
                                                                            background: 'linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)',
                                                                            backgroundSize: '200% 100%',
                                                                            animation: 'otoShimmer 1.5s linear infinite'
                                                                        }}></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Iframe */}
                                                            <iframe
                                                                key="oto-chat-iframe"
                                                                src="https://otochat.otokhmer.com/"
                                                                className="absolute inset-0 w-full h-full border-0"
                                                                allow="camera; microphone; geolocation; clipboard-write; clipboard-read; fullscreen; payment; autoplay"
                                                                title="OTO Chat Mini App"
                                                                onLoad={() => setIframeLoaded(true)}
                                                                style={{ opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            };

const ProblemItemsView = ({ language, currentUser }: { language: string, currentUser: any }) => {
    const [loadingTime, setLoadingTime] = React.useState(0);
    React.useEffect(() => {
        const timer = setInterval(() => setLoadingTime(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);
    
                                                const [iframeLoaded, setIframeLoaded] = React.useState(false);

                                                const key = currentUser?.IsSystemAdmin
                                                    ? '063a669e39fef90d061aef98caaa0fc589fba961cae83040e9ee2038a3ebb7e8'
                                                    : '60a5f0446fe326829643de09bcf2a70854fc134f070591b8f73bb27811774661';
                                                const url = `https://brokenaccflexi.onrender.com/?key=${key}`;

                                                return (
                                                    <div className="absolute inset-0 flex flex-col z-[100]" style={{ animation: 'otoSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards' }}>
                                                        <style>{`
                                                            @keyframes otoSlideIn {
                                                                from { opacity: 0; transform: translateY(20px); }
                                                                to   { opacity: 1; transform: translateY(0); }
                                                            }
                                                            @keyframes otoPulse {
                                                                0%, 100% { opacity: 1; }
                                                                50% { opacity: 0.4; }
                                                            }
                                                            @keyframes otoShimmer {
                                                                0% { background-position: -200% 0; }
                                                                100% { background-position: 200% 0; }
                                                            }
                                                        `}</style>

                                                        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 shrink-0 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)' }}>
                                                            <button
                                                                onClick={() => setAppState('role_selection')}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/8 text-xs font-semibold transition-all duration-200 active:scale-95"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                                </svg>
                                                                <span className="hidden sm:inline">{language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}</span>
                                                            </button>

                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #9f1239, #be123c)' }}>
                                                                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                                                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                                                    </svg>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[13px] font-bold text-white leading-none tracking-tight">Problem Items</span>
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'otoPulse 2s ease-in-out infinite' }}></div>
                                                                        <span className="text-[9px] text-emerald-400/80 font-semibold uppercase tracking-wider">Mini App</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                                                title="Open in new tab"
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/8 text-xs font-semibold transition-all duration-200 active:scale-95"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                                <span className="hidden sm:inline text-[11px]">{language === 'km' ? 'បើកក្រៅ' : 'Open'}</span>
                                                            </button>
                                                        </div>

                                                        <div className="flex-grow w-full relative bg-[#0d1117] overflow-hidden">
                                                            {!iframeLoaded && (
                                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0d1117]">
                                                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 relative" style={{ background: 'linear-gradient(135deg, #9f123922, #be123c22)', border: '1px solid #9f123c33' }}>
                                                                        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #9f123911, #be123c11)', animation: 'otoShimmer 1.5s linear infinite' }}></div>
                                                                        <svg viewBox="0 0 24 24" className="w-8 h-8 relative z-10" style={{ fill: '#be123c' }}>
                                                                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                                                        </svg>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-white/80 text-sm font-bold tracking-tight">Problem Items</p>
                                                                        <p className="text-white/30 text-xs mt-0.5">
                                                                            {loadingTime > 5 
                                                                                ? (language === 'km' ? 'ម៉ាស៊ីនមេកំពុងបើកដំណើរការ សូមរង់ចាំ (អាចដល់ 50 វិនាទី)...' : 'Server is waking up, please wait (up to 50s)...') 
                                                                                : (language === 'km' ? 'កំពុងបើក Mini App...' : 'Loading Mini App...')}
                                                                        </p>
                                                                    </div>
                                                                    <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                                        <div className="h-full rounded-full" style={{
                                                                            background: 'linear-gradient(90deg, #9f1239, #be123c, #9f1239)',
                                                                            backgroundSize: '200% 100%',
                                                                            animation: 'otoShimmer 1.5s linear infinite'
                                                                        }}></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <iframe
                                                                key="problem-items-iframe"
                                                                src={url}
                                                                className="absolute inset-0 w-full h-full border-0"
                                                                allow="camera; microphone; geolocation; clipboard-write; clipboard-read; fullscreen; payment; autoplay"
                                                                title="Problem Items Mini App"
                                                                onLoad={() => setIframeLoaded(true)}
                                                                style={{ opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            
};

const AppContent: React.FC = () => {
    const { 
        notifications, removeNotification, showNotification,
        isSidebarCollapsed, setIsSidebarCollapsed,
        isChatOpen, setIsChatOpen,
        unreadCount, setUnreadCount,
        isMobileMenuOpen, setIsMobileMenuOpen
    } = useUI();

    const {
        currentUser, originalAdminUser, setCurrentUser, setOriginalAdminUser, logout, hasPermission
    } = useUser();

    const {
        orders, setOrders, appData, isOrdersLoading, isSyncing, refreshTimestamp, fetchData, fetchOrders, refreshData, ordersFetchError
    } = useOrder();

    const [appState, setAppState] = useUrlState<'login' | 'user_journey' | 'admin_dashboard' | 'create_order' | 'fulfillment' | 'role_selection' | 'confirm_delivery' | 'entertainment' | 'watch' | 'series_player' | 'long_player' | 'short_player' | 'cambodia_map' | 'print_label' | 'order_metadata' | 'oto_chat' | 'problem_items'>('view', 'login');
    const [selectedTeam, setSelectedTeam] = useUrlState<string>('team', '');
    const [selectedMovieId, setSelectedMovieId] = useUrlState<string>('movie', '');
    const [isShiftOpener, setIsShiftOpener] = useState(false);
    const [activeShiftStore, setActiveShiftStore] = useState('');
    const [mobilePageTitle, setMobilePageTitle] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isGlobalLoading, setIsGlobalLoading] = useState(true);
    const [language, setLanguage] = useState<'en' | 'km'>(() => (localStorage.getItem('language') as any) || 'km');
    const [serverVersion, setServerVersion] = useState<string | null>(null);
    const [newVersionAvailable, setNewVersionAvailable] = useState<string | null>(null);
    const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
    const [countdownMessage, setCountdownMessage] = useState<string>('');

    const compareVersions = useCallback((left: string | null | undefined, right: string | null | undefined) => {
        const normalizeVersion = (value: string | null | undefined) => {
            if (!value) return [0];
            return String(value)
                .trim()
                .replace(/^v/i, '')
                .split(/[.-]/)
                .map((part) => Number.parseInt(part.replace(/\D/g, ''), 10) || 0);
        };

        const leftParts = normalizeVersion(left);
        const rightParts = normalizeVersion(right);
        const length = Math.max(leftParts.length, rightParts.length);

        for (let i = 0; i < length; i += 1) {
            const leftPart = leftParts[i] ?? 0;
            const rightPart = rightParts[i] ?? 0;
            if (leftPart > rightPart) return 1;
            if (leftPart < rightPart) return -1;
        }
        return 0;
    }, []);

    const persistUpdateAcknowledgment = useCallback((version: string) => {
        try {
            localStorage.setItem('system_update_acknowledged_version', version);
            localStorage.setItem('system_update_last_seen_version', version);
            sessionStorage.setItem('system_update_acknowledged_version', version);
        } catch (error) {
            console.warn('[App] Failed to persist acknowledged version:', error);
        }
    }, []);

    const handleRoleSelection = useCallback((selectedRole: string) => {
        const cleanup = getRoleTransitionCleanup(selectedRole);

        if (cleanup.clearSelectedTeam) {
            setSelectedTeam('');
        }
        if (cleanup.clearSelectedMovieId) {
            setSelectedMovieId('');
        }
        if (cleanup.clearPreviewImage) {
            setPreviewImageUrl(null);
        }
        if (cleanup.clearMobilePageTitle) {
            setMobilePageTitle(null);
        }

        setAppState(selectedRole as any);
    }, [setAppState, setMobilePageTitle, setPreviewImageUrl, setSelectedMovieId, setSelectedTeam]);

    // Fetch system version on page load and poll every 5 minutes
    useEffect(() => {
        const fetchSystemVersion = async () => {
            try {
                const res = await fetch(`${WEB_APP_URL}/api/system-version`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.version) {
                        setServerVersion(data.version);
                    }
                }
            } catch (e) {
                console.warn("[App] Failed to check system version:", e);
            }
        };
        fetchSystemVersion();
        const interval = setInterval(fetchSystemVersion, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Check the effective installed version against the server version
    // before showing the update modal. This prevents the modal from reappearing
    // after a refresh when the update was already acknowledged.
    useEffect(() => {
        if (isGlobalLoading || !serverVersion) {
            setNewVersionAvailable(null);
            return;
        }

        const versionCandidates = [
            currentUser?.SystemVersion,
            localStorage.getItem('system_update_acknowledged_version') || '',
            sessionStorage.getItem('system_update_acknowledged_version') || '',
            localStorage.getItem('system_update_last_seen_version') || '',
            CLIENT_VERSION
        ].filter(Boolean) as string[];

        const effectiveCurrentVersion = versionCandidates.reduce((latest, version) => {
            return compareVersions(version, latest) > 0 ? version : latest;
        }, '0');

        const systemUpdateNeeded = compareVersions(serverVersion, effectiveCurrentVersion) > 0;
        const iconUpdateNeeded = compareVersions(serverVersion, '1.1.1') >= 0 && needsAppIconUpdate();

        if (systemUpdateNeeded || iconUpdateNeeded) {
            console.log(
                `[App] 🆕 Update required: Current=${effectiveCurrentVersion}, Server=${serverVersion}, IconUpdate=${iconUpdateNeeded}`
            );
            setNewVersionAvailable(serverVersion);
        } else {
            setNewVersionAvailable(null);
            
            // Silently update database system version for this user if they already run the latest bundle but DB is lagging
            if (currentUser && currentUser.SystemVersion !== serverVersion) {
                const token = localStorage.getItem('token');
                if (token) {
                    fetch(`${WEB_APP_URL}/api/users/update-version`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ version: serverVersion })
                    }).then(res => {
                        if (res.ok) {
                            console.log("[App] Silently synced user system version in DB to match latest bundle version:", serverVersion);
                            setCurrentUser(prev => prev ? { ...prev, SystemVersion: serverVersion } : null);
                        }
                    }).catch(e => console.warn("Failed silent version sync:", e));
                }
            }
        }
    }, [compareVersions, currentUser, serverVersion, setCurrentUser, isGlobalLoading]);

    useEffect(() => {
        const handleShowSystemUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.version) {
                setNewVersionAvailable(customEvent.detail.version);
            }
        };
        window.addEventListener('show-system-update', handleShowSystemUpdate);
        return () => window.removeEventListener('show-system-update', handleShowSystemUpdate);
    }, []);

    const startForceLogoutCountdown = useCallback((msg: string) => {
        setCountdownSeconds((prev) => {
            if (prev !== null) return prev;
            
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const playTone = (freq: number, duration: number, delay: number) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + delay);
                    osc.stop(ctx.currentTime + delay + duration + 0.05);
                };
                playTone(523.25, 0.4, 0);
                playTone(523.25, 0.4, 0.5);
                setTimeout(() => ctx.close(), 2000);
            } catch (e) {
                console.warn("Failed to play warning audio:", e);
            }

            setCountdownMessage(msg);
            return 60;
        });
    }, []);

    useEffect(() => {
        if (countdownSeconds === null) return;
        if (countdownSeconds <= 0) {
            console.log("⏰ [App] Countdown finished. Logging out...");
            logout();
            window.location.reload();
            return;
        }

        const timer = setTimeout(() => {
            setCountdownSeconds(countdownSeconds - 1);
            if (countdownSeconds <= 10) {
                try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = 880;
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.15);
                    setTimeout(() => ctx.close(), 500);
                } catch {}
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdownSeconds, logout]);

    const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(() => {
        const saved = localStorage.getItem('advancedSettings');
        const defaultSettings: AdvancedSettings = { 
            enableFloatingAlerts: true, 
            enablePrivacyMode: false, 
            notificationVolume: 0.5, 
            notificationSound: 'default',
            uiTheme: 'default',
            themeMode: 'light',
            glassIntensity: 20,
            borderRadius: 24,
            animationSpeed: 'normal',
            fontStyle: 'standard',
            orderEditGracePeriod: 15,
            placingOrderGracePeriod: 5,
            packagingGracePeriod: 2
        };
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.uiTheme) {
                    parsed.uiTheme = 'default';
                    parsed.themeMode = parsed.themeMode || 'light';
                }
                return { ...defaultSettings, ...parsed };
            } catch (e) { return defaultSettings; }
        }
        return defaultSettings;
    });

    // --- BACKGROUND UPLOAD SYNC QUEUE ---
    useEffect(() => {
        // Run sync on mount (after a short delay to not block initial loading)
        const initialTimeout = setTimeout(() => {
            syncPendingPackagePhotos().catch(err => console.error("Mount sync failed:", err));
        }, 5000);

        // Run sync every 30 seconds
        const interval = setInterval(() => {
            syncPendingPackagePhotos().catch(err => console.error("Interval sync failed:", err));
        }, 30000);

        // Run sync when going back online
        const handleOnline = () => {
            console.log("🌐 [Sync Queue] Device is back online. Syncing pending package photos...");
            syncPendingPackagePhotos().catch(err => console.error("Online event sync failed:", err));
        };
        window.addEventListener('online', handleOnline);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    // --- APPLY DYNAMIC CSS VARIABLES ---
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--glass-blur', `${(advancedSettings.glassIntensity || 20) / 2}px`);
        root.style.setProperty('--global-radius', `${advancedSettings.borderRadius || 24}px`);
        
        const animDurations = { none: '0s', slow: '0.6s', normal: '0.3s', fast: '0.1s' };
        root.style.setProperty('--anim-duration', animDurations[advancedSettings.animationSpeed || 'normal']);
        
        const fonts = { 
            standard: "'Kantumruy Pro', sans-serif", 
            modern: "'Inter', sans-serif", 
            mono: "'JetBrains Mono', monospace" 
        };
        root.style.setProperty('--global-font', fonts[advancedSettings.fontStyle || 'standard']);

        // Binance theme overrides — force sharp edges and Inter font
        if (advancedSettings.uiTheme === 'binance') {
            root.style.setProperty('--global-radius', '2px');
            root.style.setProperty('--global-font', "'Inter', sans-serif");
        }
    }, [advancedSettings.glassIntensity, advancedSettings.borderRadius, advancedSettings.animationSpeed, advancedSettings.fontStyle, advancedSettings.uiTheme]);

    const [lastMessage, setLastMessage] = useState<any>(null);

    // Global WebSocket connection for system notifications (Sync, etc.)
    useEffect(() => {
        if (!currentUser) return;
        
        let ws: WebSocket | null = null;
        let reconnectTimeout: any = null;
        let reconnectAttempts = 0;
        let isDisposed = false;

        const scheduleReconnect = () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
            reconnectAttempts++;
            console.log(`⏳ [WS] Attempting reconnect ${reconnectAttempts} in ${Math.round(delay/1000)}s...`);
            reconnectTimeout = setTimeout(connect, delay);
        };

        const connect = async () => {
            if (isDisposed) return;
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token || localStorage.getItem('token');
            if (!token) return;

            // Use wss if the backend URL is https, otherwise follow frontend protocol
            const protocol = WEB_APP_URL.startsWith('https') ? 'wss' : (window.location.protocol === 'https:' ? 'wss' : 'ws');
            const host = WEB_APP_URL.replace(/^https?:\/\//, '');
            
            try {
                ws = new WebSocket(`${protocol}://${host}/api/chat/ws?token=${encodeURIComponent(token)}`);
                
                ws.onopen = () => {
                    console.log("🟢 [WS] Connected to System Hub");
                    reconnectAttempts = 0; // Reset attempts on successful connection
                };

                ws.onmessage = (event) => {
                    if (isDisposed) return;
                    try {
                        const data = JSON.parse(event.data);
                        setLastMessage(data);
                    } catch (e) {
                        setLastMessage(event.data);
                    }
                };

                ws.onclose = (event) => {
                    if (!isDisposed) {
                        console.log(`🔴 [WS] Disconnected (Code: ${event.code})`);
                        ws = null;
                        scheduleReconnect();
                    }
                };

                ws.onerror = (error) => {
                    if (!isDisposed) {
                        console.error("⚠️ [WS] Connection Error:", error);
                    }
                    // Error will trigger onclose, which handles reconnect
                };
            } catch (e) {
                if (!isDisposed) {
                    console.error("❌ [WS] Failed to initialize:", e);
                    scheduleReconnect();
                }
            }
        };

        connect();

        return () => {
            isDisposed = true;
            if (ws) {
                console.log("🛑 [WS] Cleaning up connection...");
                ws.onclose = null; // Prevent reconnect loop
                ws.onerror = null;
                ws.close();
                ws = null;
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [currentUser]);

    const tokenRef = useRef<string | null>(null);
    const ordersRef = useRef<ParsedOrder[]>([]);

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    // --- WebSocket Data Sync ---
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'new_order') {
            console.log("[App] 🔔 New order detected. Refreshing data...");
            fetchOrders(true); // Background sync
            
            // Trigger sound for all (Ding via notification)
            showNotification(
                language === 'km' ? 'មានកុម្ម៉ង់ថ្មី!' : 'New Order Detected!', 
                'info', 
                language === 'km' ? '🆕 កុម្ម៉ង់ថ្មី' : '🆕 New Order'
            );

            // Play voice for Shift Opener only if it matches the store
            if (isShiftOpener) {
                const orderStore = lastMessage.newData?.['Fulfillment Store'] || lastMessage.newData?.['FulfillmentStore'];
                const myStore = activeShiftStore;

                console.log(`[App] 🔊 Voice Store Check - Order Store: ${orderStore}, My Shift Store: ${myStore}`);

                if (orderStore && myStore && orderStore.trim().toLowerCase() === myStore.trim().toLowerCase()) {
                    setTimeout(() => {
                        // Select voice based on store
                        let voiceUrl = SOUND_URLS.NEW_ORDER_VOICE;
                        const storeLower = orderStore.trim().toLowerCase();
                        if (storeLower === 'flexi gear') {
                            voiceUrl = SOUND_URLS.NEW_ORDER_VOICE_FLEXI;
                        } else if (storeLower === 'acc store') {
                            voiceUrl = SOUND_URLS.NEW_ORDER_VOICE_ACC;
                        }

                        console.log(`[App] 🗣️ Attempting voice alert: ${voiceUrl} (Shift Opener: ${isShiftOpener} for ${myStore})`);
                        const audio = new Audio(voiceUrl);
                        audio.volume = 1.0;
                        audio.play()
                            .then(() => console.log("[App] ✅ Voice alert played successfully"))
                            .catch(e => {
                                console.error("[App] ❌ Voice play failed:", e.name, e.message);
                                if (e.name === 'NotAllowedError') {
                                    console.warn("[App] ⚠️ Browser blocked autoplay. Please click anywhere on the page to enable audio.");
                                }
                            });
                    }, 800);
                } else {
                    console.log(`[App] 🔇 Voice alert skipped: Warehouse mismatch or no store info.`);
                }
            }
        } else if (lastMessage.type === 'update_order') {
            const { orderId, newData } = lastMessage;
            if (orderId && newData) {
                // Prepare normalized data for local state
                const normalizedUpdate = { ...newData };
                if (newData['Fulfillment Status'] && !newData['FulfillmentStatus']) {
                    normalizedUpdate['FulfillmentStatus'] = newData['Fulfillment Status'];
                }
                if (newData['FulfillmentStatus'] && !newData['Fulfillment Status']) {
                    normalizedUpdate['Fulfillment Status'] = newData['FulfillmentStatus'];
                }

                const exists = ordersRef.current.some(o => o['Order ID'] === orderId);
                if (!exists) {
                    fetchOrders(true);
                } else {
                    // Trigger notification for Cancelled/Returned status changes
                    const newStatus = newData['Fulfillment Status'] || newData['FulfillmentStatus'];
                    if (newStatus === 'Cancelled' || newStatus === 'Returned') {
                        const title = newStatus === 'Cancelled' ? '🚫 ការកម្មង់ត្រូវបានបោះបង់' : '🔄 ការកម្មង់ត្រូវបានប្តូរ/សងវិញ';
                        const body = `ការកម្មង់ #${orderId.substring(0,8)} ត្រូវបានដាក់ជា ${newStatus === 'Cancelled' ? 'បោះបង់' : 'ប្តូរ/សងវិញ'}។`;
                        showNotification(body, 'error', title);
                    }

                    setOrders(prev => prev.map(o => o['Order ID'] === orderId ? { ...o, ...normalizedUpdate } : o));
                }
            }
        } else if (lastMessage.type === 'delete_order') {
            const { orderId } = lastMessage;
            if (orderId) {
                setOrders(prev => prev.filter(o => o['Order ID'] !== orderId));
            }
        } else if (lastMessage.type === 'sync_error') {
            console.error("[App] ❌ Sync Error:", lastMessage.message);
            showNotification(
                lastMessage.message || "ការ Sync ទិន្នន័យទៅ Google Sheets បរាជ័យ!", 
                'error', 
                'Sync Failure'
            );
        } else if (lastMessage.type === 'sheet_webhook_sync') {
             // A sheet was updated directly, trigger a background refresh to catch any changes not captured by optimistic updates
             if (lastMessage.sheetName === 'AllOrders' || lastMessage.sheetName?.startsWith('Orders_')) {
                 fetchOrders(true);
             } else {
                 fetchData(true);
             }
        } else if (lastMessage.type === 'system_info') {
            const wsVersion = lastMessage.version;
            if (wsVersion) {
                setServerVersion(wsVersion);
            }
        } else if (lastMessage.type === 'update_permission' || lastMessage.type === 'permissions_reset') {
            // Admin changed or reset permissions — refresh so all connected users get updated state.
            console.log(`[App] 🔐 Permissions changed (${lastMessage.type}). Refreshing...`);
            fetchData(true).then(() => {
                fetchOrders();
            }).catch(() => {});
        } else if (
            lastMessage.type === 'update_sheet' ||
            lastMessage.type === 'add_row' ||
            lastMessage.type === 'delete_row'
        ) {
            console.log(`[App] 📋 Static data changed (${lastMessage.type} / ${lastMessage.sheetName}). Refreshing...`);
            
            // SPECIAL CASE: Settings update (like force system update/logout)
            if (lastMessage.type === 'update_sheet' && lastMessage.sheetName === 'Settings') {
                const { newData } = lastMessage;
                if (newData && newData.Action === 'ForceLogout') {
                    const msg = newData.Message || (language === 'km' ? 'ប្រព័ន្ធកំពុងធ្វើបច្ចុប្បន្នភាព។ សូមចូលម្តងទៀត។' : 'System update in progress. Please log in again.');
                    startForceLogoutCountdown(msg);
                } else {
                    fetchData(true);
                }
            } else if (lastMessage.type === 'update_sheet' && lastMessage.sheetName === 'AllOrders') {
                const { primaryKey, newData } = lastMessage;
                const orderId = primaryKey?.['Order ID'];
                if (orderId && newData) {
                    const newStatus = newData['Fulfillment Status'] || newData['FulfillmentStatus'];
                    if (newStatus === 'Cancelled' || newStatus === 'Returned') {
                        const title = newStatus === 'Cancelled' ? '🚫 ការកម្មង់ត្រូវបានបោះបង់' : '🔄 ការកម្មង់ត្រូវបានប្តូរ/សងវិញ';
                        const body = `ការកម្មង់ #${orderId.substring(0,8)} ត្រូវបានដាក់ជា ${newStatus === 'Cancelled' ? 'បោះបង់' : 'ប្តូរ/សងវិញ'}។`;
                        showNotification(body, 'error', title);
                    }
                    
                    // Optimistically update local order state for other clients
                    setOrders(prev => prev.map(o => o['Order ID'] === orderId ? { ...o, ...newData, FulfillmentStatus: newStatus || o.FulfillmentStatus } : o));
                }
                fetchOrders(true);
            } else {
                fetchData(true);
            }
        }
    }, [lastMessage, fetchOrders, fetchData, setOrders, showNotification, isShiftOpener, language, startForceLogoutCountdown]);

    const isMobile = window.innerWidth < 768;
    const isAdmin = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.IsSystemAdmin) return true;
        const userRoles = (currentUser.Role || '').split(',').map(r => r.trim().toLowerCase());
        return userRoles.includes('admin');
    }, [currentUser]);

    // --- SYNC SETTINGS ---
    useEffect(() => { localStorage.setItem('language', language); }, [language]);
    useEffect(() => { localStorage.setItem('advancedSettings', JSON.stringify(advancedSettings)); }, [advancedSettings]);

    // Handle initial state and auth
    useEffect(() => {
        if (!currentUser && appState !== 'login' && appState !== 'confirm_delivery' && appState !== 'watch' && appState !== 'series_player' && appState !== 'short_player' && appState !== 'long_player' && appState !== 'print_label' && appState !== 'entertainment' && appState !== 'order_metadata') {
            setAppState('login');
        }
    }, [currentUser, appState, setAppState]);

    // Handle deep links for confirm delivery
    const urlParams = new URLSearchParams(window.location.search);
    const confirmIds = useMemo(() => urlParams.get('i')?.split(',').filter(Boolean) || [], []);
    const returnIds = useMemo(() => urlParams.get('r')?.split(',').filter(Boolean) || [], []);
    const failedIdsParam = useMemo(() => urlParams.get('f')?.split(',').filter(Boolean) || [], []);
    const confirmStore = urlParams.get('s') || '';

    useEffect(() => {
        if (urlParams.get('v') === 'cd') setAppState('confirm_delivery');
    }, [setAppState]);

    // --- PERMISSION REFRESH ---
    // Runs whenever appData.permissions changes (e.g. after fetchData, WebSocket update_permission event,
    // or background 5-min poll). Rebuilds currentUser.Permissions from the authoritative server data.
    // NOTE: currentUser?.Permissions is intentionally NOT in the dep array — the JSON comparison
    // inside prevents redundant setCurrentUser calls without causing an update→re-trigger loop.
    useEffect(() => {
        if (!currentUser || !appData?.permissions || !Array.isArray(appData.permissions) || appData.permissions.length === 0) return;

        const userRoles = (currentUser.Role || '').split(',').map(r => r.trim().toLowerCase());
        
        // Map common aliases to ensure robust permission matching
        if (userRoles.includes('sales') && !userRoles.includes('sale')) userRoles.push('sale');
        if (userRoles.includes('sale') && !userRoles.includes('sales')) userRoles.push('sales');
        if (userRoles.includes('seller')) {
            if (!userRoles.includes('sale')) userRoles.push('sale');
            if (!userRoles.includes('sales')) userRoles.push('sales');
        }
        if (userRoles.includes('dispatcher') && !userRoles.includes('fulfillment')) userRoles.push('fulfillment');
        if (userRoles.includes('fulfillment') && !userRoles.includes('dispatcher')) userRoles.push('dispatcher');

        // Collect all permission rows that match any of the user's roles (case-insensitive)
        const matchedPerms = appData.permissions.filter(p => {
            const role = (p.Role || p.role || '').toLowerCase();
            return userRoles.includes(role);
        });

        // Deduplicate by feature: if a user has multiple roles granting the same feature, prefer enabled
        const mergedPermsMap: Record<string, any> = {};
        matchedPerms.forEach(p => {
            const feature = (p.Feature || p.feature || '').toLowerCase();
            const raw = p.IsEnabled ?? p.isEnabled ?? p.is_enabled ?? false;
            const enabled = raw === true || raw === 1 || raw === 'true' || raw === 'TRUE';
            if (!mergedPermsMap[feature] || enabled) {
                mergedPermsMap[feature] = p;
            }
        });
        const rolePerms = Object.values(mergedPermsMap);

        // Only write to state if content actually changed (avoids re-render cascade)
        const nextPermsStr = JSON.stringify(rolePerms);
        setCurrentUser(prev => {
            if (!prev) return null;
            if (JSON.stringify(prev.Permissions || []) === nextPermsStr) return prev;
            return { ...prev, Permissions: rolePerms };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.Role, appData?.permissions]);

    // --- USER DATA SYNC ---
    // Sync currentUser with appData.users to catch updates to FullName, ProfilePictureURL, etc.
    useEffect(() => {
        if (!currentUser || !appData?.users || !Array.isArray(appData.users)) return;

        const updatedUserRecord = appData.users.find(u => 
            u.UserName === currentUser.UserName || 
            (u.user_name === currentUser.UserName)
        );

        if (updatedUserRecord) {
            setCurrentUser(prev => {
                if (!prev) return null;
                // Only update if critical fields changed to avoid loops
                if (
                    updatedUserRecord.FullName !== prev.FullName ||
                    updatedUserRecord.ProfilePictureURL !== prev.ProfilePictureURL ||
                    updatedUserRecord.Role !== prev.Role ||
                    updatedUserRecord.IsSystemAdmin !== prev.IsSystemAdmin ||
                    updatedUserRecord.SystemVersion !== prev.SystemVersion
                ) {
                    console.log(`[App] 🔄 Syncing currentUser with appData.users for: ${prev.UserName}`);
                    const updated = {
                        ...prev,
                        FullName: updatedUserRecord.FullName || prev.FullName,
                        ProfilePictureURL: updatedUserRecord.ProfilePictureURL || prev.ProfilePictureURL,
                        Role: updatedUserRecord.Role || prev.Role,
                        IsSystemAdmin: updatedUserRecord.IsSystemAdmin ?? prev.IsSystemAdmin,
                        TelegramUsername: updatedUserRecord.TelegramUsername || prev.TelegramUsername,
                        SystemVersion: updatedUserRecord.SystemVersion ?? prev.SystemVersion
                    };
                    
                    // Persist to cache
                    CacheService.get<{ token: string }>(CACHE_KEYS.SESSION).then(session => {
                        if (session) {
                            CacheService.set(CACHE_KEYS.SESSION, { ...session, user: updated, timestamp: Date.now() });
                        }
                    });
                    
                    return updated;
                }
                return prev;
            });
        }
    }, [currentUser?.UserName, appData?.users]);

    useEffect(() => {
        if (currentUser) fetchOrders();
    }, [currentUser, fetchOrders]);

    const fetchPermissions = useCallback(async (token: string) => {
        try {
            const res = await fetch(`${WEB_APP_URL}/api/permissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                if (result.status === 'success') {
                    return result.data;
                }
            }
        } catch (e) {
            console.error("Failed to fetch user permissions", e);
        }
        return [];
    }, []);

    // --- SESSION INITIALIZATION ---
    useEffect(() => {
        const initSession = async () => {
            try {
                // Clear old images from IndexedDB
                localDbService.clearOldImages().catch(e => console.warn("IDB clear error:", e));

                const session = await CacheService.get<{ user: User, token: string, timestamp: number }>(CACHE_KEYS.SESSION);
                if (session && session.user) {
                    let userWithPerms = { ...session.user };
                    if (session.token) {
                        tokenRef.current = session.token;
                        localStorage.setItem('token', session.token);
                        // Refresh permissions from backend
                        const perms = await fetchPermissions(session.token);
                        userWithPerms.Permissions = perms;
                    }
                    
                    // Fetch static data first to ensure permissions can be refreshed correctly
                    const freshData = await fetchData(false);
                    
                    if (freshData && freshData.users && Array.isArray(freshData.users)) {
                        const freshUserRecord = freshData.users.find((u: any) => 
                            u.UserName === userWithPerms.UserName || 
                            (u.user_name === userWithPerms.UserName)
                        );
                        if (freshUserRecord) {
                            console.log(`[App] Syncing cached user with fresh DB record during initSession. DB Version: ${freshUserRecord.SystemVersion}, Cached Version: ${userWithPerms.SystemVersion}`);
                            userWithPerms = {
                                ...userWithPerms,
                                FullName: freshUserRecord.FullName || userWithPerms.FullName,
                                ProfilePictureURL: freshUserRecord.ProfilePictureURL || userWithPerms.ProfilePictureURL,
                                Role: freshUserRecord.Role || userWithPerms.Role,
                                IsSystemAdmin: freshUserRecord.IsSystemAdmin ?? userWithPerms.IsSystemAdmin,
                                TelegramUsername: freshUserRecord.TelegramUsername || userWithPerms.TelegramUsername,
                                SystemVersion: freshUserRecord.SystemVersion ?? userWithPerms.SystemVersion
                            };
                            
                            // Save synced user back to session cache immediately
                            CacheService.set(CACHE_KEYS.SESSION, { ...session, user: userWithPerms, timestamp: Date.now() });
                        }
                    }
                    
                    setCurrentUser(userWithPerms);
                    subscribeUserToPush(WEB_APP_URL);
                    
                    const currentView = new URLSearchParams(window.location.search).get('view');
                    const validViews = [
                        'user_journey', 'admin_dashboard', 'create_order', 'fulfillment', 
                        'role_selection', 'confirm_delivery', 'entertainment', 'watch', 
                        'series_player', 'long_player', 'short_player', 'cambodia_map', 
                        'print_label', 'order_metadata', 'problem_items', 'oto_chat'
                    ];
                    if (currentView && validViews.includes(currentView)) {
                        setAppState(currentView as any);
                    } else {
                        setAppState('role_selection');
                    }
                } else {
                    await fetchData(false);
                }
            } catch (e) {
                console.warn("Session init error:", e);
            } finally {
                setIsGlobalLoading(false);
            }
        };
        initSession();
    }, [fetchData, setCurrentUser, setAppState, fetchPermissions]);

    const login = async (user: User, token: string) => {
        tokenRef.current = token;
        localStorage.setItem('token', token);
        
        // Fetch permissions before setting current user to ensure hasPermission is ready
        const perms = await fetchPermissions(token);
        const userWithPerms = { ...user, Permissions: perms };
        
        setCurrentUser(userWithPerms);
        await CacheService.set(CACHE_KEYS.SESSION, { user: userWithPerms, token, timestamp: Date.now() });
        subscribeUserToPush(WEB_APP_URL);
        await fetchData(true);
        setAppState('role_selection');
    };

    const setChatVisibility = useCallback((visible: boolean) => {
        // Implementation for chat visibility if needed
    }, []);

    const shouldShowHeader = useMemo(() => {
        if (appState === 'login' || appState === 'user_journey' || appState === 'admin_dashboard' || appState === 'confirm_delivery' || appState === 'entertainment' || appState === 'watch' || appState === 'series_player' || appState === 'long_player' || appState === 'short_player' || appState === 'cambodia_map' || appState === 'print_label' || appState === 'fulfillment' || appState === 'order_metadata' || appState === 'promotions' || appState === 'oto_chat' || appState === 'problem_items') return false;
        return true;
    }, [appState]);

    const containerClass = useMemo(() => {
        if (appState === 'entertainment' || appState === 'watch' || appState === 'series_player' || appState === 'long_player' || appState === 'short_player' || appState === 'cambodia_map' || appState === 'print_label' || appState === 'fulfillment' || appState === 'order_metadata' || appState === 'promotions' || appState === 'oto_chat' || appState === 'problem_items') return 'w-full';
        return (appState === 'admin_dashboard' || appState === 'role_selection' || appState === 'user_journey') ? 'w-full' : 'w-full px-2 sm:px-6';
    }, [appState, selectedTeam]);

    const paddingClass = useMemo(() => {
        if (appState === 'login' || appState === 'confirm_delivery' || appState === 'entertainment' || appState === 'watch' || appState === 'series_player' || appState === 'long_player' || appState === 'short_player' || appState === 'cambodia_map' || appState === 'print_label' || appState === 'fulfillment' || appState === 'order_metadata' || appState === 'promotions' || appState === 'oto_chat' || appState === 'problem_items') return 'pt-0 pb-0';
        
        // Base header padding
        let topPadding = isMobile ? 'pt-16' : 'pt-20';
        
        if (originalAdminUser) {
            topPadding = isMobile ? 'pt-[104px]' : 'pt-[120px]';
        }

        if (!shouldShowHeader) topPadding = 'pt-0';
        
        const isActionView = appState === 'create_order' || appState === 'user_journey';
        const isCenteredView = appState === 'role_selection' || (appState === 'user_journey' && !selectedTeam);
        const finalTopPadding = isCenteredView ? 'pt-0' : topPadding;
        const bottomPadding = appState === 'role_selection'
            ? 'pb-0'
            : (isCenteredView || isActionView) ? 'pb-10' : 'pb-20 md:pb-8';

        return `${finalTopPadding} ${bottomPadding}`;
    }, [appState, shouldShowHeader, isMobile, originalAdminUser, selectedTeam]);

    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    // Poll for Background Sync Status (Admin only)
    useEffect(() => {
        if (!currentUser || !currentUser.IsSystemAdmin) {
            setPendingSyncCount(0);
            return;
        }

        const fetchSyncStatus = async () => {
            try {
                const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
                const token = session?.token || localStorage.getItem('token');
                const res = await fetch(`${WEB_APP_URL}/api/admin/sync-status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        setPendingSyncCount(data.pendingCount || 0);
                    }
                }
            } catch (e) {
                // Silent fail
            }
        };

        fetchSyncStatus();
        const interval = setInterval(fetchSyncStatus, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [currentUser]);

    const legacyContextValue = useMemo(() => ({
        currentUser, appData, orders, isOrdersLoading, isSyncing, pendingSyncCount, login, logout, refreshData, refreshTimestamp,
        originalAdminUser, returnToAdmin: () => {}, previewImage: (u: string) => setPreviewImageUrl(convertGoogleDriveUrl(u)),
        updateCurrentUser: (u: any) => {
            setCurrentUser(prev => {
                if (!prev) return null;
                const updated = { ...prev, ...u };
                // Also persist to cache so it survives refresh
                CacheService.get<{ token: string }>(CACHE_KEYS.SESSION).then(session => {
                    if (session) {
                        CacheService.set(CACHE_KEYS.SESSION, { ...session, user: updated, timestamp: Date.now() });
                    }
                });
                return updated;
            });
        },
        setUnreadCount, unreadCount, updateProductInData: () => {}, apiKey: '',
        appState, setAppState, setOriginalAdminUser, fetchData, fetchOrders, setCurrentUser, setChatVisibility,
        hasPermission, updatePermission: async (role: string, feature: string, isEnabled: boolean) => {
            try {
                const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
                const token = session?.token || tokenRef.current;
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch(`${WEB_APP_URL}/api/admin/permissions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify([{ Role: role, Feature: feature, IsEnabled: isEnabled }])
                });
                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    throw new Error(errBody?.message || `Server error: ${response.status}`);
                }
                showNotification("សិទ្ធិត្រូវបានធ្វើបច្ចុប្បន្នភាព", "success");
                fetchData(true).catch(e => console.warn("[updatePermission] Background refresh failed:", e));
            } catch (e) {
                console.error("Permission update failed", e);
                throw e; // re-throw so PermissionMatrix catch block shows error notification
            }
        },
        isSidebarCollapsed, setIsSidebarCollapsed, setIsChatOpen,
        isMobileMenuOpen, setIsMobileMenuOpen,
        language, setLanguage,
        showNotification,
        mobilePageTitle, setMobilePageTitle,
        advancedSettings, setAdvancedSettings,
        selectedTeam, setSelectedTeam,
        selectedMovieId, setSelectedMovieId,
        isShiftOpener, setIsShiftOpener,
        activeShiftStore, setActiveShiftStore,
        lastMessage, setOrders, ordersFetchError
    }), [
        currentUser, appData, orders, isOrdersLoading, isSyncing, login, logout, refreshData, refreshTimestamp,
        originalAdminUser, setUnreadCount, unreadCount, appState, setAppState, setOriginalAdminUser,
        fetchData, fetchOrders, setCurrentUser, setChatVisibility, hasPermission,
        isSidebarCollapsed, setIsSidebarCollapsed, setIsChatOpen, isMobileMenuOpen, 
        setIsMobileMenuOpen, language, setLanguage, showNotification, mobilePageTitle, 
        setMobilePageTitle, advancedSettings, setAdvancedSettings, selectedTeam, setSelectedTeam,
        selectedMovieId, setSelectedMovieId, isShiftOpener, activeShiftStore, lastMessage, setOrders, ordersFetchError
    ]);

    if (isGlobalLoading) return <div className="flex h-screen items-center justify-center bg-dark" style={{ backgroundColor: 'var(--bg-dark)' }}><Spinner size="lg" /></div>;

    return (
        <AppContext.Provider value={legacyContextValue as any}>
            <OrderNotificationTrigger />
            {newVersionAvailable && (
                <SystemUpdateModal 
                    newVersion={newVersionAvailable} 
                    currentVersion={currentUser?.SystemVersion || '1.0.0'} 
                    language={language}
                    onUpdateStart={async () => {
                        if (!newVersionAvailable) return;

                        const token = localStorage.getItem('token');

                        // We don't hide the modal here so it can show the progress bar and reload
                        persistUpdateAcknowledgment(newVersionAvailable);

                        if (token) {
                            try {
                                const response = await fetch(`${WEB_APP_URL}/api/users/update-version`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ version: newVersionAvailable })
                                });
                                if (response.ok) {
                                    console.log("[App] System version updated successfully in DB");
                                    if (currentUser) {
                                        const updatedUser = { ...currentUser, SystemVersion: newVersionAvailable };
                                        setCurrentUser(updatedUser);
                                        const session = await CacheService.get<{ user: User, token: string, timestamp: number }>(CACHE_KEYS.SESSION);
                                        if (session) {
                                            session.user = updatedUser;
                                            await CacheService.set(CACHE_KEYS.SESSION, session);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("[App] Failed to update user system version", e);
                            }
                        }
                    }}
                />
            )}
            <div className={`theme-wrapper h-screen w-full overflow-hidden flex flex-col ${advancedSettings.uiTheme ? `ui-${advancedSettings.uiTheme}` : ''} ${advancedSettings.themeMode ? `theme-${advancedSettings.themeMode}` : 'theme-dark'} ${advancedSettings.themeMode === 'dark' || !advancedSettings.themeMode ? 'dark' : ''}`}>
                {/* GLOBAL PREMIUM BACKGROUND */}
                <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden pointer-events-none z-0" style={{ backgroundColor: 'var(--bg-dark)' }}>
                    {advancedSettings.uiTheme !== 'binance' && (
                        <>
                            <div className="absolute top-[-10%] left-[-10%] w-[100%] sm:w-[70%] h-[60%] sm:h-[70%] bg-blue-600/15 rounded-full blur-[80px] sm:blur-[120px] animate-pulse"></div>
                            <div className="absolute bottom-[-10%] right-[-10%] w-[100%] sm:w-[60%] h-[60%] bg-indigo-600/15 rounded-full blur-[80px] sm:blur-[120px]" style={{ animationDelay: '3s' }}></div>
                            <div className="absolute top-[20%] right-[10%] w-[50%] sm:w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[60px] sm:blur-[100px]" style={{ animationDelay: '1.5s' }}></div>
                        </>
                    )}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] mix-blend-overlay"></div>
                </div>

                <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
                    {countdownSeconds !== null && (
                        <div className="z-[9999] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-center py-2.5 px-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg border-b border-red-500/30 animate-pulse relative">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            <div className="flex-grow text-center leading-relaxed">
                                {language === 'km' 
                                  ? `⚠️ ដំណឹង៖ ប្រព័ន្ធនឹងធ្វើការអាប់ដេត និងចាកចេញដោយស្វ័យប្រវត្តិក្នុងរយៈពេល ${countdownSeconds} វិនាទីទៀត! (${countdownMessage})` 
                                  : `⚠️ Notice: System will update and logout automatically in ${countdownSeconds} seconds! (${countdownMessage})`}
                            </div>
                        </div>
                    )}

                    <Suspense fallback={<div className="flex h-full items-center justify-center bg-transparent"><Spinner size="lg" /></div>}>
                        {appState === 'cambodia_map' ? (
                            <CambodiaMapPage />
                        ) : appState === 'order_metadata' ? (
                            <OrderMetadataView orderId={new URLSearchParams(window.location.search).get('id') || ''} />
                        ) : appState === 'print_label' ? (
                            <PrintLabelPage />
                        ) : appState === 'confirm_delivery' ? (
                            <DeliveryAgentView orderIds={confirmIds} returnOrderIds={returnIds} failedOrderIds={failedIdsParam} storeName={confirmStore} />
                        ) : appState === 'watch' ? (
                            <div id="app-main-scroll-container" className="flex-grow overflow-y-auto w-full h-full">
                                <NetflixEntertainment guestMovieId={selectedMovieId} />
                            </div>
                        ) : appState === 'admin_dashboard' ? (
                            <div className="flex-grow overflow-hidden relative flex flex-col h-full w-full">
                                 {originalAdminUser && <ImpersonationBanner />}
                                 <AdminDashboard />
                                 {!isMobileMenuOpen && <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
                            </div>
                        ) : (currentUser || appState === 'series_player' || appState === 'long_player' || appState === 'short_player') && appState !== 'login' ? (
                            <div className="flex flex-col h-full w-full overflow-hidden">
                                {originalAdminUser && <ImpersonationBanner />}
                                {shouldShowHeader && <Header appState={appState} onBackToRoleSelect={() => setAppState('role_selection')} />}
                                <main className={`flex-grow overflow-hidden relative flex flex-col ${appState === 'role_selection' || (appState === 'user_journey' && !selectedTeam) ? 'bg-transparent' : ''}`}>
                                    <div id="app-main-scroll-container" className={`flex-grow h-full ${appState === 'fulfillment' || appState === 'oto_chat' || appState === 'problem_items' ? 'overflow-hidden' : 'overflow-y-auto ' + (appState === 'role_selection' ? 'no-scrollbar' : 'custom-scrollbar')} ${containerClass} ${paddingClass} transition-all duration-300`}>
                                        {appState === 'user_journey' && <UserJourney onBackToRoleSelect={() => setAppState('role_selection')} />}
                                        {appState === 'create_order' && <CreateOrderPage team={selectedTeam} onSaveSuccess={() => setAppState('user_journey')} onCancel={() => setAppState('user_journey')} />}
                                        {appState === 'fulfillment' && <FulfillmentPage />}
                                        {appState === 'promotions' && <PromotionDashboard onBack={() => setAppState('role_selection')} />}
                                        {appState === 'entertainment' && <NetflixEntertainment />}
                                        {appState === 'series_player' && <SeriesPlayerPage />}
                                        {appState === 'long_player' && <LongFilmPlayerPage />}
                                        {appState === 'short_player' && <ShortFilmPlayerPage />}
                                        {appState === 'oto_chat' && <OtoChatView language={language} setAppState={setAppState} />}

                                        {appState === 'problem_items' && <ProblemItemsView language={language} currentUser={currentUser} />}

                                        {appState === 'role_selection' && (
                                            <RoleSelectionPage onSelect={handleRoleSelection} />
                                        )}
                                    </div>
                                </main>
                                {!isMobileMenuOpen && <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
                            </div>
                        ) : (
                            <LoginPage onLoginSuccess={() => setAppState('role_selection')} />
                        )}
                    </Suspense>
                    
                    {advancedSettings.enableFloatingAlerts && (
                        <NotificationStack notifications={notifications} onRemove={removeNotification} />
                    )}

                    <PWAInstallPrompt />

                    {previewImageUrl && (
                        <Modal isOpen={true} onClose={() => setPreviewImageUrl(null)} maxWidth="max-w-5xl" zIndex="z-[300]">
                            <div className="relative bg-transparent h-[85vh] flex flex-col p-4 w-full" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setPreviewImageUrl(null)} className="absolute top-4 right-4 z-50 w-10 h-10 bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-all border border-white/20 active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                                
                                {previewImageUrl.includes('drive.google.com') ? (
                                    <iframe 
                                        src={convertGoogleDriveUrl(previewImageUrl, 'preview')} 
                                        className="w-full h-full rounded-xl border-0 bg-black/20"
                                        allow="autoplay"
                                        title="Preview"
                                    />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                                        <img src={previewImageUrl} className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </Modal>
                    )}
                </div>
            </div>
        </AppContext.Provider>
    );
};

const App: React.FC = () => {
    return (
        <UIProvider>
            <UserProvider>
                <OrderProvider>
                    <AppContent />
                </OrderProvider>
            </UserProvider>
        </UIProvider>
    );
};

export default App;

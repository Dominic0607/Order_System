
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import BottomNavBar from '../components/admin/BottomNavBar';
import Sidebar from '../components/admin/Sidebar';
import DashboardOverview from '../components/admin/DashboardOverview';
import PerformanceTrackingPage from './PerformanceTrackingPage';
import ReportDashboard from './ReportDashboard';
import SettingsDashboard from './SettingsDashboard';
import OrdersDashboard from './OrdersDashboard';
import FulfillmentDashboard from './FulfillmentDashboard'; // បន្ថែមថ្មី
import EditProfileModal from '../components/common/EditProfileModal';
import { useUrlState } from '../hooks/useUrlState';
import { WEB_APP_URL } from '../constants';
import { FullOrder, ParsedOrder } from '../types';

type ActiveDashboard = 'admin' | 'orders' | 'reports' | 'settings' | 'fulfillment'; // បន្ថែម fulfillment
type AdminView = 'dashboard' | 'performance';
type ReportType = 'overview' | 'performance' | 'profitability' | 'forecasting' | 'shipping' | 'sales_team' | 'sales_page';

const AdminDashboard: React.FC = () => {
    const { 
        appData, currentUser, refreshTimestamp, 
        isSidebarCollapsed, setAppState 
    } = useContext(AppContext);
    
    const [activeDashboard, setActiveDashboard] = useUrlState<ActiveDashboard>('tab', 'admin');
    const [currentAdminView, setCurrentAdminView] = useUrlState<AdminView>('subview', 'dashboard');
    const [activeReport, setActiveReport] = useUrlState<ReportType>('reportType', 'overview');
    
    const [loading, setLoading] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isReportSubMenuOpen, setIsReportSubMenuOpen] = useState(false);
    const [isProfileSubMenuOpen, setIsProfileSubMenuOpen] = useState(false);
    const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
    
    const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
    const [revenueBreakdownPeriod, setRevenueBreakdownPeriod] = useState<'today' | 'this_month' | 'this_year'>('today');
    const [, setTeamFilter] = useUrlState<string>('teamFilter', '');

    const fetchOrders = async () => {
        if (parsedOrders.length === 0) setLoading(true);
        try {
            const response = await fetch(`${WEB_APP_URL}/api/admin/all-orders`);
            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success') {
                    const rawOrders: FullOrder[] = Array.isArray(result.data) ? result.data.filter((o: any) => o !== null) : [];
                    const parsed = rawOrders.map(o => {
                        let products = [];
                        try { if (o['Products (JSON)']) products = JSON.parse(o['Products (JSON)']); } catch(e) {}
                        return { 
                            ...o, 
                            Products: products, 
                            IsVerified: String(o.IsVerified).toUpperCase() === 'TRUE',
                            FulfillmentStatus: o.FulfillmentStatus as any
                        };
                    });
                    setParsedOrders(parsed);
                }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [refreshTimestamp]);

    const teamRevenueStats = useMemo(() => {
        const stats: Record<string, { name: string, revenue: number, orders: number }> = {};
        const now = new Date();
        parsedOrders.forEach(order => {
            if (!order.Timestamp) return;
            const d = new Date(order.Timestamp);
            if (revenueBreakdownPeriod === 'today' && d.toDateString() !== now.toDateString()) return;
            if (revenueBreakdownPeriod === 'this_month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return;
            if (revenueBreakdownPeriod === 'this_year' && d.getFullYear() !== now.getFullYear()) return;

            let teamName = order.Team || 'Unassigned';
            if (!stats[teamName]) stats[teamName] = { name: teamName, revenue: 0, orders: 0 };
            stats[teamName].revenue += (Number(order['Grand Total']) || 0);
            stats[teamName].orders += 1;
        });
        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [parsedOrders, revenueBreakdownPeriod]);

    const provinceStats = useMemo(() => {
        const stats: Record<string, { name: string, revenue: number, orders: number }> = {};
        const now = new Date();
        parsedOrders.forEach(order => {
            if (!order.Timestamp) return;
            const d = new Date(order.Timestamp);
            if (revenueBreakdownPeriod === 'today' && d.toDateString() !== now.toDateString()) return;
            if (revenueBreakdownPeriod === 'this_month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return;
            
            const provinceName = (order.Location || '').split(/[,|\-|/]/)[0].trim();
            if (!provinceName || provinceName.toUpperCase() === 'N/A') return;
            
            if (!stats[provinceName]) stats[provinceName] = { name: provinceName, revenue: 0, orders: 0 };
            stats[provinceName].revenue += (Number(order['Grand Total']) || 0);
            stats[provinceName].orders += 1;
        });
        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [parsedOrders, revenueBreakdownPeriod]);

    const handleNavChange = (id: string) => {
        if (id === 'reports') {
            setIsReportSubMenuOpen(!isReportSubMenuOpen);
        } else {
            if (['dashboard', 'performance'].includes(id)) {
                setActiveDashboard('admin');
                setCurrentAdminView(id as AdminView);
            } else {
                setActiveDashboard(id as ActiveDashboard);
            }
            setIsMobileSidebarOpen(false);
            setIsReportSubMenuOpen(false);
        }
    };

    const handleReportSubNav = (reportId: ReportType) => {
        setActiveDashboard('reports');
        setActiveReport(reportId);
        setIsMobileSidebarOpen(false);
    };

    const renderContent = () => {
        if (loading && parsedOrders.length === 0) return <div className="flex h-96 items-center justify-center"><Spinner size="lg" /></div>;
        switch (activeDashboard) {
            case 'admin':
                if (currentAdminView === 'dashboard') {
                    return (
                        <DashboardOverview 
                            currentUser={currentUser}
                            parsedOrders={parsedOrders}
                            revenueBreakdownPeriod={revenueBreakdownPeriod}
                            setRevenueBreakdownPeriod={setRevenueBreakdownPeriod}
                            teamRevenueStats={teamRevenueStats}
                            provinceStats={provinceStats}
                            onTeamClick={(t) => { setTeamFilter(t); setActiveDashboard('orders'); }}
                        />
                    );
                }
                return <PerformanceTrackingPage orders={parsedOrders} users={appData.users || []} targets={appData.targets || []} />;
            case 'orders': return <OrdersDashboard onBack={() => setActiveDashboard('admin')} />;
            case 'reports': return <ReportDashboard activeReport={activeReport} onBack={() => setActiveDashboard('admin')} />;
            case 'settings': return <SettingsDashboard onBack={() => setActiveDashboard('admin')} />;
            case 'fulfillment': return <FulfillmentDashboard orders={parsedOrders} />; // មុខងារថ្មី
            default: return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-transparent text-gray-200">
            {/* Sidebar */}
            <div className="hidden md:block">
                <Sidebar 
                    activeDashboard={activeDashboard}
                    currentAdminView={currentAdminView}
                    isReportSubMenuOpen={isReportSubMenuOpen}
                    isProfileSubMenuOpen={isProfileSubMenuOpen}
                    onNavChange={handleNavChange}
                    onReportSubNav={handleReportSubNav}
                    setIsReportSubMenuOpen={setIsReportSubMenuOpen}
                    setIsProfileSubMenuOpen={setIsProfileSubMenuOpen}
                    setEditProfileModalOpen={setEditProfileModalOpen}
                />
            </div>
            
            {/* Mobile Sidebar */}
            <div className="md:hidden">
                {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={() => setIsMobileSidebarOpen(false)} />}
                <Sidebar 
                    isMobile={true}
                    isMobileOpen={isMobileSidebarOpen}
                    activeDashboard={activeDashboard}
                    currentAdminView={currentAdminView}
                    isReportSubMenuOpen={isReportSubMenuOpen}
                    isProfileSubMenuOpen={isProfileSubMenuOpen}
                    onNavChange={handleNavChange}
                    onReportSubNav={handleReportSubNav}
                    setIsReportSubMenuOpen={setIsReportSubMenuOpen}
                    setIsProfileSubMenuOpen={setIsProfileSubMenuOpen}
                    setEditProfileModalOpen={setEditProfileModalOpen}
                />
            </div>

            {/* Main Content Area */}
            <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-16' : 'md:pl-52'}`}>
                <div className="p-2 md:p-3 lg:p-4 pb-24 lg:pb-10 w-full max-w-full overflow-x-hidden relative">
                    <button 
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="md:hidden fixed top-24 left-4 z-40 p-3 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl"
                    >
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    {renderContent()}
                </div>
            </main>

            <BottomNavBar 
                currentView={activeDashboard === 'admin' ? currentAdminView : activeDashboard} 
                onViewChange={handleNavChange} 
                viewConfig={{
                    dashboard: { label: 'សង្ខេប', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg> },
                    fulfillment: { label: 'វេចខ្ចប់', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={2} /></svg> },
                    orders: { label: 'កម្មង់', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg> },
                    reports: { label: 'របាយការណ៍', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414" /></svg> }
                }} 
            />
            {editProfileModalOpen && <EditProfileModal onClose={() => setEditProfileModalOpen(false)} />}
        </div>
    );
};

export default AdminDashboard;


import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import DesktopAdminLayout from '../components/admin/DesktopAdminLayout';
import MobileAdminLayout from '../components/admin/MobileAdminLayout';
import TabletAdminLayout from '../components/admin/TabletAdminLayout';
import DashboardOverview from '../components/admin/DashboardOverview';
import PerformanceTrackingPage from './PerformanceTrackingPage';
import ReportDashboard from './ReportDashboard';
import SettingsDashboard from './SettingsDashboard';
import OrdersDashboard from './OrdersDashboard';
import FulfillmentDashboard from './FulfillmentDashboard';
import EditProfileModal from '../components/common/EditProfileModal';
import { useUrlState } from '../hooks/useUrlState';
import { WEB_APP_URL } from '../constants';
import { FullOrder, ParsedOrder } from '../types';
 
type ActiveDashboard = 'admin' | 'orders' | 'reports' | 'settings' | 'fulfillment';
type AdminView = 'dashboard' | 'performance';
type ReportType = 'overview' | 'performance' | 'profitability' | 'forecasting' | 'shipping' | 'sales_team' | 'sales_page';

const AdminDashboard: React.FC = () => {
    const { 
        appData, currentUser, refreshTimestamp, 
        isSidebarCollapsed
    } = useContext(AppContext);
    
    const [activeDashboard, setActiveDashboard] = useUrlState<ActiveDashboard>('tab', 'admin');
    const [currentAdminView, setCurrentAdminView] = useUrlState<AdminView>('subview', 'dashboard');
    const [activeReport, setActiveReport] = useUrlState<ReportType>('reportType', 'overview');
    
    const [loading, setLoading] = useState(false);
    const [isReportSubMenuOpen, setIsReportSubMenuOpen] = useState(false);
    const [isProfileSubMenuOpen, setIsProfileSubMenuOpen] = useState(false);
    const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
    
    // Responsive State
    const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
    
    const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
    
    // New Date Filter State Object
    const [dateFilter, setDateFilter] = useState({
        preset: 'today',
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    
    // URL State Setters
    const [, setTeamFilter] = useUrlState<string>('teamFilter', '');
    const [, setLocationFilter] = useUrlState<string>('locationFilter', '');
    const [, setUrlDateFilter] = useUrlState<string>('dateFilter', 'today');
    const [, setUrlStartDate] = useUrlState<string>('startDate', '');
    const [, setUrlEndDate] = useUrlState<string>('endDate', '');

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) setScreenSize('mobile');
            else if (width < 1280) setScreenSize('tablet');
            else setScreenSize('desktop');
        };
        handleResize(); 
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    // Helper to filter data based on current state
    const getFilteredData = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return parsedOrders.filter(order => {
            if (!order.Timestamp) return false;
            const d = new Date(order.Timestamp);
            
            if (dateFilter.preset === 'today') {
                return d.toDateString() === now.toDateString();
            } else if (dateFilter.preset === 'this_week') {
                const day = now.getDay();
                const start = new Date(today);
                start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                return d >= start && d <= end;
            } else if (dateFilter.preset === 'this_month') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            } else if (dateFilter.preset === 'custom') {
                const start = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00') : null;
                const end = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59') : null;
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            }
            // fallback defaults
            return d.toDateString() === now.toDateString();
        });
    };

    const filteredData = useMemo(() => getFilteredData(), [parsedOrders, dateFilter]);

    const teamRevenueStats = useMemo(() => {
        const stats: Record<string, { name: string, revenue: number, orders: number }> = {};
        filteredData.forEach(order => {
            let teamName = order.Team || 'Unassigned';
            if (!stats[teamName]) stats[teamName] = { name: teamName, revenue: 0, orders: 0 };
            stats[teamName].revenue += (Number(order['Grand Total']) || 0);
            stats[teamName].orders += 1;
        });
        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [filteredData]);

    const provinceStats = useMemo(() => {
        const stats: Record<string, { name: string, revenue: number, orders: number }> = {};
        filteredData.forEach(order => {
            const provinceName = (order.Location || '').split(/[,|\-|/]/)[0].trim();
            if (!provinceName || provinceName.toUpperCase() === 'N/A') return;
            
            if (!stats[provinceName]) stats[provinceName] = { name: provinceName, revenue: 0, orders: 0 };
            stats[provinceName].revenue += (Number(order['Grand Total']) || 0);
            stats[provinceName].orders += 1;
        });
        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [filteredData]);

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
            setIsReportSubMenuOpen(false);
        }
    };

    const handleReportSubNav = (reportId: ReportType) => {
        setActiveDashboard('reports');
        setActiveReport(reportId);
    };

    const navigateToOrders = (filterType: 'team' | 'location', value: string) => {
        if (filterType === 'team') setTeamFilter(value);
        if (filterType === 'location') setLocationFilter(value);
        
        // Sync Date Context to URL
        setUrlDateFilter(dateFilter.preset);
        if (dateFilter.preset === 'custom') {
            setUrlStartDate(dateFilter.start);
            setUrlEndDate(dateFilter.end);
        } else {
            // Clear custom dates if not custom preset
            setUrlStartDate('');
            setUrlEndDate('');
        }
        
        setActiveDashboard('orders');
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
                            dateFilter={dateFilter}
                            setDateFilter={setDateFilter}
                            teamRevenueStats={teamRevenueStats}
                            provinceStats={provinceStats}
                            onTeamClick={(t) => navigateToOrders('team', t)}
                            onProvinceClick={(p) => navigateToOrders('location', p)}
                        />
                    );
                }
                return <PerformanceTrackingPage orders={parsedOrders} users={appData.users || []} targets={appData.targets || []} />;
            case 'orders': return <OrdersDashboard onBack={() => setActiveDashboard('admin')} />;
            case 'reports': return <ReportDashboard activeReport={activeReport} onBack={() => setActiveDashboard('admin')} />;
            case 'settings': return <SettingsDashboard onBack={() => setActiveDashboard('admin')} />;
            case 'fulfillment': return <FulfillmentDashboard orders={parsedOrders} />;
            default: return null;
        }
    };

    const layoutProps = {
        activeDashboard,
        currentAdminView,
        isReportSubMenuOpen,
        setIsReportSubMenuOpen,
        isProfileSubMenuOpen,
        setIsProfileSubMenuOpen,
        onNavChange: handleNavChange,
        onReportSubNav: handleReportSubNav,
        setEditProfileModalOpen,
        children: renderContent()
    };

    return (
        <>
            {screenSize === 'mobile' ? (
                <MobileAdminLayout {...layoutProps} />
            ) : screenSize === 'tablet' ? (
                <TabletAdminLayout {...layoutProps} />
            ) : (
                <DesktopAdminLayout {...layoutProps} isSidebarCollapsed={isSidebarCollapsed} />
            )}
            {editProfileModalOpen && <EditProfileModal onClose={() => setEditProfileModalOpen(false)} />}
        </>
    );
};

export default AdminDashboard;

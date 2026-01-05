
import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import { ParsedOrder, User } from '../types';
import EditOrderPage from './EditOrderPage';
import OrdersList from '../components/orders/OrdersList';
import { WEB_APP_URL } from '../constants';
import Modal from '../components/common/Modal';
import SearchableProductDropdown from '../components/common/SearchableProductDropdown';
import { useUrlState } from '../hooks/useUrlState';
import PdfExportModal from '../components/admin/PdfExportModal';

interface OrdersDashboardProps {
    onBack: () => void;
}

const availableColumns = [
    { key: 'index', label: '#' },
    { key: 'orderId', label: 'ID' },
    { key: 'customerName', label: 'ឈ្មោះអតិថិជន' },
    { key: 'fulfillmentStore', label: 'ឃ្លាំង/Store' }, // New Column
    { key: 'productInfo', label: 'ព័ត៌មាន Product' },
    { key: 'location', label: 'ទីតាំង' },
    { key: 'total', label: 'សរុប' },
    { key: 'status', label: 'ទូទាត់' },
    { key: 'scheduledTime', label: 'ពេលផ្ញើសារ' }, // New Column
    { key: 'date', label: 'កាលបរិច្ឆេទ' },
    { key: 'actions', label: 'សកម្មភាព' },
    { key: 'check', label: 'Verified' },
];

const OrdersDashboard: React.FC<OrdersDashboardProps> = ({ onBack }) => {
    const { appData, refreshData, refreshTimestamp } = useContext(AppContext);
    const [editingOrderId, setEditingOrderId] = useUrlState<string>('editOrder', '');
    const [urlTeam] = useUrlState<string>('teamFilter', '');
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(availableColumns.map(c => c.key)));
    const [allOrders, setAllOrders] = useState<ParsedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAllOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${WEB_APP_URL}/api/admin/all-orders`);
            const json = await res.json();
            if (json.status === 'success') {
                const parsed = (json.data || []).filter((o: any) => o !== null).map((o: any) => {
                    let products = []; try { if (o['Products (JSON)']) products = JSON.parse(o['Products (JSON)']); } catch (e) {}
                    return { ...o, Products: products };
                });
                setAllOrders(parsed);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchAllOrders(); }, [refreshTimestamp]);

    const filteredOrders = useMemo(() => {
        return allOrders.filter(o => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return o['Order ID'].toLowerCase().includes(q) || o['Customer Name'].toLowerCase().includes(q);
            }
            return true;
        });
    }, [allOrders, searchQuery]);

    if (loading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
    if (editingOrderId) {
        const order = allOrders.find(o => o['Order ID'] === editingOrderId);
        return order ? <EditOrderPage order={order} onSaveSuccess={() => { setEditingOrderId(''); fetchAllOrders(); }} onCancel={() => setEditingOrderId('')} /> : null;
    }

    return (
        <div className="max-w-[115rem] mx-auto p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">គ្រប់គ្រងប្រតិបត្តិការណ៍</h1>
                <button onClick={onBack} className="btn btn-secondary">Back</button>
            </div>

            <div className="page-card !p-3 mb-6 bg-gray-800/40">
                <input type="text" placeholder="ស្វែងរក ID ឬ ឈ្មោះ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input max-w-md bg-gray-900/50" />
            </div>

            <OrdersList orders={filteredOrders} onEdit={o => setEditingOrderId(o['Order ID'])} showActions={true} visibleColumns={visibleColumns} />
        </div>
    );
};

export default OrdersDashboard;

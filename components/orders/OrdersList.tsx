
import React, { useContext, useState, useEffect } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { LABEL_PRINTER_URL_BASE, WEB_APP_URL } from '../../constants';
import { useOrderTotals } from './OrderGrandTotal';
import OrdersListDesktop from './OrdersListDesktop';
import OrdersListMobile from './OrdersListMobile';

interface OrdersListProps {
    orders: ParsedOrder[];
    onEdit?: (order: ParsedOrder) => void;
    showActions: boolean;
    visibleColumns?: Set<string>;
    // Selection Props
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    onToggleSelectAll?: (ids: string[]) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ 
    orders, onEdit, showActions, visibleColumns,
    selectedIds = new Set(), onToggleSelect, onToggleSelectAll
}) => {
    const { refreshData } = useContext(AppContext);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [localOrders, setLocalOrders] = useState<ParsedOrder[]>(orders);

    useEffect(() => {
        setLocalOrders(orders);
    }, [orders]);

    // Use shared hook for totals
    const totals = useOrderTotals(orders);

    const toggleOrderVerified = async (orderId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        // Optimistic Update
        setLocalOrders(prev => prev.map(o => o['Order ID'] === orderId ? { ...o, IsVerified: newStatus } : o));
        setUpdatingIds(prev => new Set(prev).add(orderId));
        
        try {
            const response = await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetName: 'AllOrders', primaryKey: { 'Order ID': orderId }, newData: { 'IsVerified': newStatus } })
            });
            if (!response.ok) throw new Error("Failed to save");
            refreshData();
        } catch (e) {
            console.error("Verification toggle failed:", e);
            // Revert on error
            setLocalOrders(prev => prev.map(o => o['Order ID'] === orderId ? { ...o, IsVerified: currentStatus } : o));
            alert("រក្សាទុកស្ថានភាពមិនបានសម្រេច!");
        } finally {
            setUpdatingIds(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    };

    const formatPhone = (val: string) => {
        let phone = (val || '').replace(/[^0-9]/g, '');
        if (phone.length > 0) phone = '0' + phone.replace(/^0+/, '');
        return phone;
    };

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handlePrint = (order: ParsedOrder) => {
        if (!LABEL_PRINTER_URL_BASE || !order) return;
        const validatedPhone = formatPhone(order['Customer Phone']);
        const queryParams = new URLSearchParams({
            id: order['Order ID'],
            name: order['Customer Name'] || '',
            phone: validatedPhone,
            location: order.Location || '',
            address: order['Address Details'] || '',
            total: (order['Grand Total'] || 0).toString(),
            payment: order['Payment Status'] || 'Unpaid',
            shipping: order['Internal Shipping Method'] || 'N/A',
            page: order.Page || '',
            user: order.User || '',
        });
        const note = order.Note || '';
        const mapMatch = note.match(/https?:\/\/(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)\/[^\s]+/);
        if (mapMatch) queryParams.set('map', mapMatch[0]);
        window.open(`${LABEL_PRINTER_URL_BASE}?${queryParams.toString()}`, '_blank');
    };

    return (
        <div className="w-full flex flex-col">
            <div className="flex-grow space-y-4">
                {/* Desktop View */}
                <div className="hidden md:block">
                    <OrdersListDesktop 
                        orders={localOrders}
                        totals={totals}
                        visibleColumns={visibleColumns}
                        selectedIds={selectedIds}
                        onToggleSelect={onToggleSelect}
                        onToggleSelectAll={onToggleSelectAll}
                        onEdit={onEdit}
                        handlePrint={handlePrint}
                        handleCopy={handleCopy}
                        copiedId={copiedId}
                        toggleOrderVerified={toggleOrderVerified}
                        updatingIds={updatingIds}
                    />
                </div>

                {/* Mobile View */}
                <div className="md:hidden">
                    <OrdersListMobile 
                        orders={localOrders}
                        totals={totals}
                        visibleColumns={visibleColumns}
                        selectedIds={selectedIds}
                        onToggleSelect={onToggleSelect}
                        onEdit={onEdit}
                        handlePrint={handlePrint}
                        handleCopy={handleCopy}
                        copiedId={copiedId}
                        toggleOrderVerified={toggleOrderVerified}
                        updatingIds={updatingIds}
                    />
                </div>
            </div>

            {/* Aesthetic Spacer */}
            <div className="h-64 md:h-[400px] w-full pointer-events-none opacity-0 shrink-0" aria-hidden="true"></div>
        </div>
    );
};

export default OrdersList;

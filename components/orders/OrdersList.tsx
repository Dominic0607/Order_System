
import React, { useContext, useState, useEffect } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { WEB_APP_URL } from '../../constants';
import Spinner from '../common/Spinner';

interface OrdersListProps {
    orders: ParsedOrder[];
    onEdit?: (order: ParsedOrder) => void;
    showActions: boolean;
    visibleColumns?: Set<string>;
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, onEdit, showActions, visibleColumns }) => {
    const { appData, refreshData } = useContext(AppContext);
    const isVisible = (key: string) => !visibleColumns || visibleColumns.has(key);

    return (
        <div className="overflow-x-auto page-card !p-0 shadow-2xl">
            <table className="admin-table w-full text-sm">
                <thead>
                    <tr className="bg-gray-800/80 text-gray-400 font-black uppercase text-[10px] tracking-wider">
                        {isVisible('index') && <th className="p-4 w-12">#</th>}
                        {isVisible('orderId') && <th className="p-4 text-center">Order ID</th>}
                        {isVisible('customerName') && <th className="p-4 text-left">អតិថិជន</th>}
                        {isVisible('fulfillmentStore') && <th className="p-4 text-left">ឃ្លាំង/Store</th>}
                        {isVisible('productInfo') && <th className="p-4 text-left">ទំនិញ & Tags</th>}
                        {isVisible('total') && <th className="p-4 text-right">សរុប</th>}
                        {isVisible('status') && <th className="p-4 text-center">ទូទាត់</th>}
                        {isVisible('scheduledTime') && <th className="p-4 text-left">ពេលផ្ញើសារ</th>}
                        {isVisible('date') && <th className="p-4 text-left">កាលបរិច្ឆេទ</th>}
                        {isVisible('actions') && <th className="p-4 text-center">សកម្មភាព</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                    {orders.map((order, idx) => (
                        <tr key={order['Order ID']} className="hover:bg-gray-700/20 transition-all">
                            {isVisible('index') && <td className="p-4 text-center text-gray-500 font-bold">{idx + 1}</td>}
                            {isVisible('orderId') && <td className="p-4 text-center font-black text-blue-400">{order['Order ID']}</td>}
                            {isVisible('customerName') && <td className="p-4 font-bold text-gray-100">{order['Customer Name']}</td>}
                            {isVisible('fulfillmentStore') && <td className="p-4 text-gray-300 font-medium">{order.FulfillmentStore || '-'}</td>}
                            {isVisible('productInfo') && (
                                <td className="p-4">
                                    {order.Products.map((p, i) => (
                                        <div key={i} className="text-[11px] mb-1">
                                            <span className="text-gray-200 font-bold">{p.quantity}x {p.name}</span>
                                            {p.tags && <span className="ml-2 text-[9px] bg-blue-900/50 text-blue-300 px-1.5 rounded">{p.tags}</span>}
                                        </div>
                                    ))}
                                </td>
                            )}
                            {isVisible('total') && <td className="p-4 text-right font-black text-blue-400">${order['Grand Total'].toFixed(2)}</td>}
                            {isVisible('status') && (
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${order['Payment Status'] === 'Paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {order['Payment Status']}
                                    </span>
                                </td>
                            )}
                            {isVisible('scheduledTime') && (
                                <td className="p-4 text-[10px] text-orange-400 font-bold">
                                    {order.ScheduledTime ? new Date(order.ScheduledTime).toLocaleString('km-KH') : '-'}
                                </td>
                            )}
                            {isVisible('date') && <td className="p-4 text-[10px] text-gray-500">{new Date(order.Timestamp).toLocaleDateString('km-KH')}</td>}
                            {isVisible('actions') && (
                                <td className="p-4 text-center">
                                    <button onClick={() => onEdit?.(order)} className="text-blue-400 hover:text-white transition-colors font-black text-xs uppercase">Edit</button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OrdersList;

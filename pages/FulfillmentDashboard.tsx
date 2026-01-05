
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { useFulfillment } from '../hooks/useFulfillment';
import Spinner from '../components/common/Spinner';
import { convertGoogleDriveUrl } from '../utils/fileUtils';
import { ParsedOrder, FulfillmentStatus } from '../types';

const FulfillmentCard: React.FC<{ 
    order: ParsedOrder; 
    onStatusChange: (id: string, status: FulfillmentStatus) => void;
    isLoading: boolean;
}> = ({ order, onStatusChange, isLoading }) => {
    const currentStatus = order.FulfillmentStatus || 'Pending';
    
    return (
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5 space-y-4 hover:border-blue-500/50 transition-all shadow-lg animate-fade-in relative overflow-hidden group">
            {isLoading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
                    <Spinner size="md" />
                </div>
            )}
            
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="text-white font-black uppercase text-sm tracking-tight">{order['Order ID'].substring(0, 8)}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{order.Page} ({order.Team})</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-300">{order['Customer Name']}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{order['Customer Phone']}</p>
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-2">
                {order.Products.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex-shrink-0">
                            <img src={convertGoogleDriveUrl(p.image)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="text-xs font-bold text-gray-200 truncate leading-tight">{p.name}</p>
                            <div className="flex justify-between mt-0.5">
                                <span className="text-[10px] text-blue-400 font-black">Qty: {p.quantity}</span>
                                {p.colorInfo && <span className="text-[10px] text-purple-400 italic">ពណ៌: {p.colorInfo}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-2 flex gap-2">
                {currentStatus === 'Pending' && (
                    <button 
                        onClick={() => onStatusChange(order['Order ID'], 'Packing')}
                        className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase py-2 rounded-xl"
                    >
                        ចាប់ផ្តើមវេចខ្ចប់
                    </button>
                )}
                {currentStatus === 'Packing' && (
                    <button 
                        onClick={() => onStatusChange(order['Order ID'], 'Shipped')}
                        className="flex-1 btn bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase py-2 rounded-xl"
                    >
                        ផ្ញើចេញរួចរាល់
                    </button>
                )}
                {currentStatus === 'Shipped' && (
                    <div className="flex-1 text-center py-2 bg-gray-700/50 rounded-xl text-[10px] font-black text-gray-400 uppercase">
                        ✅ បានបញ្ចេញទំនិញ
                    </div>
                )}
            </div>
        </div>
    );
};

const FulfillmentDashboard: React.FC<{ orders: ParsedOrder[] }> = ({ orders }) => {
    const { refreshData } = useContext(AppContext);
    const { ordersByStatus, updateStatus, loadingId } = useFulfillment(orders, refreshData);
    const [activeTab, setActiveTab] = useState<FulfillmentStatus>('Pending');

    const filteredList = useMemo(() => {
        if (activeTab === 'Pending') return ordersByStatus.Pending;
        if (activeTab === 'Packing') return ordersByStatus.Packing;
        return ordersByStatus.Shipped;
    }, [activeTab, ordersByStatus]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800/20 p-5 rounded-[2rem] border border-white/5 backdrop-blur-md">
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Fulfillment Store</h1>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {(['Pending', 'Packing', 'Shipped'] as const).map(status => (
                        <button 
                            key={status}
                            onClick={() => setActiveTab(status)}
                            className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === status ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            {status === 'Pending' ? 'ត្រូវវេចខ្ចប់' : status === 'Packing' ? 'កំពុងវេចខ្ចប់' : 'បានផ្ញើចេញ'}
                            <span className="ml-2 px-1.5 py-0.5 bg-black/30 rounded-md text-[8px]">{ordersByStatus[status].length}</span>
                        </button>
                    ))}
                </div>
            </div>

            {filteredList.length === 0 ? (
                <div className="py-20 text-center bg-gray-800/10 rounded-[3rem] border-2 border-dashed border-gray-700/50">
                    <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-sm">មិនមានទិន្នន័យក្នុងបញ្ជីនេះទេ</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredList.map(order => (
                        <FulfillmentCard 
                            key={order['Order ID']} 
                            order={order} 
                            onStatusChange={updateStatus}
                            isLoading={loadingId === order['Order ID']}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FulfillmentDashboard;

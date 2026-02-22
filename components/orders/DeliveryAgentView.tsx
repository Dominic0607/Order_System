
import React, { useState, useEffect, useMemo } from 'react';
import { ParsedOrder } from '../../types';
import { WEB_APP_URL } from '../../constants';
import Spinner from '../common/Spinner';

interface DeliveryAgentViewProps {
    orderIds: string[];
    storeName: string;
}

const DeliveryAgentView: React.FC<DeliveryAgentViewProps> = ({ orderIds, storeName }) => {
    const [orders, setOrders] = useState<ParsedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [costs, setCosts] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                // Fetch last 30 days to find these IDs
                const res = await fetch(`${WEB_APP_URL}/api/admin/all-orders?days=30`);
                const result = await res.json();
                if (result.status === 'success') {
                    const idSet = new Set(orderIds);
                    const found = result.data
                        .filter((o: any) => o && idSet.has(o['Order ID']))
                        .map((o: any) => ({
                            ...o,
                            Products: o['Products (JSON)'] ? JSON.parse(o['Products (JSON)']) : [],
                            'Internal Cost': Number(o['Internal Cost']) || 0
                        }));
                    
                    setOrders(found);
                    const initialCosts: Record<string, number> = {};
                    found.forEach((o: any) => {
                        initialCosts[o['Order ID']] = o['Internal Cost'];
                    });
                    setCosts(initialCosts);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [orderIds]);

    const handleCostChange = (id: string, val: string) => {
        const num = parseFloat(val);
        setCosts(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const updates = orders.map(o => {
                return fetch(`${WEB_APP_URL}/api/admin/update-row`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sheetName: 'Orders',
                        primaryKey: { 'Order ID': o['Order ID'] },
                        newData: { 'Internal Cost': costs[o['Order ID']] }
                    })
                });
            });
            await Promise.all(updates);
            setIsSubmitted(true);
        } catch (e) {
            alert("Submission failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalShipCost = useMemo(() => Object.values(costs).reduce((a, b) => a + b, 0), [costs]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-950"><Spinner size="lg" /></div>;

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#0f172a] p-6 flex flex-col items-center justify-center animate-fade-in">
                <div id="summary-card" className="bg-gray-900 border-2 border-emerald-500/30 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">បញ្ជាក់ថ្លៃដឹកសរុប</h2>
                        <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">{storeName}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">ចំនួនកញ្ចប់</p>
                            <p className="text-2xl font-black text-white">{orders.length}</p>
                        </div>
                        <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">ថ្លៃដឹកសរុប</p>
                            <p className="text-2xl font-black text-white">${totalShipCost.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] text-gray-600 font-bold italic">សូមថតរូបអេក្រង់នេះ ដើម្បីបញ្ជាក់ជាមួយក្រុមហ៊ុន</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => {
                        // Simple notification as copying image is restricted in most mobile browsers without library
                        alert("Please take a screenshot of the summary card above.");
                    }}
                    className="mt-8 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl active:scale-95 transition-all"
                >
                    Screenshot & Save
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4 sm:p-8 flex flex-col">
            <div className="max-w-2xl mx-auto w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase">Confirm Ship Cost</h1>
                    <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px]">Delivery Agent Portal | {storeName}</p>
                </div>

                <div className="bg-gray-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-4 bg-gray-800/50 border-b border-white/5 flex justify-between items-center px-6">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order List ({orders.length})</span>
                        <span className="text-[10px] font-black text-blue-400 uppercase">Edit Ship Cost Below</span>
                    </div>
                    
                    <div className="divide-y divide-white/5">
                        {orders.map((o, idx) => (
                            <div key={o['Order ID']} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500 border border-white/5">
                                    {idx + 1}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="text-sm font-bold truncate">{o['Customer Name']}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">{o['Order ID']}</p>
                                </div>
                                <div className="flex-shrink-0 w-24">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            value={costs[o['Order ID']] ?? ''}
                                            onChange={(e) => handleCostChange(o['Order ID'], e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-6 pr-3 text-right text-sm font-black text-blue-400 focus:border-blue-500 focus:ring-0 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-gray-800/30 border-t border-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-center px-2">
                            <span className="text-xs font-black text-gray-400 uppercase">Total Confirmation</span>
                            <span className="text-2xl font-black text-white">${totalShipCost.toFixed(2)}</span>
                        </div>
                        
                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? <Spinner size="sm" /> : (
                                <>
                                    Confirm & Send <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryAgentView;

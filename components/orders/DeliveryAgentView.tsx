import React, { useState, useEffect, useMemo } from 'react';
import { ParsedOrder } from '../../types';
import { WEB_APP_URL } from '../../constants';
import Spinner from '../common/Spinner';
import html2canvas from 'html2canvas';

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
    const [isExpired, setIsExpired] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        // Check Expiry
        const urlParams = new URLSearchParams(window.location.search);
        const expiresAt = parseInt(urlParams.get('expires') || '0');
        if (expiresAt && Date.now() > expiresAt) {
            setIsExpired(true);
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            try {
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

    const handleCopyImage = async () => {
        const element = document.getElementById('summary-card');
        if (!element) return;
        
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a',
                scale: 2,
                logging: false,
                useCORS: true
            });
            
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        const data = [new ClipboardItem({ [blob.type]: blob })];
                        await navigator.clipboard.write(data);
                        setCopyStatus('success');
                        setTimeout(() => setCopyStatus('idle'), 3000);
                    } catch (err) {
                        console.error("Clipboard write failed", err);
                        // Fallback: download
                        const dataUrl = canvas.toDataURL('image/jpeg');
                        const link = document.createElement('a');
                        link.download = 'delivery_confirmation.jpg';
                        link.href = dataUrl;
                        link.click();
                        setCopyStatus('error');
                        setTimeout(() => setCopyStatus('idle'), 3000);
                    }
                }
            }, 'image/png');
        } catch (e) {
            console.error("Canvas failed", e);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-950"><Spinner size="lg" /></div>;

    if (isExpired) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Link ហួសសុពលភាព (Link Expired)</h2>
                <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">Link នេះមានសុពលភាពត្រឹមតែ ២ ម៉ោងប៉ុណ្ណោះ។ សូមទាក់ទងក្រុមហ៊ុនដើម្បីផ្ញើ Link ថ្មី។</p>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#020617] p-6 flex flex-col items-center justify-center animate-fade-in">
                <div id="summary-card" className="bg-gray-900 border-2 border-emerald-500/30 p-8 rounded-[3rem] w-full max-w-md shadow-2xl text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">បញ្ជាក់ថ្លៃដឹកសរុប (Confirmation)</h2>
                        <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">{storeName}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5 shadow-inner">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">ចំនួនកញ្ចប់ (Count)</p>
                            <p className="text-3xl font-black text-white">{orders.length}</p>
                        </div>
                        <div className="bg-blue-600/10 p-5 rounded-[2rem] border border-blue-500/20 shadow-inner">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">ថ្លៃដឹកសរុប (Total Cost)</p>
                            <p className="text-3xl font-black text-white">${totalShipCost.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] text-gray-600 font-bold italic">សូមប្រើប៊ូតុងខាងក្រោមដើម្បី Copy រូបភាព រួចយកទៅ Paste ក្នុង Telegram</p>
                    </div>
                </div>
                
                <div className="mt-8 flex flex-col w-full max-w-md gap-3">
                    <button 
                        onClick={handleCopyImage}
                        className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-xl ${
                            copyStatus === 'success' ? 'bg-emerald-600 text-white' : 
                            copyStatus === 'error' ? 'bg-red-600 text-white' : 'bg-white text-black active:scale-95'
                        }`}
                    >
                        {copyStatus === 'success' ? (
                            <>✅ បានចម្លងរូបភាព (Copied Image!)</>
                        ) : copyStatus === 'error' ? (
                            <>❌ កំហុស (Failed - Downloading Instead)</>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ចម្លងរូបភាព (Copy Image)
                            </>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => setIsSubmitted(false)}
                        className="py-4 bg-gray-800 text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl border border-white/5 active:scale-95 transition-all"
                    >
                        កែសម្រួលឡើងវិញ (Back & Edit)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 sm:p-8 flex flex-col pb-24">
            <div className="max-w-3xl mx-auto w-full space-y-8">
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none drop-shadow-2xl">បញ្ជាក់ថ្លៃសេវាដឹក</h1>
                    <div className="h-1.5 w-16 bg-blue-600 rounded-full mx-auto"></div>
                    <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px]">Delivery Agent Portal | {storeName}</p>
                </div>

                <div className="bg-gray-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
                    <div className="p-5 bg-gray-800/50 border-b border-white/5 flex justify-between items-center px-8">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">បញ្ជីការកម្មង់ (Order List: {orders.length})</span>
                        <span className="text-[10px] font-black text-blue-400 uppercase">កែសម្រួលខាងក្រោម (Edit Below)</span>
                    </div>
                    
                    <div className="divide-y divide-white/5">
                        {orders.map((o, idx) => (
                            <div key={o['Order ID']} className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-4 flex-grow min-w-0">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500 border border-white/5 group-hover:border-blue-500/30 transition-all">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-black text-white truncate uppercase tracking-tight">{o['Customer Name']}</p>
                                            <span className="text-xs font-black text-blue-400 font-mono bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/20">{o['Customer Phone']}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium truncate flex items-center gap-1.5">
                                            <span className="text-blue-500/50">📍</span> {o.Location} 
                                            <span className="text-gray-700 mx-1">|</span> 
                                            <span className="opacity-60">ID: {o['Order ID']}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 border-t border-white/5 sm:border-0 pt-4 sm:pt-0">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">តម្លៃអីវ៉ាន់ (Total)</p>
                                        <p className="text-base font-black text-emerald-400 italic">${Number(o['Grand Total']).toFixed(2)}</p>
                                    </div>
                                    
                                    <div className="w-32">
                                        <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest mb-1.5 ml-1">ថ្លៃដឹក (Ship Cost)</p>
                                        <div className="relative group/input">
                                            <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-sm group-focus-within/input:bg-blue-500/10 transition-all"></div>
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500/50 text-xs font-black z-10">$</span>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                value={costs[o['Order ID']] ?? ''}
                                                onChange={(e) => handleCostChange(o['Order ID'], e.target.value)}
                                                className="relative w-full bg-black/60 border-2 border-white/10 rounded-2xl py-3 pl-8 pr-4 text-right text-base font-black text-blue-400 focus:border-blue-500 focus:bg-black/80 focus:ring-0 transition-all shadow-2xl z-0"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 bg-gray-800/30 border-t border-white/10 flex flex-col gap-6">
                        <div className="flex justify-between items-center px-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">សរុបការបញ្ជាក់ (Total Confirmation)</span>
                                <span className="text-[8px] font-bold text-gray-600 uppercase">Khmer & English Bilingual View</span>
                            </div>
                            <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] italic">${totalShipCost.toFixed(2)}</span>
                        </div>
                        
                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl shadow-blue-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 border border-blue-400/20"
                        >
                            {isSubmitting ? <Spinner size="sm" /> : (
                                <>
                                    <span>បញ្ជូនការបញ្ជាក់ (Confirm & Send)</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
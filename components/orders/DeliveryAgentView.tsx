
import React, { useState, useEffect, useMemo } from 'react';
import { ParsedOrder } from '../../types';
import { WEB_APP_URL } from '../../constants';
import Spinner from '../common/Spinner';
import html2canvas from 'html2canvas';

interface DeliveryAgentViewProps {
    orderIds: string[];
    returnOrderIds: string[];
    failedOrderIds: string[];
    storeName: string;
}

const DeliveryAgentView: React.FC<DeliveryAgentViewProps> = ({ orderIds, returnOrderIds, failedOrderIds, storeName }) => {
    const [orders, setOrders] = useState<ParsedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [costs, setCosts] = useState<Record<string, number>>({});
    
    // Explicitly track returned and failed IDs as provided from Step 1
    const returnedSet = useMemo(() => new Set(returnOrderIds), [returnOrderIds]);
    const failedSet = useMemo(() => new Set(failedOrderIds), [failedOrderIds]);
    const successSet = useMemo(() => new Set(orderIds), [orderIds]);
    
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const expiresAt = parseInt(urlParams.get('e') || urlParams.get('expires') || '0');
        if (expiresAt && Date.now() > expiresAt) {
            setIsExpired(true);
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch(`${WEB_APP_URL}/api/admin/all-orders?days=30`, { headers });
                const result = await res.json();
                if (result.status === 'success') {
                    const allTargetIds = new Set([...orderIds, ...returnOrderIds, ...failedOrderIds]);
                    const found = result.data
                        .filter((o: any) => o && allTargetIds.has(o['Order ID']))
                        .map((o: any) => ({
                            ...o,
                            Products: o['Products (JSON)'] ? JSON.parse(o['Products (JSON)']) : [],
                            'Internal Cost': Number(o['Internal Cost']) || 0
                        }));
                    
                    setOrders(found);
                    const initialCosts: Record<string, number> = {};
                    found.forEach((o: any) => { initialCosts[o['Order ID']] = o['Internal Cost']; });
                    setCosts(initialCosts);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [orderIds, returnOrderIds, failedOrderIds]);

    const handleCostChange = (id: string, val: string) => {
        const num = parseFloat(val);
        setCosts(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
    };

    const handleSubmit = async () => {
        if (orders.length === 0) return;
        setIsSubmitting(true);
        let failureCount = 0;
        const failedOrders: string[] = [];

        try {
            // Algorithm: Progressive Queue Processing (Concurrency 5 for speed)
            // Balancing speed and safety for Google Sheets via Node backend
            const concurrencyLimit = 5;
            const queue = [...orders];
            const totalToProcess = queue.length;
            let processedCount = 0;

            const processItem = async (o: ParsedOrder) => {
                const isDelivered = successSet.has(o['Order ID']);
                const isReturned = returnedSet.has(o['Order ID']);
                
                const finalCost = isDelivered ? (costs[o['Order ID']] || 0) : 0;
                
                // Surgical update data
                const updateData: any = {
                    'Internal Cost': finalCost,
                };

                if (isDelivered) {
                    updateData['Fulfillment Status'] = 'Delivered';
                    updateData['Delivered Time'] = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    
                    // --- Past Date Logic ---
                    if (o.Timestamp) {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                        const match = String(o.Timestamp).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                        
                        if (match) {
                            const orderDate = `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
                            if (orderDate !== todayStr) {
                                const originalDD = match[3].padStart(2,'0');
                                const originalMM = match[2].padStart(2,'0');
                                const originalYY = match[1].slice(-2);
                                const noteAdd = `(កាលបរិចេ្ឆទទម្លាក់ការកម្មង់ : ${originalDD}/${originalMM}/${originalYY})`;
                                
                                let newNote = o.Note || '';
                                if (!newNote.includes('កាលបរិចេ្ឆទទម្លាក់ការកម្មង់')) {
                                    updateData.Note = newNote ? `${newNote}\n${noteAdd}` : noteAdd;
                                }
                                
                                let timeStr = '12:00:00';
                                const timeMatch = String(o.Timestamp).match(/\s(\d{1,2}:\d{2}(?::\d{2})?)/);
                                if (timeMatch) timeStr = timeMatch[1].length === 5 ? `${timeMatch[1]}:00` : timeMatch[1];
                                
                                updateData.Timestamp = `${todayStr} ${timeStr}`;
                            }
                        }
                    }
                } else if (isReturned) {
                    updateData['Fulfillment Status'] = 'Returned';
                }

                const payload = {
                    orderId: o['Order ID'],
                    team: o.Team,
                    userName: 'Delivery Agent',
                    newData: updateData
                };

                let success = false;
                let attempts = 0;
                const maxAttempts = 3; // Reduced for faster failure detection, backend has its own retries
                
                const token = localStorage.getItem('token');
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                while (!success && attempts < maxAttempts) {
                    attempts++;
                    try {
                        const response = await fetch(`${WEB_APP_URL}/api/admin/update-order`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(payload)
                        });

                        if (response.ok) {
                            success = true;
                        } else {
                            // Exponential backoff
                            const delay = Math.min(5000, (Math.pow(2, attempts) * 500));
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    } catch (err) {
                        const delay = Math.min(5000, (Math.pow(2, attempts) * 500));
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                
                if (!success) {
                    failureCount++;
                    failedOrders.push(o['Order ID']);
                }

                processedCount++;
                console.log(`Agent Progress: ${processedCount}/${totalToProcess} (${o['Order ID']}: ${success ? 'OK' : 'FAIL'})`);
                
                // Minimal breather (300ms instead of 1500ms for high performance)
                await new Promise(resolve => setTimeout(resolve, 300));
            };

            // Run in concurrent batches
            for (let i = 0; i < queue.length; i += concurrencyLimit) {
                const batch = queue.slice(i, i + concurrencyLimit);
                await Promise.all(batch.map(processItem));
            }

            if (failureCount > 0) {
                 alert(`ការបញ្ជូនបានបញ្ចប់ ប៉ុន្តែមាន ${failureCount} កញ្ចប់បរាជ័យក្នុងការ Update: (${failedOrders.join(', ')})\n\nសូមព្យាយាមម្តងទៀតសម្រាប់កញ្ចប់ដែលបរាជ័យ។`);
            } else {
                 setIsSubmitted(true);
            }
        } catch (e: any) {
            console.error("Critical Submission Error:", e);
            alert(`ការបញ្ជូនបរាជ័យ: ${e.message}\n\nគន្លឹះ៖ សូមពិនិត្យអ៊ីនធឺណិត រួចចុចបញ្ជូនម្តងទៀត។`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalShipCost = useMemo(() => {
        return orders.reduce((acc, o) => {
            if (!successSet.has(o['Order ID'])) return acc;
            return acc + (costs[o['Order ID']] || 0);
        }, 0);
    }, [costs, successSet, orders]);

    const financialStats = useMemo(() => {
        const successOrders = orders.filter(o => successSet.has(o['Order ID']));
        const nonSuccessOrders = orders.filter(o => !successSet.has(o['Order ID']));
        
        return {
            totalSuccess: successOrders.reduce((acc, o) => acc + (Number(o['Grand Total']) || 0), 0),
            paidSuccess: successOrders.filter(o => o['Payment Status'] === 'Paid').reduce((acc, o) => acc + (Number(o['Grand Total']) || 0), 0),
            codSuccess: successOrders.filter(o => o['Payment Status'] !== 'Paid').reduce((acc, o) => acc + (Number(o['Grand Total']) || 0), 0),
            totalFailed: nonSuccessOrders.reduce((acc, o) => acc + (Number(o['Grand Total']) || 0), 0)
        };
    }, [orders, successSet]);

    const handleCopyImage = async () => {
        const element = document.getElementById('summary-card');
        if (!element) return;
        try {
            setCopyStatus('idle');
            // Ensure fonts are loaded before capturing
            await document.fonts.ready;
            
            // Artificial delay to ensure full render
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const canvas = await html2canvas(element, {
                backgroundColor: '#020617',
                scale: 4, // Higher scale for extreme clarity
                logging: false,
                useCORS: true,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('summary-card');
                    if (el) {
                        // FORCE FONT AND REMOVE BREAKING STYLES FOR KHMER
                        el.style.fontFamily = "'Kantumruy Pro', sans-serif";
                        const allNodes = el.querySelectorAll('*');
                        allNodes.forEach(node => {
                            const htmlNode = node as HTMLElement;
                            // Khmer rendering breaks with letter-spacing or uppercase in some canvas engines
                            htmlNode.style.letterSpacing = 'normal';
                            htmlNode.style.textTransform = 'none';
                            htmlNode.style.fontFamily = "'Kantumruy Pro', sans-serif";
                        });
                    }
                }
            });
            
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        // Standard clipboard copy (modern browsers)
                        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                        setCopyStatus('success');
                        setTimeout(() => setCopyStatus('idle'), 4000);
                    } catch (err) {
                        console.error("Clipboard write failed, falling back to download:", err);
                        // Fallback only if clipboard fails (required to Paste in Telegram)
                        const dataUrl = canvas.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.download = `confirm_${Date.now()}.png`;
                        link.href = dataUrl;
                        link.click();
                        setCopyStatus('error');
                        setTimeout(() => setCopyStatus('idle'), 4000);
                    }
                }
            }, 'image/png');
        } catch (e) { 
            console.error("Canvas capture failed:", e);
            setCopyStatus('error'); 
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0E11]"><Spinner size="lg" /></div>;

    if (isExpired) {
        return (
            <div className="min-h-full bg-[#0B0E11] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-[#F6465D]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#F6465D]/20 shadow-xl shadow-[#F6465D]/5">
                    <svg className="w-10 h-10 text-[#F6465D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">Link ហួសសុពលភាព</h2>
                <p className="text-[#F6465D] font-bold text-sm mb-4">Link Expired</p>
                <p className="text-gray-500 max-w-xs leading-relaxed text-xs">Link នេះមានសុពលភាពត្រឹមតែ ២ ម៉ោងប៉ុណ្ណោះ។ សូមទាក់ទងក្រុមហ៊ុនដើម្បីផ្ញើ Link ថ្មី។</p>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-full bg-[#0B0E11] p-4 flex flex-col items-center justify-center animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FCD535]/5 blur-[120px] -mr-48 -mt-48 rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0ECB81]/5 blur-[120px] -ml-48 -mb-48 rounded-full pointer-events-none"></div>

                <div id="summary-card" className="bg-[#181A20] border-2 border-[#0ECB81]/30 p-8 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(14,203,129,0.1)] text-center space-y-8 relative overflow-hidden z-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#0ECB81]/5 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none"></div>
                    
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#0ECB81]/10 rounded-full flex items-center justify-center mx-auto border-2 border-[#0ECB81]/30 shadow-[0_0_20px_rgba(14,203,129,0.2)] mb-4">
                                <svg className="w-8 h-8 text-[#0ECB81]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white leading-snug">បញ្ជាក់ថ្លៃដឹកសរុប<br/><span className="text-base text-gray-500 uppercase tracking-widest font-black">(Confirmation)</span></h2>
                            <p className="text-[#FCD535] bg-[#FCD535]/10 px-4 py-1.5 rounded-full border border-[#FCD535]/20 text-[10px] font-black uppercase tracking-[0.2em] mt-3 inline-block shadow-inner">{storeName}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-[#0B0E11] p-6 rounded-[2rem] border border-[#2B3139] shadow-inner text-center">
                                <p className="text-[10px] font-bold text-gray-500 mb-2">ចំនួនកញ្ចប់ (COUNT)</p>
                                <p className="text-4xl font-black text-white">{orderIds.length}</p>
                            </div>
                            <div className="bg-gradient-to-br from-[#FCD535]/10 to-transparent p-6 rounded-[2rem] border border-[#FCD535]/20 shadow-inner text-center">
                                <p className="text-[10px] font-bold text-[#FCD535] mb-2">ថ្លៃដឹកសរុប (TOTAL)</p>
                                <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(252,213,53,0.3)]">${(Number(totalShipCost) || 0).toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="bg-[#0B0E11]/80 p-7 rounded-[2.5rem] border border-[#2B3139] text-left space-y-4 shadow-inner">
                            <div className="flex justify-between items-center text-white font-black border-b border-[#2B3139] pb-4 mb-1">
                                <span className="text-[13px] font-bold">សរុបទឹកប្រាក់ (ដឹកជោគជ័យ)</span>
                                <span className="text-2xl tracking-tighter">${(Number(financialStats.totalSuccess) || 0).toFixed(2)}</span>
                            </div>
                            <div className="space-y-3 font-bold text-gray-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">├─ 🟢 Paid (បង់រួច)</span>
                                    <span className="text-2xl text-[#0ECB81] font-black">${(Number(financialStats.paidSuccess) || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">└─ 🔴 COD (ប្រមូលលុយ) 💸</span>
                                    <span className="text-2xl text-[#F6465D] font-black">${(Number(financialStats.codSuccess) || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-gray-600 font-bold pt-4 border-t border-[#2B3139]">
                                <span className="text-xs font-bold text-gray-500">❌ ដឹកមិនជោគជ័យ និង Return</span>
                                <span className="text-lg tracking-tighter text-gray-500">${(Number(financialStats.totalFailed) || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-[#2B3139]/50 relative z-10">
                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] italic">Generated by ACC Order System v2.0</p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col w-full max-w-md gap-3 relative z-10">
                    <p className="text-[10px] text-gray-500 font-bold italic text-center mb-1">សូមចុចប៊ូតុងខាងក្រោមដើម្បី Copy រូបភាព រួច Paste ក្នុង Telegram</p>
                    <button onClick={handleCopyImage} className={`py-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(252,213,53,0.15)] border ${copyStatus === 'success' ? 'bg-[#0ECB81] border-[#0ECB81] text-black shadow-[0_0_20px_rgba(14,203,129,0.3)]' : 'bg-gradient-to-r from-[#FCD535] to-[#f59e0b] border-[#FCD535] text-black active:scale-[0.98]'}`}>
                        {copyStatus === 'success' ? <>✅ បានចម្លងរូបភាព (Copied!)</> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> ចម្លងរូបភាព (Copy Image)</>}
                    </button>
                    <button onClick={() => setIsSubmitted(false)} className="py-4 bg-[#181A20] text-gray-400 font-black uppercase tracking-widest text-[9px] rounded-[1.5rem] border border-[#2B3139] hover:text-white hover:border-white/20 transition-all active:scale-95 shadow-inner">Back & Edit</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#0B0E11] text-white flex flex-col relative overflow-x-hidden font-['Kantumruy_Pro']">
            <style>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
            
            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FCD535]/5 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0ECB81]/5 blur-[120px] -ml-48 -mb-48 rounded-full"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="p-5 sm:p-8 text-center pt-8">
                    <div className="inline-flex items-center gap-2 bg-[#FCD535]/10 px-4 py-1.5 rounded-full border border-[#FCD535]/20 mb-3 shadow-[0_0_15px_rgba(252,213,53,0.1)]">
                        <div className="w-1.5 h-1.5 bg-[#FCD535] rounded-full animate-pulse shadow-[0_0_5px_rgba(252,213,53,0.8)]"></div>
                        <span className="text-[10px] font-black text-[#FCD535] uppercase tracking-[0.2em]">Delivery Agent Portal</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">បញ្ជាក់ថ្លៃសេវាដឹក</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[9px] mt-2 opacity-80">Confirm Ship Cost | {storeName}</p>
                </div>

                <div className="mx-auto w-full px-3 sm:px-6 pb-32 max-w-4xl">
                    <div className="bg-[#181A20] border border-[#2B3139] rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                        
                        {/* Header Bar */}
                        <div className="p-4 sm:p-5 bg-[#0B0E11]/80 backdrop-blur-md border-b border-[#2B3139] flex justify-between items-center px-6">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Assignment List</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-white">{orders.length}</span>
                                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Packages</span>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-[#181A20] border border-[#2B3139] shadow-inner text-[8px] font-black text-gray-400 uppercase rounded-lg tracking-widest">Edit Ship Cost Below</span>
                        </div>
                        
                        {/* List Layout (Unified for Desktop and Mobile) */}
                        <div className="p-3 sm:p-5 space-y-3 bg-[#0B0E11]/30">
                            {orders.map((o, idx) => {
                                const isReturned = returnedSet.has(o['Order ID']);
                                const isFailed = failedSet.has(o['Order ID']);
                                const isNotSuccess = isReturned || isFailed;
                                const isPaid = o['Payment Status'] === 'Paid';
                                
                                return (
                                    <div key={o['Order ID']} className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${isNotSuccess ? 'bg-[#181A20] border-[#2B3139] opacity-50 hover:opacity-80' : 'bg-[#181A20] border-[#2B3139] hover:border-[#2B3139] hover:bg-[#1E2329]'}`}>
                                        
                                        {!isNotSuccess && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-[#FCD535]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                        
                                        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 relative z-10">
                                            {/* Left Section: Info */}
                                            <div className="flex gap-4 min-w-0 flex-1">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border shadow-inner transition-colors ${isNotSuccess ? 'bg-[#0B0E11] border-[#2B3139] text-gray-600' : 'bg-[#0B0E11] border-[#2B3139] text-gray-400 group-hover:text-[#FCD535] group-hover:border-[#FCD535]/30'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[15px] sm:text-base font-black font-mono leading-none tracking-tight block transition-colors ${isNotSuccess ? 'text-gray-500' : 'text-[#FCD535]'}`}>
                                                            {o['Customer Phone']}
                                                        </span>
                                                        {o['Customer Phone'] && (
                                                            <div className="flex items-center gap-1.5 ml-1">
                                                                <a href={`tel:${String(o['Customer Phone']).replace(/\s+/g, '')}`} className="bg-[#0ECB81]/10 text-[#0ECB81] hover:bg-[#0ECB81]/20 p-1.5 rounded-lg transition-colors border border-[#0ECB81]/20" title="Call Customer" target="_blank" rel="noopener noreferrer">
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                                </a>
                                                                <a href={`https://t.me/+855${String(o['Customer Phone']).replace(/\D/g, '').replace(/^0+/, '')}`} className="bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 p-1.5 rounded-lg transition-colors border border-[#3b82f6]/20" title="Telegram Customer" target="_blank" rel="noopener noreferrer">
                                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 mt-1 min-w-0">
                                                        <span className="text-[10px] font-bold text-gray-300 bg-[#0B0E11] px-2.5 py-1 rounded-md border border-[#2B3139] uppercase tracking-widest shrink-0 shadow-inner">{o.Location}</span>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase truncate">
                                                            {o['Customer Name']}
                                                        </span>
                                                    </div>
                                                    
                                                    {o['Address Details'] && (
                                                        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-gray-400 font-medium italic">
                                                            <span className="shrink-0 pt-0.5">↳</span>
                                                            <span className="truncate">{o['Address Details']}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Section: Values & Input */}
                                            <div className="flex sm:flex-col justify-between sm:justify-center items-end sm:items-end gap-3 sm:gap-2 flex-shrink-0 pt-3 sm:pt-0 border-t border-[#2B3139]/50 sm:border-0 mt-3 sm:mt-0">
                                                <div className="flex flex-col sm:items-end gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border shadow-inner ${isPaid ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20' : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20'}`}>
                                                            {isPaid ? 'Paid' : 'COD'}
                                                        </span>
                                                        <p className={`text-base font-black italic transition-colors ${isNotSuccess ? 'text-gray-600 line-through' : 'text-white'}`}>
                                                            ${(Number(o['Grand Total']) || 0).toFixed(2)}
                                                        </p>
                                                    </div>
                                                    
                                                    {isNotSuccess ? (
                                                        <div className="flex flex-col items-start sm:items-end gap-1 mt-1">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-inner border ${isReturned ? 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                                {isReturned ? 'Returned' : 'Failed'}
                                                            </span>
                                                            {(o['Return Reason'] || o['Cancel Reason']) && (
                                                                <span className="text-[9px] font-bold text-gray-500 uppercase max-w-[120px] text-right truncate">
                                                                    {o['Return Reason'] || o['Cancel Reason']}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="w-32 relative group/input">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs z-10 transition-colors group-hover/input:text-[#FCD535]">$</span>
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                value={costs[o['Order ID']] ?? ''} 
                                                                onChange={(e) => handleCostChange(o['Order ID'], e.target.value)} 
                                                                className="relative w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl py-2 pl-7 pr-3 text-right text-[15px] font-mono font-black text-[#FCD535] focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535]/30 transition-all z-0 shadow-inner hover:border-[#2B3139]/80" 
                                                                placeholder="0.00" 
                                                            />
                                                            <div className="absolute -top-2 -right-1 bg-[#181A20] px-1 text-[8px] font-black text-gray-500 uppercase tracking-widest z-10">Ship Cost</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary & Actions Footer */}
                        <div className="bg-[#0B0E11]/80 backdrop-blur-md border-t border-[#2B3139]">
                            <div className="p-5 sm:p-7 border-b border-[#2B3139] space-y-3">
                                <div className="flex items-center justify-between text-white font-black">
                                    <span className="text-xs uppercase tracking-widest text-gray-300">សរុបទឹកប្រាក់ (ដឹកជោគជ័យ)</span>
                                    <span className="text-xl tracking-tighter">${(Number(financialStats.totalSuccess) || 0).toFixed(2)}</span>
                                </div>
                                <div className="space-y-1.5 ml-2 sm:ml-4 text-[11px] font-bold text-gray-400">
                                    <div className="flex justify-between items-center bg-[#181A20] px-3 py-1.5 rounded-lg border border-[#2B3139] shadow-inner">
                                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81]"></span> Paid</span>
                                        <span className="text-[#0ECB81] font-black text-sm">${(Number(financialStats.paidSuccess) || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[#181A20] px-3 py-1.5 rounded-lg border border-[#2B3139] shadow-inner">
                                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#F6465D]"></span> COD</span>
                                        <span className="text-[#F6465D] font-black text-sm">${(Number(financialStats.codSuccess) || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-gray-500 font-bold pt-3 border-t border-[#2B3139]">
                                    <span className="text-[10px] uppercase tracking-widest">❌ សរុបទឹកប្រាក់ (ដឹកមិនជោគជ័យ និង Return)</span>
                                    <span className="text-sm tracking-tighter">${(Number(financialStats.totalFailed) || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="p-5 sm:p-7 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535]/5 blur-[30px] rounded-full pointer-events-none"></div>
                                <div className="flex flex-col sm:items-start items-center text-center sm:text-left gap-1 relative z-10">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Total Ship Fee (Success)</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl sm:text-4xl font-black text-[#FCD535] tracking-tighter italic leading-none drop-shadow-[0_0_15px_rgba(252,213,53,0.2)]">
                                            ${(Number(totalShipCost) || 0).toFixed(2)}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">USD</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSubmit} 
                                    disabled={isSubmitting || orders.length === 0} 
                                    className="w-full sm:w-auto px-8 sm:px-10 py-4 bg-gradient-to-r from-[#FCD535] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-[0_0_30px_rgba(252,213,53,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 border border-[#FCD535] group disabled:opacity-50 disabled:grayscale relative z-10"
                                >
                                    {isSubmitting ? (
                                        <Spinner size="sm" />
                                    ) : (
                                        <>
                                            <span>បញ្ជូនការបញ្ជាក់<br className="sm:hidden" /><span className="text-[9px] sm:ml-2 opacity-80">(Confirm & Send)</span></span>
                                            <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center group-hover:bg-black/20 transition-colors shrink-0">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-4 text-center opacity-30 relative z-10">
                <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.4em]">ACC Team v2.0 Operations</p>
            </div>
        </div>
    );
};

export default DeliveryAgentView;

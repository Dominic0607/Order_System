import React, { useState, useMemo, useEffect, useContext } from 'react';
import Modal from '../common/Modal';
import { ParsedOrder, AppData, User } from '../../types';
import { AppContext } from '../../context/AppContext';
import { WEB_APP_URL } from '../../constants';
import BankSelector from './BankSelector';
import Spinner from '../common/Spinner';
import html2canvas from 'html2canvas';

interface DeliveryListGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: ParsedOrder[];
    appData: AppData;
    team?: string;
    initialStore?: string;
    initialShipping?: string;
    ignoreDateFilter?: boolean;
}

const STEPS = {
    FILTER: 1,
    PROMPT: 1.5,
    VERIFY: 2,
    SUMMARY: 3
};

const SESSION_KEY = 'delivery_list_session';

const DeliveryListGeneratorModal: React.FC<DeliveryListGeneratorModalProps> = ({
    isOpen, onClose, orders, appData, initialStore, initialShipping, ignoreDateFilter
}) => {
    const { currentUser, showNotification, refreshData, language } = useContext(AppContext);
    const [step, setStep] = useState(STEPS.FILTER);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedShipping, setSelectedShipping] = useState('ACC Delivery Agent');
    const [previewText, setPreviewText] = useState('');
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [step1SelectedIds, setStep1SelectedIds] = useState<Set<string>>(new Set());
    const [step1ReturnIds, setStep1ReturnIds] = useState<Set<string>>(new Set());

    const [searchQuery, setSearchQuery] = useState('');
    const [manualOrders, setManualOrders] = useState<ParsedOrder[]>([]);
    const [showManualSearch, setShowManualSearch] = useState(false);

    const [pendingOrders, setPendingOrders] = useState<ParsedOrder[]>([]);
    const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
    const [shippingAdjustments, setShippingAdjustments] = useState<Record<string, number>>({});
    
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBank, setSelectedBank] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [summaryResult, setSummaryResult] = useState<any>(null);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const getSafeIsoDate = (dateStr: string) => {
        if (!dateStr) return '';
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s(\d{1,2}):(\d{2})/);
        if (match) {
            const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5]));
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
        } catch (e) { return ''; }
    };

    const filteredOrders = useMemo(() => {
        const dateFiltered = orders.filter(o => {
            if (!o.Timestamp) return false;
            const orderDate = getSafeIsoDate(o.Timestamp); 
            const passesDate = ignoreDateFilter || orderDate === selectedDate;
            return passesDate && 
                   (!selectedStore || o['Fulfillment Store'] === selectedStore) &&
                   (o['Internal Shipping Method'] || '').toLowerCase() === selectedShipping.toLowerCase();
        });
        const combined = [...dateFiltered, ...manualOrders];
        const seen = new Set();
        return combined.filter(o => {
            if (seen.has(o['Order ID'])) return false;
            seen.add(o['Order ID']);
            return true;
        });
    }, [orders, selectedDate, selectedStore, selectedShipping, manualOrders]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return orders.filter(o => 
            (o['Order ID'].toLowerCase().includes(q) || (o['Customer Phone'] || '').includes(q)) &&
            !filteredOrders.some(existing => existing['Order ID'] === o['Order ID'])
        ).slice(0, 10);
    }, [orders, searchQuery, filteredOrders]);

    useEffect(() => {
        setStep1SelectedIds(new Set(filteredOrders.map(o => o['Order ID'])));
    }, [filteredOrders]);

    useEffect(() => {
        if (isOpen) {
            const savedSession = localStorage.getItem(SESSION_KEY);
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    if (session.pendingOrders?.length > 0) {
                        setPendingOrders(session.pendingOrders);
                        setVerifiedIds(new Set(session.verifiedIds));
                        setShippingAdjustments(session.shippingAdjustments);
                        setStep(STEPS.PROMPT);
                    } else resetToFilter();
                } catch (e) { resetToFilter(); }
            } else resetToFilter();
        }
    }, [isOpen]);

    const resetToFilter = () => {
        setStep(STEPS.FILTER); setPreviewText(''); setIsPreviewing(false);
        setPendingOrders([]); setVerifiedIds(new Set()); setShippingAdjustments({});
        setStep1ReturnIds(new Set()); setManualOrders([]); setSearchQuery('');
        setShowManualSearch(false); setShowPaymentModal(false); setPassword(''); setSelectedBank('');
        
        if (initialStore) {
            setSelectedStore(initialStore);
        } else if (appData.stores?.length > 0) {
            setSelectedStore(appData.stores[0].StoreName);
        }

        if (initialShipping) {
            setSelectedShipping(initialShipping);
        } else if (appData.shippingMethods?.length > 0) {
            const hasACC = appData.shippingMethods.some(m => m.MethodName === 'ACC Delivery Agent');
            if (hasACC) setSelectedShipping('ACC Delivery Agent');
            else setSelectedShipping(appData.shippingMethods[0].MethodName);
        }
    };

    const handleDiscardSession = () => { localStorage.removeItem(SESSION_KEY); resetToFilter(); };

    const handleGeneratePreview = () => {
        if (filteredOrders.length === 0) { alert("No orders selected!"); return; }
        const dateObj = new Date(selectedDate);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        let text = `📦 **បញ្ជីដឹកជញ្ជូនប្រចាំថ្ងៃ** 📅 ${formattedDate}\n🚚 ក្រុមហ៊ុន: ${selectedShipping}\n🏭 ឃ្លាំង: ${selectedStore}\n--------------------------------\n\n`;
        
        let totalSuccessUSD = 0, totalPaidUSD = 0, totalCodUSD = 0, totalFailedUSD = 0, successCount = 0;
        
        filteredOrders.forEach((o, index) => {
            const isSuccess = step1SelectedIds.has(o['Order ID']), isReturn = step1ReturnIds.has(o['Order ID']);
            const grandTotal = o['Grand Total'] || 0, isPaid = o['Payment Status'] === 'Paid';
            let lineSuffix = isSuccess ? ' ✅' : isReturn ? ' ( Return )' : ' ⏳ (ដឹកមិនជោគជ័យ)';
            if (isSuccess) { totalSuccessUSD += grandTotal; successCount++; if (isPaid) totalPaidUSD += grandTotal; else totalCodUSD += grandTotal; }
            else totalFailedUSD += grandTotal;
            const location = o.Location || '', details = o['Address Details'] || '';
            let fullAddress = (location === 'រាជធានីភ្នំពេញ' && details) ? details : [location, details].filter(Boolean).join(', ');
            if (fullAddress.length > 40) fullAddress = fullAddress.substring(0, 40) + '...';
            text += `${index + 1}. 📞 ${o['Customer Phone']} | ID: \`${o['Order ID'].slice(-5)}\`\n   📍 ${fullAddress}\n   (💵 $${(Number(grandTotal) || 0).toFixed(2)}) - ${isPaid ? '🟢' : '🔴'} **${isPaid ? 'Paid' : 'COD'}**${lineSuffix}\n\n`;
        });
        
        text += `--------------------------------\n📦 **ចំនួនកញ្ចប់សរុប:** ${successCount} កញ្ចប់\n💰 **សរុបទឹកប្រាក់ (ដឹកជោគជ័យ):** $${(Number(totalSuccessUSD) || 0).toFixed(2)}\n   ├─ 🟢 Paid: $${(Number(totalPaidUSD) || 0).toFixed(2)}\n   └─ 🔴 COD: $${(Number(totalCodUSD) || 0).toFixed(2)} 💸\n❌ **សរុបទឹកប្រាក់ (ដឹកមិនជោគជ័យ):** $${(Number(totalFailedUSD) || 0).toFixed(2)}\n\n`;
        
        const selectedOrderIds = filteredOrders.filter(o => step1SelectedIds.has(o['Order ID'])).map(o => o['Order ID']);
        const returnOrderIds = filteredOrders.filter(o => step1ReturnIds.has(o['Order ID'])).map(o => o['Order ID']);
        const failedOrderIds = filteredOrders.filter(o => !step1SelectedIds.has(o['Order ID']) && !step1ReturnIds.has(o['Order ID'])).map(o => o['Order ID']);
        
        if (selectedOrderIds.length > 0 || returnOrderIds.length > 0 || failedOrderIds.length > 0) {
            const confirmUrl = `${window.location.origin}${window.location.pathname}?v=cd&i=${selectedOrderIds.join(',')}&r=${returnOrderIds.join(',')}&f=${failedOrderIds.join(',')}&s=${encodeURIComponent(selectedStore)}&e=${Date.now() + (2 * 60 * 60 * 1000)}`;
            text += `--------------------------------\n🔗 **តំណភ្ជាប់បញ្ជាក់ថ្លៃដឹក (Confirm Delivery Link):**\n👉 ${confirmUrl}\n\n*(⚠️ បញ្ជាក់៖ លីងនេះមានសុពលភាពត្រឹមតែ ២ ម៉ោងប៉ុណ្ណោះ)*`;
        }
        setPreviewText(text); setIsPreviewing(true);
    };

    const handleCopyAgentLink = async () => {
        const selectedOrderIds = filteredOrders.filter(o => step1SelectedIds.has(o['Order ID'])).map(o => o['Order ID']);
        const returnOrderIds = filteredOrders.filter(o => step1ReturnIds.has(o['Order ID'])).map(o => o['Order ID']);
        const failedOrderIds = filteredOrders.filter(o => !step1SelectedIds.has(o['Order ID']) && !step1ReturnIds.has(o['Order ID'])).map(o => o['Order ID']);
        
        if (selectedOrderIds.length === 0 && returnOrderIds.length === 0 && failedOrderIds.length === 0) { alert("No orders selected!"); return; }
        const confirmUrl = `${window.location.origin}${window.location.pathname}?v=cd&i=${selectedOrderIds.join(',')}&r=${returnOrderIds.join(',')}&f=${failedOrderIds.join(',')}&s=${encodeURIComponent(selectedStore)}&e=${Date.now() + (2 * 60 * 60 * 1000)}`;
        try { await navigator.clipboard.writeText(confirmUrl); showNotification("Link Copied!", "success"); } catch (e) { alert("Failed to copy link"); }
    };

    const handleCopyAndSaveSession = async () => {
        try {
            await navigator.clipboard.writeText(previewText); showNotification("Report Copied!", "success");
            const currentOrders = filteredOrders.filter(o => step1SelectedIds.has(o['Order ID']));
            const initialAdjustments: Record<string, number> = {};
            currentOrders.forEach(o => { initialAdjustments[o['Order ID']] = o['Internal Cost'] || 0; });
            const allIds = currentOrders.map(o => o['Order ID']);
            setPendingOrders(currentOrders); setVerifiedIds(new Set(allIds)); setShippingAdjustments(initialAdjustments);
            localStorage.setItem(SESSION_KEY, JSON.stringify({ pendingOrders: currentOrders, verifiedIds: allIds, shippingAdjustments: initialAdjustments, timestamp: Date.now() }));
            setStep(STEPS.PROMPT);
        } catch (err) { alert("Copy failed."); }
    };

    const toggleVerify = (id: string) => {
        setVerifiedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };

    const handleShippingChange = (id: string, val: string) => {
        const num = parseFloat(val); setShippingAdjustments(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
    };

    const handleConfirmTransaction = async () => {
        if (!password) { alert("Password required."); return; }
        setIsSubmitting(true);
        
        try {
            // Ensure we have a username to verify against
            const username = currentUser?.UserName || (currentUser as any)?.userName || (currentUser as any)?.user_name;
            if (!username) {
                throw new Error("មិនអាចរកឃើញឈ្មោះអ្នកប្រើប្រាស់ (User name not found)");
            }

            // 1. Verify Password First
            const verifyRes = await fetch(`${WEB_APP_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userName: username, 
                    password: password 
                })
            });

            if (!verifyRes.ok) {
                const errorData = await verifyRes.json().catch(() => ({}));
                throw new Error(errorData.message || "លេខសម្ងាត់មិនត្រឹមត្រូវ (Incorrect Password)");
            }

            const concurrencyLimit = 5;
            const queue = [...pendingOrders];
            const totalToProcess = queue.length;
            let failureCount = 0;
            const failedOrders: string[] = [];
            let processedCount = 0;

            const processOrder = async (order: ParsedOrder) => {
                const isVerified = verifiedIds.has(order['Order ID']);
                const isUnpaid = order['Payment Status'] !== 'Paid';
                const finalInternalCost = shippingAdjustments[order['Order ID']] !== undefined ? shippingAdjustments[order['Order ID']] : (order['Internal Cost'] || 0);
                
                const updateData: any = { 
                    'Internal Cost': finalInternalCost,
                    'Fulfillment Status': isVerified ? 'Delivered' : order['Fulfillment Status']
                };
                
                if (isVerified) { 
                    updateData['Delivered Time'] = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    if (isUnpaid) {
                        updateData['Payment Status'] = 'Paid'; 
                        updateData['Payment Info'] = selectedBank; 
                        updateData['Delivery Paid'] = order['Grand Total']; 
                        updateData['Delivery Unpaid'] = 0; 
                    }
                    if (order.Timestamp) {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                        const match = order.Timestamp.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                        if (match) {
                            const orderDate = `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
                            if (orderDate !== todayStr) {
                                const noteAdd = `(កាលបរិចេ្ឆទទម្លាក់ការកម្មង់ : ${match[3]}/${match[2]}/${match[1].slice(-2)})`;
                                if (!(order.Note || '').includes('កាលបរិចេ្ឆទទម្លាក់ការកម្មង់')) updateData.Note = order.Note ? `${order.Note}\n${noteAdd}` : noteAdd;
                                let timeStr = '12:00:00';
                                const timeMatch = order.Timestamp.match(/\s(\d{1,2}:\d{2}(?::\d{2})?)/);
                                if (timeMatch) timeStr = timeMatch[1].length === 5 ? `${timeMatch[1]}:00` : timeMatch[1];
                                updateData.Timestamp = `${todayStr} ${timeStr}`;
                            }
                        }
                    }
                }

                const payload = { orderId: order['Order ID'], team: order.Team, userName: currentUser?.UserName, newData: updateData };
                let success = false; let attempts = 0;
                while (!success && attempts < 3) {
                    attempts++;
                    try {
                        const res = await fetch(`${WEB_APP_URL}/api/admin/update-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        if (res.ok) success = true;
                        else await new Promise(r => setTimeout(r, Math.min(5000, (Math.pow(2, attempts) * 500))));
                    } catch (e) { await new Promise(r => setTimeout(r, Math.min(5000, (Math.pow(2, attempts) * 500)))); }
                }
                if (!success) { failureCount++; failedOrders.push(order['Order ID']); }
                processedCount++;
                await new Promise(r => setTimeout(r, 300));
            };

            for (let i = 0; i < queue.length; i += concurrencyLimit) {
                await Promise.all(queue.slice(i, i + concurrencyLimit).map(processOrder));
            }

            if (failureCount > 0) alert(`Update finished with ${failureCount} errors.`);
            else {
                localStorage.removeItem(SESSION_KEY); 
                const successVerified = pendingOrders.filter(o => verifiedIds.has(o['Order ID']));
                const newlyPaid = successVerified.filter(o => o['Payment Status'] !== 'Paid').reduce((sum, o) => sum + (o['Grand Total'] || 0), 0);
                setSummaryResult({
                    count: successVerified.length,
                    totalUSD: successVerified.reduce((sum, o) => sum + (o['Grand Total'] || 0), 0),
                    shipCost: successVerified.reduce((sum, o) => sum + (shippingAdjustments[o['Order ID']] || 0), 0),
                    date: selectedDate, store: selectedStore, user: currentUser?.FullName,
                    alreadyPaid: successVerified.filter(o => o['Payment Status'] === 'Paid').reduce((sum, o) => sum + (o['Grand Total'] || 0), 0),
                    newlyPaid
                });
                setStep(STEPS.SUMMARY); setShowPaymentModal(false);
            }
            await refreshData();
        } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    const handleCopySummary = async () => {
        const element = document.getElementById('summary-card');
        if (!element) return;
        try {
            setCopyStatus('idle'); await document.fonts.ready; await new Promise(r => setTimeout(r, 800));
            const canvas = await html2canvas(element, { backgroundColor: '#0B0E11', scale: 4, useCORS: true });
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); setCopyStatus('success'); }
                    catch (err) { const dataUrl = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.download = `summary.png`; link.href = dataUrl; link.click(); setCopyStatus('error'); }
                }
            }, 'image/png');
        } catch (e) { setCopyStatus('error'); }
    };

    if (!isOpen) return null;

    if (isPreviewing) {
        return (
            <Modal isOpen={true} onClose={() => setIsPreviewing(false)} maxWidth="max-w-xl">
                <div className="flex flex-col h-full max-h-[90vh] bg-[#0B0E11] font-sans relative overflow-hidden">
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] -mr-48 -mt-48 rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FCD535]/5 blur-[100px] -ml-48 -mb-48 rounded-full pointer-events-none"></div>
                    
                    <div className="px-6 py-5 border-b border-[#2B3139]/50 flex justify-between items-center bg-[#0B0E11]/80 backdrop-blur-md relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FCD535]/10 border border-[#FCD535]/20 flex items-center justify-center text-[#FCD535]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-100 uppercase tracking-widest">Delivery Roster Preview</h3>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Ready to Copy</p>
                            </div>
                        </div>
                        <button onClick={() => setIsPreviewing(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar relative z-10">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#FCD535]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] sm:text-xs text-gray-300 leading-relaxed bg-[#181A20]/80 p-5 rounded-xl border border-[#2B3139] shadow-inner select-all relative z-10">
                                {previewText}
                            </pre>
                        </div>
                    </div>
                    
                    <div className="px-6 py-5 border-t border-[#2B3139]/50 bg-[#0B0E11]/80 backdrop-blur-md flex flex-col sm:flex-row gap-4 relative z-10">
                        <button onClick={handleCopyAgentLink} className="flex-1 py-3.5 text-[10px] font-black text-[#FCD535] bg-[#FCD535]/10 border border-[#FCD535]/20 hover:bg-[#FCD535]/20 rounded-xl uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Copy Only Link
                        </button>
                        <button onClick={handleCopyAndSaveSession} className="flex-1 py-3.5 text-[10px] font-black text-black bg-gradient-to-r from-[#FCD535] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] rounded-xl shadow-[0_0_20px_rgba(252,213,53,0.3)] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            Copy All & Proceed
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    if (step === STEPS.PROMPT) {
        return (
            <Modal isOpen={true} onClose={handleDiscardSession} maxWidth="max-w-md">
                <div className="bg-[#181A20] border border-[#2B3139] rounded-sm p-8 text-center font-sans space-y-6">
                    <div className="w-16 h-16 bg-[#2B3139] mx-auto rounded-sm flex items-center justify-center text-[#FCD535]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-200 uppercase tracking-widest mb-2">Pending Session</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">You have an unverified delivery list pending completion. Would you like to resume?</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#2B3139]">
                        <button onClick={handleDiscardSession} className="py-3 text-[10px] font-bold text-gray-400 bg-[#0B0E11] border border-[#2B3139] hover:text-[#F6465D] hover:border-[#F6465D] uppercase tracking-widest rounded-sm transition-colors text-center">Discard</button>
                        <button onClick={() => setStep(STEPS.VERIFY)} className="py-3 text-[10px] font-bold text-black bg-[#FCD535] hover:bg-[#FCD535]/90 uppercase tracking-widest rounded-sm transition-colors text-center">Resume</button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} fullScreen={true}>
            <div className="flex flex-col h-screen w-screen bg-[#0B0E11] font-sans text-gray-300">
                {/* Header with Stepper */}
                <div className="flex-shrink-0 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#2B3139]/50 bg-[#181A20]/80 backdrop-blur-md z-50 sticky top-0 gap-4 sm:gap-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-[#2B3139] to-[#1E2329] shadow-[0_0_10px_rgba(43,49,57,0.3)] flex items-center justify-center text-[#FCD535] border border-[#2B3139]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold uppercase tracking-widest text-gray-200">
                                Dispatch Generator
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] shadow-[0_0_5px_rgba(14,203,129,0.5)]"></span>
                                <span className="text-[9px] font-bold text-[#0ECB81] uppercase tracking-widest">Secure Logistics Core</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-2 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                        <div className={`flex items-center gap-2 ${step >= STEPS.FILTER ? 'opacity-100' : 'opacity-40'} transition-all`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > STEPS.FILTER ? 'bg-[#0ECB81] text-black shadow-[0_0_10px_rgba(14,203,129,0.3)]' : step === STEPS.FILTER ? 'bg-[#FCD535] text-black shadow-[0_0_10px_rgba(252,213,53,0.3)]' : 'bg-[#2B3139] text-gray-400'}`}>{step > STEPS.FILTER ? '✓' : '1'}</div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-all ${step === STEPS.FILTER ? 'text-[#FCD535]' : step > STEPS.FILTER ? 'text-[#0ECB81]' : 'text-gray-500'}`}>Select</span>
                        </div>
                        <div className={`w-6 sm:w-10 h-[2px] transition-all ${step >= STEPS.VERIFY ? 'bg-[#0ECB81] shadow-[0_0_5px_rgba(14,203,129,0.5)]' : 'bg-[#2B3139]'}`}></div>
                        <div className={`flex items-center gap-2 ${step >= STEPS.VERIFY ? 'opacity-100' : 'opacity-40'} transition-all`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > STEPS.VERIFY ? 'bg-[#0ECB81] text-black shadow-[0_0_10px_rgba(14,203,129,0.3)]' : step === STEPS.VERIFY ? 'bg-[#FCD535] text-black shadow-[0_0_10px_rgba(252,213,53,0.3)]' : 'bg-[#2B3139] text-gray-400'}`}>{step > STEPS.VERIFY ? '✓' : '2'}</div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-all ${step === STEPS.VERIFY ? 'text-[#FCD535]' : step > STEPS.VERIFY ? 'text-[#0ECB81]' : 'text-gray-500'}`}>Verify</span>
                        </div>
                        <div className={`w-6 sm:w-10 h-[2px] transition-all ${step >= STEPS.SUMMARY ? 'bg-[#0ECB81] shadow-[0_0_5px_rgba(14,203,129,0.5)]' : 'bg-[#2B3139]'}`}></div>
                        <div className={`flex items-center gap-2 ${step >= STEPS.SUMMARY ? 'opacity-100' : 'opacity-40'} transition-all`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === STEPS.SUMMARY ? 'bg-[#0ECB81] text-black shadow-[0_0_10px_rgba(14,203,129,0.5)]' : 'bg-[#2B3139] text-gray-400'}`}>3</div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-all ${step === STEPS.SUMMARY ? 'text-[#0ECB81]' : 'text-gray-500'}`}>Summary</span>
                        </div>
                    </div>

                    <button onClick={onClose} className="absolute right-6 top-6 sm:static sm:top-auto sm:right-auto w-10 h-10 rounded-sm bg-[#0B0E11]/80 backdrop-blur-sm border border-[#2B3139] hover:bg-[#F6465D] hover:border-[#F6465D] hover:text-white text-gray-500 transition-all flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar relative">
                    <div className="max-w-6xl mx-auto w-full p-4 sm:p-8">
                        {step === STEPS.FILTER && (
                            <div className="animate-fade-in space-y-6">
                                {/* Control Panel */}
                                <div className="bg-gradient-to-r from-[#181A20] to-[#1E2329] border border-[#2B3139]/70 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-5 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FCD535] to-[#FCD535]/10"></div>
                                    <div className="space-y-2 pl-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#FCD535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Date Selection</label>
                                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-2.5 px-3 text-white text-xs font-mono focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535]/30 outline-none transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#0ECB81]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Logistics Partner</label>
                                        <select value={selectedShipping} onChange={(e) => setSelectedShipping(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-2.5 px-3 text-white text-xs font-bold focus:border-[#0ECB81] focus:ring-1 focus:ring-[#0ECB81]/30 outline-none transition-all shadow-inner">
                                            {appData.shippingMethods?.map(m => <option key={m.MethodName} value={m.MethodName}>{m.MethodName}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> Fulfillment Node</label>
                                        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-2.5 px-3 text-white text-xs font-bold focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 outline-none transition-all shadow-inner">
                                            {appData.stores?.map(s => <option key={s.StoreName} value={s.StoreName}>{s.StoreName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* External Search Mode */}
                                {showManualSearch && (
                                    <div className="bg-[#181A20] border border-[#2B3139] rounded-sm p-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-[#FCD535] uppercase tracking-widest">External Inclusion</label>
                                            <button onClick={() => setShowManualSearch(false)} className="text-gray-500 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Search Mobile/ID..." 
                                            value={searchQuery} 
                                            onChange={e => setSearchQuery(e.target.value)} 
                                            className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-sm px-4 py-2 text-white font-mono text-xs focus:border-[#FCD535] outline-none transition-colors"
                                        />
                                        <div className="space-y-2">
                                            {searchResults.map(o => (
                                                <div key={o['Order ID']} className="flex justify-between items-center p-3 bg-[#0B0E11] border border-[#2B3139] rounded-sm">
                                                    <div>
                                                        <span className="text-gray-200 text-xs font-bold block">{o['Customer Name']}</span>
                                                        <span className="text-gray-500 text-[10px] font-mono">{o['Order ID']}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => { setManualOrders(prev => [...prev, o]); setSearchQuery(''); setShowManualSearch(false); }}
                                                        className="px-3 py-1 bg-[#FCD535]/10 text-[#FCD535] border border-[#FCD535]/20 hover:bg-[#FCD535] hover:text-black rounded-sm text-[10px] font-bold uppercase transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Order Grid */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selection Queue ({filteredOrders.length})</h3>
                                        {!showManualSearch && (
                                            <button onClick={() => setShowManualSearch(true)} className="px-3 py-1.5 bg-[#2B3139] hover:bg-gray-700 text-white rounded-sm border border-transparent text-[9px] font-bold uppercase tracking-widest transition-colors">+ Add External</button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredOrders.map((order, idx) => {
                                            const isSelected = step1SelectedIds.has(order['Order ID']);
                                            const isReturn = step1ReturnIds.has(order['Order ID']);
                                            
                                            // Dynamic styling based on selection
                                            let cardClasses = 'bg-[#181A20] border-[#2B3139] opacity-80 hover:opacity-100 hover:border-[#FCD535]/30 hover:bg-[#1E2329]';
                                            let glowDiv = null;
                                            
                                            if (isSelected) {
                                                cardClasses = 'bg-[#FCD535]/5 border-[#FCD535]/40 shadow-[0_0_15px_rgba(252,213,53,0.1)] opacity-100 scale-[1.01]';
                                                glowDiv = <div className="absolute top-0 right-0 w-24 h-24 bg-[#FCD535]/15 rounded-full blur-[24px] -mr-12 -mt-12 pointer-events-none"></div>;
                                            } else if (isReturn) {
                                                cardClasses = 'bg-[#F6465D]/5 border-[#F6465D]/40 shadow-[0_0_15px_rgba(246,70,93,0.1)] opacity-100 scale-[1.01]';
                                                glowDiv = <div className="absolute top-0 right-0 w-24 h-24 bg-[#F6465D]/15 rounded-full blur-[24px] -mr-12 -mt-12 pointer-events-none"></div>;
                                            }

                                            return (
                                                <div key={order['Order ID']} className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col ${cardClasses}`}>
                                                    {glowDiv}
                                                    <div className="flex justify-between items-start mb-4 relative z-10 flex-grow">
                                                        <div className="flex gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border shadow-sm transition-colors ${isSelected ? 'bg-[#FCD535] text-black border-[#FCD535]' : isReturn ? 'bg-[#F6465D] text-white border-[#F6465D]' : 'bg-[#0B0E11] text-gray-500 border-[#2B3139]'}`}>{idx + 1}</div>
                                                            <div className="min-w-0 pr-2">
                                                                <h4 className={`text-sm font-bold uppercase truncate transition-colors ${isSelected ? 'text-[#FCD535]' : isReturn ? 'text-[#F6465D]' : 'text-gray-200'}`}>{order['Customer Name']}</h4>
                                                                <p className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">{order['Customer Phone']} • <span className="text-gray-500">{order['Order ID'].slice(-5)}</span></p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs font-black shrink-0 ${isSelected ? 'text-[#FCD535]' : isReturn ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>${(order['Grand Total'] || 0).toFixed(2)}</span>
                                                    </div>
                                                    
                                                    {/* Location indicator */}
                                                    <div className="mb-4 text-xs font-medium text-gray-300 bg-[#0B0E11]/80 p-2.5 rounded-lg border border-[#2B3139]/50 truncate relative z-10 flex items-center gap-1.5 shadow-inner">
                                                        <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        {order.Location || 'No location'} {order['Address Details'] ? `- ${order['Address Details']}` : ''}
                                                    </div>

                                                    <div className="flex items-center justify-end gap-2 mt-auto relative z-10">
                                                        <button 
                                                            onClick={() => { const s = new Set(step1SelectedIds), r = new Set(step1ReturnIds); if (s.has(order['Order ID'])) s.delete(order['Order ID']); else { s.add(order['Order ID']); r.delete(order['Order ID']); }; setStep1SelectedIds(s); setStep1ReturnIds(r); }} 
                                                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 flex justify-center items-center gap-1.5 ${isSelected ? 'bg-gradient-to-r from-[#FCD535] to-[#fde047] border-[#FCD535] text-black shadow-[0_0_15px_rgba(252,213,53,0.3)]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-400 hover:text-[#FCD535] hover:border-[#FCD535]/50'}`}
                                                        >
                                                            {isSelected && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                            Success
                                                        </button>
                                                        <button 
                                                            onClick={() => { const s = new Set(step1SelectedIds), r = new Set(step1ReturnIds); if (r.has(order['Order ID'])) r.delete(order['Order ID']); else { r.add(order['Order ID']); s.delete(order['Order ID']); }; setStep1SelectedIds(s); setStep1ReturnIds(r); }} 
                                                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 flex justify-center items-center gap-1.5 ${isReturn ? 'bg-gradient-to-r from-[#F6465D] to-[#fb7185] border-[#F6465D] text-white shadow-[0_0_15px_rgba(246,70,93,0.3)]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-400 hover:text-[#F6465D] hover:border-[#F6465D]/50'}`}
                                                        >
                                                            {isReturn && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
                                                            Return
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === STEPS.VERIFY && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-[#181A20] border border-[#2B3139] rounded-sm p-5 flex gap-4">
                                    <div className="w-10 h-10 rounded-sm bg-[#2B3139] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 text-[#FCD535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-bold text-[#FCD535] uppercase tracking-widest">Verification Protocol</h4>
                                        <p className="text-xs text-gray-400 font-medium">Please verify the delivery logistics and update shipping costs appropriately.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {pendingOrders.map((order, idx) => {
                                        const isChecked = verifiedIds.has(order['Order ID']);
                                        const isPaid = order['Payment Status'] === 'Paid';
                                        return (
                                            <div key={order['Order ID']} className={`p-5 rounded-xl border transition-all duration-300 relative overflow-hidden ${isChecked ? 'bg-gradient-to-r from-[#181A20] to-[#1E2329] border-[#FCD535]/30 shadow-[0_0_15px_rgba(252,213,53,0.05)]' : 'bg-[#0B0E11] border-[#2B3139] opacity-40 hover:opacity-70'}`}>
                                                {isChecked && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FCD535] to-[#FCD535]/10"></div>}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10 pl-2">
                                                    <div className="flex gap-4 min-w-0 flex-1 items-center">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 border shadow-sm transition-colors ${isChecked ? 'bg-[#FCD535] text-black border-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-500'}`}>{idx + 1}</div>
                                                        <div className="min-w-0">
                                                            <h4 className={`text-sm font-bold uppercase truncate transition-colors ${isChecked ? 'text-gray-200' : 'text-gray-500'}`}>{order['Customer Name']}</h4>
                                                            <div className="flex items-center gap-3 mt-1.5 min-w-0">
                                                                <span className="text-[11px] font-bold text-gray-500 font-mono shrink-0">{order['Customer Phone']}</span>
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className="text-[10px] font-bold text-gray-300 bg-[#0B0E11] px-2.5 py-1 rounded-md border border-[#2B3139] uppercase tracking-widest shrink-0 shadow-inner">{order.Location}</span>
                                                                    {order['Address Details'] && (
                                                                        <span className="text-[10px] font-bold text-gray-400 truncate italic bg-[#0B0E11]/50 px-2 py-0.5 rounded border border-[#2B3139]/50">
                                                                            {order['Address Details']}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-5">
                                                        <div className="text-right flex flex-col items-end">
                                                            <p className={`text-base font-black ${isChecked ? 'text-[#0ECB81]' : 'text-gray-500'}`}>${(order['Grand Total'] || 0).toFixed(2)}</p>
                                                            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 mt-1 rounded-md shadow-sm ${isPaid ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20' : 'bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20'}`}>{order['Payment Status']}</span>
                                                        </div>
                                                        <div className="w-32 relative group/input">
                                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs z-10 transition-colors ${isChecked ? 'text-gray-500 group-hover/input:text-[#FCD535]' : 'text-gray-600'}`}>$</span>
                                                            <input type="number" step="0.01" value={shippingAdjustments[order['Order ID']] ?? 0} onChange={(e) => handleShippingChange(order['Order ID'], e.target.value)} className={`w-full bg-[#0B0E11] border rounded-xl py-2 pl-7 pr-3 text-right text-[15px] font-mono font-black outline-none transition-all shadow-inner [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${isChecked ? 'border-[#2B3139] text-[#FCD535] focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535]/30 hover:border-[#FCD535]/50' : 'border-[#2B3139] text-gray-600'}`} disabled={!isChecked} />
                                                            <div className="absolute -top-2 -right-1 bg-[#181A20] px-1 text-[8px] font-black text-gray-500 uppercase tracking-widest z-10">Delivery Fee</div>
                                                        </div>
                                                        <button onClick={() => toggleVerify(order['Order ID'])} className={`w-12 h-12 mt-4 sm:mt-0 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-sm ${isChecked ? 'bg-gradient-to-br from-[#FCD535] to-[#fde047] border-[#FCD535] text-black shadow-[0_0_15px_rgba(252,213,53,0.3)]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-500 hover:text-white'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === STEPS.SUMMARY && summaryResult && (
                            <div className="animate-fade-in max-w-lg mx-auto w-full space-y-6 pt-10">
                                <div id="summary-card" className="bg-gradient-to-b from-[#181A20] to-[#1E2329] border-2 border-dashed border-[#0ECB81]/40 rounded-2xl p-10 relative flex flex-col items-center shadow-[0_10px_40px_rgba(14,203,129,0.1)] overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0ECB81] via-[#34d399] to-[#0ECB81]"></div>
                                    <div className="w-20 h-20 bg-gradient-to-br from-[#0ECB81]/20 to-[#0ECB81]/5 border border-[#0ECB81]/40 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(14,203,129,0.2)]">
                                        <svg className="w-10 h-10 text-[#0ECB81]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-8">Dispatch Complete</h3>
                                    
                                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-[#0B0E11]/80 p-5 rounded-xl border border-[#2B3139] text-center shadow-inner">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> Packets</p>
                                            <p className="text-3xl font-black text-white leading-none">{summaryResult.count}</p>
                                        </div>
                                        <div className="bg-[#0B0E11]/80 p-5 rounded-xl border border-[#2B3139] text-center shadow-inner">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Total Fee</p>
                                            <p className="text-3xl font-black text-[#FCD535] leading-none">${summaryResult.shipCost.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="w-full bg-[#0B0E11]/80 p-6 rounded-xl border border-[#2B3139] space-y-4 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#0ECB81]/5 rounded-full blur-[20px] -mr-10 -mt-10 pointer-events-none"></div>
                                        <div className="flex justify-between items-center border-b border-[#2B3139] pb-4">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Gross Target</span>
                                            <span className="text-2xl font-black text-[#0ECB81]">${summaryResult.totalUSD.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> Already Paid</span>
                                            <span className="text-sm font-mono font-bold text-gray-300">${summaryResult.alreadyPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-[#FCD535]/10 p-2.5 rounded-lg border border-[#FCD535]/20 mt-2">
                                            <span className="text-[10px] font-bold text-[#FCD535] uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#FCD535] animate-pulse"></div> Handled Today</span>
                                            <span className="text-sm font-mono font-black text-[#FCD535]">${summaryResult.newlyPaid.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#2B3139] flex items-center justify-center text-xs font-bold text-white border border-gray-600">{(summaryResult.user || 'U')[0]}</div>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Authorized By</p>
                                            <p className="text-xs font-bold text-gray-300 leading-none">{summaryResult.user}</p>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleCopySummary} className="w-full py-3 rounded-sm bg-[#FCD535] hover:bg-[#FCD535]/90 text-black font-bold uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> {copyStatus === 'success' ? 'Report Copied!' : 'Copy Summary Image'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Secure Action Bar */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-[#2B3139] bg-[#181A20] z-50 flex justify-end gap-3">
                    {step === STEPS.FILTER && (
                        <button onClick={handleGeneratePreview} disabled={step1SelectedIds.size === 0} className="px-6 py-2.5 rounded-sm bg-[#FCD535] hover:bg-[#FCD535]/90 text-black font-bold uppercase text-[10px] tracking-widest disabled:opacity-50 transition-colors">Generate Preview</button>
                    )}
                    {step === STEPS.VERIFY && (
                        <>
                            <button onClick={() => setStep(STEPS.FILTER)} className="px-6 py-2.5 rounded-sm bg-[#0B0E11] border border-[#2B3139] hover:bg-[#2B3139] text-gray-400 font-bold uppercase text-[10px] tracking-widest transition-colors">Back</button>
                            <button onClick={() => setShowPaymentModal(true)} className="px-6 py-2.5 rounded-sm bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black font-bold uppercase text-[10px] tracking-widest transition-colors">Finalize Deliveries</button>
                        </>
                    )}
                    {step === STEPS.SUMMARY && (
                        <button onClick={onClose} className="px-6 py-2.5 rounded-sm bg-[#2B3139] hover:bg-gray-700 text-white font-bold uppercase text-[10px] tracking-widest transition-colors">Close</button>
                    )}
                </div>

                {/* Password Modal */}
                {showPaymentModal && (
                    <div className="absolute inset-0 z-[100] bg-[#0B0E11]/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[#181A20] border border-[#2B3139] rounded-sm w-full max-w-sm p-8 text-center space-y-6 shadow-2xl">
                            <div className="w-12 h-12 bg-[#2B3139] rounded-sm flex items-center justify-center mx-auto text-[#0ECB81]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-200">System Override</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Authenticate action</p>
                            </div>
                            
                            <div className="space-y-4">
                                {pendingOrders.some(o => verifiedIds.has(o['Order ID']) && o['Payment Status'] !== 'Paid') && (
                                    <div className="space-y-2 text-left">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Collection Channel</label>
                                        <BankSelector bankAccounts={appData.bankAccounts || []} selectedBankName={selectedBank} onSelect={setSelectedBank} />
                                    </div>
                                )}
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-sm py-3 px-4 text-center text-lg font-bold text-white focus:border-[#0ECB81] outline-none transition-colors tracking-widest placeholder:tracking-normal" placeholder="Password" />
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button onClick={() => setShowPaymentModal(false)} className="py-2.5 rounded-sm bg-[#0B0E11] border border-[#2B3139] hover:bg-[#2B3139] text-gray-400 font-bold uppercase text-[10px] tracking-widest transition-colors">Cancel</button>
                                    <button onClick={handleConfirmTransaction} disabled={isSubmitting} className="py-2.5 rounded-sm bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black font-bold uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2">{isSubmitting ? <Spinner size="sm" /> : 'Confirm'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default DeliveryListGeneratorModal;

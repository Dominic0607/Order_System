
import React, { useState, useMemo, useEffect, useContext } from 'react';
import Modal from '../common/Modal';
import { ParsedOrder, AppData } from '../../types';
import { AppContext } from '../../context/AppContext';
import { WEB_APP_URL } from '../../constants';
import BankSelector from './BankSelector';
import Spinner from '../common/Spinner';

interface DeliveryListGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: ParsedOrder[];
    appData: AppData;
    team?: string;
}

const STEPS = {
    FILTER: 1,
    PROMPT: 1.5, // Intermediate step for Resume/Discard
    VERIFY: 2
};

const SESSION_KEY = 'delivery_list_session';

const DeliveryListGeneratorModal: React.FC<DeliveryListGeneratorModalProps> = ({ 
    isOpen, onClose, orders, appData
}) => {
    const { currentUser, showNotification, refreshData } = useContext(AppContext);
    const [step, setStep] = useState(STEPS.FILTER);
    
    // Step 1: Filter States
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedShipping, setSelectedShipping] = useState('ACC Delivery Agent');
    const [previewText, setPreviewText] = useState('');
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [step1SelectedIds, setStep1SelectedIds] = useState<Set<string>>(new Set());
    const [step1ReturnIds, setStep1ReturnIds] = useState<Set<string>>(new Set());

    // Manual Addition State
    const [searchQuery, setSearchQuery] = useState('');
    const [manualOrders, setManualOrders] = useState<ParsedOrder[]>([]);
    const [showManualSearch, setShowManualSearch] = useState(false);

    // Step 2: Verification & Adjustment
    const [pendingOrders, setPendingOrders] = useState<ParsedOrder[]>([]);
    const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
    const [shippingAdjustments, setShippingAdjustments] = useState<Record<string, number>>({});
    
    // Finalization Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBank, setSelectedBank] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper: Safe ISO Date Extractor
    const getSafeIsoDate = (dateStr: string) => {
        if (!dateStr) return '';
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s(\d{1,2}):(\d{2})/);
        if (match) {
            const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5]));
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        } catch (e) { return ''; }
    };

    // Filtered Orders Logic (Stage 1)
    const filteredOrders = useMemo(() => {
        const dateFiltered = orders.filter(o => {
            if (!o.Timestamp) return false;
            const orderDate = getSafeIsoDate(o.Timestamp); 
            if (!orderDate) return false;
            const isDateMatch = orderDate === selectedDate;
            const isStoreMatch = selectedStore ? o['Fulfillment Store'] === selectedStore : false;
            const isShippingMatch = (o['Internal Shipping Method'] || '').toLowerCase() === selectedShipping.toLowerCase();
            return isDateMatch && isStoreMatch && isShippingMatch;
        });

        // Merge with manual orders and deduplicate
        const combined = [...dateFiltered, ...manualOrders];
        const seen = new Set();
        return combined.filter(o => {
            if (seen.has(o['Order ID'])) return false;
            seen.add(o['Order ID']);
            return true;
        });
    }, [orders, selectedDate, selectedStore, selectedShipping, manualOrders]);

    // Search Results for manual addition
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return orders.filter(o => 
            (o['Order ID'].toLowerCase().includes(q) || (o['Customer Phone'] || '').includes(q)) &&
            !filteredOrders.some(existing => existing['Order ID'] === o['Order ID'])
        ).slice(0, 5); // Limit results
    }, [orders, searchQuery, filteredOrders]);

    // Sync selections when filters change
    useEffect(() => {
        setStep1SelectedIds(new Set(filteredOrders.map(o => o['Order ID'])));
    }, [filteredOrders]);

    // Initialize / Restore Session
    useEffect(() => {
        if (isOpen) {
            const savedSession = localStorage.getItem(SESSION_KEY);
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    // Validate session data roughly
                    if (session.pendingOrders && session.pendingOrders.length > 0) {
                        setPendingOrders(session.pendingOrders);
                        setVerifiedIds(new Set(session.verifiedIds));
                        setShippingAdjustments(session.shippingAdjustments);
                        setStep(STEPS.PROMPT);
                    } else {
                        // Invalid session, reset
                        localStorage.removeItem(SESSION_KEY);
                        resetToFilter();
                    }
                } catch (e) {
                    localStorage.removeItem(SESSION_KEY);
                    resetToFilter();
                }
            } else {
                resetToFilter();
            }
        }
    }, [isOpen]);

    const resetToFilter = () => {
        setStep(STEPS.FILTER);
        setPreviewText('');
        setIsPreviewing(false);
        setPendingOrders([]);
        setVerifiedIds(new Set());
        setShippingAdjustments({});
        setStep1ReturnIds(new Set());
        setManualOrders([]);
        setSearchQuery('');
        setShowManualSearch(false);
        setShowPaymentModal(false);
        setPassword('');
        setSelectedBank('');
        // Set default store
        if (appData.stores && appData.stores.length > 0) {
            setSelectedStore(appData.stores[0].StoreName);
        }
        if (appData.shippingMethods && appData.shippingMethods.length > 0) {
            // Check if ACC Delivery Agent exists, otherwise pick first
            const hasACC = appData.shippingMethods.some(m => m.MethodName === 'ACC Delivery Agent');
            if (!hasACC) setSelectedShipping(appData.shippingMethods[0].MethodName);
        }
    };

    const handleDiscardSession = () => {
        localStorage.removeItem(SESSION_KEY);
        resetToFilter();
    };

    const handleGeneratePreview = () => {
        if (filteredOrders.length === 0) {
            alert("No orders to generate!");
            return;
        }

        const dateObj = new Date(selectedDate);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        let text = `📦 **បញ្ជីដឹកជញ្ជូនប្រចាំថ្ងៃ** 📅 ${formattedDate}\n`;
        text += `🚚 ក្រុមហ៊ុន: ${selectedShipping}\n`;
        text += `🏭 ឃ្លាំង: ${selectedStore}\n`;
        text += `--------------------------------\n\n`;
        
        let totalSuccessUSD = 0;
        let totalPaidUSD = 0;
        let totalCodUSD = 0;
        let totalFailedUSD = 0;
        let successCount = 0;
        
        filteredOrders.forEach((o, index) => {
            const phone = o['Customer Phone'] || '';
            const orderId = o['Order ID'] || '';
            const grandTotal = o['Grand Total'] || 0;
            const isPaid = o['Payment Status'] === 'Paid';
            const paymentStatusText = isPaid ? 'Paid' : 'COD';
            const statusIcon = isPaid ? '🟢' : '🔴';
            
            const isSuccess = step1SelectedIds.has(orderId);
            const isReturn = step1ReturnIds.has(orderId);
            
            const location = o.Location || '';
            const details = o['Address Details'] || '';
            let fullAddress = (location === 'រាជធានីភ្នំពេញ' && details) ? details : [location, details].filter(Boolean).join(', ');
            if (fullAddress.length > 35) fullAddress = fullAddress.substring(0, 35) + '...';

            let lineSuffix = '';
            if (isSuccess) {
                lineSuffix = ' ✅';
                totalSuccessUSD += grandTotal;
                successCount++;
                if (isPaid) totalPaidUSD += grandTotal;
                else totalCodUSD += grandTotal;
            } else if (isReturn) {
                lineSuffix = ' ( Return )';
                totalFailedUSD += grandTotal;
            } else {
                lineSuffix = ' ⏳ (ដឹកមិនជោគជ័យ)';
                totalFailedUSD += grandTotal;
            }

            text += `${index + 1}. 📞 ${phone} | \`${orderId}\`\n`;
            text += `   📍 ${fullAddress}\n`;
            text += `   (💵 $${grandTotal.toFixed(2)}) - ${statusIcon} **${paymentStatusText}**${lineSuffix}\n\n`;
        });

        text += `--------------------------------\n`;
        text += `📦 **ចំនួនកញ្ចប់សរុប:** ${successCount} កញ្ចប់\n`;
        text += `💰 **សរុបទឹកប្រាក់ (ដឹកជោគជ័យ):** $${totalSuccessUSD.toFixed(2)}\n`;
        text += `   ├─ 🟢 Paid: $${totalPaidUSD.toFixed(2)}\n`;
        text += `   └─ 🔴 COD: $${totalCodUSD.toFixed(2)} 💸\n`;
        text += `❌ **សរុបទឹកប្រាក់ (ដឹកមិនជោគជ័យ):** $${totalFailedUSD.toFixed(2)}\n\n`;
        
        // Add Confirmation Link for Agent
        const selectedOrderIds = filteredOrders.filter(o => step1SelectedIds.has(o['Order ID'])).map(o => o['Order ID']);
        if (selectedOrderIds.length > 0) {
            const baseUrl = window.location.origin + window.location.pathname;
            const expiryTimestamp = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now
            const confirmUrl = `${baseUrl}?view=confirm_delivery&ids=${selectedOrderIds.join(',')}&store=${encodeURIComponent(selectedStore)}&expires=${expiryTimestamp}`;
            text += `--------------------------------\n`;
            text += `🔗 **ចុចខាងក្រោមដើម្បីបញ្ជាក់ថ្លៃដឹក (Confirm):**\n`;
            text += `👉 ${confirmUrl}`;
        }

        setPreviewText(text);
        setIsPreviewing(true);
    };

    const handleCopyAgentLink = async () => {
        const selectedOrderIds = filteredOrders.filter(o => step1SelectedIds.has(o['Order ID'])).map(o => o['Order ID']);
        if (selectedOrderIds.length === 0) {
            alert("No orders selected!");
            return;
        }
        const baseUrl = window.location.origin + window.location.pathname;
        const expiryTimestamp = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now
        const confirmUrl = `${baseUrl}?view=confirm_delivery&ids=${selectedOrderIds.join(',')}&store=${encodeURIComponent(selectedStore)}&expires=${expiryTimestamp}`;
        
        try {
            await navigator.clipboard.writeText(confirmUrl);
            showNotification("Agent Link Copied!", "success");
        } catch (e) { alert("Failed to copy link"); }
    };

    const handleCopyAndSaveSession = async () => {
        try {
            await navigator.clipboard.writeText(previewText);
            showNotification("Copied! Saving session...", "success");

            // Prepare Data for Verification Stage - Only use what was selected in Step 1
            const currentOrders = filteredOrders.filter(o => step1SelectedIds.has(o['Order ID']));
            const initialAdjustments: Record<string, number> = {};
            currentOrders.forEach(o => {
                initialAdjustments[o['Order ID']] = o['Internal Cost'] || 0;
            });
            const allIds = currentOrders.map(o => o['Order ID']);

            // Save to State
            setPendingOrders(currentOrders);
            setVerifiedIds(new Set(allIds));
            setShippingAdjustments(initialAdjustments);

            // Persist Session
            const sessionData = {
                pendingOrders: currentOrders,
                verifiedIds: allIds, // Set converts to array for JSON
                shippingAdjustments: initialAdjustments,
                timestamp: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

            setStep(STEPS.PROMPT);
        } catch (err) {
            console.error(err);
            alert("Copy failed.");
        }
    };

    // Toggle Verification
    const toggleVerify = (id: string) => {
        setVerifiedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (verifiedIds.size === pendingOrders.length) {
            setVerifiedIds(new Set());
        } else {
            setVerifiedIds(new Set(pendingOrders.map(o => o['Order ID'])));
        }
    };

    const handleShippingChange = (id: string, val: string) => {
        const num = parseFloat(val);
        setShippingAdjustments(prev => ({
            ...prev,
            [id]: isNaN(num) ? 0 : num
        }));
    };

    const hasCheckedUnpaidOrders = useMemo(() => {
        return pendingOrders.some(o => verifiedIds.has(o['Order ID']) && o['Payment Status'] !== 'Paid');
    }, [pendingOrders, verifiedIds]);

    const handleSubmitClick = () => {
        if (verifiedIds.size === 0) {
            alert("Please verify at least one order.");
            return;
        }
        setShowPaymentModal(true);
    };

    const handleConfirmTransaction = async () => {
        if (!password) {
            alert("Please enter your password.");
            return;
        }
        if (hasCheckedUnpaidOrders && !selectedBank) {
            alert("Please select a bank for unpaid orders.");
            return;
        }

        setIsSubmitting(true);

        try {
            const loginRes = await fetch(`${WEB_APP_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser?.UserName,
                    password: password
                })
            });

            const loginJson = await loginRes.json();
            if (!loginRes.ok || loginJson.status !== 'success') {
                throw new Error("Incorrect Password");
            }

            const updates = [];
            for (const order of pendingOrders) {
                if (!verifiedIds.has(order['Order ID'])) continue;

                const newShippingCost = shippingAdjustments[order['Order ID']];
                const isUnpaid = order['Payment Status'] !== 'Paid';
                
                const newData: any = { 'Internal Cost': newShippingCost };

                if (isUnpaid) {
                    newData['Payment Status'] = 'Paid';
                    newData['Payment Info'] = selectedBank;
                    newData['Delivery Paid'] = order['Grand Total'];
                    newData['Delivery Unpaid'] = 0;
                }

                updates.push(fetch(`${WEB_APP_URL}/api/admin/update-row`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sheetName: 'Orders',
                        primaryKey: { 'Order ID': order['Order ID'] },
                        newData: newData
                    })
                }));
            }

            await Promise.all(updates);
            
            // Clear Session
            localStorage.removeItem(SESSION_KEY);
            await refreshData();
            showNotification("Delivery verified successfully!", "success");
            onClose();

        } catch (err: any) {
            console.error("Transaction Error", err);
            alert(err.message || "Failed to process transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div className="bg-[#0f172a] rounded-[2rem] overflow-hidden flex flex-col h-[85vh] border border-white/10 shadow-2xl relative">
                
                {/* Header */}
                <div className="p-6 bg-gray-900/90 backdrop-blur-md border-b border-white/10 flex justify-between items-center sticky top-0 z-20">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-lg ${step === STEPS.FILTER ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                            {step === STEPS.PROMPT ? '!' : Math.floor(step)}
                        </span>
                        {step === STEPS.FILTER ? "បង្កើតបញ្ជី (Generate)" : step === STEPS.PROMPT ? "បន្តសកម្មភាព (Resume)" : "បញ្ជាក់ការដឹក (Confirm Success)"}
                    </h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-all">&times;</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-gradient-to-b from-[#0f172a] to-[#1e293b] flex flex-col">
                    
                    {/* --- STEP 1: FILTER & EDIT PREVIEW --- */}
                    {step === STEPS.FILTER && (
                        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto h-full flex flex-col w-full">
                            {/* Filter Controls */}
                            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all ${isPreviewing ? 'opacity-50 pointer-events-none hidden sm:grid' : ''}`}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block ml-1">កាលបរិច្ឆេទ</label>
                                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="form-input bg-gray-900 border-gray-700 rounded-xl text-white font-bold w-full py-3 px-4 focus:border-blue-500 shadow-inner text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block ml-1">សេវាដឹក</label>
                                    <select value={selectedShipping} onChange={(e) => setSelectedShipping(e.target.value)} className="form-select bg-gray-900 border-gray-700 rounded-xl text-white font-bold w-full py-3 px-4 focus:border-purple-500 shadow-inner text-sm">
                                        {appData.shippingMethods?.map(m => <option key={m.MethodName} value={m.MethodName}>{m.MethodName}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block ml-1">ឃ្លាំង</label>
                                    <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="form-select bg-gray-900 border-gray-700 rounded-xl text-white font-bold w-full py-3 px-4 focus:border-orange-500 shadow-inner text-sm">
                                        {appData.stores?.map(s => <option key={s.StoreName} value={s.StoreName}>{s.StoreName}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Add Past Orders Button */}
                            {!isPreviewing && (
                                <div className="flex justify-start">
                                    <button 
                                        onClick={() => setShowManualSearch(true)}
                                        className="px-6 py-2.5 bg-gray-800/50 hover:bg-blue-600/20 text-gray-400 hover:text-blue-400 rounded-xl border border-dashed border-gray-700 hover:border-blue-500/50 transition-all flex items-center gap-3 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                        បន្ថែមប្រតិបត្ដិការណ៍ចាស់ (Add Past Order)
                                    </button>
                                </div>
                            )}

                            {/* List of Orders in Step 1 */}
                            {!isPreviewing && filteredOrders.length > 0 && (
                                <div className="flex-grow flex flex-col min-h-0 bg-black/20 rounded-2xl border border-gray-700 overflow-hidden shadow-inner">
                                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ជ្រើសរើសទិន្នន័យ ({step1SelectedIds.size}/{filteredOrders.length})</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (step1SelectedIds.size === filteredOrders.length) {
                                                    setStep1SelectedIds(new Set());
                                                } else {
                                                    setStep1SelectedIds(new Set(filteredOrders.map(o => o['Order ID'])));
                                                    setStep1ReturnIds(new Set());
                                                }
                                            }}
                                            className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                                        >
                                            {step1SelectedIds.size === filteredOrders.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar flex-grow">
                                        {filteredOrders.map((order, idx) => {
                                            const isSelected = step1SelectedIds.has(order['Order ID']);
                                            const isReturn = step1ReturnIds.has(order['Order ID']);
                                            
                                            return (
                                                <div 
                                                    key={order['Order ID']} 
                                                    className={`flex items-center gap-3 p-3 border-b border-gray-800/50 hover:bg-white/5 transition-all ${!isSelected && !isReturn ? 'bg-black/10' : ''}`}
                                                >
                                                    <div className="flex-shrink-0 w-5 text-[10px] font-mono text-gray-600 text-center">{idx + 1}</div>
                                                    
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-white truncate">{order['Customer Name']}</p>
                                                            <span className="text-[10px] font-black text-blue-400 font-mono bg-blue-400/10 px-1.5 rounded">{order['Customer Phone']}</span>
                                                        </div>
                                                        <p className="text-[9px] text-gray-500 font-mono truncate">{order['Order ID']} | {order.Location}</p>
                                                    </div>

                                                    <div className="text-right flex-shrink-0 mr-2">
                                                        <p className="text-xs font-black text-blue-400">${order['Grand Total']}</p>
                                                        <p className={`text-[8px] font-bold uppercase ${order['Payment Status'] === 'Paid' ? 'text-emerald-500' : 'text-red-500'}`}>{order['Payment Status']}</p>
                                                    </div>

                                                    <div className="flex gap-1.5 flex-shrink-0">
                                                        {/* Success Button */}
                                                        <button 
                                                            onClick={() => {
                                                                const nextS = new Set(step1SelectedIds);
                                                                const nextR = new Set(step1ReturnIds);
                                                                if (nextS.has(order['Order ID'])) {
                                                                    nextS.delete(order['Order ID']);
                                                                } else {
                                                                    nextS.add(order['Order ID']);
                                                                    nextR.delete(order['Order ID']);
                                                                }
                                                                setStep1SelectedIds(nextS);
                                                                setStep1ReturnIds(nextR);
                                                            }}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-900 border-gray-700 text-gray-600 hover:border-gray-500'}`}
                                                            title="Mark as Success"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                        </button>

                                                        {/* Return Button with Text */}
                                                        <button 
                                                            onClick={() => {
                                                                const nextS = new Set(step1SelectedIds);
                                                                const nextR = new Set(step1ReturnIds);
                                                                if (nextR.has(order['Order ID'])) {
                                                                    nextR.delete(order['Order ID']);
                                                                } else {
                                                                    nextR.add(order['Order ID']);
                                                                    nextS.delete(order['Order ID']);
                                                                }
                                                                setStep1SelectedIds(nextS);
                                                                setStep1ReturnIds(nextR);
                                                            }}
                                                            className={`px-3 h-8 rounded-lg flex items-center justify-center border-2 transition-all gap-1.5 ${isReturn ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-gray-900 border-gray-700 text-gray-600 hover:border-red-500/50 hover:text-red-400'}`}
                                                            title="Mark as Return"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                                            <span className="text-[10px] font-black uppercase">Return</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Action Button for Generate */}
                            {!isPreviewing && (
                                <div className="flex justify-center pt-4">
                                    <button 
                                        onClick={handleGeneratePreview} 
                                        className="group relative px-12 py-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] hover:scale-105 transition-all active:scale-95 flex items-center gap-4 overflow-hidden border border-white/20"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        </div>
                                        <span className="relative z-10 drop-shadow-md">បង្កើតបញ្ជី (Generate Preview)</span>
                                    </button>
                                </div>
                            )}

                            {/* Editable Preview Area */}
                            {isPreviewing && (
                                <div className="flex-grow flex flex-col animate-fade-in-up space-y-4">
                                    <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <label className="text-xs font-black text-gray-300 uppercase tracking-widest">Preview & Edit</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={handleCopyAgentLink}
                                                className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-1.5 transition-colors bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                Copy Link Only
                                            </button>
                                            <button onClick={() => setIsPreviewing(false)} className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                Reset
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-center">
                                        <button 
                                            onClick={handleGeneratePreview}
                                            className="w-full px-6 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl border border-emerald-500/20 transition-all flex items-center gap-3 active:scale-95 text-[10px] font-black uppercase tracking-widest justify-center shadow-lg shadow-blue-900/10"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" /></svg>
                                            Refresh Report Text
                                        </button>
                                    </div>

                                    <textarea 
                                        value={previewText}
                                        onChange={(e) => setPreviewText(e.target.value)}
                                        className="w-full flex-grow bg-black/40 border border-gray-700 rounded-2xl p-4 font-mono text-sm text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none shadow-inner min-h-[300px]"
                                        placeholder="Generated text will appear here..."
                                    />
                                    
                                    <div className="flex justify-center">
                                        <button 
                                            onClick={handleGeneratePreview}
                                            className="text-[10px] font-black text-blue-400 hover:text-white uppercase tracking-[0.2em] bg-blue-600/10 px-6 py-2 rounded-full border border-blue-500/20 transition-all active:scale-90"
                                        >
                                            Refresh Preview Text
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- STEP 1.5: PROMPT (RESUME SESSION) --- */}
                    {step === STEPS.PROMPT && (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 animate-fade-in text-center max-w-lg mx-auto w-full">
                            <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center border-2 border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
                                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">មានប្រតិបត្តិការដែលមិនទាន់បានបញ្ចប់</h3>
                                <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                                    ប្រព័ន្ធបានរក្សាទុកទិន្នន័យពីលើកមុន។ <br/>
                                    តើអ្នកចង់បន្តទៅដំណាក់កាល **បញ្ជាក់ការដឹក (Verify)** ឬចាប់ផ្តើមថ្មី?
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button onClick={handleDiscardSession} className="py-4 rounded-xl bg-gray-800 text-gray-400 font-bold border border-gray-700 hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-400 transition-all">
                                    ចាប់ផ្តើមថ្មី (Discard)
                                </button>
                                <button onClick={() => setStep(STEPS.VERIFY)} className="py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:scale-105 transition-all">
                                    បន្ត (Resume)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 2: VERIFY & CONFIRM --- */}
                    {step === STEPS.VERIFY && (
                        <div className="space-y-6 animate-fade-in w-full">
                            {/* Warning Banner */}
                            <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3">
                                <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <div>
                                    <h4 className="text-amber-400 font-black uppercase text-xs tracking-widest">ការណែនាំ (Instructions)</h4>
                                    <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                                        សូមពិនិត្យមើលបញ្ជីខាងក្រោមអោយបានច្បាស់លាស់។ <br/>
                                        - ដកសញ្ញា ✔️ ចេញ ប្រសិនបើការដឹក **បរាជ័យ** (Failed)។<br/>
                                        - កែប្រែ **Shipping Cost** ប្រសិនបើមានការផ្លាស់ប្តូរ។<br/>
                                        - ប្រព័ន្ធនឹងធ្វើបច្ចុប្បន្នភាពទិន្នន័យបង់ប្រាក់ (Paid) សម្រាប់តែការដឹកជោគជ័យប៉ុណ្ណោះ។
                                    </p>
                                </div>
                            </div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 px-4 items-center">
                                <div className="col-span-1 text-center">No</div>
                                <div className="col-span-4">Customer Info</div>
                                <div className="col-span-2 text-center">Status</div>
                                <div className="col-span-2 text-right">Total</div>
                                <div className="col-span-2 text-right">Ship Cost</div>
                                <div className="col-span-1 flex justify-center">
                                    <button 
                                        onClick={handleSelectAll}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${verifiedIds.size === pendingOrders.length && pendingOrders.length > 0 ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'border-gray-500 text-transparent hover:border-gray-300'}`}
                                        title="Toggle All"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 pb-10">
                                {pendingOrders.map((order, idx) => {
                                    const isChecked = verifiedIds.has(order['Order ID']);
                                    return (
                                        <div 
                                            key={order['Order ID']} 
                                            className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all ${isChecked ? 'bg-gray-800 border-gray-700 shadow-md' : 'bg-red-900/10 border-red-500/30 opacity-50 grayscale'}`}
                                        >
                                            <div className="col-span-1 text-center font-mono text-gray-500">{idx + 1}</div>
                                            
                                            <div className="col-span-4 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-white truncate">{order['Customer Name']}</p>
                                                    <span className="text-[10px] font-black text-blue-400 font-mono bg-blue-400/10 px-1.5 rounded">{order['Customer Phone']}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-mono truncate">{order['Order ID']}</p>
                                            </div>

                                            <div className="col-span-2 text-center">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${order['Payment Status'] === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {order['Payment Status']}
                                                </span>
                                            </div>

                                            <div className="col-span-2 text-right font-bold text-blue-400">
                                                ${order['Grand Total']}
                                            </div>

                                            <div className="col-span-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">$</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={shippingAdjustments[order['Order ID']] ?? 0}
                                                        onChange={(e) => handleShippingChange(order['Order ID'], e.target.value)}
                                                        className="w-full bg-black/30 border border-gray-600 rounded-lg py-1 pl-6 pr-2 text-right text-xs font-bold text-white focus:border-blue-500"
                                                        disabled={!isChecked}
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-span-1 flex justify-center">
                                                <button 
                                                    onClick={() => toggleVerify(order['Order ID'])}
                                                    className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-gray-500 text-transparent hover:border-gray-300'}`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- MANUAL SEARCH OVERLAY --- */}
                    {showManualSearch && (
                        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-gray-900 border border-gray-700 rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl flex flex-col max-h-[80%] animate-scale-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">ស្វែងរកប្រតិបត្តិការណ៍ចាស់</h3>
                                    <button onClick={() => { setShowManualSearch(false); setSearchQuery(''); }} className="text-gray-500 hover:text-white transition-colors">&times;</button>
                                </div>

                                <div className="relative mb-6">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        placeholder="ស្វែងរកតាម ID ឬ លេខទូរស័ព្ទ..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:border-blue-500 transition-all shadow-inner"
                                    />
                                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>

                                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                                    {searchResults.length > 0 ? searchResults.map(o => (
                                        <button 
                                            key={o['Order ID']}
                                            onClick={() => {
                                                setManualOrders(prev => [...prev, o]);
                                                setStep1SelectedIds(prev => new Set(prev).add(o['Order ID']));
                                                setShowManualSearch(false);
                                                setSearchQuery('');
                                                showNotification("Order added successfully!", "success");
                                            }}
                                            className="w-full flex items-center justify-between p-4 bg-gray-800/40 hover:bg-blue-600/10 rounded-2xl border border-white/5 hover:border-blue-500/30 text-left transition-all"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{o['Customer Name']}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{o['Order ID']} | {o['Customer Phone']}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-blue-400">${o['Grand Total']}</p>
                                                <p className="text-[10px] text-gray-600 font-bold uppercase">{o.Timestamp.split(' ')[0]}</p>
                                            </div>
                                        </button>
                                    )) : searchQuery ? (
                                        <div className="text-center py-10 text-gray-500 text-xs italic">មិនមានលទ្ធផលស្វែងរក...</div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-600 text-xs">សូមវាយលេខសម្គាល់ ឬ លេខទូរស័ព្ទដើម្បីស្វែងរក</div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => { setShowManualSearch(false); setSearchQuery(''); }}
                                    className="mt-6 w-full py-4 bg-gray-800 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-700 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/5 bg-gray-900 sticky bottom-0 z-20 flex justify-between gap-4">
                    {step === STEPS.VERIFY && (
                        <button 
                            onClick={() => setStep(STEPS.PROMPT)} 
                            className="px-8 py-4 rounded-2xl bg-gray-800 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-700 hover:text-white transition-all active:scale-95"
                        >
                            Back
                        </button>
                    )}

                    {/* Step 1 Footer */}
                    {step === STEPS.FILTER && isPreviewing && (
                        <div className="flex gap-4 w-full justify-end">
                             <button 
                                onClick={() => setIsPreviewing(false)} 
                                className="px-8 py-4 rounded-2xl bg-gray-800 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-700 transition-all"
                            >
                                Back to Filters
                            </button>
                            <button 
                                onClick={handleCopyAndSaveSession} 
                                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                Copy & Next <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Step 2 Footer */}
                    {step === STEPS.VERIFY && (
                        <button 
                            onClick={handleSubmitClick} 
                            className="w-full sm:w-auto ml-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            Submit Verification <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </button>
                    )}
                </div>

                {/* Final Authorization Modal (Nested) */}
                {showPaymentModal && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl transform scale-100 animate-scale-in">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Final Authorization</h3>
                            <p className="text-gray-400 text-sm mb-6">Please verify payment details for checked orders.</p>

                            <div className="space-y-6">
                                {hasCheckedUnpaidOrders && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Select Bank for Unpaid Orders</label>
                                        <BankSelector 
                                            bankAccounts={appData.bankAccounts || []} 
                                            selectedBankName={selectedBank} 
                                            onSelect={setSelectedBank} 
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-red-400 uppercase tracking-widest">Your Password</label>
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="form-input bg-gray-800 border-gray-600 rounded-xl text-white font-bold w-full py-3 px-4 focus:border-red-500"
                                        placeholder="Required to confirm"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setShowPaymentModal(false)}
                                        className="flex-1 py-3 bg-gray-800 rounded-xl font-bold text-gray-400 hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleConfirmTransaction}
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 active:scale-95 flex justify-center items-center gap-2"
                                    >
                                        {isSubmitting ? <Spinner size="sm" /> : 'Confirm & Update'}
                                    </button>
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

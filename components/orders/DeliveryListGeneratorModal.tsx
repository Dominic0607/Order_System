
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
        return orders.filter(o => {
            if (!o.Timestamp) return false;
            const orderDate = getSafeIsoDate(o.Timestamp); 
            if (!orderDate) return false;
            const isDateMatch = orderDate === selectedDate;
            const isStoreMatch = selectedStore ? o['Fulfillment Store'] === selectedStore : false;
            const isShippingMatch = (o['Internal Shipping Method'] || '').toLowerCase() === selectedShipping.toLowerCase();
            return isDateMatch && isStoreMatch && isShippingMatch;
        });
    }, [orders, selectedDate, selectedStore, selectedShipping]);

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
        setShowPaymentModal(false);
        setPassword('');
        setSelectedBank('');
        // Set default store
        if (appData.stores && appData.stores.length === 1) {
            setSelectedStore(appData.stores[0].StoreName);
        }
    };

    const handleDiscardSession = () => {
        localStorage.removeItem(SESSION_KEY);
        resetToFilter();
    };

    const handleGeneratePreview = () => {
        if (filteredOrders.length === 0) {
            alert("No orders found to generate!");
            return;
        }

        const dateObj = new Date(selectedDate);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        let text = `📦 **បញ្ជីដឹកជញ្ជូនប្រចាំថ្ងៃ** 📅 ${formattedDate}\n`;
        text += `🚚 ក្រុមហ៊ុន: ${selectedShipping}\n`;
        text += `🏭 ឃ្លាំង: ${selectedStore}\n`;
        text += `--------------------------------\n\n`;
        
        let totalUSD = 0;
        
        filteredOrders.forEach((o, index) => {
            const phone = o['Customer Phone'] || '';
            const orderId = o['Order ID'] || '';
            const grandTotal = o['Grand Total'] || 0;
            const isPaid = o['Payment Status'] === 'Paid';
            const paymentStatusText = isPaid ? 'Paid' : 'COD';
            const statusIcon = isPaid ? '🟢' : '🔴';
            
            const location = o.Location || '';
            const details = o['Address Details'] || '';
            let fullAddress = (location === 'រាជធានីភ្នំពេញ' && details) ? details : [location, details].filter(Boolean).join(', ');
            if (fullAddress.length > 25) fullAddress = fullAddress.substring(0, 25) + '...';

            text += `${index + 1}. 📞 ${phone} | \`${orderId}\`\n`;
            text += `   📍 ${fullAddress}\n`;
            text += `   (💵 $${grandTotal.toFixed(2)}) - ${statusIcon} **${paymentStatusText}**\n\n`;
            
            totalUSD += grandTotal;
        });

        text += `--------------------------------\n`;
        text += `📦 **ចំនួនកញ្ចប់សរុប:** ${filteredOrders.length} កញ្ចប់\n`;
        text += `💰 **សរុបទឹកប្រាក់:** $${totalUSD.toFixed(2)}\n`;

        setPreviewText(text);
        setIsPreviewing(true);
    };

    const handleCopyAndSaveSession = async () => {
        try {
            await navigator.clipboard.writeText(previewText);
            showNotification("Copied! Saving session...", "success");

            // Prepare Data for Verification Stage
            const currentOrders = [...filteredOrders];
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
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
                    
                    {/* --- STEP 1: FILTER & EDIT PREVIEW --- */}
                    {step === STEPS.FILTER && (
                        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto h-full flex flex-col">
                            {/* Filter Controls (Hide when previewing to save space, or keep top) */}
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

                            {/* Action Button for Generate */}
                            {!isPreviewing && (
                                <div className="flex justify-center pt-10">
                                    <button onClick={handleGeneratePreview} className="btn btn-primary px-10 py-4 shadow-xl shadow-blue-600/30 text-base">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        បង្កើតបញ្ជី (Generate Preview)
                                    </button>
                                </div>
                            )}

                            {/* Editable Preview Area */}
                            {isPreviewing && (
                                <div className="flex-grow flex flex-col animate-fade-in-up">
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Preview & Edit</label>
                                        <button onClick={() => setIsPreviewing(false)} className="text-xs text-red-400 hover:text-red-300 underline">Reset Filters</button>
                                    </div>
                                    <textarea 
                                        value={previewText}
                                        onChange={(e) => setPreviewText(e.target.value)}
                                        className="w-full flex-grow bg-black/40 border border-gray-700 rounded-2xl p-4 font-mono text-sm text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none shadow-inner"
                                        placeholder="Generated text will appear here..."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- STEP 1.5: PROMPT (RESUME SESSION) --- */}
                    {step === STEPS.PROMPT && (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 animate-fade-in text-center max-w-lg mx-auto">
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
                        <div className="space-y-6 animate-fade-in">
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
                            <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 px-4">
                                <div className="col-span-1 text-center">No</div>
                                <div className="col-span-4">Customer Info</div>
                                <div className="col-span-2 text-center">Status</div>
                                <div className="col-span-2 text-right">Total</div>
                                <div className="col-span-2 text-right">Ship Cost</div>
                                <div className="col-span-1 text-center">Success</div>
                            </div>

                            <div className="space-y-2">
                                {pendingOrders.map((order, idx) => {
                                    const isChecked = verifiedIds.has(order['Order ID']);
                                    return (
                                        <div 
                                            key={order['Order ID']} 
                                            className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all ${isChecked ? 'bg-gray-800 border-gray-700' : 'bg-red-900/10 border-red-500/30 opacity-60'}`}
                                        >
                                            <div className="col-span-1 text-center font-mono text-gray-500">{idx + 1}</div>
                                            
                                            <div className="col-span-4 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{order['Customer Name']}</p>
                                                <p className="text-xs text-gray-400 font-mono truncate">{order['Order ID']}</p>
                                            </div>

                                            <div className="col-span-2 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${order['Payment Status'] === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {order['Payment Status']}
                                                </span>
                                            </div>

                                            <div className="col-span-2 text-right font-bold text-blue-400">
                                                ${order['Grand Total']}
                                            </div>

                                            <div className="col-span-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={shippingAdjustments[order['Order ID']] ?? 0}
                                                        onChange={(e) => handleShippingChange(order['Order ID'], e.target.value)}
                                                        className="w-full bg-black/30 border border-gray-600 rounded-lg py-1.5 pl-6 pr-2 text-right text-sm font-bold text-white focus:border-blue-500"
                                                        disabled={!isChecked}
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-span-1 flex justify-center">
                                                <button 
                                                    onClick={() => toggleVerify(order['Order ID'])}
                                                    className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-500 text-transparent hover:border-gray-300'}`}
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

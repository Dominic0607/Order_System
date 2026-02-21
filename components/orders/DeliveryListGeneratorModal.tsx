
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
    orders: ParsedOrder[]; // This receives GLOBAL orders
    appData: AppData;
    team?: string; // Optional team prop if needed for context
}

const STEPS = {
    FILTER: 1,
    VERIFY: 2 // Stage 2: Confirm & Pay
};

const DeliveryListGeneratorModal: React.FC<DeliveryListGeneratorModalProps> = ({ 
    isOpen, onClose, orders, appData
}) => {
    const { currentUser, showNotification, refreshData } = useContext(AppContext);
    const [step, setStep] = useState(STEPS.FILTER);
    
    // Step 1: Filter States
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedShipping, setSelectedShipping] = useState('ACC Delivery Agent');

    // Step 2: Verification & Adjustment
    const [pendingOrders, setPendingOrders] = useState<ParsedOrder[]>([]);
    const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
    const [shippingAdjustments, setShippingAdjustments] = useState<Record<string, number>>({});
    
    // Finalization Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBank, setSelectedBank] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep(STEPS.FILTER);
            setPendingOrders([]);
            setVerifiedIds(new Set());
            setShippingAdjustments({});
            setShowPaymentModal(false);
            setPassword('');
            setSelectedBank('');
            
            // Set default store if only one exists
            if (appData.stores && appData.stores.length === 1) {
                setSelectedStore(appData.stores[0].StoreName);
            }
        }
    }, [isOpen, appData.stores]);

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

    // Toggle Verification (Stage 2)
    const toggleVerify = (id: string) => {
        setVerifiedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Generate Text & Transition to Stage 2
    const handleCopyAndProceed = async () => {
        if (filteredOrders.length === 0) {
            alert("No orders to copy!");
            return;
        }

        // Generate Text Logic (Same as before)
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
            
            // Location
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

        try {
            await navigator.clipboard.writeText(text);
            showNotification("Copied! Please verify success deliveries.", "success");
            
            // Initialize Stage 2 Data
            setPendingOrders([...filteredOrders]);
            setVerifiedIds(new Set(filteredOrders.map(o => o['Order ID']))); // Default all to checked
            
            // Initialize shipping adjustments
            const initialAdjustments: Record<string, number> = {};
            filteredOrders.forEach(o => {
                initialAdjustments[o['Order ID']] = o['Internal Cost'] || 0;
            });
            setShippingAdjustments(initialAdjustments);

            setStep(STEPS.VERIFY);
        } catch (err) {
            console.error(err);
            alert("Copy failed.");
        }
    };

    const handleShippingChange = (id: string, val: string) => {
        const num = parseFloat(val);
        setShippingAdjustments(prev => ({
            ...prev,
            [id]: isNaN(num) ? 0 : num
        }));
    };

    // Check if we need to ask for a bank (only if any checked order is Unpaid)
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
            // 1. Verify Password
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

            // 2. Process Updates
            const updates = [];
            
            for (const order of pendingOrders) {
                // Skip if unchecked (Failed Delivery)
                if (!verifiedIds.has(order['Order ID'])) continue;

                const newShippingCost = shippingAdjustments[order['Order ID']];
                const isUnpaid = order['Payment Status'] !== 'Paid';
                
                const newData: any = {
                    'Internal Cost': newShippingCost
                };

                // Only update Payment Status & Bank if it was Unpaid
                if (isUnpaid) {
                    newData['Payment Status'] = 'Paid';
                    newData['Payment Info'] = selectedBank;
                    newData['Delivery Paid'] = order['Grand Total']; // Assuming full payment upon delivery
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
            
            await refreshData();
            showNotification("Delivery verified and updated successfully!", "success");
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
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-lg ${step === STEPS.FILTER ? 'bg-blue-600' : 'bg-emerald-600'}`}>{step}</span>
                        {step === STEPS.FILTER ? "បង្កើតបញ្ជី (Generate)" : "បញ្ជាក់ការដឹក (Confirm Success)"}
                    </h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-all">&times;</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
                    
                    {/* --- STEP 1: FILTER & COPY --- */}
                    {step === STEPS.FILTER && (
                        <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block ml-1">កាលបរិច្ឆេទ</label>
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)} 
                                    className="form-input bg-gray-900 border-gray-700 rounded-2xl text-white font-bold w-full py-4 px-5 focus:border-blue-500 shadow-inner"
                                />
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-orange-400 uppercase tracking-widest block ml-1">ឃ្លាំងបញ្ចេញទំនិញ (Store) <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    {appData.stores?.map((s) => (
                                        <button
                                            key={s.StoreName}
                                            onClick={() => setSelectedStore(s.StoreName)}
                                            className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all shadow-lg flex flex-col items-center gap-2 ${selectedStore === s.StoreName ? 'border-orange-500 bg-orange-500/10 text-white shadow-orange-500/20' : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                        >
                                            <span className="text-2xl">🏭</span>
                                            {s.StoreName}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-purple-400 uppercase tracking-widest block ml-1">សេវាដឹក (Shipping Method)</label>
                                <select 
                                    value={selectedShipping} 
                                    onChange={(e) => setSelectedShipping(e.target.value)}
                                    className="form-select bg-gray-900 border-gray-700 rounded-2xl text-white font-bold w-full py-4 px-5 focus:border-purple-500 shadow-inner"
                                >
                                    {appData.shippingMethods?.map(m => (
                                        <option key={m.MethodName} value={m.MethodName}>{m.MethodName}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Preview Stats */}
                            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl flex justify-between items-center">
                                <span className="text-blue-300 font-bold text-sm">Found Orders:</span>
                                <span className="text-2xl font-black text-white">{filteredOrders.length}</span>
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
                            onClick={() => setStep(STEPS.FILTER)} 
                            className="px-8 py-4 rounded-2xl bg-gray-800 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-700 hover:text-white transition-all active:scale-95"
                        >
                            Back
                        </button>
                    )}

                    {step === STEPS.FILTER ? (
                        <button 
                            onClick={() => {
                                if (!selectedStore) {
                                    alert("សូមជ្រើសរើសឃ្លាំង (Store) ជាមុនសិន!");
                                    return;
                                }
                                handleCopyAndProceed();
                            }} 
                            className="w-full sm:w-auto ml-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            Copy & Proceed <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
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

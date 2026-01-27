
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal';
import { ParsedOrder, AppData } from '../../types';

interface DeliveryListGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: ParsedOrder[]; // This receives GLOBAL orders
    appData: AppData;
    team?: string; // Optional team prop if needed for context
}

const STEPS = {
    FILTER: 1,
    VERIFY: 2,
    PREVIEW: 3
};

const DeliveryListGeneratorModal: React.FC<DeliveryListGeneratorModalProps> = ({ 
    isOpen, onClose, orders, appData
}) => {
    const [step, setStep] = useState(STEPS.FILTER);
    
    // Step 1: Filter States
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedShipping, setSelectedShipping] = useState('ACC Delivery Agent');

    // Step 2: Verification State (Set of Order IDs that are successful)
    const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep(STEPS.FILTER);
            setVerifiedIds(new Set());
            // Set default store if only one exists
            if (appData.stores && appData.stores.length === 1) {
                setSelectedStore(appData.stores[0].StoreName);
            }
        }
    }, [isOpen, appData.stores]);

    // Filtered Orders Logic
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const orderDate = new Date(o.Timestamp).toISOString().split('T')[0];
            const isDateMatch = orderDate === selectedDate;
            const isStoreMatch = selectedStore ? o['Fulfillment Store'] === selectedStore : false;
            // Case insensitive check for shipping method just in case
            const isShippingMatch = (o['Internal Shipping Method'] || '').toLowerCase() === selectedShipping.toLowerCase();
            
            return isDateMatch && isStoreMatch && isShippingMatch;
        });
    }, [orders, selectedDate, selectedStore, selectedShipping]);

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
        if (verifiedIds.size === filteredOrders.length) {
            setVerifiedIds(new Set());
        } else {
            setVerifiedIds(new Set(filteredOrders.map(o => o['Order ID'])));
        }
    };

    // Generate Text
    const generatedText = useMemo(() => {
        if (!selectedDate) return '';
        const dateObj = new Date(selectedDate);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        let text = `📦 **បញ្ជីដឹកជញ្ជូនប្រចាំថ្ងៃ** 📅 ${formattedDate}\n`;
        text += `🚚 ក្រុមហ៊ុន: ${selectedShipping}\n`;
        text += `🏭 ឃ្លាំង: ${selectedStore}\n`;
        text += `--------------------------------\n\n`;
        
        let totalSuccessPaid = 0;
        let totalSuccessCOD = 0;
        let totalFailedUSD = 0;

        filteredOrders.forEach((o, index) => {
            const isSuccess = verifiedIds.has(o['Order ID']);
            const verificationMark = isSuccess ? '✅' : '⏳ (ដឹកមិនជោគជ័យ)'; 
            
            // Location Logic
            const location = o.Location || '';
            const details = o['Address Details'] || '';
            let fullAddress = '';

            if (location === 'រាជធានីភ្នំពេញ' && details) {
                fullAddress = details;
            } else {
                fullAddress = [location, details].filter(Boolean).join(', ');
            }

            // Truncate Address (Max 25 chars)
            let displayAddress = fullAddress;
            if (displayAddress.length > 25) {
                displayAddress = displayAddress.substring(0, 25) + '...';
            }
            
            const phone = o['Customer Phone'] || '';
            const orderId = o['Order ID'] || '';
            const grandTotal = o['Grand Total'] || 0;
            const isPaid = o['Payment Status'] === 'Paid';
            const paymentStatusText = isPaid ? 'Paid' : 'COD';
            const statusIcon = isPaid ? '🟢' : '🔴';
            
            // UPDATED FORMAT:
            // 1. Index. 📞 Phone | `OrderID` (Monospace)
            //    📍 Address (Truncated 25)
            //    (💵 Total) - Status Emoji
            
            text += `${index + 1}. 📞 ${phone} | \`${orderId}\`\n`;
            text += `   📍 ${displayAddress}\n`;
            text += `   (💵 $${grandTotal.toFixed(2)}) - ${statusIcon} **${paymentStatusText}** ${verificationMark}\n\n`;
            
            // Calculate Split Totals
            if (isSuccess) {
                if (isPaid) {
                    totalSuccessPaid += grandTotal;
                } else {
                    totalSuccessCOD += grandTotal;
                }
            } else {
                totalFailedUSD += grandTotal;
            }
        });

        if (filteredOrders.length === 0) {
            text += "    (មិនមានទិន្នន័យសម្រាប់ថ្ងៃនេះ)\n";
        }

        const totalSuccessUSD = totalSuccessPaid + totalSuccessCOD;

        text += `--------------------------------\n`;
        text += `📦 **ចំនួនកញ្ចប់សរុប:** ${filteredOrders.length} កញ្ចប់\n`;
        
        // Bold Success Total
        text += `💰 **សរុបទឹកប្រាក់ (ដឹកជោគជ័យ): $${totalSuccessUSD.toFixed(2)}**\n`;
        if (totalSuccessUSD > 0) {
            text += `   ├─ 🟢 Paid: $${totalSuccessPaid.toFixed(2)}\n`;
            text += `   └─ 🔴 COD: $${totalSuccessCOD.toFixed(2)}\n`;
        }
        
        // Add Emoji for Failed Total
        if (totalFailedUSD > 0) {
            text += `❌ សរុបទឹកប្រាក់ (ដឹកមិនជោគជ័យ): $${totalFailedUSD.toFixed(2)}\n`;
        }
        
        return text;
    }, [filteredOrders, verifiedIds, selectedDate, selectedStore, selectedShipping]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedText);
            // Use a simpler alert or a toast if available in context, for now alert is fine
            alert("អត្ថបទត្រូវបានចម្លង (Copied)!");
        } catch (err) {
            console.error(err);
            alert("បរាជ័យក្នុងការចម្លង។");
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
            <div className="bg-[#0f172a] rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] border border-white/10 shadow-2xl">
                
                {/* Header */}
                <div className="p-6 bg-gray-900/90 backdrop-blur-md border-b border-white/10 flex justify-between items-center sticky top-0 z-20">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-lg shadow-blue-600/20">{step}</span>
                        {step === STEPS.FILTER && "កំណត់លក្ខខណ្ឌ (Filter)"}
                        {step === STEPS.VERIFY && "ផ្ទៀងផ្ទាត់ (Verify)"}
                        {step === STEPS.PREVIEW && "បង្កើតអត្ថបទ (Preview)"}
                    </h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-all">&times;</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
                    
                    {/* STEP 1: FILTER */}
                    {step === STEPS.FILTER && (
                        <div className="space-y-8 animate-fade-in">
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
                        </div>
                    )}

                    {/* STEP 2: VERIFY */}
                    {step === STEPS.VERIFY && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-2 bg-black/20 p-3 rounded-2xl border border-white/5">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total: <strong className="text-white text-sm">{filteredOrders.length}</strong> Orders</p>
                                <button onClick={handleSelectAll} className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Toggle All</button>
                            </div>

                            {filteredOrders.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-gray-700 rounded-[2rem] bg-gray-800/30">
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No matching orders found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredOrders.map((order, idx) => {
                                        const isChecked = verifiedIds.has(order['Order ID']);
                                        return (
                                            <div 
                                                key={order['Order ID']} 
                                                onClick={() => toggleVerify(order['Order ID'])}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all group ${isChecked ? 'bg-emerald-900/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-gray-800 border-transparent hover:bg-gray-700'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all flex-shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'border-gray-600 bg-gray-900 text-transparent'}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-sm font-black text-white truncate">{order['Customer Name']}</p>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${order['Payment Status'] === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{order['Payment Status']}</span>
                                                    </div>
                                                    <p className="text-xs font-mono text-gray-400 font-bold mt-0.5">{order['Customer Phone']}</p>
                                                    <p className="text-[10px] text-gray-500 mt-1 truncate">{order.Location}, {order['Address Details']}</p>
                                                </div>
                                                <div className="text-right pl-2 border-l border-white/5">
                                                    <p className="text-base font-black text-blue-400">${order['Grand Total']}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === STEPS.PREVIEW && (
                        <div className="animate-fade-in h-full flex flex-col">
                            <div className="bg-black/40 p-5 rounded-2xl border border-gray-700/50 font-mono text-xs sm:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed shadow-inner flex-grow overflow-auto">
                                {generatedText}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/5 bg-gray-900 sticky bottom-0 z-20 flex justify-between gap-4">
                    {step > 1 ? (
                        <button 
                            onClick={() => setStep(step - 1)} 
                            className="px-8 py-4 rounded-2xl bg-gray-800 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-700 hover:text-white transition-all active:scale-95"
                        >
                            Back
                        </button>
                    ) : (
                        <div></div> 
                    )}

                    {step < STEPS.PREVIEW ? (
                        <button 
                            onClick={() => {
                                if (step === STEPS.FILTER && !selectedStore) {
                                    alert("សូមជ្រើសរើសឃ្លាំង (Store) ជាមុនសិន!");
                                    return;
                                }
                                setStep(step + 1);
                            }} 
                            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
                        >
                            Next <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ) : (
                        <button 
                            onClick={handleCopy} 
                            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            Copy Text
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default DeliveryListGeneratorModal;

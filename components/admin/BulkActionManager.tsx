
import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import { WEB_APP_URL } from '../../constants';
import { ParsedOrder } from '../../types';
import BulkActionBarDesktop from './BulkActionBarDesktop';
import BulkActionBarMobile from './BulkActionBarMobile';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import ShippingMethodDropdown from '../common/ShippingMethodDropdown';
import DriverSelector from '../orders/DriverSelector';

interface BulkActionManagerProps {
    orders: ParsedOrder[];
    selectedIds: Set<string>;
    onComplete: () => void;
    onClearSelection: () => void;
}

const BulkActionManager: React.FC<BulkActionManagerProps> = ({ orders, selectedIds, onComplete, onClearSelection }) => {
    const { appData, currentUser, refreshData, isSidebarCollapsed } = useContext(AppContext);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Modals visibility
    const [activeModal, setActiveModal] = useState<'cost' | 'payment' | 'shipping' | 'delete' | null>(null);

    // Form states
    const [costValue, setCostValue] = useState('');
    
    // Payment States
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [paymentInfo, setPaymentInfo] = useState('');

    // Shipping States
    const [shippingMethod, setShippingMethod] = useState('');
    const [shippingDriver, setShippingDriver] = useState('');
    const [shippingCost, setShippingCost] = useState('');
    
    const [deletePassword, setDeletePassword] = useState('');

    const handleBulkUpdate = async (partialUpdate: any, confirmMsg?: string) => {
        if (selectedIds.size === 0) return;
        if (confirmMsg && !window.confirm(confirmMsg)) return;

        setIsProcessing(true);
        try {
            const idArray = Array.from(selectedIds);
            
            for (const id of idArray) {
                const originalOrder = orders.find(o => o['Order ID'] === id);
                if (!originalOrder) continue;

                const mergedData = { ...originalOrder, ...partialUpdate };
                
                const cleanPayload: any = {
                    "Timestamp": mergedData.Timestamp,
                    "Order ID": mergedData['Order ID'],
                    "User": mergedData.User,
                    "Page": mergedData.Page,
                    "TelegramValue": mergedData.TelegramValue,
                    "Customer Name": mergedData['Customer Name'],
                    "Customer Phone": mergedData['Customer Phone'],
                    "Location": mergedData.Location,
                    "Address Details": mergedData['Address Details'],
                    "Note": mergedData.Note || "",
                    "Shipping Fee (Customer)": mergedData['Shipping Fee (Customer)'],
                    "Subtotal": mergedData.Subtotal,
                    "Grand Total": mergedData['Grand Total'],
                    "Internal Shipping Method": mergedData['Internal Shipping Method'],
                    "Internal Shipping Details": mergedData['Internal Shipping Details'],
                    "Internal Cost": Number(mergedData['Internal Cost']) || 0,
                    "Payment Status": mergedData['Payment Status'],
                    "Payment Info": mergedData['Payment Info'] || "",
                    "Discount ($)": mergedData['Discount ($)'],
                    "Total Product Cost ($)": mergedData['Total Product Cost ($)'],
                    "Fulfillment Store": mergedData['Fulfillment Store'],
                    "Team": mergedData.Team,
                    "Scheduled Time": mergedData['Scheduled Time'] || "",
                    "IsVerified": mergedData.IsVerified
                };

                cleanPayload['Products (JSON)'] = JSON.stringify(mergedData.Products);

                await fetch(`${WEB_APP_URL}/api/admin/update-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        orderId: id, 
                        team: mergedData.Team, 
                        userName: currentUser?.UserName, 
                        newData: cleanPayload 
                    })
                });
            }
            
            await refreshData();
            setActiveModal(null);
            onComplete();
        } catch (e) {
            console.error("Bulk update failed:", e);
            alert("ការកែសម្រួលបរាជ័យ!");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (deletePassword !== currentUser?.Password) {
            alert("លេខសម្ងាត់មិនត្រឹមត្រូវ!");
            return;
        }

        setIsProcessing(true);
        try {
            const idArray = Array.from(selectedIds);
            for (const id of idArray) {
                const order = orders.find(o => o['Order ID'] === id);
                await fetch(`${WEB_APP_URL}/api/admin/delete-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: id,
                        team: order?.Team,
                        userName: currentUser?.UserName,
                        telegramMessageId1: order?.['Telegram Message ID 1'],
                        telegramMessageId2: order?.['Telegram Message ID 2'],
                        telegramChatId: order?.TelegramValue
                    })
                });
            }
            await refreshData();
            setActiveModal(null);
            setDeletePassword('');
            onComplete();
        } catch (e) {
            alert("ការលុបបរាជ័យ!");
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper to check if selected shipping needs driver
    const selectedMethodInfo = appData.shippingMethods?.find(m => m.MethodName === shippingMethod);
    const requiresDriver = selectedMethodInfo?.RequireDriverSelection;

    if (selectedIds.size === 0) return null;

    return (
        <>
            {/* Desktop View */}
            <BulkActionBarDesktop 
                selectedCount={selectedIds.size}
                isSidebarCollapsed={isSidebarCollapsed}
                isProcessing={isProcessing}
                onVerify={() => handleBulkUpdate({ 'IsVerified': true }, `បញ្ជាក់លើការកម្មង់ទាំង ${selectedIds.size} នេះ?`)}
                onUnverify={() => handleBulkUpdate({ 'IsVerified': false })}
                onOpenModal={setActiveModal}
                onClearSelection={onClearSelection}
            />

            {/* Mobile View */}
            <BulkActionBarMobile 
                selectedCount={selectedIds.size}
                isProcessing={isProcessing}
                onVerify={() => handleBulkUpdate({ 'IsVerified': true }, `បញ្ជាក់លើការកម្មង់ទាំង ${selectedIds.size} នេះ?`)}
                onUnverify={() => handleBulkUpdate({ 'IsVerified': false })}
                onOpenModal={setActiveModal}
                onClearSelection={onClearSelection}
            />

            {/* Modals */}
            
            {/* 1. COST MODAL */}
            <Modal isOpen={activeModal === 'cost'} onClose={() => setActiveModal(null)} maxWidth="max-w-sm">
                <div className="p-8 bg-[#0f172a] rounded-[3rem] border border-white/10">
                    <h3 className="text-xl font-black text-white text-center mb-8 uppercase tracking-tight">កែប្រែថ្លៃដឹកដើម (Cost)</h3>
                    <div className="relative mb-8">
                        <input type="number" step="0.01" value={costValue} onChange={e => setCostValue(e.target.value)} className="form-input !bg-black/40 !border-gray-700 !py-6 text-blue-400 font-black text-4xl text-center rounded-[2rem] focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="0.00" autoFocus />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-2xl">$</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setActiveModal(null)} className="py-4 text-gray-500 font-black uppercase text-xs tracking-widest hover:text-white transition-colors">បោះបង់</button>
                        <button onClick={() => handleBulkUpdate({ 'Internal Cost': Number(costValue) })} className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/20 active:scale-95" disabled={isProcessing || !costValue}>រក្សាទុក</button>
                    </div>
                </div>
            </Modal>

            {/* 2. PAYMENT MODAL */}
            <Modal isOpen={activeModal === 'payment'} onClose={() => setActiveModal(null)} maxWidth="max-w-md">
                <div className="p-6 sm:p-8 bg-[#0f172a] rounded-[2.5rem] border border-white/10 overflow-hidden">
                    <h3 className="text-lg font-black text-white text-center mb-6 uppercase tracking-tight">កែប្រែស្ថានភាពទូទាត់</h3>
                    
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-gray-700 mb-6">
                        <button 
                            onClick={() => { setPaymentStatus('Paid'); }}
                            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${paymentStatus === 'Paid' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            ✅ Paid (រួចរាល់)
                        </button>
                        <button 
                            onClick={() => { setPaymentStatus('Unpaid'); setPaymentInfo(''); }}
                            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${paymentStatus === 'Unpaid' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            ⏳ Unpaid (COD)
                        </button>
                    </div>

                    {paymentStatus === 'Paid' && (
                        <div className="space-y-3 mb-8 animate-fade-in-down">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ជ្រើសរើសធនាគារ</p>
                            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {appData.bankAccounts?.map((b: any) => (
                                    <button 
                                        key={b.BankName} 
                                        onClick={() => setPaymentInfo(b.BankName)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${paymentInfo === b.BankName ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-gray-800/50 border-white/5 hover:border-white/20'}`}
                                    >
                                        <img src={convertGoogleDriveUrl(b.LogoURL)} className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5" alt="" />
                                        <span className={`text-[10px] font-black truncate ${paymentInfo === b.BankName ? 'text-blue-400' : 'text-gray-400'}`}>{b.BankName}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                        <button onClick={() => setActiveModal(null)} className="py-4 text-gray-500 font-black uppercase text-xs tracking-widest hover:text-white">បោះបង់</button>
                        <button 
                            onClick={() => handleBulkUpdate({ 'Payment Status': paymentStatus, 'Payment Info': paymentStatus === 'Paid' ? paymentInfo : '' })} 
                            className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" 
                            disabled={isProcessing || (paymentStatus === 'Paid' && !paymentInfo)}
                        >
                            រក្សាទុក
                        </button>
                    </div>
                </div>
            </Modal>

            {/* 3. SHIPPING MODAL - Reusable Components */}
            <Modal isOpen={activeModal === 'shipping'} onClose={() => setActiveModal(null)} maxWidth="max-w-xl">
                <div className="p-6 sm:p-8 bg-[#0f172a] rounded-[2.5rem] border border-white/10 max-h-[85vh] flex flex-col">
                    <h3 className="text-lg font-black text-white text-center mb-6 uppercase tracking-tight flex-shrink-0">កែប្រែក្រុមហ៊ុនដឹកជញ្ជូន</h3>
                    
                    <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-grow">
                        {/* 1. Method Selection using Component */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ជ្រើសរើសសេវាដឹក</p>
                            <ShippingMethodDropdown 
                                methods={appData.shippingMethods || []}
                                selectedMethodName={shippingMethod}
                                onSelect={(m) => { setShippingMethod(m.MethodName); setShippingDriver(''); }}
                            />
                        </div>

                        {/* 2. Driver Selection using Component */}
                        {requiresDriver && (
                            <div className="space-y-3 animate-fade-in">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="h-4 w-1 bg-blue-500 rounded-full"></div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ជ្រើសរើសអ្នកដឹក (DriverSelection)*</label>
                                </div>
                                <DriverSelector 
                                    drivers={appData.drivers || []}
                                    selectedDriverName={shippingDriver}
                                    onSelect={setShippingDriver}
                                />
                                {!shippingDriver && <p className="text-center text-[9px] text-gray-500 italic">សូមជ្រើសរើសអ្នកដឹកម្នាក់</p>}
                            </div>
                        )}

                        {/* 3. Cost Input */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">កែប្រែថ្លៃដឹកដើម (Internal Cost)</p>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={shippingCost} 
                                    onChange={e => setShippingCost(e.target.value)} 
                                    className="form-input !bg-black/40 !border-gray-700 !py-4 pl-4 pr-10 rounded-2xl font-black text-white focus:border-blue-500" 
                                    placeholder="បញ្ចូលថ្លៃដឹកថ្មី (បើមាន)" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            </div>
                            <div className="flex gap-2">
                                {[0, 1.25, 1.5, 2.0].map(val => (
                                    <button 
                                        key={val} 
                                        onClick={() => setShippingCost(String(val))}
                                        className="flex-1 py-2 bg-gray-800 border border-gray-700 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                                    >
                                        ${val}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 flex-shrink-0">
                        <button onClick={() => setActiveModal(null)} className="py-4 text-gray-500 font-black uppercase text-xs tracking-widest hover:text-white">បោះបង់</button>
                        <button 
                            onClick={() => {
                                const payload: any = { 'Internal Shipping Method': shippingMethod };
                                if (requiresDriver) payload['Internal Shipping Details'] = shippingDriver;
                                else payload['Internal Shipping Details'] = shippingMethod; // Default detail to method name if no driver
                                
                                if (shippingCost) payload['Internal Cost'] = Number(shippingCost);
                                
                                handleBulkUpdate(payload);
                            }} 
                            className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isProcessing || !shippingMethod || (requiresDriver && !shippingDriver)}
                        >
                            រក្សាទុក
                        </button>
                    </div>
                </div>
            </Modal>

            {/* 4. DELETE MODAL */}
            <Modal isOpen={activeModal === 'delete'} onClose={() => setActiveModal(null)} maxWidth="max-w-md">
                <div className="p-8 bg-[#0f172a] rounded-[3rem] border border-white/10">
                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-white text-center mb-4 uppercase tracking-tight">លុបប្រតិបត្តិការណ៍សរុប</h3>
                    <p className="text-center text-gray-500 text-sm mb-8">តើអ្នកប្រាកដទេថាចង់លុបការកម្មង់ទាំង <strong>{selectedIds.size}</strong> នេះ? សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយបានទេ។</p>
                    
                    <div className="space-y-4 mb-8">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">បញ្ចូលពាក្យសម្ងាត់ដើម្បីបញ្ជាក់</label>
                        <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} className="form-input !bg-red-500/5 !border-red-500/20 !py-4 text-center text-white font-black tracking-widest" placeholder="••••••••" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setActiveModal(null)} className="py-4 text-gray-500 font-black uppercase text-xs tracking-widest">បោះបង់</button>
                        <button onClick={handleBulkDelete} className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40 active:scale-95" disabled={isProcessing || !deletePassword}>បាទ, លុបទាំងអស់</button>
                    </div>
                </div>
            </Modal>

            <style>{`
                @keyframes pulse-subtle {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(37,99,235,0.2); }
                    50% { transform: scale(1.05); box-shadow: 0 0 35px rgba(37,99,235,0.4); }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 2s infinite ease-in-out;
                }
            `}</style>
        </>
    );
};

export default BulkActionManager;

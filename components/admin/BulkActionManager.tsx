
import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { WEB_APP_URL } from '../../constants';

interface BulkActionManagerProps {
    selectedIds: Set<string>;
    onComplete: () => void;
    onClearSelection: () => void;
}

const BulkActionManager: React.FC<BulkActionManagerProps> = ({ selectedIds, onComplete, onClearSelection }) => {
    const { appData, currentUser, refreshData, isSidebarCollapsed } = useContext(AppContext);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Modals visibility
    const [activeModal, setActiveModal] = useState<'cost' | 'payment' | 'shipping' | 'delete' | null>(null);

    // Form states
    const [costValue, setCostValue] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [paymentInfo, setPaymentInfo] = useState('');
    const [shippingMethod, setShippingMethod] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    const handleBulkUpdate = async (updateData: any, confirmMsg?: string) => {
        if (selectedIds.size === 0) return;
        if (confirmMsg && !window.confirm(confirmMsg)) return;

        setIsProcessing(true);
        try {
            const idArray = Array.from(selectedIds);
            const chunkSize = 5;
            for (let i = 0; i < idArray.length; i += chunkSize) {
                const chunk = idArray.slice(i, i + chunkSize);
                await Promise.all(chunk.map(id => 
                    fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            sheetName: 'AllOrders', 
                            primaryKey: { 'Order ID': id }, 
                            newData: updateData 
                        })
                    })
                ));
            }
            
            await refreshData();
            setActiveModal(null);
            onComplete();
        } catch (e) {
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
                await fetch(`${WEB_APP_URL}/api/admin/delete-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: id,
                        userName: currentUser?.UserName,
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

    if (selectedIds.size === 0) return null;

    /**
     * ============================================================
     * ផ្នែកបញ្ជាទីតាំង (POSITION CONTROLS)
     * ============================================================
     * - បើចង់រំកិលទៅ "ឆ្វេង" ទៀត៖ បន្ថយលេខ paddingLeft (ឧទាហរណ៍ 64px)
     * - បើចង់រំកិលទៅ "ស្ដាំ" ៖ បង្កើនលេខ paddingLeft (ឧទាហរណ៍ 200px)
     * - បើចង់ប្ដូរគម្លាត "បាត" ៖ ប្ដូរ Class bottom-10 នៅខាងក្រោម
     */
    const containerPaddingLeft = isSidebarCollapsed ? '64px' : '208px';

    return (
        <>
            {/* --- Outer Wrapper (រ៉ាប់រងការរុញទីតាំងពី Sidebar) --- */}
            <div 
                className="fixed bottom-10 left-0 w-full z-[100] flex justify-center pointer-events-none transition-all duration-500"
                style={{ paddingLeft: containerPaddingLeft }}
            >
                {/* --- The Bar Content --- */}
                <div className="relative bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_30px_70px_rgba(0,0,0,0.8)] p-2 sm:p-3 flex items-center gap-4 sm:gap-6 overflow-hidden ring-1 ring-white/10 pointer-events-auto animate-fade-in-up">
                    
                    {/* Glowing Aura */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-full bg-blue-500/5 blur-[80px] pointer-events-none"></div>

                    {/* 1. Counter Display */}
                    <div className="flex items-center gap-3.5 pl-3 sm:pl-5 relative z-10">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-lg shadow-[0_0_25px_rgba(37,99,235,0.4)] animate-pulse-subtle border-2 border-white/10">
                            {selectedIds.size}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-black text-white leading-none tracking-tight">ជ្រើសរើស</span>
                            <span className="text-[8px] text-blue-400 font-bold uppercase tracking-[0.25em] mt-1">ACTIVE NODE</span>
                        </div>
                    </div>

                    {/* Separator | */}
                    <div className="h-10 w-px bg-white/10 relative z-10"></div>

                    {/* 2. Verify Pill Group */}
                    <div className="flex items-center bg-[#242f41] p-1.5 rounded-[1.8rem] border border-white/5 relative z-10">
                        <button 
                            onClick={() => handleBulkUpdate({ 'IsVerified': true }, `បញ្ជាក់លើការកម្មង់ទាំង ${selectedIds.size} នេះ?`)}
                            className="px-6 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-[1.4rem] text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                            disabled={isProcessing}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}><path d="M5 13l4 4L19 7" /></svg>
                            VERIFY
                        </button>
                        <button 
                            onClick={() => handleBulkUpdate({ 'IsVerified': false })}
                            className="px-5 py-2.5 text-gray-400 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                            disabled={isProcessing}
                        >
                            UNVERIFY
                        </button>
                    </div>

                    {/* 3. Action Pills Group */}
                    <div className="flex items-center gap-1 bg-white/5 px-6 py-1.5 rounded-[1.8rem] border border-white/5 relative z-10">
                        <button onClick={() => setActiveModal('cost')} className="px-3.5 py-3 hover:text-white text-[#f6ad55] text-[11px] font-black uppercase tracking-widest transition-all hover:scale-110">COST</button>
                        <button onClick={() => setActiveModal('payment')} className="px-3.5 py-3 hover:text-white text-[#4299e1] text-[11px] font-black uppercase tracking-widest transition-all hover:scale-110">PAY</button>
                        <button onClick={() => setActiveModal('shipping')} className="px-3.5 py-3 hover:text-white text-[#9f7aea] text-[11px] font-black uppercase tracking-widest transition-all hover:scale-110">SHIP</button>
                    </div>

                    {/* Separator | */}
                    <div className="h-10 w-px bg-white/10 relative z-10"></div>

                    {/* 4. Danger Action */}
                    <div className="pr-3 sm:pr-5 relative z-10">
                        <button 
                            onClick={() => setActiveModal('delete')} 
                            className="px-6 py-3.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-[1.6rem] text-[12px] font-black transition-all active:scale-95 shadow-lg hover:shadow-red-900/20"
                        >
                            លុបចោល
                        </button>
                    </div>

                    {/* Clear All Helper Float */}
                    <button 
                        onClick={onClearSelection}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gray-800/80 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-all shadow-xl"
                    >
                        Clear Selection
                    </button>
                </div>
            </div>

            {/* --- Modals --- */}
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

            <Modal isOpen={activeModal === 'payment'} onClose={() => setActiveModal(null)} maxWidth="max-w-md">
                <div className="p-8 bg-[#0f172a] rounded-[3rem] border border-white/10">
                    <h3 className="text-xl font-black text-white text-center mb-8 uppercase tracking-tight">កែប្រែស្ថានភាពទូទាត់</h3>
                    <div className="space-y-4 mb-10">
                        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="form-select bg-black/40 border-gray-700 !py-4 font-black rounded-2xl focus:border-blue-500/50">
                            <option value="Paid">Paid (រួចរាល់)</option>
                            <option value="Unpaid">Unpaid (COD)</option>
                        </select>
                        {paymentStatus === 'Paid' && (
                            <select value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} className="form-select bg-black/40 border-gray-700 !py-4 font-black rounded-2xl animate-fade-in-down">
                                <option value="">-- ជ្រើសរើសធនាគារ --</option>
                                {appData.bankAccounts?.map((b: any) => <option key={b.BankName} value={b.BankName}>{b.BankName}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setActiveModal(null)} className="py-4 text-gray-500 font-black uppercase text-xs tracking-widest">បោះបង់</button>
                        <button onClick={() => handleBulkUpdate({ 'Payment Status': paymentStatus, 'Payment Info': paymentStatus === 'Paid' ? paymentInfo : '' })} className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl" disabled={isProcessing || (paymentStatus === 'Paid' && !paymentInfo)}>រក្សាទុក</button>
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

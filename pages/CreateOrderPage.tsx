
import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { Product as ProductType, MasterProduct, ShippingMethod, Driver, BankAccount, Store, TeamPage } from '../types';
import Spinner from '../components/common/Spinner';
import { WEB_APP_URL } from '../constants';
import Modal from '../components/common/Modal';
import { convertGoogleDriveUrl } from '../utils/fileUtils';
import SearchableProductDropdown from '../components/common/SearchableProductDropdown';

declare global {
    interface Window {
        Html5Qrcode: any;
    }
}

interface CreateOrderPageProps {
    team: string;
    onSaveSuccess: () => void;
    onCancel: () => void;
}

type ProductUIState = ProductType & {
    discountType: 'percent' | 'amount' | 'custom';
    discountAmountInput: string;
    discountPercentInput: string;
    finalPriceInput: string;
    applyDiscountToTotal: boolean;
}

const initialProductState: ProductUIState = {
    id: Date.now(),
    name: '',
    quantity: 1,
    originalPrice: 0,
    finalPrice: 0,
    total: 0,
    discountPercent: 0,
    colorInfo: '',
    image: '',
    cost: 0,
    discountType: 'percent',
    discountAmountInput: '',
    discountPercentInput: '',
    finalPriceInput: '',
    applyDiscountToTotal: false,
};

const STEPS = [
    { number: 1, title: 'អតិថិជន' },
    { number: 2, title: 'ផលិតផល' },
    { number: 3, title: 'ដឹកជញ្ជូន' },
    { number: 4, title: 'ផ្ទៀងផ្ទាត់' },
];

const MapModal: React.FC<{ isOpen: boolean; onClose: () => void; url: string; }> = ({ isOpen, onClose, url }) => {
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { if (isOpen) setIsLoading(true); }, [isOpen, url]);
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
            <h2 className="text-xl font-bold mb-2 text-white">ស្វែងរកទីតាំង</h2>
            <div className="relative w-full h-[70vh] bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                {isLoading && <div className="absolute inset-0 flex items-center justify-center"><Spinner size="lg"/><span className="ml-3 text-gray-300">Loading Map...</span></div>}
                <iframe src={url} width="100%" height="100%" style={{ border: 0 }} onLoad={() => setIsLoading(false)} className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}></iframe>
            </div>
        </Modal>
    );
};

const BarcodeScannerModal = ({ onClose, onCodeScanned, scanMode, setScanMode, productsInOrder, masterProducts }: any) => {
    const scannerRef = useRef<any>(null);
    const [isScannerInitializing, setIsScannerInitializing] = useState(true);
    useEffect(() => {
        const scanner = new window.Html5Qrcode("barcode-reader-container");
        scannerRef.current = scanner;
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        scanner.start({ facingMode: "environment" }, config, (text: string) => { onCodeScanned(text); if (scanMode === 'single') onClose(); })
            .then(() => setIsScannerInitializing(false))
            .catch(() => setIsScannerInitializing(false));
        return () => { if (scannerRef.current?.getState() === 2) scannerRef.current.stop(); };
    }, [onCodeScanned, scanMode]);
    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col p-4">
            <div className="flex justify-between items-center text-white mb-4"><h2 className="text-xl font-bold">Scan Barcode</h2><button onClick={onClose} className="p-2 bg-gray-800 rounded-full">&times;</button></div>
            <div id="barcode-reader-container" className="flex-grow bg-gray-900 rounded-lg overflow-hidden relative">
                {isScannerInitializing && <div className="absolute inset-0 flex items-center justify-center"><Spinner size="lg"/></div>}
            </div>
            <div className="mt-4 flex gap-4">
                <button onClick={() => setScanMode('increment')} className={`flex-1 py-3 rounded-xl font-bold ${scanMode === 'increment' ? 'bg-blue-600' : 'bg-gray-800'}`}>បូកចំនួន</button>
                <button onClick={() => setScanMode('single')} className={`flex-1 py-3 rounded-xl font-bold ${scanMode === 'single' ? 'bg-blue-600' : 'bg-gray-800'}`}>រាប់មួយ</button>
            </div>
        </div>
    );
};

const CreateOrderPage: React.FC<CreateOrderPageProps> = ({ team, onSaveSuccess, onCancel }) => {
    const { appData, currentUser, previewImage, apiKey } = useContext(AppContext);
    const [currentStep, setCurrentStep] = useState(1);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    
    const [order, setOrder] = useState<any>({
        page: '',
        telegramValue: '',
        fulfillmentStore: '', // New Field
        scheduledTime: '',    // New Field
        isScheduled: false,   // UI State
        customer: { name: '', phone: '', province: '', district: '', sangkat: '', additionalLocation: '', shippingFee: '' },
        products: [{...initialProductState, id: Date.now()}],
        shipping: { method: '', details: '', cost: '' },
        payment: { status: 'Unpaid', info: '' },
        subtotal: 0,
        grandTotal: 0,
        note: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [selectedShippingMethod, setSelectedShippingMethod] = useState<any>(null);
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [scanMode, setScanMode] = useState<'single' | 'increment'>('increment');
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [mapSearchUrl, setMapSearchUrl] = useState('');
    const [shippingFeeOption, setShippingFeeOption] = useState<'charge' | 'free'>('charge');

    const teamPages = useMemo(() => appData.pages?.filter((p: any) => p.Team === team) || [], [appData.pages, team]);
    const stores = useMemo(() => appData.stores || [], [appData.stores]);

    const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pageName = e.target.value;
        const pageData = teamPages.find((p: any) => p.PageName === pageName);
        setOrder((prev: any) => ({
            ...prev,
            page: pageName,
            telegramValue: pageData ? pageData.TelegramValue : '',
            fulfillmentStore: pageData?.DefaultStore || prev.fulfillmentStore // Auto-default store
        }));
    };

    const handleCodeScanned = useCallback((scannedCode: string) => {
        const foundProduct = appData.products.find((p: MasterProduct) => p.Barcode?.trim() === scannedCode.trim());
        if (!foundProduct) return;
        setOrder((prev: any) => {
            const idx = prev.products.findIndex((p: any) => p.name === foundProduct.ProductName);
            const updated = [...prev.products];
            if (idx > -1) {
                if (scanMode === 'increment') updated[idx].quantity += 1;
            } else {
                updated.push({ ...initialProductState, id: Date.now(), name: foundProduct.ProductName, originalPrice: foundProduct.Price, cost: foundProduct.Cost, image: foundProduct.ImageURL });
            }
            return { ...prev, products: updated };
        });
    }, [appData.products, scanMode]);

    const submitOrder = async () => {
        setLoading(true);
        setError('');
        
        const payload = {
            currentUser,
            selectedTeam: team,
            page: order.page,
            fulfillmentStore: order.fulfillmentStore,
            scheduledTime: order.isScheduled ? order.scheduledTime : null,
            customer: { ...order.customer, shippingFee: Number(order.customer.shippingFee) || 0 },
            products: order.products.map((p: any) => ({
                name: p.name, quantity: p.quantity, originalPrice: p.originalPrice, 
                finalPrice: p.finalPrice, total: p.total, colorInfo: p.colorInfo, cost: p.cost, image: p.image
            })),
            shipping: { ...order.shipping, cost: Number(order.shipping.cost) || 0 },
            payment: order.payment,
            subtotal: order.subtotal,
            grandTotal: order.grandTotal,
            note: order.note,
        };

        try {
            const response = await fetch(`${WEB_APP_URL}/api/submit-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Failed');
            
            setSubmissionStatus({ type: 'success', message: `ការកម្មង់បានបង្កើតជោគជ័យ! Order ID: ${result.orderId}` });
            setTimeout(onSaveSuccess, 3000);
        } catch(err: any) {
            setSubmissionStatus({ type: 'error', message: `បរាជ័យ: ${err.message}` });
            setTimeout(() => setSubmissionStatus(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto md:mt-10 px-2 sm:px-0">
            {submissionStatus && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="page-card text-center flex flex-col items-center animate-fade-in-scale">
                        <p className="text-xl font-bold text-white mb-2">{submissionStatus.message}</p>
                        {submissionStatus.type === 'success' && <Spinner size="md" />}
                    </div>
                </div>
            )}
            
            {isScannerVisible && <BarcodeScannerModal onClose={() => setIsScannerVisible(false)} onCodeScanned={handleCodeScanned} scanMode={scanMode} setScanMode={setScanMode} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl md:text-3xl font-bold text-white">កម្មង់ថ្មី (ក្រុម {team})</h1>
                <button onClick={() => setIsCancelModalOpen(true)} className="btn btn-secondary bg-red-900/30 text-red-300">បោះបង់</button>
            </div>

            <div className="page-card">
                <div className="flex justify-between items-center mb-8 relative">
                    {STEPS.map(s => (
                        <div key={s.number} className={`flex flex-col items-center z-10 ${currentStep >= s.number ? 'text-blue-400' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 mb-1 ${currentStep >= s.number ? 'border-blue-500 bg-blue-900' : 'border-gray-600'}`}>{s.number}</div>
                            <span className="text-[10px]">{s.title}</span>
                        </div>
                    ))}
                </div>

                {currentStep === 1 && (
                    <fieldset className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Facebook Page*</label>
                                <select value={order.page} onChange={handlePageChange} className="form-select">
                                    <option value="">-- ជ្រើសរើស Page --</option>
                                    {teamPages.map((p: any) => <option key={p.PageName} value={p.PageName}>{p.PageName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">ឃ្លាំងបញ្ចេញទំនិញ (Branch/Store)*</label>
                                <select value={order.fulfillmentStore} onChange={e => setOrder({...order, fulfillmentStore: e.target.value})} className="form-select">
                                    <option value="">-- ជ្រើសរើសឃ្លាំង --</option>
                                    {stores.map((s: Store) => <option key={s.StoreName} value={s.StoreName}>{s.StoreName}</option>)}
                                </select>
                            </div>
                            <input type="text" placeholder="ឈ្មោះអតិថិជន*" value={order.customer.name} onChange={e => setOrder({...order, customer: {...order.customer, name: e.target.value}})} className="form-input" />
                            <input type="tel" placeholder="លេខទូរស័ព្ទ*" value={order.customer.phone} onChange={e => setOrder({...order, customer: {...order.customer, phone: e.target.value}})} className="form-input" />
                        </div>
                    </fieldset>
                )}

                {currentStep === 4 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 space-y-4">
                            <h3 className="font-bold text-blue-300">ការកំណត់សារ Telegram</h3>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={order.isScheduled} onChange={e => setOrder({...order, isScheduled: e.target.checked})} className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-blue-500" />
                                <span className="text-sm text-gray-200">កំណត់ពេលផ្ញើសារ (Schedule Send)</span>
                            </label>
                            {order.isScheduled && (
                                <input type="datetime-local" value={order.scheduledTime} onChange={e => setOrder({...order, scheduledTime: e.target.value})} className="form-input" min={new Date().toISOString().slice(0, 16)} />
                            )}
                        </div>
                        <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                             <p className="text-sm"><strong>Store:</strong> {order.fulfillmentStore || 'None'}</p>
                             <p className="text-sm"><strong>Subtotal:</strong> ${order.subtotal.toFixed(2)}</p>
                             <p className="text-xl font-black text-blue-400">Total: ${order.grandTotal.toFixed(2)}</p>
                        </div>
                    </div>
                )}

                <div className="flex justify-between mt-8 pt-4 border-t border-gray-700">
                    <button onClick={() => setCurrentStep(currentStep - 1)} className={`btn btn-secondary ${currentStep === 1 ? 'invisible' : ''}`}>ត្រឡប់</button>
                    {currentStep < 4 ? <button onClick={() => setCurrentStep(currentStep + 1)} className="btn btn-primary">បន្ត</button> : <button onClick={submitOrder} className="btn btn-primary px-10" disabled={loading}>{loading ? <Spinner size="sm" /> : 'បញ្ជូន'}</button>}
                </div>
            </div>
        </div>
    );
};

export default CreateOrderPage;

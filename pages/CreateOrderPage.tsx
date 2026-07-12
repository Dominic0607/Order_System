
import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Product as ProductType, MasterProduct, Driver, Store, TeamPage, ShippingMethod } from '../types';
import Spinner from '../components/common/Spinner';
import { WEB_APP_URL } from '../constants';
import Modal from '../components/common/Modal';
import { convertGoogleDriveUrl } from '../utils/fileUtils';
import SearchableProductDropdown from '../components/common/SearchableProductDropdown';
import PageDropdown from '../components/common/PageDropdown';
import SearchablePageDropdown from '../components/common/SearchablePageDropdown';
import ShippingMethodDropdown from '../components/common/ShippingMethodDropdown';
import MapModal from '../components/orders/MapModal';
import BarcodeScannerModal from '../components/orders/BarcodeScannerModal';
import SearchableProvinceDropdown from '../components/orders/SearchableProvinceDropdown';
import TelegramScheduler from '../components/orders/TelegramScheduler';
import SetQuantity from '../components/orders/SetQuantity';
import DriverSelector from '../components/orders/DriverSelector';
import BankSelector from '../components/orders/BankSelector'; // Import the new component
import { logUserActivity } from '../services/auditService';
import { CacheService, CACHE_KEYS } from '../services/cacheService';
import { useSoundEffects } from '../hooks/useSoundEffects';

import OrderGracePeriod from '../components/orders/OrderGracePeriod';

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

const CreateOrderPage: React.FC<CreateOrderPageProps> = ({ team, onSaveSuccess, onCancel }) => {
    const { appData, currentUser, apiKey, previewImage, hasPermission, advancedSettings } = useContext(AppContext);
    const { playSuccess } = useSoundEffects();
    const [currentStep, setCurrentStep] = useState(1);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const isLightMode = advancedSettings?.themeMode === 'light';

    // Theme-specific input styles
    const inputBgClass = isLightMode 
        ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500' 
        : 'bg-gray-900 border-gray-700 text-white placeholder-gray-500';
    const selectBgClass = isLightMode 
        ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-500' 
        : 'bg-gray-900 border-gray-700 text-white';

    useEffect(() => {
        if (window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentStep]);

    if (!hasPermission('create_order')) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 mb-6 shadow-2xl">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className={`text-2xl font-black italic uppercase tracking-tight mb-4 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Access Denied</h2>
            <p className={`text-sm max-w-sm leading-relaxed mb-10 ${isLightMode ? 'text-slate-500' : 'text-gray-500'}`}>អ្នកមិនមានសិទ្ធិបង្កើតការកម្មង់ឡើយ។ សូមទាក់ទង Admin។</p>
            <button onClick={onCancel} className={`px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl active:scale-95 ${isLightMode ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-gray-200'}`}>Back to Portal</button>
        </div>
    );

    const initialOrderState = useMemo(() => ({
        page: '',
        telegramValue: '',
        fulfillmentStore: '',
        pageSelectMode: 'cards', // 'cards' or 'search'
        customer: { name: '', phone: '', province: '', district: '', sangkat: '', additionalLocation: '', shippingFee: '' },
        products: [{...initialProductState, id: Date.now()}],
        shipping: { method: '', details: '', cost: '' },
        payment: { status: 'Unpaid', info: '' },
        telegram: { schedule: false, time: '' },
        subtotal: 0,
        grandTotal: 0,
        note: '',
    }), []);

    const [order, setOrder] = useState<any>(initialOrderState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [selectedShippingMethod, setSelectedShippingMethod] = useState<any>(null);
    const [carrierLogo, setCarrierLogo] = useState<string>('');
    const [shippingLogo, setShippingLogo] = useState<string>('');
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [shippingFeeOption, setShippingFeeOption] = useState<'charge' | 'free'>('charge');
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [mapSearchUrl, setMapSearchUrl] = useState('');
    const [scanMode, setScanMode] = useState<'single' | 'increment'>('increment');
    const [recommendationMessage, setRecommendationMessage] = useState<string>('');
    const [recentNotes, setRecentNotes] = useState<string[]>([]);

    const DRAFT_KEY = useMemo(() => `createOrderDraft_${currentUser?.UserName}_${team}`, [currentUser, team]);

    useEffect(() => {
        if (currentUser?.UserName) {
            try {
                const notes = JSON.parse(localStorage.getItem(`recent_notes_${currentUser.UserName}`) || '[]');
                setRecentNotes(notes);
            } catch (e) {
                console.error("Failed to load recent notes");
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (order.fulfillmentStore && order.customer.province && appData.driverRecommendations) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            const recommendation = appData.driverRecommendations.find(r => 
                r.DayOfWeek === today && 
                r.StoreName === order.fulfillmentStore && 
                r.Province === order.customer.province
            );

            if (recommendation) {
                const method = appData.shippingMethods?.find(m => m.MethodName === recommendation.ShippingMethod);
                if (method) {
                    setSelectedShippingMethod(method);
                    setShippingLogo(convertGoogleDriveUrl(method.LogoURL));
                    setOrder(prev => ({
                        ...prev,
                        shipping: {
                            ...prev.shipping,
                            method: method.MethodName,
                            details: recommendation.DriverName,
                            cost: method.InternalCost ? String(method.InternalCost) : prev.shipping.cost
                        }
                    }));
                    setRecommendationMessage(`នៅសាខា ${recommendation.StoreName} ថ្ងៃនេះ វេនដឹករបស់ ${recommendation.DriverName}`);
                    return;
                }
            }
        }
        setRecommendationMessage('');
    }, [order.fulfillmentStore, order.customer.province, appData.driverRecommendations, appData.shippingMethods]);

    useEffect(() => {
        if (window.innerWidth < 768) {            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentStep]);

    useEffect(() => {
        try {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft) {
                const parsedDraft = JSON.parse(savedDraft);
                setOrder((prev: any) => ({ ...prev, ...parsedDraft }));
                if (parsedDraft.customer && typeof parsedDraft.customer.shippingFee === 'number') {
                    setShippingFeeOption(parsedDraft.customer.shippingFee === 0 ? 'free' : 'charge');
                }
                if (parsedDraft.customer.phone) {
                   const phoneNumber = parsedDraft.customer.phone;
                   const foundCarrier = appData.phoneCarriers?.find((carrier: any) => 
                        (carrier.Prefixes || '').split(',').some((prefix: string) => phoneNumber.startsWith(prefix.trim()))
                    );
                    setCarrierLogo(foundCarrier ? convertGoogleDriveUrl(foundCarrier.CarrierLogoURL) : '');
                }
                if (parsedDraft.shipping.method) {
                    const methodInfo = appData.shippingMethods?.find((s: any) => s.MethodName === parsedDraft.shipping.method);
                    setSelectedShippingMethod(methodInfo || null);
                    setShippingLogo(methodInfo ? convertGoogleDriveUrl(methodInfo.LogoURL) : '');
                }
            }
        } catch (e) {
            localStorage.removeItem(DRAFT_KEY);
        }
    }, [DRAFT_KEY, appData.phoneCarriers, appData.shippingMethods]);

    useEffect(() => {
        const handler = setTimeout(() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(order));
        }, 500);
        return () => clearTimeout(handler);
    }, [order, DRAFT_KEY]);

    const handleCancelClick = () => setIsCancelModalOpen(true);
    const handleConfirmCancel = () => { localStorage.removeItem(DRAFT_KEY); setIsCancelModalOpen(false); onCancel(); };
    
    const teamPages = useMemo(() => {
        if (!appData.pages) return [];
        const requestedTeam = (team || '').trim().toLowerCase();
        return appData.pages.filter((p: TeamPage) => (p.Team || '').trim().toLowerCase() === requestedTeam);
    }, [appData.pages, team]);

    useEffect(() => {
        if (teamPages.length === 1 && !order.page) {
            const pageData = teamPages[0];
            setOrder((prev: any) => ({ ...prev, page: pageData.PageName, telegramValue: pageData.TelegramValue, fulfillmentStore: pageData.DefaultStore || order.fulfillmentStore }));
        }
    }, [teamPages, order.page]);

    const provinces = useMemo(() => {
        if (!appData.locations) return [];
        return [...new Set(appData.locations.map((loc: any) => loc.Province))];
    }, [appData.locations]);

    const districts = useMemo(() => {
        if (!appData.locations || !order.customer.province) return [];
        return [...new Set(appData.locations.filter((loc: any) => loc.Province === order.customer.province).map((loc: any) => loc.District))].sort((a, b) => String(a).localeCompare(String(b), 'km'));
    }, [appData.locations, order.customer.province]);

    const sangkats = useMemo(() => {
        if (!appData.locations || !order.customer.province || !order.customer.district) return [];
        return [...new Set(appData.locations.filter((loc: any) => loc.Province === order.customer.province && loc.District === order.customer.district).map((loc: any) => loc.Sangkat).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'km'));
    }, [appData.locations, order.customer.province, order.customer.district]);

    useEffect(() => {
        const newSubtotal = order.products.reduce((acc: number, p: ProductType) => acc + (p.total || 0), 0);
        const newGrandTotal = newSubtotal + (Number(order.customer.shippingFee) || 0);
        if (newSubtotal !== order.subtotal || newGrandTotal !== order.grandTotal) {
            setOrder((prev: any) => ({ ...prev, subtotal: newSubtotal, grandTotal: newGrandTotal }));
        }
    }, [order.products, order.customer.shippingFee]);

    const calculateProductFields = (product: ProductUIState, allMasterProducts: MasterProduct[]): ProductUIState => {
        const updated = { ...product };
        const masterProduct = allMasterProducts.find(p => p.ProductName === updated.name);
        updated.quantity = Math.max(1, Number(updated.quantity) || 1);
        updated.originalPrice = Math.max(0, masterProduct ? (Number(masterProduct.Price) || 0) : 0);
        updated.cost = Math.max(0, masterProduct ? (Number(masterProduct.Cost) || 0) : 0);
        const originalTotal = updated.quantity * updated.originalPrice;
        let finalTotal = originalTotal;
        let totalDiscountAmount = 0;
        switch (updated.discountType) {
            case 'percent':
                const dp = Math.max(0, Number(updated.discountPercentInput) || 0);
                totalDiscountAmount = originalTotal * (dp / 100);
                finalTotal = originalTotal - totalDiscountAmount;
                break;
            case 'amount':
                const da = Math.max(0, Number(updated.discountAmountInput) || 0);
                totalDiscountAmount = (updated.quantity > 1 && updated.applyDiscountToTotal) ? da : da * updated.quantity;
                finalTotal = originalTotal - totalDiscountAmount;
                break;
            case 'custom':
                const cfp = Math.max(0, Number(updated.finalPriceInput) || 0);
                finalTotal = updated.quantity * cfp;
                totalDiscountAmount = originalTotal - finalTotal;
                updated.finalPrice = cfp;
                break;
        }
        updated.total = Math.max(0, finalTotal);
        updated.finalPrice = updated.quantity > 0 ? updated.total / updated.quantity : 0;
        updated.discountPercent = originalTotal > 0 ? (totalDiscountAmount / originalTotal) * 100 : 0;
        if (updated.discountType !== 'custom') updated.finalPriceInput = updated.finalPrice.toFixed(2);
        return updated;
    };

    const handleCodeScanned = useCallback((scannedCode: string) => {
        const foundProduct = appData.products.find((p: MasterProduct) => p.Barcode && p.Barcode.trim() === scannedCode.trim());
        if (!foundProduct) return;
        setOrder((prevOrder: any) => {
            const existingProductIndex = prevOrder.products.findIndex((p: ProductType) => p.name === foundProduct.ProductName);
            let updatedProducts;
            if (existingProductIndex > -1) {
                const productToUpdate = { ...prevOrder.products[existingProductIndex] };
                if (scanMode === 'increment') productToUpdate.quantity += 1;
                const recalculated = calculateProductFields(productToUpdate, appData.products);
                updatedProducts = [...prevOrder.products];
                updatedProducts[existingProductIndex] = recalculated;
            } else {
                const emptyProductIndex = prevOrder.products.findIndex((p: ProductType) => !p.name);
                const newProduct: ProductUIState = { ...initialProductState, id: Date.now(), name: foundProduct.ProductName, quantity: 1, originalPrice: foundProduct.Price, cost: foundProduct.Cost, image: foundProduct.ImageURL, tags: foundProduct.Tags };
                const recalculated = calculateProductFields(newProduct, appData.products);
                if (emptyProductIndex > -1) { updatedProducts = [...prevOrder.products]; updatedProducts[emptyProductIndex] = recalculated; }
                else { updatedProducts = [...prevOrder.products, recalculated]; }
            }
            return { ...prevOrder, products: updatedProducts };
        });
        if (scanMode === 'single') setIsScannerVisible(false);
    }, [appData.products, scanMode]);

    const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            let phoneNumber = value.replace(/[^0-9]/g, '');
            if (phoneNumber.length > 1 && phoneNumber.startsWith('00')) phoneNumber = '0' + phoneNumber.substring(2);
            else if (phoneNumber.length > 0 && !phoneNumber.startsWith('0')) phoneNumber = '0' + phoneNumber;
            let foundCarrier = null;
            if (phoneNumber.length >= 2 && appData.phoneCarriers) { foundCarrier = appData.phoneCarriers.find((carrier: any) => (carrier.Prefixes || '').split(',').some((prefix: string) => phoneNumber.startsWith(prefix.trim()))); }
            setCarrierLogo(foundCarrier ? convertGoogleDriveUrl(foundCarrier.CarrierLogoURL) : '');
            setOrder((prev: any) => ({ ...prev, customer: { ...prev.customer, phone: phoneNumber } }));
            return;
        }
        if (name === 'shippingFee') {
            const numValue = value === '' ? '' : Math.max(0, parseFloat(value)); 
            setOrder((prev: any) => ({ ...prev, customer: { ...prev.customer, shippingFee: numValue } }));
            return;
        }
        setOrder((prev: any) => {
            let newCustomerState = { ...prev.customer, [name]: value };
            if (name === 'province') { newCustomerState.district = ''; newCustomerState.sangkat = ''; }
            else if (name === 'district') { newCustomerState.sangkat = ''; }
            return { ...prev, customer: newCustomerState };
        });
    };
    
    const handleProductUpdate = (index: number, field: keyof ProductUIState, value: any, extraTags?: string) => {
         setOrder((prev: any) => {
            const updatedProducts = [...prev.products];
            let productToUpdate = { ...updatedProducts[index] };
            if (['discountPercentInput', 'discountAmountInput', 'finalPriceInput'].includes(field)) {
                let stringValue = String(value).replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
                if (stringValue.startsWith('0') && stringValue.length > 1 && !stringValue.startsWith('0.')) stringValue = String(parseFloat(stringValue));
                // @ts-ignore
                productToUpdate[field] = stringValue;
            } else if (field === 'quantity') {
                productToUpdate[field] = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
            } else {
                // @ts-ignore
                productToUpdate[field] = value;
            }
            if (field === 'name') {
                const masterProduct = appData.products.find((p: MasterProduct) => p.ProductName === value);
                productToUpdate.name = value;
                if (masterProduct) {
                    productToUpdate.originalPrice = masterProduct.Price;
                    productToUpdate.image = masterProduct.ImageURL;
                    productToUpdate.cost = masterProduct.Cost;
                    productToUpdate.discountType = 'percent';
                    productToUpdate.finalPrice = masterProduct.Price;
                    productToUpdate.finalPriceInput = String(masterProduct.Price);
                    // Update tags from dropdown selection
                    productToUpdate.tags = extraTags !== undefined ? extraTags : masterProduct.Tags;
                } else {
                    productToUpdate.originalPrice = 0; productToUpdate.image = ''; productToUpdate.cost = 0;
                    productToUpdate.discountType = 'custom'; productToUpdate.finalPrice = 0; productToUpdate.tags = '';
                }
            }
            if (field === 'discountType') { productToUpdate.discountPercentInput = ''; productToUpdate.discountAmountInput = ''; productToUpdate.finalPrice = productToUpdate.originalPrice; productToUpdate.finalPriceInput = String(productToUpdate.originalPrice); }
            updatedProducts[index] = calculateProductFields(productToUpdate, appData.products);
            return { ...prev, products: updatedProducts };
        });
    };
    
    const handleShippingMethodSelect = (method: ShippingMethod) => {
        setSelectedShippingMethod(method);
        setShippingLogo(convertGoogleDriveUrl(method.LogoURL));

        let recommendedDriver = '';
        if (method.EnableDriverRecommendation) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            const recommendation = appData.driverRecommendations?.find(r => 
                r.DayOfWeek === today && 
                r.StoreName === order.fulfillmentStore && 
                r.Province === order.customer.province &&
                r.ShippingMethod === method.MethodName
            );

            if (recommendation) {
                recommendedDriver = recommendation.DriverName;
                setRecommendationMessage(`នៅសាខា ${recommendation.StoreName} ថ្ងៃនេះ វេនដឹករបស់ ${recommendation.DriverName}`);
            } else {
                setRecommendationMessage('');
            }
        } else {
            setRecommendationMessage('');
        }

        setOrder((prev: any) => ({
            ...prev,
            shipping: {
                ...prev.shipping,
                method: method.MethodName,
                details: method.RequireDriverSelection ? (recommendedDriver || '') : '',
                cost: method.InternalCost ? String(method.InternalCost) : prev.shipping.cost
            }
        }));
    };
    const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let sv = value;
        if (name === 'cost') {
            if (sv.startsWith('0') && sv.length > 1 && !sv.startsWith('0.')) sv = String(parseFloat(sv));
            const numericValue = parseFloat(sv) || 0;
            sv = String(Math.max(0, numericValue)); 
        }
        setOrder((prev: any) => ({ ...prev, shipping: { ...prev.shipping, [name]: sv } }));
    };

    const handleDriverChange = (driverName: string) => {
        setOrder((prev: any) => ({ ...prev, shipping: { ...prev.shipping, details: driverName } }));
    };

    const handleBankChange = (bankName: string) => {
        setOrder((prev: any) => ({ ...prev, payment: { ...prev.payment, info: bankName } }));
    };

    const handleShippingOptionChange = (option: 'charge' | 'free') => { setShippingFeeOption(option); setOrder((prev: any) => ({ ...prev, customer: { ...prev.customer, shippingFee: option === 'free' ? 0 : '' } })); };
    
    const handleSearchOnMaps = () => {
        if (!apiKey) { alert("API Key Required for Maps."); return; }
        const { province, district, sangkat, additionalLocation } = order.customer;
        const query = [additionalLocation, sangkat, district, province, 'Cambodia'].filter(Boolean).join(', ');
        setMapSearchUrl(`https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encodeURIComponent(query)}`);
        setIsMapModalOpen(true);
    };

    const validateStep = (step: number): boolean => {
        setError(''); 
        switch (step) {
            case 1:
                if (!order.customer.name || !order.customer.phone || !order.customer.province || !order.page || !order.fulfillmentStore) { setError('សូមបំពេញឈ្មោះ, លេខទូរស័ព្ទ, ខេត្ត/ក្រុង, Page និងឃ្លាំងបញ្ចេញទំនិញ។'); return false; }
                if (shippingFeeOption === 'charge' && (order.customer.shippingFee === '' || order.customer.shippingFee < 0)) { setError('សូមបញ្ចូលតម្លៃដឹកជញ្ជូនឱ្យបានត្រឹមត្រូវ។'); return false; }
                return true;
            case 2:
                if (order.products.length === 0 || order.products.some((p: any) => !p.name || p.quantity <= 0)) { setError('សូមពិនិត្យទិន្នន័យផលិតផល។'); return false; }
                return true;
            case 3:
                if (!order.shipping.method || (selectedShippingMethod?.RequireDriverSelection && !order.shipping.details) || order.shipping.cost === '' || parseFloat(order.shipping.cost) < 0) { setError('សូមពិនិត្យព័ត៌មានដឹកជញ្ជូន។'); return false; }
                return true;
            case 4:
                 if (order.payment.status === 'Paid' && !order.payment.info) { setError('សូមជ្រើសរើសគណនីធនាគារ។'); return false; }
                 if (order.telegram.schedule && !order.telegram.time) { setError('សូមជ្រើសរើសពេលវេលាផ្ញើសារ។'); return false; }
                return true;
            default: return true;
        }
    };
    
    const nextStep = () => { if (validateStep(currentStep)) setCurrentStep(currentStep + 1); };
    const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

    const [undoTimer, setUndoTimer] = useState<number | null>(null);
    const [maxUndoTimer, setMaxUndoTimer] = useState<number>(7);
    const [isUndoing, setIsUndoing] = useState(false);
    const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const submitIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const submitOrder = async () => {
        for (const step of STEPS) { if (!validateStep(step.number)) { setCurrentStep(step.number); return; } }
        setLoading(true);

        // Mobile Optimization: Scroll to Top and Close Keyboard
        if (window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }

        const gracePeriod = advancedSettings?.placingOrderGracePeriod || 5;

        // OPTIMISTIC UI: Start countdown
        setMaxUndoTimer(gracePeriod);
        setUndoTimer(gracePeriod);
        
        let secondsLeft = gracePeriod;
        if (submitIntervalRef.current) clearInterval(submitIntervalRef.current);
        submitIntervalRef.current = setInterval(() => {
            secondsLeft -= 1;
            setUndoTimer(secondsLeft);
            if (secondsLeft <= 0) {
                if (submitIntervalRef.current) {
                    clearInterval(submitIntervalRef.current);
                    submitIntervalRef.current = null;
                }
            }
        }, 1000);

        // Wait for the Grace Period before actual submission
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = setTimeout(async () => {
            if (submitIntervalRef.current) {
                clearInterval(submitIntervalRef.current);
                submitIntervalRef.current = null;
            }
            setUndoTimer(null);
            
            // Proceed with ACTUAL API CALL
            await executeFinalSubmit();
        }, gracePeriod * 1000);
    };

    const handleUndo = () => {
        if (submitTimeoutRef.current) {
            clearTimeout(submitTimeoutRef.current);
            submitTimeoutRef.current = null;
        }
        if (submitIntervalRef.current) {
            clearInterval(submitIntervalRef.current);
            submitIntervalRef.current = null;
        }
        setIsUndoing(true);
        setTimeout(() => {
            setUndoTimer(null);
            setLoading(false);
            setIsUndoing(false);
        }, 500); // Small animation delay
    };

    const executeFinalSubmit = async () => {
        let phoneToSend = '0' + order.customer.phone.replace(/[^0-9]/g, '').replace(/^0+/, '');
        
        // Construct Address Details manually to ensure it appears in the Sheet/Telegram even if scheduled
        const addressParts = [
            order.customer.additionalLocation,
            order.customer.sangkat,
            order.customer.district
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ');

        // Format scheduled time to UTC ISO string for accurate backend comparison
        let scheduledTimeStr = '';
        if (order.telegram.schedule && order.telegram.time) {
            try {
                scheduledTimeStr = new Date(order.telegram.time).toISOString();
            } catch (e) {
                scheduledTimeStr = order.telegram.time;
            }
        }

        const payload = { 
            currentUser, 
            selectedTeam: team, 
            page: order.page, 
            telegramValue: order.telegramValue, 
            
            // Nested object (standard)
            customer: { 
                ...order.customer, 
                phone: phoneToSend, 
                shippingFee: Number(order.customer.shippingFee) || 0 
            }, 
            
            // *** CRITICAL FIX: Flattened keys for Backend/Sheet/Scheduled Tasks ***
            "Customer Name": order.customer.name,
            "Customer Phone": phoneToSend,
            "Location": order.customer.province,
            "Address Details": fullAddress,
            "Internal Shipping Method": order.shipping.method,
            "Internal Shipping Details": order.shipping.details,
            "Internal Cost": Number(order.shipping.cost) || 0,
            "Payment Status": order.payment.status,
            "Payment Info": order.payment.info,
            "Fulfillment Store": order.fulfillmentStore,
            
            products: order.products.map((p: any) => ({ 
                name: p.name, 
                quantity: Number(p.quantity) || 1, 
                originalPrice: Number(p.originalPrice) || 0, 
                finalPrice: Number(p.finalPrice) || 0, 
                total: Number(p.total) || 0, 
                colorInfo: p.colorInfo, 
                cost: Number(p.cost) || 0,
                tags: p.tags,
                image: p.image
            })), 
            shipping: { 
                ...order.shipping, 
                cost: Number(order.shipping.cost) || 0 
            }, 
            payment: order.payment, 
            subtotal: Number(order.subtotal) || 0, 
            grandTotal: Number(order.grandTotal) || 0, 
            note: order.note,
            fulfillmentStore: order.fulfillmentStore,
            scheduledTime: scheduledTimeStr
        };
        
        try {
            const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
            const token = session?.token;
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${WEB_APP_URL}/api/submit-order`, { 
                method: 'POST', 
                headers: headers, 
                body: JSON.stringify(payload) 
            });
            const result = await res.json();
            if (!res.ok || result.status !== 'success') throw new Error(result.message || 'Error');
            
            // Play success sound
            playSuccess();

            // *** NEW: Send Global Notification via Chat System ***
            try {
                const productNames = order.products.map((p: any) => p.name).join(', ');
                const notificationMessage = `📢 NEW ORDER: ${team} | ${order.page} | 👤 ${currentUser?.FullName} | 💰 $${payload.grandTotal} | 📍 ${order.customer.province} | 📦 ${productNames}`;
                
                await fetch(`${WEB_APP_URL}/api/chat/send`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        UserName: currentUser?.UserName,
                        MessageType: 'Text',
                        Content: notificationMessage
                    })
                });
            } catch (notifyErr) {
                console.warn("Failed to send system notification", notifyErr);
            }
            // -----------------------------------------------------

            // *** NEW: Explicitly log user activity to avoid "System" user in Audit Logs ***
            await logUserActivity(
                currentUser?.UserName || 'Unknown',
                'CREATE_ORDER',
                `Created Order ID: ${result.orderId} for ${order.customer.name}`
            );

            // Save recent note
            if (order.note && order.note.trim()) {
                const noteKey = `recent_notes_${currentUser?.UserName}`;
                try {
                    let rNotes = JSON.parse(localStorage.getItem(noteKey) || '[]');
                    const cleanNote = order.note.trim();
                    rNotes = rNotes.filter((n: string) => n !== cleanNote);
                    rNotes.unshift(cleanNote);
                    if (rNotes.length > 5) rNotes = rNotes.slice(0, 5);
                    localStorage.setItem(noteKey, JSON.stringify(rNotes));
                    setRecentNotes(rNotes);
                } catch (e) {
                    console.error("Failed to save recent note", e);
                }
            }

            localStorage.removeItem(DRAFT_KEY);
            setSubmissionStatus({ type: 'success', message: `ជោគជ័យ! Order ID: ${result.orderId}` });
            setTimeout(onSaveSuccess, 3000);
        } catch(err: any) {
            setSubmissionStatus({ type: 'error', message: `បរាជ័យ: ${err.message}` });
            setTimeout(() => setSubmissionStatus(null), 3000);
        } finally { setLoading(false); }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <fieldset className={`border p-3 sm:p-4 rounded-lg animate-fade-in space-y-6 ${isLightMode ? 'border-slate-200' : 'border-gray-600'}`}>
                        <legend className={`px-2 text-base sm:text-lg font-semibold ${isLightMode ? 'text-blue-600' : 'text-blue-300'}`}>ព័ត៌មានអតិថិជន & Page</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <label className="input-label font-black text-xs uppercase tracking-widest text-gray-500 mb-0 block">Facebook Page*</label>
                                    
                                    {/* UI Style Toggle */}
                                    <div className={`flex p-1 rounded-xl border ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-gray-900/80 border-gray-700'}`}>
                                        <button 
                                            type="button"
                                            onClick={() => setOrder({ ...order, pageSelectMode: 'cards' })}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 ${order.pageSelectMode === 'cards' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : (isLightMode ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300')}`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            Card View
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setOrder({ ...order, pageSelectMode: 'search' })}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 ${order.pageSelectMode === 'search' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : (isLightMode ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300')}`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            Search View
                                        </button>
                                    </div>
                                </div>

                                <div className="animate-fade-in-down">
                                    {order.pageSelectMode === 'cards' ? (
                                        <PageDropdown 
                                            pages={teamPages} 
                                            selectedPageName={order.page} 
                                            onSelect={(pageData) => setOrder({ 
                                                ...order, 
                                                page: pageData.PageName, 
                                                telegramValue: pageData.TelegramValue, 
                                                fulfillmentStore: pageData.DefaultStore || order.fulfillmentStore 
                                            })} 
                                        />
                                    ) : (
                                        <SearchablePageDropdown 
                                            pages={teamPages}
                                            selectedPageName={order.page}
                                            onSelect={(pageData) => setOrder({ 
                                                ...order, 
                                                page: pageData.PageName, 
                                                telegramValue: pageData.TelegramValue, 
                                                fulfillmentStore: pageData.DefaultStore || order.fulfillmentStore 
                                            })}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                    <label className={`input-label !mb-0 font-black text-xs uppercase tracking-widest ${isLightMode ? 'text-orange-600' : 'text-orange-400'}`}>ឃ្លាំងបញ្ចេញទំនិញ (Store)*</label>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {appData.stores?.map((s: Store) => {
                                        const isSelected = order.fulfillmentStore === s.StoreName;
                                        return (
                                            <button 
                                                key={s.StoreName} 
                                                type="button" 
                                                onClick={() => setOrder({...order, fulfillmentStore: s.StoreName})}
                                                className={`relative overflow-hidden group p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-2 ${
                                                    isSelected 
                                                    ? (isLightMode ? 'bg-orange-50 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]') 
                                                    : (isLightMode ? 'bg-slate-50 border-slate-200 hover:border-slate-400 hover:bg-slate-100/50' : 'bg-gray-900 border-gray-800 hover:border-gray-600')
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 text-white' : (isLightMode ? 'bg-slate-200 text-slate-500 group-hover:text-slate-700' : 'bg-gray-800 text-gray-500 group-hover:text-gray-300')}`}>
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                </div>
                                                <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? (isLightMode ? 'text-orange-700' : 'text-white') : (isLightMode ? 'text-slate-600' : 'text-gray-400')}`}>{s.StoreName}</span>
                                                {isSelected && (
                                                    <div className="absolute top-1 right-1">
                                                        <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <input type="text" name="name" value={order.customer.name} placeholder="ឈ្មោះអតិថិជន*" className={`form-input !py-3 rounded-xl ${inputBgClass}`} onChange={handleCustomerChange} required />
                            <div className="relative group">
                                <input type="tel" name="phone" value={order.customer.phone} placeholder="លេខទូរស័ព្ទ*" className={`form-input !py-3 rounded-xl pr-12 font-mono font-black ${inputBgClass} ${isLightMode ? '!text-blue-600' : '!text-blue-300'}`} onChange={handleCustomerChange} required />
                                <div className="absolute right-0 top-0 bottom-0 pr-3 flex items-center justify-center pointer-events-none">
                                    {carrierLogo && <img src={carrierLogo} alt="Carrier" className="h-6 w-auto object-contain transition-all animate-fade-in" />}
                                </div>
                            </div>
                             
                             <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <SearchableProvinceDropdown 
                                    provinces={provinces}
                                    selectedProvince={order.customer.province}
                                    onSelect={(val) => handleCustomerChange({ target: { name: 'province', value: val } } as any)}
                                />
                                <select name="district" value={order.customer.district} className={`form-select !py-3 rounded-xl ${selectBgClass}`} onChange={handleCustomerChange} disabled={!order.customer.province}><option value="">-- ស្រុក/ខណ្ឌ --</option>{districts.map((d: string) => <option key={d} value={d}>{d}</option>)}</select>
                                <select name="sangkat" value={order.customer.sangkat} className={`form-select !py-3 rounded-xl ${selectBgClass}`} onChange={handleCustomerChange} disabled={!order.customer.district}><option value="">-- ឃុំ/សង្កាត់ --</option>{sangkats.map((s: string) => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                             <div className="md:col-span-2">
                                <label className="input-label font-black text-[10px] uppercase text-gray-500 tracking-widest mb-2 block">ទីតាំងលម្អិត (ផ្ទះលេខ, ផ្លូវ)</label>
                                <div className="flex gap-2">
                                    <input type="text" name="additionalLocation" value={order.customer.additionalLocation} placeholder="បញ្ចូលទីតាំងលម្អិត..." className={`form-input !py-3 rounded-xl flex-grow ${inputBgClass}`} onChange={handleCustomerChange} />
                                    <button type="button" onClick={handleSearchOnMaps} className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border transition-all active:scale-90 ${isLightMode ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white' : 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="input-label font-black text-[10px] uppercase text-gray-500 tracking-widest mb-2 block">ថ្លៃសេវាដឹកជញ្ជូន</label>
                                <div className="flex gap-3 mb-3">
                                    <button type="button" onClick={() => handleShippingOptionChange('charge')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all border ${shippingFeeOption === 'charge' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300')}`}>គិតថ្លៃសេវា</button>
                                    <button type="button" onClick={() => handleShippingOptionChange('free')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all border ${shippingFeeOption === 'free' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300')}`}>មិនគិតថ្លៃសេវា</button>
                                </div>
                                {shippingFeeOption === 'charge' && (
                                    <div className="space-y-3 animate-fade-in">
                                        <input type="number" min="0" name="shippingFee" value={order.customer.shippingFee} placeholder="តម្លៃដឹកជញ្ជូន (ឧ. 1.5)*" className={`form-input !py-3 rounded-xl ${inputBgClass}`} onChange={handleCustomerChange} required />
                                        <div className="flex gap-2">
                                            {[1, 1.5, 2].map(fee => {
                                                const isActive = parseFloat(order.customer.shippingFee) === fee;
                                                return (
                                                    <button 
                                                        key={fee} 
                                                        type="button" 
                                                        onClick={() => handleCustomerChange({ target: { name: 'shippingFee', value: String(fee) } } as any)}
                                                        className={`flex-1 py-2 border font-black rounded-xl text-xs transition-all active:scale-95 ${isActive ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200')}`}
                                                    >
                                                        ${fee}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </fieldset>
                );
            case 2:
                return (
                    <fieldset className={`border p-3 sm:p-4 rounded-lg animate-fade-in space-y-4 sm:space-y-6 ${isLightMode ? 'border-slate-200' : 'border-gray-600'}`}>
                        <legend className={`px-2 text-base sm:text-lg font-semibold ${isLightMode ? 'text-blue-600' : 'text-blue-300'}`}>ផលិតផល & ការបញ្ចុះតម្លៃ</legend>
                        
                        {/* Team, Page, User Info Banner */}
                        <div className={`rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-inner border ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-white'}`}>
                            <div className="flex gap-4 flex-wrap">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-1">Team</span>
                                    <span className="bg-blue-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1 rounded-lg shadow-md">{team}</span>
                                </div>
                                <div className={`h-10 w-px hidden sm:block ${isLightMode ? 'bg-slate-200' : 'bg-white/10'}`}></div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-1">Page</span>
                                    <span className={`font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1 rounded-lg border truncate max-w-[150px] ${isLightMode ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-600/20 text-purple-400 border-purple-500/20'}`}>{order.page || 'Not Selected'}</span>
                                </div>
                                <div className={`h-10 w-px hidden sm:block ${isLightMode ? 'bg-slate-200' : 'bg-white/10'}`}></div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-1">User</span>
                                    <span className={`font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1 rounded-lg border ${isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20'}`}>{currentUser?.FullName}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Customer</span>
                                <span className={`font-bold text-xs ${isLightMode ? 'text-slate-700' : 'text-gray-300'}`}>{order.customer.name || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                             {order.products.map((p: ProductUIState, index: number) => {
                                 const originalTotal = (Number(p.quantity) || 0) * (Number(p.originalPrice) || 0);
                                 const discountValue = originalTotal - (Number(p.total) || 0);
                                 return (
                                    <div key={p.id} className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border relative shadow-xl overflow-hidden group ${isLightMode ? 'bg-slate-50/50 border-slate-200/80' : 'bg-gray-800/40 border-gray-700'}`}>
                                        <button type="button" onClick={() => { if (order.products.length > 1) setOrder({ ...order, products: order.products.filter((_:any, i:number)=>i!==index) }); }} className="absolute top-2 right-2 sm:top-4 sm:right-4 text-red-400 bg-red-400/10 rounded-full h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center border border-red-400/20 hover:bg-red-600 hover:text-white transition-all z-10 active:scale-90" disabled={order.products.length <= 1}>
                                            <span className="text-xl sm:text-2xl leading-none">&times;</span>
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 mb-4 sm:mb-6">
                                            <div className="md:col-span-2 flex justify-center">
                                                <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden border-2 shadow-inner group-hover:border-blue-500/50 transition-colors ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-gray-900 border-gray-700'}`}><img src={convertGoogleDriveUrl(p.image)} className="w-full h-full object-cover" alt="" /></div>
                                            </div>
                                            <div className="md:col-span-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ឈ្មោះផលិតផល*</label><SearchableProductDropdown products={appData.products || []} selectedProductName={p.name} onSelect={(val, tags) => handleProductUpdate(index, 'name', val, tags)} allowAddNew={false} /></div>
                                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                    <SetQuantity 
                                                        value={p.quantity} 
                                                        onChange={(val) => handleProductUpdate(index, 'quantity', val)} 
                                                    />
                                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ពណ៌/សម្គាល់</label><input type="text" list={`colors-datalist-${p.id}`} value={p.colorInfo} onChange={(e) => handleProductUpdate(index, 'colorInfo', e.target.value)} className={`form-input text-sm !py-2.5 rounded-xl ${inputBgClass}`} placeholder="ឧ. ខៀវ, XL" /><datalist id={`colors-datalist-${p.id}`}>{(appData.colors || []).map((c:any,i:number)=><option key={i} value={c.ColorName}/>)}</datalist></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`rounded-xl sm:rounded-[2rem] p-3 sm:p-6 border space-y-4 sm:space-y-6 ${isLightMode ? 'bg-slate-100/60 border-slate-200/80' : 'bg-black/20 border-white/5'}`}>
                                            <div className="flex items-center gap-2 sm:gap-3"><div className={`h-px flex-grow ${isLightMode ? 'bg-slate-200' : 'bg-gray-700/50'}`}></div><span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] whitespace-nowrap">Pricing & Discount</span><div className={`h-px flex-grow ${isLightMode ? 'bg-slate-200' : 'bg-gray-700/50'}`}></div></div>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                                                <div className="space-y-3 sm:space-y-4">
                                                    <div className={`flex p-1 rounded-xl sm:rounded-2xl border shadow-inner ${isLightMode ? 'bg-slate-200/60 border-slate-300' : 'bg-gray-900/50 border-gray-700'}`}>{(['percent', 'amount', 'custom'] as const).map(t => (<button key={t} type="button" onClick={() => handleProductUpdate(index, 'discountType', t)} className={`flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 active:scale-95 ${p.discountType === t ? 'bg-blue-600 text-white shadow-lg' : (isLightMode ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300')}`}><span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest">{t === 'percent' ? 'បញ្ចុះ %' : t === 'amount' ? 'បញ្ចុះ $' : 'កែតម្លៃលក់'}</span></button>))}</div>
                                                    <div className="relative animate-fade-in">{p.discountType === 'percent' && (<div className="space-y-2"><label className={`text-[10px] font-bold ml-1 ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>បញ្ចូលភាគរយបញ្ចុះតម្លៃ (%)</label><div className="relative"><input type="number" min="0" max="100" placeholder="0" value={p.discountPercentInput} onChange={e=>handleProductUpdate(index, 'discountPercentInput', e.target.value)} className={`form-input !text-base sm:!text-lg !font-black !py-2 sm:!py-3 pr-10 text-right ${isLightMode ? 'text-blue-600 bg-white border-slate-200' : 'text-blue-400 bg-gray-900 border-gray-700'}`} /><div className="absolute right-0 top-0 bottom-0 pr-4 flex items-center pointer-events-none"><span className="text-gray-500 font-black">%</span></div></div></div>)}{p.discountType === 'amount' && (<><div className="space-y-2"><label className={`text-[10px] font-bold ml-1 ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>បញ្ចូលទឹកប្រាក់បញ្ចុះតម្លៃ ($)</label><div className="relative"><input type="number" min="0" placeholder="0.00" value={p.discountAmountInput} onChange={e=>handleProductUpdate(index, 'discountAmountInput', e.target.value)} className={`form-input !text-base sm:!text-lg !font-black !py-2 sm:!py-3 pr-10 text-right ${isLightMode ? 'text-red-600 bg-white border-slate-200' : 'text-red-400 bg-gray-900 border-gray-700'}`} /><div className="absolute right-0 top-0 bottom-0 pr-4 flex items-center pointer-events-none"><span className="text-gray-500 font-black">$</span></div></div></div>{p.quantity > 1 && (<label className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg mt-1 sm:mt-2 border active:scale-95 transition-transform ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-black/20 border-white/5 text-gray-400'}`}><input type="checkbox" checked={p.applyDiscountToTotal} onChange={e => handleProductUpdate(index, 'applyDiscountToTotal', e.target.checked)} className={`w-4 h-4 rounded ${isLightMode ? 'border-slate-300 bg-white text-blue-600' : 'border-gray-600 bg-gray-800 text-blue-500'}`} /><span className="text-[9px] sm:text-[10px] uppercase font-black">បញ្ចុះលើតម្លៃសរុប</span></label>)}</>)}{p.discountType === 'custom' && (<div className="space-y-2"><label className={`text-[10px] font-bold ml-1 ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>កំណត់តម្លៃលក់ថ្មីក្នុង ១ ឯកតា ($)</label><div className="relative"><input type="text" inputMode="decimal" placeholder="0.00" value={p.finalPriceInput} onChange={e=>handleProductUpdate(index, 'finalPriceInput', e.target.value)} className={`form-input !text-base sm:!text-lg !font-black !py-2 sm:!py-3 pr-10 text-right ${isLightMode ? 'text-emerald-600 bg-white border-slate-200' : 'text-emerald-400 bg-gray-900 border-gray-700'}`} /><div className="absolute right-0 top-0 bottom-0 pr-4 flex items-center pointer-events-none"><span className="text-gray-500 font-black">$</span></div></div></div>)}</div>
                                                </div>
                                                <div className={`rounded-xl sm:rounded-[1.5rem] p-3 sm:p-5 border flex flex-col justify-between ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-gray-900/60 border-white/5'}`}><div className="space-y-2 sm:space-y-3"><div className="flex justify-between items-center text-[10px] sm:text-xs"><span className="text-gray-500 font-bold uppercase">Original Subtotal</span><span className={`font-black ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>${originalTotal.toFixed(2)}</span></div><div className="flex justify-between items-center text-[10px] sm:text-xs"><span className="text-gray-500 font-bold uppercase">Discount Applied</span><span className={`font-black ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>-{discountValue > 0 ? `$${discountValue.toFixed(2)}` : '$0.00'}</span></div><div className={`h-px my-1 ${isLightMode ? 'bg-slate-100' : 'bg-gray-700/50'}`}></div><div className="flex justify-between items-center"><span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Total</span><span className={`text-xl sm:text-2xl font-black tracking-tighter ${isLightMode ? 'text-slate-900' : 'text-white'}`}>${(p.total || 0).toFixed(2)}</span></div></div><div className={`mt-3 sm:mt-4 pt-2 sm:pt-3 border-t flex justify-center ${isLightMode ? 'border-slate-100' : 'border-white/5'}`}><span className={`text-[8px] sm:text-[9px] px-2 sm:px-3 py-1 rounded-full border font-black uppercase tracking-widest ${isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>Avg. ${(p.finalPrice || 0).toFixed(2)} / unit</span></div></div>
                                            </div>
                                        </div>
                                    </div>
                                 );
                              })}
                        </div>

                        {/* NEW: Subtotal Display for Step 2 */}
                        <div className={`p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 border ${isLightMode ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-900/80 border-blue-500/20'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${isLightMode ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/10 text-blue-400'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Quantity</span>
                                    <span className={`text-lg font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{order.products.reduce((acc: number, p: any) => acc + (Number(p.quantity) || 0), 0)} items</span>
                                </div>
                            </div>
                            <div className={`h-px w-full sm:w-px sm:h-10 ${isLightMode ? 'bg-blue-200' : 'bg-gray-700'}`}></div>
                            <div className="flex flex-col items-center sm:items-end">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>Estimated Subtotal</span>
                                <span className={`text-3xl font-black tracking-tighter drop-shadow-md ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                    ${(order.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
                            <button 
                                type="button" 
                                onClick={() => setOrder({ ...order, products: [...order.products, { ...initialProductState, id: Date.now() }] })}
                                className={`w-full py-4 px-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${isLightMode ? 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-emerald-100' : 'bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white shadow-emerald-900/10'}`}
                            >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                បន្ថែមផលិតផល (Add Item)
                            </button>
                            <button type="button" onClick={()=>setIsScannerVisible(true)} className={`w-full py-4 px-6 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${isLightMode ? 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white shadow-blue-100' : 'bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white shadow-blue-900/10'}`}><svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" strokeWidth="3"/></svg>Scan Barcode</button>
                        </div>
                    </fieldset>
                );
            case 3:
                return (
                    <div className="animate-fade-in space-y-4 sm:space-y-6">
                        {/* Section Header */}
                        <div className={`flex items-center gap-3 pb-2 border-b border-dashed ${isLightMode ? 'border-slate-200' : 'border-gray-700'}`}>
                            <span className={`text-lg font-black uppercase tracking-widest ${isLightMode ? 'text-blue-600' : 'text-blue-300'}`}>
                                ដឹកជញ្ជូន (Logistics Settings)
                            </span>
                        </div>

                        {/* Unified Card Container */}
                        <div className={`p-4 sm:p-5 border-2 rounded-none space-y-5 ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#181A20] border-[#2B3139]'}`}>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                                {/* Section 1: Shipping Method */}
                                <div className="space-y-1.5 w-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-1.5 h-3.5 ${isLightMode ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                                        <span className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>វិធីសាស្រ្តដឹកជញ្ជូន*</span>
                                    </div>
                                    {recommendationMessage && (
                                        <div className={`mb-2 p-2 border rounded-xl flex items-center gap-2 animate-pulse ${isLightMode ? 'bg-blue-50 border-blue-200' : 'bg-blue-600/10 border-blue-500/20'}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-blue-700' : 'text-blue-400'}`}>{recommendationMessage}</span>
                                        </div>
                                    )}
                                    <ShippingMethodDropdown methods={appData.shippingMethods || []} selectedMethodName={order.shipping.method} onSelect={handleShippingMethodSelect} />
                                </div>

                                {/* Section 2: Cost */}
                                <div className="space-y-1.5 w-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-1.5 h-3.5 ${isLightMode ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                                        <span className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>ថ្លៃសេវាឲ្យអ្នកដឹក (Cost)*</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <div className={`flex items-center rounded-xl border-2 transition-all flex-1 min-w-[100px] ${isLightMode ? 'bg-white border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20' : 'bg-gray-900 border-gray-700 focus-within:border-blue-500'}`}>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                step="0.01" 
                                                name="cost" 
                                                placeholder="0.00" 
                                                value={order.shipping.cost} 
                                                className="w-full bg-transparent pl-3 pr-8 py-1.5 font-black text-sm outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                                onChange={handleShippingChange} 
                                                required 
                                            />
                                            <span className="pr-3 text-gray-400 font-bold text-xs">$</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {(selectedShippingMethod?.CostShortcuts ? selectedShippingMethod.CostShortcuts.split(',').map((s: string) => parseFloat(s.trim())) : [1.25, 1.5, 2]).map((cost: number) => {
                                                const isActive = parseFloat(order.shipping.cost) === cost;
                                                return (
                                                    <button 
                                                        key={cost} 
                                                        type="button" 
                                                        onClick={() => handleShippingChange({ target: { name: 'cost', value: String(cost) } } as any)}
                                                        className={`px-3.5 py-1.5 border font-black rounded-xl text-xs transition-all active:scale-95 ${isActive ? (isLightMode ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-blue-600 border-blue-500 text-white shadow-lg') : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200')}`}
                                                    >
                                                        ${cost}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Driver Selection (conditionally rendered inside same card to keep padding low) */}
                            {selectedShippingMethod?.RequireDriverSelection && (
                                <div className={`pt-4 border-t ${isLightMode ? 'border-slate-100' : 'border-gray-800/80'} space-y-2.5`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-3.5 ${isLightMode ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                                        <span className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>ជ្រើសរើសអ្នកដឹក (DriverSelection)*</span>
                                    </div>
                                    <DriverSelector 
                                        drivers={appData.drivers || []} 
                                        selectedDriverName={order.shipping.details} 
                                        onSelect={handleDriverChange} 
                                    />
                                    {!order.shipping.details && (<p className={`text-center text-[10px] italic mt-1 font-bold ${isLightMode ? 'text-red-500' : 'text-red-400'}`}>សូមជ្រើសរើសអ្នកដឹកម្នាក់</p>)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 4:
                const selectedDriver = appData.drivers?.find((d: Driver) => d.DriverName === order.shipping.details);
                return (
                    <div className="animate-fade-in space-y-4">
                        {/* Combined Customer & Shipping Info Card */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-1 h-3 ${isLightMode ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                    ព័ត៌មានដឹកជញ្ជូន និងអតិថិជន (Delivery Details)
                                </span>
                            </div>
                            <div className={`p-4 border-2 rounded-2xl ${isLightMode ? 'bg-white border-slate-100 shadow-sm' : 'bg-[#181A20] border-[#2B3139]'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-dashed divide-slate-100 dark:divide-gray-800">
                                    {/* Column 1: Customer */}
                                    <div className="space-y-1 pb-3 md:pb-0">
                                        <p className={`text-[9px] font-black uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>ព័ត៌មានអតិថិជន / Customer</p>
                                        <p className={`font-black text-base ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{order.customer.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-black font-mono text-sm ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>{order.customer.phone}</span>
                                            {carrierLogo && <img src={carrierLogo} className="h-4 w-auto object-contain opacity-90" alt="" />}
                                        </div>
                                        
                                        {/* Address with Map Pin Icon */}
                                        <div className="flex items-start gap-1.5 mt-1">
                                            <svg className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <p className={`font-medium text-xs leading-normal ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>
                                                {`${order.customer.additionalLocation}, Sangkat ${order.customer.sangkat}, District ${order.customer.district}, Province ${order.customer.province}`.replace(/^,|,$/g, '').trim() || 'No address specified'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Column 2: Shipping Details */}
                                    <div className="space-y-2.5 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between">
                                        <div>
                                            <p className={`text-[9px] font-black uppercase tracking-wider mb-2.5 ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>ព័ត៌មានដឹកជញ្ជូន / Shipping Details</p>
                                            
                                            <div className="space-y-2">
                                                {/* Shipping Method */}
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className={`text-[10.5px] font-bold ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>វិធីសាស្រ្តដឹក / Method</span>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        {shippingLogo && <img src={shippingLogo} className="h-5 w-auto object-contain rounded-md border border-black/5 flex-shrink-0" alt="" />}
                                                        <span className={`font-black text-xs truncate ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{order.shipping.method}</span>
                                                    </div>
                                                </div>

                                                {/* Fulfillment Store */}
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className={`text-[10.5px] font-bold ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>ឃ្លាំងបំពេញ / Warehouse</span>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isLightMode ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-purple-600/10 text-purple-400 border-purple-500/20'}`}>{order.fulfillmentStore}</span>
                                                </div>

                                                {/* Selected Driver */}
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className={`text-[10.5px] font-bold ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>អ្នកដឹកបញ្ជូន / Driver</span>
                                                    {order.shipping.details ? (
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            {selectedDriver && <img src={convertGoogleDriveUrl(selectedDriver.ImageURL)} className="w-5 h-5 rounded-full object-cover border border-white shadow-sm flex-shrink-0" alt="" />}
                                                            <span className={`text-xs font-black truncate ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{order.shipping.details}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-xs font-bold ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>N/A</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cost Row */}
                                        <div className={`flex items-center justify-between pt-2 border-t border-dashed ${isLightMode ? 'border-slate-100' : 'border-gray-800'}`}>
                                            <span className={`text-[10.5px] font-black uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>ថ្លៃដឹកជញ្ជូន / Cost</span>
                                            <span className={`text-sm font-black font-mono ${isLightMode ? 'text-orange-600' : 'text-orange-400'}`}>${(Number(order.shipping.cost) || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compact Order Items List */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-1 h-3 ${isLightMode ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                    បញ្ជីទំនិញកុម្ម៉ង់ (Order Items)
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {order.products.map((p: any) => (
                                    <div key={p.id} className={`flex items-center gap-3.5 p-2 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${isLightMode ? 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-100/50' : 'bg-[#181A20] border-[#2B3139]'}`}>
                                        <img src={convertGoogleDriveUrl(p.image)} className="w-9 h-9 rounded-xl object-cover border border-slate-100 flex-shrink-0" alt="" />
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`font-black text-xs truncate ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{p.name}</p>
                                                <p className={`font-black text-xs font-mono ${isLightMode ? 'text-slate-900' : 'text-white'}`}>${(p.total || 0).toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] mt-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${isLightMode ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-blue-600/10 text-blue-400 border-blue-500/20'}`}>x{p.quantity}</span>
                                                    {p.colorInfo && <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] ${isLightMode ? 'bg-purple-50 text-purple-600 border border-purple-100/50' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>{p.colorInfo}</span>}
                                                </div>
                                                <p className={`font-bold font-mono text-[9px] ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>${(p.finalPrice || 0).toFixed(2)}/unit</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Compact Pricing Summary Bar */}
                        <div className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-4 ${isLightMode ? 'bg-slate-50/50 border-slate-100' : 'bg-gray-905 border-[#2B3139]'}`}>
                            <div className="flex gap-6">
                                <div>
                                    <span className={`text-[8px] font-black uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>សរុបទំនិញ</span>
                                    <p className={`font-black text-sm ${isLightMode ? 'text-slate-700' : 'text-white'}`}>${(Number(order.subtotal) || 0).toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className={`text-[8px] font-black uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>សេវាដឹក</span>
                                    <p className={`font-black text-sm ${isLightMode ? 'text-slate-700' : 'text-white'}`}>${(Number(order.customer.shippingFee) || 0).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 rounded-xl text-center bg-blue-600 text-white shadow-md shadow-blue-500/15">
                                <span className="text-[8px] font-black uppercase tracking-widest block opacity-90 mb-0.5">សរុបរួម (Grand Total)</span>
                                <p className="font-black text-xl font-mono leading-none">${(Number(order.grandTotal) || 0).toFixed(2)}</p>
                            </div>
                        </div>
                        
                        {/* Compact Payment Section */}
                        <fieldset className={`border-2 p-4 rounded-2xl ${isLightMode ? 'border-slate-100 bg-slate-50/30' : 'border-gray-755 bg-[#181A20]/20'}`}>
                            <legend className={`px-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>ស្ថានភាពទូទាត់</legend>
                            <div className="space-y-3">
                                {/* Segmented Control for Payment Status */}
                                <div className={`flex p-0.5 rounded-xl border max-w-xs ${isLightMode ? 'bg-slate-100/80 border-slate-200/60' : 'bg-gray-900/80 border-gray-700'}`}>
                                    <button 
                                        type="button"
                                        onClick={() => setOrder({...order, payment: {...order.payment, status: 'Unpaid', info: ''}})}
                                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${order.payment.status === 'Unpaid' ? 'bg-red-600 text-white shadow-sm' : (isLightMode ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300')}`}
                                    >
                                        <span>Unpaid</span>
                                        <span className="text-[8px] opacity-75 font-normal">(COD)</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setOrder({...order, payment: {...order.payment, status: 'Paid'}})}
                                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${order.payment.status === 'Paid' ? 'bg-emerald-600 text-white shadow-sm' : (isLightMode ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300')}`}
                                    >
                                        <span>Paid</span>
                                        <span className="text-[8px] opacity-75 font-normal">(Transfer)</span>
                                    </button>
                                </div>

                                {order.payment.status === 'Paid' && (
                                    <div className="animate-fade-in-down space-y-2">
                                        <p className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>ជ្រើសរើសគណនីធនាគារ</p>
                                        <BankSelector 
                                            bankAccounts={appData.bankAccounts || []}
                                            selectedBankName={order.payment.info}
                                            onSelect={(bankName) => handleBankChange(bankName)}
                                            fulfillmentStore={order.fulfillmentStore}
                                        />
                                    </div>
                                )}
                            </div>
                        </fieldset>
                        
                        {/* Telegram Scheduling Component */}
                        <TelegramScheduler 
                            schedule={order.telegram.schedule}
                            time={order.telegram.time}
                            onChange={(data) => setOrder({ ...order, telegram: data })}
                        />

                        <div className="space-y-2 sm:space-y-3 pt-4">
                            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isLightMode ? 'text-slate-500' : 'text-gray-500'}`}>ចំណាំ & Link Google Map</label>
                            
                            {/* Recently Used Notes Chips */}
                            {recentNotes.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-1">
                                    {recentNotes.map((rNote, idx) => (
                                        <button 
                                            key={idx}
                                            type="button"
                                            onClick={() => setOrder({...order, note: order.note ? `${order.note} | ${rNote}` : rNote})}
                                            className={`px-3.5 py-1 border rounded-full text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all duration-200 active:scale-95 truncate max-w-[200px] ${isLightMode ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm shadow-blue-500/5' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}`}
                                            title={rNote}
                                        >
                                            {rNote.length > 20 ? rNote.substring(0, 20) + '...' : rNote}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea placeholder="ចំណាំបន្ថែម..." value={order.note} rows={4} onChange={(e) => setOrder({...order, note: e.target.value})} className={`form-textarea !rounded-2xl text-sm focus:border-blue-500/50 ${isLightMode ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-gray-900/60 border-white/5 text-white'}`}></textarea>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="w-full px-1 sm:px-4 pb-10 create-order-flat">
            <div className="max-w-4xl mx-auto mt-2 sm:mt-10 lg:mt-14">
             <style>{`
                /* CSS variables for flat theme colors */
                .create-order-flat {
                    --input-bg: rgba(15, 23, 42, 0.4);
                    --input-border: rgba(255, 255, 255, 0.05);
                    --card-bg-override: rgba(30, 41, 59, 0.3);
                    --border-override: rgba(255, 255, 255, 0.05);
                    --text-color: #ffffff;
                }
                .theme-light .create-order-flat {
                    --input-bg: #ffffff;
                    --input-border: #e2e8f0;
                    --card-bg-override: #ffffff;
                    --border-override: #e2e8f0;
                    --text-color: #1e293b;
                }

                /* Neutralize Neumorphism overrides to allow standard flat layout styling */
                .ui-neumorphism .create-order-flat .form-input,
                .ui-neumorphism .create-order-flat .form-select,
                .ui-neumorphism .create-order-flat .form-textarea {
                    background: var(--input-bg) !important;
                    border: 1px solid var(--input-border) !important;
                    box-shadow: none !important;
                    color: var(--text-color) !important;
                }
                .ui-neumorphism .create-order-flat .bg-gray-800\\/40,
                .ui-neumorphism .create-order-flat .bg-gray-900\\/50,
                .ui-neumorphism .create-order-flat .bg-gray-900\\/80,
                .ui-neumorphism .create-order-flat .bg-gray-900\\/60,
                .ui-neumorphism .create-order-flat .bg-gray-900\\/40,
                .ui-neumorphism .create-order-flat .bg-black\\/20,
                .ui-neumorphism .create-order-flat .page-card {
                    background: var(--card-bg-override) !important;
                    border: 1px solid var(--border-override) !important;
                    box-shadow: none !important;
                }
                .ui-neumorphism .create-order-flat fieldset {
                    box-shadow: none !important;
                }

                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .btn-shimmer {
                    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite linear;
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 15px rgba(37,99,235,0.3); }
                    50% { box-shadow: 0 0 30px rgba(37,99,235,0.6); }
                }
                .btn-pulse { animation: pulse-glow 2s infinite ease-in-out; }
                @keyframes spin-border {
                    from { --angle: 0deg; }
                    to { --angle: 360deg; }
                }
                @property --angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                .card-flux {
                    position: relative;
                    background: #0f172a;
                    z-index: 1;
                }
                .card-flux-active::after, .card-flux-active::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    z-index: -1;
                    background: conic-gradient(from var(--angle), transparent 70%, #3b82f6, #8b5cf6, #ec4899, #3b82f6);
                    border-radius: inherit;
                    animation: spin-border 3s linear infinite;
                }
                .card-flux-before {
                    filter: blur(10px);
                    opacity: 0.7;
                }
                @keyframes float-y {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-float-y { animation: float-y 3s ease-in-out infinite; }
                @keyframes pulse-soft {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
             `}</style>
             {submissionStatus && (<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4"><div className="page-card text-center flex flex-col items-center animate-fade-in-scale">{submissionStatus.type === 'success' ? (<div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]"><svg className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></div>) : (<div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/30"><svg className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></div>)}<p className="text-base sm:text-lg font-black text-white">{submissionStatus.message}</p></div></div>)}
            <MapModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} url={mapSearchUrl} />
            {isScannerVisible && <BarcodeScannerModal onClose={() => setIsScannerVisible(false)} onCodeScanned={handleCodeScanned} scanMode={scanMode} setScanMode={setScanMode} productsInOrder={order.products} masterProducts={appData.products || []} />}
            <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} maxWidth="max-w-sm"><div className="p-6 text-center space-y-6"><div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 shadow-xl shadow-red-900/10 animate-bounce-slow"><svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h3 className={`text-lg sm:text-xl font-black uppercase tracking-tighter ${isLightMode ? 'text-slate-900' : 'text-white'}`}>បោះបង់ការបញ្ចូល?</h3><div className="flex gap-3"><button onClick={() => setIsCancelModalOpen(false)} className={`px-6 py-3 border rounded-2xl flex-1 font-black text-xs sm:text-sm transition-all active:scale-95 ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>ទេ (ត្រឡប់)</button><button onClick={handleConfirmCancel} className="px-6 py-3 bg-red-600 border border-red-500 text-white rounded-2xl flex-1 font-black text-xs sm:text-sm transition-all hover:bg-red-700 active:scale-95 shadow-lg shadow-red-900/20">បាទ (បោះបង់)</button></div></div></Modal>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-4">
                <h1 className={`hidden md:flex text-2xl sm:text-3xl font-black uppercase tracking-tighter items-center gap-3 sm:gap-4 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    <span className="text-blue-500">កុម្ម៉ង់ថ្មី</span>
                    <span className={`text-[9px] sm:text-[10px] px-3 sm:px-4 py-1.5 rounded-full border uppercase tracking-[0.15em] sm:tracking-[0.2em] ${isLightMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-600/20 text-blue-400 border-blue-500/20'}`}>{team}</span>
                </h1>
                <button onClick={handleCancelClick} className={`hidden md:block px-6 py-2.5 border font-black rounded-2xl uppercase text-[10px] sm:text-[11px] tracking-widest transition-all active:scale-90 ${isLightMode ? 'bg-white border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-500 hover:text-red-600' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-red-500 hover:bg-red-500/10 hover:text-red-400'}`}>បោះបង់</button>
            </div>

            <div className={`backdrop-blur-3xl rounded-[1.5rem] sm:rounded-[3rem] p-3 sm:p-10 shadow-2xl border ${isLightMode ? 'bg-white border-slate-200/80 shadow-slate-100' : 'bg-gray-800/30 border-white/5'}`}>
                <div className="flex justify-between items-center mb-8 sm:mb-12 relative px-2 sm:px-4">
                    <div className={`absolute left-6 right-6 sm:left-10 sm:right-10 top-1/2 w-[calc(100%-48px)] sm:w-[calc(100%-80px)] h-0.5 -z-10 ${isLightMode ? 'bg-slate-200' : 'bg-gray-700'}`}></div>
                    <div className="absolute left-6 sm:left-10 top-1/2 h-0.5 bg-blue-500 -z-10 transition-all duration-500" style={{ width: `${((currentStep-1)/(STEPS.length-1)) * (100 - (48/400)*100)}%` }}></div>
                    {STEPS.map(step => (
                        <div key={step.number} className={`relative flex flex-col items-center z-10 transition-all duration-500 ${currentStep >= step.number ? 'scale-110' : 'opacity-40 scale-90'}`}>
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-[10px] sm:text-xs border-2 transition-all duration-500 ${currentStep >= step.number ? 'border-blue-500 bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : (isLightMode ? 'border-slate-300 bg-slate-100 text-slate-400' : 'border-gray-600 bg-gray-800 text-gray-500')}`}>{currentStep > step.number ? "✓" : step.number}</div>
                            <span className={`absolute -bottom-6 sm:-bottom-7 text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${currentStep >= step.number ? (isLightMode ? 'text-blue-600' : 'text-blue-400') : (isLightMode ? 'text-slate-400' : 'text-gray-600')}`}>{step.title}</span>
                        </div>
                    ))}
                </div>
                 
                 
                <div className="mt-8 sm:mt-16">{renderStepContent()}</div>
                
                {error && <div className={`mt-4 sm:mt-6 p-3 sm:p-4 border rounded-xl sm:rounded-2xl text-center text-[10px] sm:text-xs font-bold animate-shake ${isLightMode ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{error}</div>}
                
                <div className={`mt-8 sm:mt-10 pt-6 sm:pt-8 border-t space-y-3 sm:space-y-4 ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
                    <div className="flex gap-3 sm:gap-4 h-12 sm:h-16">
                        {currentStep > 1 && (
                            <button type="button" onClick={prevStep} className={`flex-1 px-4 sm:px-8 border rounded-2xl font-black uppercase text-[10px] sm:text-[12px] tracking-[0.15em] transition-all flex items-center justify-center gap-2 active:scale-95 ${isLightMode ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}><svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M15 19l-7-7 7-7"/></svg>ត្រឡប់</button>
                        )}
                        
                        {currentStep < STEPS.length ? (
                            <button type="button" onClick={nextStep} className="relative flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[12px] sm:text-[14px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 group overflow-hidden btn-pulse"><div className="absolute inset-0 btn-shimmer pointer-events-none"></div><span className="relative z-10">ជំហានបន្ទាប់</span><svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 relative z-10 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M9 5l7 7-7 7"/></svg></button>
                        ) : (
                             <button type="button" onClick={submitOrder} className="relative flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[12px] sm:text-[14px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 overflow-hidden" disabled={loading}><div className="absolute inset-0 btn-shimmer pointer-events-none"></div>{loading && undoTimer === null ? <Spinner size="sm" /> : <><span className="relative z-10">បញ្ជូនកម្ម៉ង់ឥឡូវនេះ</span><svg className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 animate-bounce-x" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg></>}</button>
                        )}
                    </div>
                    <button onClick={handleCancelClick} className={`md:hidden w-full py-4 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all active:scale-95 border ${isLightMode ? 'bg-white border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600' : 'bg-gray-800/40 border-white/5 text-gray-500 hover:text-red-400'}`}>បោះបង់ការបញ្ចូល</button>
                </div>
            </div>
        </div>

            {/* UNDO / GRACE PERIOD OVERLAY */}
            {undoTimer !== null && (
                <OrderGracePeriod 
                    timer={undoTimer}
                    maxTimer={maxUndoTimer}
                    onUndo={handleUndo}
                    isUndoing={isUndoing}
                    accentColor="emerald"
                />
            )}

            <style>{`.animate-bounce-x { animation: bounce-x 1s infinite ease-in-out; } @keyframes bounce-x { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(5px); } }`}</style>
        </div>
    );
};

export default CreateOrderPage;






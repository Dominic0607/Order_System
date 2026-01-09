
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import { ParsedOrder, Product, MasterProduct, ShippingMethod } from '../types';
import { WEB_APP_URL } from '../constants';
import SearchableProductDropdown from '../components/common/SearchableProductDropdown';
import SearchableShippingMethodDropdown from '../components/common/SearchableShippingMethodDropdown';
import SearchableProvinceDropdown from '../components/orders/SearchableProvinceDropdown';
import SetQuantity from '../components/orders/SetQuantity';
import { convertGoogleDriveUrl } from '../utils/fileUtils';

interface EditOrderPageProps {
    order: ParsedOrder;
    onSaveSuccess: () => void;
    onCancel: () => void;
}

const EditOrderPage: React.FC<EditOrderPageProps> = ({ order, onSaveSuccess, onCancel }) => {
    const { appData, currentUser, previewImage } = useContext(AppContext);
    
    // ចាប់ផ្ដើម formData ជាមួយ order ដើមទាំងអស់
    const [formData, setFormData] = useState<ParsedOrder>(order);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [bankLogo, setBankLogo] = useState<string>('');

    // បន្ថែម State សម្រាប់ជំនួយការជ្រើសរើស ស្រុក និង ឃុំ
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedSangkat, setSelectedSangkat] = useState('');

    useEffect(() => {
        if (formData['Payment Status'] === 'Paid' && formData['Payment Info']) {
             const bankInfo = appData.bankAccounts?.find((b: any) => b.BankName === formData['Payment Info']);
             if (bankInfo) setBankLogo(convertGoogleDriveUrl(bankInfo.LogoURL));
        }
    }, [formData['Payment Status'], formData['Payment Info'], appData.bankAccounts]);

    // Logic សម្រាប់ទាញយកបញ្ជី ខេត្ត ស្រុក ឃុំ ដូចក្នុង CreateOrderPage
    const provinces = useMemo(() => {
        if (!appData.locations) return [];
        return [...new Set(appData.locations.map((loc: any) => loc.Province))];
    }, [appData.locations]);

    const districts = useMemo(() => {
        if (!appData.locations || !formData.Location) return [];
        return [...new Set(appData.locations
            .filter((loc: any) => loc.Province === formData.Location)
            .map((loc: any) => loc.District))].sort((a, b) => String(a).localeCompare(String(b), 'km'));
    }, [appData.locations, formData.Location]);

    const sangkats = useMemo(() => {
        if (!appData.locations || !formData.Location || !selectedDistrict) return [];
        return [...new Set(appData.locations
            .filter((loc: any) => loc.Province === formData.Location && loc.District === selectedDistrict)
            .map((loc: any) => loc.Sangkat).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'km'));
    }, [appData.locations, formData.Location, selectedDistrict]);

    const formatPhoneNumber = (val: string) => {
        let phone = val.replace(/[^0-9]/g, '');
        if (phone.length > 0 && !phone.startsWith('0')) phone = '0' + phone;
        return phone;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            let processedValue: any = value;
            
            if (name === 'Customer Phone') {
                processedValue = formatPhoneNumber(value);
            } else if (name === 'Shipping Fee (Customer)' || name === 'Internal Cost') {
                processedValue = value === '' ? 0 : Math.max(0, parseFloat(value) || 0);
            }

            const updatedState = { ...prev, [name]: processedValue };

            if (name === 'Shipping Fee (Customer)') {
                const newTotals = recalculateTotals(updatedState.Products, Number(processedValue) || 0);
                return { ...updatedState, ...newTotals };
            }
            
            if (name === 'Payment Status' && processedValue === 'Unpaid') { 
                updatedState['Payment Info'] = ''; 
                setBankLogo(''); 
            }
            
            return updatedState;
        });
    };

    const handleProvinceSelect = (val: string) => {
        setFormData(prev => ({ ...prev, Location: val }));
        setSelectedDistrict('');
        setSelectedSangkat('');
    };

    const handleShippingMethodSelect = (method: ShippingMethod) => {
        setFormData(prev => ({ 
            ...prev, 
            'Internal Shipping Method': method.MethodName,
            'Internal Shipping Details': method.RequireDriverSelection ? '' : method.MethodName
        }));
    };

    const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const bankName = e.target.value;
        const bankInfo = appData.bankAccounts?.find((b: any) => b.BankName === bankName);
        setBankLogo(bankInfo ? convertGoogleDriveUrl(bankInfo.LogoURL) : '');
        setFormData(prev => ({ ...prev, 'Payment Info': bankName }));
    };

    const recalculateTotals = (products: Product[], shippingFee: number): Partial<ParsedOrder> => {
        const subtotal = products.reduce((sum, p) => sum + (p.total || 0), 0);
        const grandTotal = subtotal + (Number(shippingFee) || 0);
        const totalProductCost = products.reduce((sum, p) => sum + ((p.cost || 0) * (p.quantity || 0)), 0);
        const totalDiscount = products.reduce((sum, p) => sum + ((p.originalPrice - p.finalPrice) * p.quantity), 0);
        
        return { 
            Subtotal: subtotal, 
            'Grand Total': grandTotal, 
            'Total Product Cost ($)': totalProductCost,
            'Discount ($)': totalDiscount
        };
    };

    const handleProductChange = (index: number, field: keyof Product, value: any) => {
        setFormData(prev => {
            const newProducts = [...prev.Products];
            const productToUpdate = { ...newProducts[index] };
            
            if (field === 'name') {
                const masterProduct = appData.products.find((p: MasterProduct) => p.ProductName === value);
                if (masterProduct) {
                    productToUpdate.name = masterProduct.ProductName;
                    productToUpdate.originalPrice = masterProduct.Price;
                    productToUpdate.finalPrice = masterProduct.Price;
                    productToUpdate.cost = masterProduct.Cost;
                    productToUpdate.image = masterProduct.ImageURL;
                }
            } else if (field === 'finalPrice' || field === 'quantity') {
                // @ts-ignore
                productToUpdate[field] = value === '' ? 0 : Math.max(field === 'quantity' ? 1 : 0, Number(value) || 0);
            } else {
                // @ts-ignore
                productToUpdate[field] = value;
            }
            
            productToUpdate.total = (Number(productToUpdate.quantity) || 0) * (Number(productToUpdate.finalPrice) || 0);
            newProducts[index] = productToUpdate;
            const newTotals = recalculateTotals(newProducts, Number(prev['Shipping Fee (Customer)']) || 0);
            return { ...prev, Products: newProducts, ...newTotals };
        });
    };
    
    const handleAddProduct = () => {
        setFormData(prev => ({ 
            ...prev, 
            Products: [ 
                ...prev.Products, 
                { id: Date.now(), name: '', quantity: 1, originalPrice: 0, finalPrice: 0, total: 0, discountPercent: 0, colorInfo: '', image: '', cost: 0 } 
            ] 
        }));
    };

    const handleRemoveProduct = (index: number) => {
        if (formData.Products.length <= 1) { 
            alert("ប្រតិបត្តិការណ៍ត្រូវតែមានផលិតផលយ៉ាងតិចមួយ។"); 
            return; 
        }
        setFormData(prev => {
            const newProducts = prev.Products.filter((_, i) => i !== index);
            const newTotals = recalculateTotals(newProducts, Number(prev['Shipping Fee (Customer)']) || 0);
            return { ...prev, Products: newProducts, ...newTotals };
        });
    };
    
    const handleDelete = async () => {
        if (!window.confirm(`តើអ្នកពិតជាចង់លុបប្រតិបត្តិការណ៍ ID: ${formData['Order ID']} មែនទេ?`)) return;
        if (!currentUser) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`${WEB_APP_URL}/api/admin/delete-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId: formData['Order ID'], 
                    team: formData.Team, 
                    userName: currentUser.UserName 
                })
            });
            if (!response.ok) throw new Error('Delete failed');
            onSaveSuccess();
        } catch (err: any) { 
            setError(`លុបមិនបានសម្រេច: ${err.message}`); 
        } finally { 
            setIsDeleting(false); 
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');
        
        if (!formData.Products.every(p => p.name && p.quantity > 0)) {
            setError("សូមពិនិត្យព័ត៌មានផលិតផល (ឈ្មោះ និងចំនួន)។");
            setLoading(false);
            return;
        }

        try {
            const finalTotals = recalculateTotals(formData.Products, Number(formData['Shipping Fee (Customer)']) || 0);
            const payloadData: any = { 
                ...order, 
                ...formData, 
                ...finalTotals 
            };
            
            payloadData['Products (JSON)'] = JSON.stringify(payloadData.Products);
            delete payloadData.Products;

            const response = await fetch(`${WEB_APP_URL}/api/admin/update-order`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    orderId: formData['Order ID'], 
                    team: formData.Team, 
                    userName: currentUser?.UserName, 
                    newData: payloadData 
                }) 
            });
            
            if (!response.ok) throw new Error('Update failed');
            onSaveSuccess();
        } catch (err: any) { 
            setError(`រក្សាទុកមិនបានសម្រេច: ${err.message}`); 
        } finally { 
            setLoading(false); 
        }
    };
    
    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 px-2 sm:px-0">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-blue-600 rounded-full"></span>
                        Edit Order
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="px-3 py-1 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">ID: {formData['Order ID']}</span>
                        <span className="px-3 py-1 bg-gray-800 text-gray-500 rounded-lg text-[10px] font-bold uppercase">{formData.Team}</span>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={onCancel} className="flex-1 sm:flex-none px-8 py-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 font-black rounded-xl uppercase text-xs tracking-widest transition-all">បោះបង់</button>
                    <button onClick={handleSubmit} className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-xl shadow-blue-900/20 transition-all" disabled={loading}>{loading ? <Spinner size="sm"/> : 'រក្សាទុក'}</button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-8">
                        {/* Customer Information Card */}
                        <div className="bg-gray-800/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden relative group">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">ព័ត៌មានអតិថិជន</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ឈ្មោះអតិថិជន*</label>
                                    <input type="text" name="Customer Name" value={formData['Customer Name'] || ''} onChange={handleInputChange} className="form-input !py-4 bg-black/40 border-gray-700 focus:border-blue-500/50 rounded-2xl font-bold" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">លេខទូរស័ព្ទ*</label>
                                    <input type="tel" name="Customer Phone" value={formData['Customer Phone'] || ''} onChange={handleInputChange} className="form-input !py-4 bg-black/40 border-gray-700 focus:border-blue-500/50 rounded-2xl font-mono font-black" required />
                                </div>
                                
                                {/* ផ្នែកជ្រើសរើសទីតាំងថ្មី (ដូចក្នុង CreateOrderPage) */}
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ខេត្ត/រាជធានី*</label>
                                        <SearchableProvinceDropdown 
                                            provinces={provinces}
                                            selectedProvince={formData.Location}
                                            onSelect={handleProvinceSelect}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ស្រុក/ខណ្ឌ</label>
                                        <select 
                                            value={selectedDistrict} 
                                            onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedSangkat(''); }} 
                                            className="form-select bg-black/40 border-gray-700 rounded-2xl !py-4 font-bold"
                                            disabled={!formData.Location}
                                        >
                                            <option value="">-- ស្រុក/ខណ្ឌ --</option>
                                            {districts.map((d: string) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ឃុំ/សង្កាត់</label>
                                        <select 
                                            value={selectedSangkat} 
                                            onChange={(e) => setSelectedSangkat(e.target.value)} 
                                            className="form-select bg-black/40 border-gray-700 rounded-2xl !py-4 font-bold"
                                            disabled={!selectedDistrict}
                                        >
                                            <option value="">-- ឃុំ/សង្កាត់ --</option>
                                            {sangkats.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">អាសយដ្ឋានលម្អិត</label>
                                    <input type="text" name="Address Details" value={formData['Address Details'] || ''} onChange={handleInputChange} className="form-input !py-4 bg-black/40 border-gray-700 focus:border-blue-500/50 rounded-2xl font-bold" placeholder="ផ្ទះលេខ, ផ្លូវ, ឬចំណុចសម្គាល់..." />
                                </div>
                            </div>
                        </div>

                        {/* Products List Card */}
                        <div className="bg-gray-800/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">បញ្ជីផលិតផល</h3>
                                </div>
                                <button type="button" onClick={handleAddProduct} className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">+ បន្ថែម</button>
                            </div>
                            
                            <div className="space-y-4">
                                {formData.Products.map((p, index) => (
                                    <div key={p.id || index} className="group relative bg-black/30 rounded-[2rem] p-5 border border-white/5 hover:border-blue-500/20 transition-all shadow-inner">
                                        <button type="button" onClick={() => handleRemoveProduct(index)} className="absolute -top-2 -right-2 bg-red-600/20 text-red-500 w-8 h-8 rounded-full border border-red-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white shadow-xl z-10">&times;</button>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                            <div className="md:col-span-2 flex justify-center">
                                                <div className="w-20 h-20 bg-gray-900 rounded-2xl border-2 border-gray-800 overflow-hidden shadow-2xl cursor-pointer" onClick={() => p.image && previewImage(convertGoogleDriveUrl(p.image))}>
                                                    <img src={convertGoogleDriveUrl(p.image)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            </div>
                                            <div className="md:col-span-4 space-y-2">
                                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">ឈ្មោះផលិតផល*</label>
                                                <SearchableProductDropdown products={appData.products} selectedProductName={p.name} onSelect={(name) => handleProductChange(index, 'name', name)} />
                                            </div>
                                            <div className="md:col-span-3">
                                                <SetQuantity value={p.quantity} onChange={(val) => handleProductChange(index, 'quantity', val)} />
                                            </div>
                                            <div className="md:col-span-3 space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">តម្លៃលក់ ($)</label>
                                                <div className="relative">
                                                    <input type="number" step="0.01" value={p.finalPrice} onChange={(e) => handleProductChange(index, 'finalPrice', e.target.value)} className="form-input !py-3 !pr-8 bg-black/40 border-gray-700 rounded-xl font-black text-blue-400 text-lg" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 font-black">$</span>
                                                </div>
                                            </div>
                                            
                                            <div className="md:col-span-12 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                    <span className="text-[10px] font-black text-gray-600 uppercase">សម្គាល់៖</span>
                                                    <input type="text" value={p.colorInfo} onChange={(e) => handleProductChange(index, 'colorInfo', e.target.value)} className="flex-grow bg-transparent border-b border-gray-800 text-xs font-black text-gray-300 focus:border-blue-500 outline-none px-2" placeholder="..." />
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Item Subtotal</p>
                                                        <p className="text-lg font-black text-white">${p.total.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                        {/* Summary Card */}
                        <div className="bg-blue-600 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(37,99,235,0.3)] text-white relative overflow-hidden group">
                            <div className="relative z-10 space-y-6">
                                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                                    <span className="text-xs font-black uppercase tracking-widest opacity-80">Subtotal</span>
                                    <span className="text-2xl font-black">${(Number(formData.Subtotal) || 0).toFixed(2)}</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-80">ថ្លៃសេវាដឹក (ពីអតិថិជន)</label>
                                        <div className="relative">
                                            <input type="number" step="0.1" name="Shipping Fee (Customer)" value={formData['Shipping Fee (Customer)']} onChange={handleInputChange} className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 px-4 outline-none font-black text-xl placeholder:text-white/30" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black">$</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-white/20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-80">Total Due</p>
                                    <p className="text-5xl font-black tracking-tighter">${(Number(formData['Grand Total']) || 0).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        </div>

                        {/* Shipping & Payment Detail */}
                        <div className="bg-gray-800/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>ក្រុមហ៊ុនដឹកជញ្ជូន</label>
                                    <SearchableShippingMethodDropdown methods={appData.shippingMethods || []} selectedMethodName={formData['Internal Shipping Method']} onSelect={handleShippingMethodSelect} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>អ្នកដឹក / លម្អិត</label>
                                    <select name="Internal Shipping Details" value={formData['Internal Shipping Details']} onChange={handleInputChange} className="form-select bg-black/40 border-gray-700 rounded-2xl !py-4 font-bold">
                                        <option value="">-- ជ្រើសរើសអ្នកដឹក --</option>
                                        {appData.drivers?.map((d: any) => <option key={d.DriverName} value={d.DriverName}>{d.DriverName}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>ថ្លៃបង់ឱ្យអ្នកដឹក (Cost)*</label>
                                    <div className="relative">
                                        <input type="number" step="0.01" name="Internal Cost" value={formData['Internal Cost']} onChange={handleInputChange} className="form-input !py-4 !pr-10 bg-black/40 border-gray-700 rounded-2xl font-black text-orange-400 text-lg" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-black">$</span>
                                    </div>
                                </div>
                                <div className="h-px bg-white/5"></div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>ស្ថានភាពទូទាត់</label>
                                    <select name="Payment Status" value={formData['Payment Status']} onChange={handleInputChange} className={`form-select !py-4 rounded-2xl font-black uppercase tracking-widest border-none ${formData['Payment Status'] === 'Paid' ? 'bg-emerald-600 text-white' : 'bg-red-600/20 text-red-400 border border-red-500/20'}`}>
                                        <option value="Unpaid">Unpaid (COD)</option>
                                        <option value="Paid">Paid (រួចរាល់)</option>
                                    </select>
                                </div>
                                {formData['Payment Status'] === 'Paid' && (
                                    <div className="space-y-4 animate-fade-in-down">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">គណនីធនាគារ</label>
                                            <div className="flex items-center gap-3">
                                                <select value={formData['Payment Info']} onChange={handleBankChange} className="form-select bg-black/40 border-gray-700 rounded-2xl !py-4 font-bold flex-grow">
                                                    <option value="">ជ្រើសរើសធនាគារ</option>
                                                    {appData.bankAccounts?.map((b: any) => <option key={b.BankName} value={b.BankName}>{b.BankName}</option>)}
                                                </select>
                                                {bankLogo && <img src={bankLogo} className="w-14 h-14 object-contain bg-white/5 p-1 rounded-xl border border-white/10" alt="" />}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Note & Delete */}
                        <div className="bg-gray-800/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ចំណាំបន្ថែម</label>
                                <textarea name="Note" value={formData.Note} onChange={handleInputChange} rows={3} className="form-textarea bg-black/40 border-gray-700 rounded-[1.5rem] text-sm font-bold" placeholder="ចំណាំ..." />
                            </div>
                            <button type="button" onClick={handleDelete} className="w-full mt-6 py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest border border-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2" disabled={loading || isDeleting}>
                                {isDeleting ? <Spinner size="sm" /> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg> លុបប្រតិបត្តិការណ៍</>}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditOrderPage;

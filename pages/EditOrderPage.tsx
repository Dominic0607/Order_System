
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import { ParsedOrder, Product, MasterProduct } from '../types';
import { WEB_APP_URL, LABEL_PRINTER_URL_BASE } from '../constants';
import SearchableProductDropdown from '../components/common/SearchableProductDropdown';
import { convertGoogleDriveUrl } from '../utils/fileUtils';

interface EditOrderPageProps {
    order: ParsedOrder;
    onSaveSuccess: () => void;
    onCancel: () => void;
}

const EditOrderPage: React.FC<EditOrderPageProps> = ({ order, onSaveSuccess, onCancel }) => {
    const { appData, currentUser } = useContext(AppContext);
    const [formData, setFormData] = useState<ParsedOrder>(order);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [bankLogo, setBankLogo] = useState<string>('');

    // Initialize bank logo on mount
    useEffect(() => {
        if (order['Payment Status'] === 'Paid' && order['Payment Info']) {
             const bankInfo = appData.bankAccounts?.find((b: any) => b.BankName === order['Payment Info']);
             if (bankInfo) {
                 setBankLogo(convertGoogleDriveUrl(bankInfo.LogoURL));
             }
        }
    }, [order, appData.bankAccounts]);

    const formatPhoneNumber = (val: string) => {
        let phone = val.replace(/[^0-9]/g, '');
        if (phone.length > 0) {
            // Ensure exactly one leading zero
            phone = '0' + phone.replace(/^0+/, '');
        }
        return phone;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'Customer Phone') {
            const phoneNumber = formatPhoneNumber(value);
            setFormData(prev => ({ ...prev, [name]: phoneNumber }));
            return;
        }

        setFormData(prev => {
            const updatedState = { ...prev, [name]: value };
            if (name === 'Shipping Fee (Customer)') {
                const newTotals = recalculateTotals(updatedState.Products, Number(value) || 0);
                return { ...updatedState, ...newTotals };
            }
            if (name === 'Payment Status' && value === 'Unpaid') {
                updatedState['Payment Info'] = '';
                setBankLogo('');
            }
            return updatedState;
        });
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
        return { Subtotal: subtotal, 'Grand Total': grandTotal, 'Total Product Cost ($)': totalProductCost };
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
            } else {
                // @ts-ignore
                productToUpdate[field] = value;
            }
            productToUpdate.total = (productToUpdate.quantity || 0) * (productToUpdate.finalPrice || 0);
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
        if (formData.Products.length <= 1) { alert("An order must have at least one product."); return; }
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
                    userName: currentUser.UserName,
                    telegramMessageIds: [formData['Telegram Message ID 1'], formData['Telegram Message ID 2']].filter(Boolean)
                })
            });
            if (!response.ok) throw new Error('Delete failed');
            onSaveSuccess();
        } catch (err: any) { setError(`Delete failed: ${err.message}`); } finally { setIsDeleting(false); }
    };

    const handlePrint = () => {
        if (!LABEL_PRINTER_URL_BASE || !formData) return;
        
        const validatedPhone = formatPhoneNumber(formData['Customer Phone']);
        
        const queryParams = new URLSearchParams({
            id: formData['Order ID'],
            name: formData['Customer Name'] || '',
            phone: validatedPhone,
            location: formData.Location || '',
            address: formData['Address Details'] || '',
            total: (formData['Grand Total'] || 0).toString(),
            payment: formData['Payment Status'] || 'Unpaid',
            shipping: formData['Internal Shipping Method'] || 'N/A',
            page: formData.Page || '',
            user: formData.User || '',
        });

        const note = formData.Note || '';
        const mapMatch = note.match(/https?:\/\/(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)\/[^\s]+/);
        if (mapMatch) {
            queryParams.set('map', mapMatch[0]);
        }

        window.open(`${LABEL_PRINTER_URL_BASE}?${queryParams.toString()}`, '_blank');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (!currentUser || !formData.Team) { setError("Error missing data"); setLoading(false); return; }
        
        const finalTotals = recalculateTotals(formData.Products, Number(formData['Shipping Fee (Customer)']) || 0);
        
        // Ensure phone number has leading zero even for old/imported data
        const validatedPhone = formatPhoneNumber(formData['Customer Phone']);
        
        const fullUpdatedOrder: any = { 
            ...formData, 
            'Customer Phone': validatedPhone,
            ...finalTotals 
        };
        fullUpdatedOrder['Products (JSON)'] = JSON.stringify(fullUpdatedOrder.Products);
        delete fullUpdatedOrder.Products;

        try {
            const response = await fetch(`${WEB_APP_URL}/api/admin/update-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: formData['Order ID'],
                    team: formData.Team,
                    userName: currentUser.UserName,
                    newData: fullUpdatedOrder
                })
            });
            if (!response.ok) throw new Error('Update failed');
            onSaveSuccess();
        } catch (err: any) { setError(`Update failed: ${err.message}`); } finally { setLoading(false); }
    };
    
    const profit = (Number(formData['Grand Total']) || 0) - (Number(formData['Total Product Cost ($)']) || 0) - (Number(formData['Internal Cost']) || 0);

    return (
        <div className="w-full page-card animate-fade-in">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 bg-gray-900/50 rounded-lg">
                    <div><strong className="text-gray-400 block">Order ID</strong>{formData['Order ID']}</div>
                    <div><strong className="text-gray-400 block">User</strong>{formData.User}</div>
                    <div><strong className="text-gray-400 block">Team</strong>{formData.Team}</div>
                    <div><strong className="text-gray-400 block">Timestamp</strong>{new Date(formData.Timestamp).toLocaleString()}</div>
                </div>

                <fieldset className="border border-gray-600 p-4 rounded-lg space-y-4">
                    <legend className="px-2 text-lg font-semibold text-blue-300">Customer</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="Customer Name" value={formData['Customer Name']} onChange={handleInputChange} className="form-input" placeholder="Customer Name" />
                        <input type="tel" name="Customer Phone" value={formData['Customer Phone']} onChange={handleInputChange} className="form-input" placeholder="Customer Phone" />
                        <input type="text" name="Location" value={formData.Location} onChange={handleInputChange} className="form-input" placeholder="Province/City" />
                        <input type="text" name="Address Details" value={formData['Address Details']} onChange={handleInputChange} className="form-input" placeholder="Address Details" />
                         <div className="relative">
                            <input type="number" step="0.1" name="Shipping Fee (Customer)" value={formData['Shipping Fee (Customer)']} onChange={handleInputChange} className="form-input" placeholder="Shipping Fee" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border border-gray-600 p-4 rounded-lg space-y-4">
                    <legend className="px-2 text-lg font-semibold text-blue-300">Products</legend>
                    {formData.Products.map((p, index) => (
                        <div key={p.id || index} className="grid grid-cols-12 gap-x-4 gap-y-2 items-center p-3 bg-gray-800/50 rounded-md">
                             <div className="col-span-12 sm:col-span-5">
                                <SearchableProductDropdown products={appData.products} selectedProductName={p.name} onSelect={(name) => handleProductChange(index, 'name', name)} />
                             </div>
                             <div className="col-span-4 sm:col-span-1"><input type="number" min="1" value={p.quantity} onChange={(e) => handleProductChange(index, 'quantity', Number(e.target.value))} className="form-input text-center" /></div>
                             <div className="col-span-8 sm:col-span-2"><input type="number" step="0.01" value={p.finalPrice} onChange={(e) => handleProductChange(index, 'finalPrice', Number(e.target.value))} className="form-input text-center" placeholder="Price" /></div>
                             <div className="col-span-8 sm:col-span-2"><input type="text" value={p.colorInfo} onChange={(e) => handleProductChange(index, 'colorInfo', e.target.value)} className="form-input" placeholder="Color/Info" /></div>
                             <div className="col-span-4 sm:col-span-1 text-center font-semibold">${p.total.toFixed(2)}</div>
                             <div className="col-span-12 sm:col-span-1 text-right"><button type="button" onClick={() => handleRemoveProduct(index)} className="btn !p-2 !bg-red-600/50 hover:!bg-red-600">🗑️</button></div>
                        </div>
                    ))}
                     <button type="button" onClick={handleAddProduct} className="btn btn-secondary">Add Product</button>
                </fieldset>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <fieldset className="border border-gray-600 p-4 rounded-lg space-y-4">
                        <legend className="px-2 text-lg font-semibold text-blue-300">Shipping</legend>
                        <select name="Internal Shipping Method" value={formData['Internal Shipping Method']} onChange={handleInputChange} className="form-select">
                           {appData.shippingMethods?.map((s: any) => <option key={s.MethodName} value={s.MethodName}>{s.MethodName}</option>)}
                        </select>
                        <select name="Internal Shipping Details" value={formData['Internal Shipping Details']} onChange={handleInputChange} className="form-select">
                            <option value="">-- ជ្រើសរើសអ្នកដឹក --</option>
                            {appData.drivers?.map((d: any) => <option key={d.DriverName} value={d.DriverName}>{d.DriverName}</option>)}
                        </select>
                        <div className="relative"><input type="number" step="0.01" name="Internal Cost" value={formData['Internal Cost']} onChange={handleInputChange} className="form-input" placeholder="Internal Cost" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">$</span></div>
                    </fieldset>
                    <fieldset className="border border-gray-600 p-4 rounded-lg space-y-4">
                        <legend className="px-2 text-lg font-semibold text-blue-300">Payment</legend>
                        <select name="Payment Status" value={formData['Payment Status']} onChange={handleInputChange} className="form-select">
                            <option value="Unpaid">Unpaid</option>
                            <option value="Paid">Paid</option>
                        </select>
                        {formData['Payment Status'] === 'Paid' && (
                             <div className="flex items-center gap-2">
                                <select name="Payment Info" value={formData['Payment Info']} onChange={handleBankChange} className="form-select">
                                    <option value="">Select Bank</option>
                                    {appData.bankAccounts?.map((b: any) => <option key={b.BankName} value={b.BankName}>{b.BankName}</option>)}
                                </select>
                                {bankLogo && <img src={bankLogo} alt="Bank Logo" className="h-10 w-16 object-contain bg-white/10 p-1 rounded-md" />}
                             </div>
                        )}
                    </fieldset>
                </div>
                
                <textarea name="Note" placeholder="Order Note..." value={formData.Note} rows={3} onChange={handleInputChange} className="form-textarea"></textarea>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 bg-gray-900/50 rounded-lg">
                    <div><strong className="text-gray-400 block">Subtotal</strong>${(Number(formData.Subtotal) || 0).toFixed(2)}</div>
                    <div><strong className="text-gray-400 block">Total Cost</strong>${((Number(formData['Total Product Cost ($)']) || 0) + (Number(formData['Internal Cost']) || 0)).toFixed(2)}</div>
                    <div><strong className="text-lg text-blue-300 block">Grand Total</strong><span className="text-xl font-bold">${(Number(formData['Grand Total']) || 0).toFixed(2)}</span></div>
                    <div><strong className="text-lg text-green-400 block">Est. Profit</strong><span className={`text-xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${profit.toFixed(2)}</span></div>
                </div>

                {error && <p className="text-red-400 mt-2 p-3 bg-red-900/50 rounded-md">{error}</p>}

                <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-4 border-t border-gray-700 mt-6">
                    <button type="button" onClick={handleDelete} className="btn !bg-red-600/80 hover:!bg-red-700 text-white w-full sm:w-auto" disabled={loading || isDeleting}>
                        {isDeleting ? <Spinner size="sm" /> : 'លុបប្រតិបត្តិការណ៍'}
                    </button>
                    <div className="flex flex-wrap justify-center sm:justify-end gap-3 w-full sm:w-auto">
                        {LABEL_PRINTER_URL_BASE && (
                            <button type="button" onClick={handlePrint} className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                ព្រីន Label
                            </button>
                        )}
                        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading || isDeleting}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || isDeleting}>
                            {loading ? <Spinner size="sm" /> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditOrderPage;

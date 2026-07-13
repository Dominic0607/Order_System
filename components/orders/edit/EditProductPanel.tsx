
import React, { useState, useContext } from 'react';
import { Product, MasterProduct } from '../../../types';
import SearchableProductDropdown from '../../common/SearchableProductDropdown';
import SetQuantity from '../SetQuantity';
import { convertGoogleDriveUrl } from '../../../utils/fileUtils';
import { AppContext } from '../../../context/AppContext';

interface EditProductPanelProps {
    products: Product[];
    masterProducts: MasterProduct[];
    onProductChange: (index: number, field: keyof Product, value: any, extraTags?: string) => void;
    onAddProduct: () => void;
    onAddMasterProduct: (master: MasterProduct) => void;
    onRemoveProduct: (index: number) => void;
    onPreviewImage: (url: string) => void;
    onScanBarcode: () => void;
    fulfillmentStatus?: string;
    fulfillmentStore?: string;
    packedBy?: string;
    packedTime?: string;
    dispatchedBy?: string;
    dispatchedTime?: string;
}

const EditProductPanel: React.FC<EditProductPanelProps> = ({
    products, masterProducts, onProductChange, onAddProduct, onAddMasterProduct, onRemoveProduct, onPreviewImage, onScanBarcode,
    fulfillmentStatus, fulfillmentStore, packedBy, packedTime, dispatchedBy, dispatchedTime
}) => {
    const { advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className={`flex-initial lg:flex-1 border rounded-xl flex flex-col relative min-h-[400px] lg:min-h-[500px] shadow-2xl transition-colors duration-300 ${
            isLightMode 
                ? 'bg-white border-slate-200 shadow-slate-100' 
                : 'bg-[#1E2329] border-[#2B3139]'
        }`}>
            {/* Minimal Header */}
            <div className={`px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-opacity-70 backdrop-blur-md sticky top-0 z-40 ${
                isLightMode ? 'bg-white border-slate-200' : 'bg-[#1E2329]/50 border-[#2B3139]'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                        isLightMode 
                            ? 'bg-blue-50 border-blue-200 text-blue-500' 
                            : 'bg-[#FCD535]/10 border-[#FCD535]/20 text-[#FCD535]'
                    }`}>
                        <svg className={`w-5 h-5 ${isLightMode ? 'text-blue-500' : 'text-[#FCD535]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <div>
                        <h3 className={`text-base font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-800' : 'text-[#EAECEF]'}`}>
                            Items List
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLightMode ? 'bg-slate-100 text-slate-500' : 'bg-[#2B3139] text-[#848E9C]'}`}>{products.length}</span>
                        </h3>
                        <p className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${isLightMode ? 'text-slate-400' : 'text-[#848E9C]'}`}>Manage order products and quantities</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button type="button" onClick={onScanBarcode} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-semibold border ${
                        isLightMode 
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-350 text-slate-700' 
                            : 'bg-[#2B3139] hover:bg-[#363C44] text-[#EAECEF] border-[#363C44]'
                    }`}>
                        <svg className={`w-4 h-4 ${isLightMode ? 'text-blue-500' : 'text-[#FCD535]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                        Scan
                    </button>
                    <button type="button" onClick={onAddProduct} className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isLightMode 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/10' 
                            : 'bg-[#FCD535] hover:bg-[#F0B90B] text-[#181A20] shadow-[#FCD535]/10'
                    }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 4v16m8-8H4" /></svg> Add Blank
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col p-4 lg:p-6">
                
                {/* Modern Search Section */}
                <div className="mb-6 relative z-50">
                    <SearchableProductDropdown 
                        products={masterProducts} 
                        selectedProductName={searchQuery} 
                        onSelect={(name, tags) => {
                            const master = masterProducts.find(p => p.ProductName === name);
                            if (master) {
                                onAddMasterProduct(master);
                                setSearchQuery('');
                            }
                        }} 
                        allowAddNew={false}
                    />
                </div>

                {/* Status Pills */}
                {(fulfillmentStore || packedBy || dispatchedBy) && (
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        {fulfillmentStore && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#2B3139]/30 border-[#2B3139]'
                            }`}>
                                <span className="w-2 h-2 rounded-full bg-[#848E9C]"></span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-[#848E9C]'}`}>{fulfillmentStore}</span>
                            </div>
                        )}
                        {packedBy && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0ECB81]/5 rounded-full border border-[#0ECB81]/10">
                                <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse"></span>
                                <span className="text-[10px] font-bold text-[#0ECB81] uppercase tracking-wider">Packed: {packedBy}</span>
                            </div>
                        )}
                        {dispatchedBy && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FCD535]/5 rounded-full border border-[#FCD535]/10">
                                <span className="w-2 h-2 rounded-full bg-[#FCD535]"></span>
                                <span className="text-[10px] font-bold text-[#FCD535] uppercase tracking-wider">Dispatched: {dispatchedBy}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Items Table Headers (Desktop Only) */}
                {products.length > 0 && (
                    <div className={`hidden lg:grid grid-cols-12 gap-4 px-4 py-2 border-b mb-4 ${isLightMode ? 'border-slate-150' : 'border-[#2B3139]'}`}>
                        <div className={`col-span-1 text-[10px] font-bold uppercase tracking-widest text-center ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>#</div>
                        <div className={`col-span-1 text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Image</div>
                        <div className={`col-span-3 text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Product & Variant</div>
                        <div className={`col-span-1 text-[10px] font-bold uppercase tracking-widest text-center ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Qty</div>
                        <div className={`col-span-2 text-[10px] font-bold uppercase tracking-widest text-right ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Base Price</div>
                        <div className={`col-span-2 text-[10px] font-bold uppercase tracking-widest text-right ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Discount</div>
                        <div className={`col-span-2 text-[10px] font-bold uppercase tracking-widest text-right pr-10 ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Subtotal</div>
                    </div>
                )}

                {/* Expanded List (No Nested Scroll) */}
                <div className="space-y-4 pr-1">
                    {products.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed ${
                            isLightMode ? 'bg-slate-50/50 border-slate-205' : 'bg-[#0B0E11]/20 border-[#2B3139]'
                        }`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isLightMode ? 'bg-slate-100' : 'bg-[#2B3139]/50'}`}>
                                <svg className={`w-8 h-8 ${isLightMode ? 'text-slate-300' : 'text-[#474D57]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            </div>
                            <p className={`text-sm font-semibold ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>No items added to this order yet</p>
                        </div>
                    ) : (
                        products.map((p, index) => {
                            const discountAmount = Math.max(0, (p.originalPrice || 0) - (p.finalPrice || 0));

                            return (
                                <div key={p.id || index} className={`group relative rounded-xl lg:rounded-none transition-all p-4 lg:p-0 lg:border-b lg:pb-4 border ${
                                    isLightMode 
                                        ? 'bg-slate-50 hover:bg-slate-100/50 lg:bg-transparent lg:border-slate-150' 
                                        : 'bg-[#1E2329] hover:bg-[#2B3139]/20 border-[#2B3139] lg:border-[#2B3139]/50'
                                }`}>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center relative">
                                        
                                        {/* Serial Number (Index) */}
                                        <div className="hidden lg:flex col-span-1 justify-center">
                                            <span className={`text-xs font-bold ${isLightMode ? 'text-slate-350' : 'text-[#474D57]'}`}>{(index + 1).toString().padStart(2, '0')}</span>
                                        </div>

                                        {/* Product Visual */}
                                        <div className="col-span-1 flex items-center justify-between lg:justify-start">
                                            <div 
                                                className={`w-16 h-16 lg:w-12 lg:h-12 rounded-lg border overflow-hidden cursor-pointer transition-all shadow-inner ${
                                                    isLightMode ? 'bg-slate-100 border-slate-200 hover:border-blue-500' : 'bg-[#0B0E11] border-[#2B3139] hover:border-[#FCD535]'
                                                }`}
                                                onClick={() => p.image && onPreviewImage(convertGoogleDriveUrl(p.image))}
                                            >
                                                {p.image ? (
                                                    <img src={convertGoogleDriveUrl(p.image)} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all scale-110" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center opacity-20">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Mobile-only Index & Delete */}
                                            <div className="lg:hidden flex items-center gap-3">
                                                <span className={`text-xs font-bold ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>#{(index + 1).toString().padStart(2, '0')}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => onRemoveProduct(index)}
                                                    className="w-8 h-8 rounded-lg bg-[#F6465D]/10 text-[#F6465D] flex items-center justify-center border border-[#F6465D]/20"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Product Name & Variant */}
                                        <div className="col-span-3 space-y-2">
                                            <SearchableProductDropdown 
                                                products={masterProducts} 
                                                selectedProductName={p.name} 
                                                onSelect={(name, tags) => onProductChange(index, 'name', name, tags)} 
                                                allowAddNew={false}
                                            />
                                            <div className="flex items-center gap-2 px-1">
                                                <input 
                                                    type="text" 
                                                    value={p.colorInfo} 
                                                    onChange={(e) => onProductChange(index, 'colorInfo', e.target.value)} 
                                                    className={`w-full bg-transparent border-b py-1 text-[11px] font-semibold outline-none transition-all ${
                                                        isLightMode 
                                                            ? 'border-slate-200 text-slate-600 placeholder-slate-350 focus:border-blue-500 focus:text-blue-600' 
                                                            : 'border-[#2B3139] text-[#848E9C] placeholder-[#474D57] focus:border-[#FCD535] focus:text-[#FCD535]'
                                                    }`} 
                                                    placeholder="Variant (Color, Size, etc.)" 
                                                />
                                            </div>
                                        </div>

                                        {/* Quantity */}
                                        <div className="col-span-1 flex flex-col items-center gap-1">
                                            <span className={`lg:hidden text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Quantity</span>
                                            <div className="w-full max-w-[120px]">
                                                <SetQuantity 
                                                    value={Number(p.quantity) || 1} 
                                                    onChange={(val) => onProductChange(index, 'quantity', val)} 
                                                    label="" 
                                                />
                                            </div>
                                        </div>

                                        {/* Base Price */}
                                        <div className="col-span-2 flex flex-col lg:items-end gap-1">
                                            <span className={`lg:hidden text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Base Price</span>
                                            <div className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition-all ${
                                                isLightMode 
                                                    ? 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-blue-500' 
                                                    : 'bg-[#0B0E11]/40 border-[#2B3139] group-focus-within:border-[#FCD535]'
                                            }`}>
                                                <span className={`text-xs font-bold ${isLightMode ? 'text-slate-400' : 'text-[#848E9C]'}`}>$</span>
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal" 
                                                    value={p.originalPrice} 
                                                    onChange={(e) => onProductChange(index, 'originalPrice', e.target.value)} 
                                                    className={`w-16 bg-transparent border-none p-0 text-right font-bold focus:ring-0 text-sm tabular-nums ${isLightMode ? 'text-slate-700' : 'text-[#EAECEF]'}`} 
                                                />
                                            </div>
                                        </div>

                                        {/* Individual Discount */}
                                        <div className="col-span-2 flex flex-col lg:items-end gap-1">
                                            <span className={`lg:hidden text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Discount</span>
                                            <div className={`flex items-center gap-1 px-3 py-2 rounded-lg border focus-within:border-[#F6465D] transition-all ${
                                                isLightMode ? 'bg-rose-50/50 border-rose-100' : 'bg-[#F6465D]/5 border-[#F6465D]/10'
                                            }`}>
                                                <span className="text-xs text-[#F6465D] font-bold">-$</span>
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal" 
                                                    value={discountAmount > 0 ? discountAmount.toFixed(2) : ''} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || val.endsWith('.')) {
                                                            onProductChange(index, 'finalPrice', p.originalPrice);
                                                        } else {
                                                            const disc = Math.max(0, parseFloat(val) || 0);
                                                            onProductChange(index, 'finalPrice', Math.max(0, p.originalPrice - disc));
                                                        }
                                                    }} 
                                                    placeholder="0.00"
                                                    className="w-16 bg-transparent border-none p-0 text-right font-bold text-[#F6465D] focus:ring-0 text-sm tabular-nums placeholder-[#F6465D]/30" 
                                                />
                                            </div>
                                        </div>

                                        {/* Subtotal */}
                                        <div className="col-span-2 flex flex-col items-end gap-1 pr-10">
                                            <span className={`lg:hidden text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Subtotal</span>
                                            <div className="text-right">
                                                <p className={`text-lg font-black tabular-nums tracking-tighter leading-none ${isLightMode ? 'text-slate-800' : 'text-[#FCD535]'}`}>
                                                    ${(Number(p.total) || 0).toFixed(2)}
                                                </p>
                                                <p className={`text-[9px] font-bold mt-1 uppercase ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>Net: ${(Number(p.finalPrice) || 0).toFixed(2)}</p>
                                            </div>

                                            {/* Desktop-only Delete Button (Trailing) */}
                                            <button 
                                                type="button" 
                                                onClick={() => onRemoveProduct(index)}
                                                className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#F6465D]/10 text-[#F6465D] opacity-0 group-hover:opacity-100 transition-all items-center justify-center hover:bg-[#F6465D] hover:text-white border border-[#F6465D]/20 shadow-xl"
                                                title="Remove Item"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Subtotal Indicator (Decorative) */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl pointer-events-none ${isLightMode ? 'from-blue-500/5' : 'from-[#FCD535]/5'} to-transparent`}></div>
        </div>
    );
};

export default EditProductPanel;

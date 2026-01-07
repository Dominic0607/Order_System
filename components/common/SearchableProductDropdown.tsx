
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MasterProduct } from '../../types';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import Modal from './Modal';

const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return <span>{text}</span>;
    const terms = query.split(' ').filter(Boolean).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (terms.length === 0) return <span>{text}</span>;
    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    return (
        <>
            {text.split(regex).map((part, i) =>
                regex.test(part) && part.trim() !== '' ? <strong key={i} className="text-yellow-300 bg-yellow-900/50 rounded-sm px-0.5">{part}</strong> : part
            )}
        </>
    );
};

const getRelevanceScore = (product: MasterProduct, query: string): number => {
    const pName = (product.ProductName || '').toLowerCase();
    const pBarcode = (product.Barcode || '').toLowerCase();
    const searchableText = `${pName} ${pBarcode}`;
    const q = query.toLowerCase().trim();
    if (!q) return 1;
    const queryTerms = q.split(' ').filter(Boolean);
    const allTermsMatch = queryTerms.every(term => searchableText.includes(term));
    if (!allTermsMatch) return 0;
    let score = 10;
    queryTerms.forEach(term => {
        if (pName.includes(term)) score += 20;
        if (pBarcode.includes(term)) score += 10;
    });
    if (pName.startsWith(q)) score += 500;
    return score;
};

interface SearchableProductDropdownProps {
    products: MasterProduct[];
    selectedProductName: string;
    onSelect: (productName: string) => void;
    showTagEditor?: boolean;
}

const SearchableProductDropdown: React.FC<SearchableProductDropdownProps> = ({ products, selectedProductName, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [previewProduct, setPreviewProduct] = useState<MasterProduct | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setSearchTerm(selectedProductName);
    }, [selectedProductName]);

    // Handle smooth scrolling on mobile when preview opens
    useEffect(() => {
        if (previewProduct) {
            const timer = setTimeout(() => {
                if (modalContentRef.current) {
                    modalContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [previewProduct]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(selectedProductName);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedProductName]);
    
    const filteredProducts = useMemo(() => {
        const query = searchTerm || '';
        if (!query.trim()) return [];
        return products
            .map(product => ({ product, score: getRelevanceScore(product, query) }))
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score || a.product.ProductName.localeCompare(b.product.ProductName))
            .map(p => p.product);
    }, [products, searchTerm]);
    
    const canAddNewProduct = useMemo(() => {
        const trimmedSearch = searchTerm.trim();
        if (!trimmedSearch) return false;
        return !products.some(p => p.ProductName.trim().toLowerCase() === trimmedSearch.toLowerCase());
    }, [searchTerm, products]);

    const itemsForNavigation = useMemo(() => {
        const items = [...filteredProducts];
        if (canAddNewProduct) {
            items.unshift({ isAddNew: true, ProductName: searchTerm.trim() } as any);
        }
        return items;
    }, [filteredProducts, canAddNewProduct, searchTerm]);

    const confirmSelect = useCallback((productName: string) => {
        onSelect(productName);
        setSearchTerm(productName);
        setIsOpen(false);
        setPreviewProduct(null);
        setActiveIndex(0);
        inputRef.current?.blur();
    }, [onSelect]);
    
    const handleItemClick = (item: any) => {
        if (item.isAddNew) confirmSelect(item.ProductName);
        else {
            setPreviewProduct(item);
            setIsOpen(false);
        }
    };

    const handleClear = useCallback(() => {
        onSelect('');
        setSearchTerm('');
        setIsOpen(true);
        setActiveIndex(0);
        inputRef.current?.focus();
    }, [onSelect]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const itemsCount = itemsForNavigation.length;
        if (itemsCount === 0) return;
        switch (e.key) {
            case 'ArrowDown': e.preventDefault(); if (!isOpen) setIsOpen(true); setActiveIndex(prev => (prev + 1) % itemsCount); break;
            case 'ArrowUp': e.preventDefault(); if (!isOpen) setIsOpen(true); setActiveIndex(prev => (prev - 1 + itemsCount) % itemsCount); break;
            case 'Enter': e.preventDefault(); if (!isOpen) return; if (activeIndex > -1 && itemsForNavigation[activeIndex]) handleItemClick(itemsForNavigation[activeIndex]); break;
            case 'Escape': setIsOpen(false); setSearchTerm(selectedProductName); inputRef.current?.blur(); break;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    className="form-input !pr-16 !py-3.5 bg-gray-900/50 border-gray-700 group-hover:border-blue-500/50 transition-all rounded-[1.25rem] font-bold text-gray-200"
                    placeholder="ស្វែងរកផលិតផល..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); setActiveIndex(0); }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {searchTerm && <button type="button" onClick={handleClear} className="text-gray-500 hover:text-white text-2xl">&times;</button>}
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in-down max-h-80">
                    <ul className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {itemsForNavigation.length === 0 ? (
                            <li className="p-4 text-center text-xs text-gray-500 font-black uppercase tracking-widest">រកមិនឃើញផលិតផលទេ</li>
                        ) : itemsForNavigation.map((item, index) => {
                            if ('isAddNew' in item && item.isAddNew) {
                                return (
                                    <li key="add-new" className={`p-3.5 rounded-2xl cursor-pointer flex items-center gap-4 transition-all ${activeIndex === index ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-gray-300'}`} onMouseDown={() => handleItemClick(item)}>
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" /></svg>
                                        </div>
                                        <div className="min-w-0"><p className="font-black text-sm leading-tight">បន្ថែមថ្មី៖ <span className="text-yellow-400">"{item.ProductName}"</span></p></div>
                                    </li>
                                );
                            }
                            const product = item as MasterProduct;
                            return (
                                <li key={product.ProductName} className={`p-2.5 rounded-2xl cursor-pointer flex items-center gap-3 transition-all ${activeIndex === index ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-300'}`} onMouseDown={() => handleItemClick(product)}>
                                    <img src={convertGoogleDriveUrl(product.ImageURL)} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                                    <div className="min-w-0 flex-grow">
                                        <p className="font-black text-[15px] truncate leading-tight">{highlightMatch(product.ProductName, searchTerm)}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/10">${product.Price.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {previewProduct && (
                <Modal isOpen={true} onClose={() => setPreviewProduct(null)} maxWidth={isMobile ? "max-w-[95vw]" : "max-w-2xl"}>
                    <div ref={modalContentRef} className="bg-[#0f172a] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/5 relative">
                        
                        {/* Header Image Area with Blur Background */}
                        <div className="relative h-48 sm:h-72 w-full">
                            <div className="absolute inset-0 z-0">
                                <img src={convertGoogleDriveUrl(previewProduct.ImageURL)} className="w-full h-full object-cover blur-3xl opacity-30" alt="" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center z-10 p-6">
                                <img 
                                    src={convertGoogleDriveUrl(previewProduct.ImageURL)} 
                                    className="h-full w-auto object-contain rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 transform transition-transform hover:scale-105 duration-500" 
                                    alt={previewProduct.ProductName} 
                                />
                            </div>
                            <div className="absolute top-4 right-4 z-20">
                                <div className="bg-emerald-500 text-white font-black px-4 py-2 rounded-2xl shadow-xl border-2 border-white/20 text-lg">
                                    ${previewProduct.Price.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8 bg-gradient-to-b from-transparent to-black/40">
                            <div>
                                <p className="text-blue-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] mb-3">បញ្ជាក់ការជ្រើសរើស</p>
                                <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight break-words">
                                    {previewProduct.ProductName}
                                </h3>
                                {previewProduct.Barcode && (
                                    <div className="mt-4 inline-flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        <span className="text-gray-400 font-mono text-xs tracking-widest">{previewProduct.Barcode}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons - Always visible and at the bottom */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                                <button 
                                    onClick={() => setPreviewProduct(null)} 
                                    className="order-2 sm:order-1 flex-1 py-4 sm:py-5 bg-gray-800/50 hover:bg-gray-800 text-gray-400 font-black rounded-2xl uppercase text-[11px] tracking-widest transition-all active:scale-95 border border-white/5"
                                >
                                    បោះបង់
                                </button>
                                <button 
                                    onClick={() => confirmSelect(previewProduct.ProductName)} 
                                    className="order-1 sm:order-2 flex-[2] py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    ជ្រើសរើសយក
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                            </div>
                        </div>

                        {/* Extra Visual Flair */}
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none"></div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SearchableProductDropdown;

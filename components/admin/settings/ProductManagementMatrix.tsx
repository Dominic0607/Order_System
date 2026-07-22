
import React, { useState, useContext, useMemo, useCallback, useRef } from 'react';
import { AppContext } from '../../../context/AppContext';
import { MasterProduct } from '../../../types';
import Spinner from '../../common/Spinner';
import { WEB_APP_URL } from '../../../constants';
import { convertGoogleDriveUrl } from '../../../utils/fileUtils';
import { translations } from '../../../translations';

interface ProductManagementMatrixProps {
    products: MasterProduct[];
    onRefresh: () => void;
}

type SortField = 'name' | 'barcode' | 'category' | 'price' | 'cost' | 'profit';
type SortOrder = 'asc' | 'desc';

const ProductManagementMatrix: React.FC<ProductManagementMatrixProps> = ({ products, onRefresh }) => {
    const { appData, refreshData, showNotification, language } = useContext(AppContext);
    const t = translations[language] || translations.km;
    const productCategoryOptions: string[] = useMemo(() => {
        const cats = (appData as any)?.productCategories || [];
        const fromData = cats.map((c: any) => c.CategoryName).filter(Boolean);
        // Also include categories already used on products (fallback if sheet is empty)
        const usedCats = Array.from(new Set(products.map(p => p.Category).filter(Boolean))) as string[];
        return Array.from(new Set([...fromData, ...usedCats])).sort();
    }, [appData, products]);
    
    // State management
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    
    const [updating, setUpdating] = useState<string | null>(null);
    const [editData, setEditData] = useState<Record<string, Partial<MasterProduct>>>({});
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // New product form state
    const [newProductFile, setNewProductFile] = useState<File | null>(null);
    const [newProductImagePreview, setNewProductImagePreview] = useState<string | null>(null);
    const [newCategorySearch, setNewCategorySearch] = useState('');
    const [newCategoryOpen, setNewCategoryOpen] = useState(false);
    const [editCategorySearch, setEditCategorySearch] = useState<Record<string, string>>({});
    const [editCategoryOpen, setEditCategoryOpen] = useState<Record<string, boolean>>({});
    const newCategoryRef = useRef<HTMLDivElement>(null);
    const [newProduct, setNewProduct] = useState<Partial<MasterProduct>>({
        ProductName: '',
        Barcode: '',
        Category: '',
        Price: 0,
        Cost: 0,
        Tags: '',
        ImageURL: ''
    });

    // Extract unique tags for quick filtering
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        products.forEach(p => {
            if (p.Tags) {
                p.Tags.split(/[,;\s]+/).forEach(t => {
                    const cleaned = t.trim();
                    if (cleaned) tagSet.add(cleaned);
                });
            }
        });
        return Array.from(tagSet);
    }, [products]);

    // Extract unique categories for quick filtering
    const allCategories = useMemo(() => {
        const catSet = new Set<string>();
        products.forEach(p => {
            if (p.Category?.trim()) {
                catSet.add(p.Category.trim());
            }
        });
        return Array.from(catSet);
    }, [products]);

    // Handle barcode copy to clipboard
    const handleCopyBarcode = (barcode: string) => {
        if (!barcode) return;
        navigator.clipboard.writeText(barcode);
        setCopiedBarcode(barcode);
        showNotification?.(`បានចម្លង Barcode: ${barcode}`, 'info');
        setTimeout(() => setCopiedBarcode(null), 2000);
    };

    // Add new product handler
    const handleAddNewProduct = async () => {
        if (!newProduct.ProductName?.trim()) {
            showNotification?.('សូមបញ្ចូលឈ្មោះផលិតផល', 'error');
            return;
        }

        setIsAddingNew(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${WEB_APP_URL}/api/admin/add-row`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sheetName: 'Products',
                    newData: newProduct
                })
            });

            const result = await res.json();
            if (res.ok && result.status === 'success') {
                if (newProductFile) {
                    try {
                        showNotification?.('កំពុងបញ្ជូនរូបភាព...', 'info');
                        const reader = new FileReader();
                        const uploadPromise = new Promise<void>((resolve, reject) => {
                            reader.onload = async () => {
                                try {
                                    const base64Data = (reader.result as string).split(',')[1];
                                    const uploadRes = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                            fileData: base64Data,
                                            fileName: `Product_${newProduct.ProductName}_${Date.now()}.webp`,
                                            mimeType: newProductFile.type || 'image/webp',
                                            sheetName: 'Products',
                                            primaryKey: { ProductName: newProduct.ProductName },
                                            targetColumn: 'ImageURL'
                                        })
                                    });
                                    if (uploadRes.ok) resolve(); else reject(new Error('Image upload failed'));
                                } catch (e) { reject(e); }
                            };
                            reader.onerror = () => reject(new Error('File read error'));
                            reader.readAsDataURL(newProductFile);
                        });
                        await uploadPromise;
                    } catch (e: any) {
                        showNotification?.(`បានបន្ថែមផលិតផល តែជួបបញ្ហាក្នុងការ Upload រូបភាព: ${e.message}`, 'warning');
                    }
                }

                showNotification?.('បន្ថែមផលិតផលថ្មីជោគជ័យ', 'success');
                setNewProduct({
                    ProductName: '',
                    Barcode: '',
                    Category: '',
                    Price: 0,
                    Cost: 0,
                    Tags: '',
                    ImageURL: ''
                });
                setNewProductFile(null);
                setNewProductImagePreview(null);
                await refreshData();
                onRefresh();
            } else {
                throw new Error(result.message || 'Add failed');
            }
        } catch (err: any) {
            showNotification?.(err.message || 'Error adding product', 'error');
        } finally {
            setIsAddingNew(false);
        }
    };

    // Filter and Sort logic
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // 1. Search Query Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.ProductName.toLowerCase().includes(q) ||
                (p.Barcode || '').toLowerCase().includes(q) ||
                (p.Category || '').toLowerCase().includes(q) ||
                (p.Tags || '').toLowerCase().includes(q)
            );
        }

        // 2. Category Filter
        if (selectedCategory) {
            result = result.filter(p => p.Category && p.Category.toLowerCase().trim() === selectedCategory.toLowerCase().trim());
        }

        // 3. Tag Filter
        if (selectedTag) {
            result = result.filter(p => p.Tags && p.Tags.toLowerCase().includes(selectedTag.toLowerCase()));
        }

        // 4. Sorting
        if (sortField) {
            result.sort((a, b) => {
                const getVal = (prod: MasterProduct, field: SortField) => {
                    const changes = editData[prod.ProductName] || {};
                    switch (field) {
                        case 'name': return (changes.ProductName ?? prod.ProductName).toLowerCase();
                        case 'barcode': return (changes.Barcode ?? prod.Barcode ?? '').toLowerCase();
                        case 'category': return (changes.Category ?? prod.Category ?? '').toLowerCase();
                        case 'price': return Number(changes.Price ?? prod.Price ?? 0);
                        case 'cost': return Number(changes.Cost ?? prod.Cost ?? 0);
                        case 'profit': {
                            const p = Number(changes.Price ?? prod.Price ?? 0);
                            const c = Number(changes.Cost ?? prod.Cost ?? 0);
                            return p - c;
                        }
                        default: return 0;
                    }
                };

                const valA = getVal(a, sortField);
                const valB = getVal(b, sortField);

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [products, searchQuery, selectedCategory, selectedTag, sortField, sortOrder, editData]);

    // Header Sort Toggle
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortOrder === 'asc') setSortOrder('desc');
            else setSortField(null); // Reset sort
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleFieldChange = (productName: string, field: keyof MasterProduct, value: any) => {
        setEditData(prev => ({
            ...prev,
            [productName]: {
                ...(prev[productName] || {}),
                [field]: value
            }
        }));
    };

    const handleResetRow = (productName: string) => {
        setEditData(prev => {
            const next = { ...prev };
            delete next[productName];
            return next;
        });
    };

    const handleSaveRow = async (product: MasterProduct, specificChanges?: Partial<MasterProduct>) => {
        const changes = specificChanges || editData[product.ProductName];
        if (!changes || Object.keys(changes).length === 0) return;

        setUpdating(product.ProductName);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sheetName: 'Products',
                    primaryKey: { ProductName: product.ProductName },
                    newData: changes
                })
            });

            const result = await res.json();
            if (res.ok && result.status === 'success') {
                showNotification?.(`${t.save_success || 'បានរក្សាទុក'}: ${product.ProductName}`, 'success');
                if (!specificChanges) {
                    handleResetRow(product.ProductName);
                }
                await refreshData();
                onRefresh();
            } else {
                throw new Error(result.message || t.no_data);
            }
        } catch (err: any) {
            showNotification?.(err.message || 'Error', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const handleImageUpload = async (product: MasterProduct, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUpdating(product.ProductName);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const token = localStorage.getItem('token');

                const res = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        fileData: base64Data,
                        fileName: `Product_${product.ProductName}_${Date.now()}.webp`,
                        mimeType: 'image/webp',
                        sheetName: 'Products',
                        primaryKey: { ProductName: product.ProductName },
                        targetColumn: 'ImageURL'
                    })
                });

                const result = await res.json();
                if (res.ok && result.status === 'success') {
                    showNotification?.(t.upload_success || 'Upload រូបភាពជោគជ័យ', 'success');
                    await refreshData();
                    onRefresh();
                } else {
                    throw new Error(result.message || 'Upload failed');
                }
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            showNotification?.(err.message || 'Error', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteProduct = async (product: MasterProduct) => {
        if (!window.confirm(`${t.confirm_delete || 'តើអ្នកពិតជាចង់លុប'} "${product.ProductName}"?`)) return;

        setUpdating(product.ProductName);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${WEB_APP_URL}/api/admin/delete-row`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sheetName: 'Products',
                    primaryKey: { ProductName: product.ProductName }
                })
            });

            const result = await res.json();
            if (res.ok && result.status === 'success') {
                showNotification?.(t.delete_success || 'លុបជោគជ័យ', 'success');
                await refreshData();
                onRefresh();
            } else {
                throw new Error(result.message || 'Delete failed');
            }
        } catch (err: any) {
            showNotification?.(err.message || 'Error', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const handleSaveAll = async () => {
        const changedProducts = Object.keys(editData);
        if (changedProducts.length === 0) return;

        setIsSavingAll(true);
        let successCount = 0;
        let failCount = 0;

        for (const name of changedProducts) {
            const product = products.find(p => p.ProductName === name);
            if (!product) continue;

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sheetName: 'Products',
                        primaryKey: { ProductName: name },
                        newData: editData[name]
                    })
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch {
                failCount++;
            }
        }

        if (successCount > 0) {
            showNotification?.(`${t.save_success || 'រក្សាទុកជោគជ័យ'}: ${successCount}`, 'success');
            setEditData({});
            await refreshData();
            onRefresh();
        }
        if (failCount > 0) {
            showNotification?.(`បរាជ័យ: ${failCount}`, 'error');
        }
        setIsSavingAll(false);
    };

    // Calculate profit and margin
    const renderProfitMargin = (price: number, cost: number) => {
        if (!price && !cost) return null;
        const profit = price - cost;
        const margin = price > 0 ? (profit / price) * 100 : 0;
        const isPositive = profit >= 0;

        return (
            <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                <span className={`font-semibold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {isPositive ? '+' : ''}${profit.toFixed(2)}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    margin >= 30 ? 'bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30' :
                    margin > 0 ? 'bg-[#fcd535]/15 text-[#fcd535] border border-[#fcd535]/30' :
                    'bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30'
                }`}>
                    {margin.toFixed(1)}%
                </span>
            </div>
        );
    };

    const newProductPrice = newProduct.Price || 0;
    const newProductCost = newProduct.Cost || 0;

    return (
        <div className="flex flex-col h-full gap-3 font-sans text-[#eaecef]">
            {/* Top Toolbar & Filter Bar */}
            <div className="bg-[#1e2329] border border-[#2b3139] rounded-lg p-3.5 shadow-md flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-grow max-w-lg">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#848e9c]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder={`${t.search || 'ស្វែងរក...'} (Name, Barcode, Tags)`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md py-2 pl-10 pr-9 text-sm text-[#eaecef] focus:border-[#fcd535] focus:ring-1 focus:ring-[#fcd535] outline-none transition-all placeholder:text-[#5e6673]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c] hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
                        {/* Total Count Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b0e11] border border-[#2b3139] rounded-md text-xs font-semibold text-[#848e9c]">
                            <span>សរុប:</span>
                            <span className="text-[#fcd535] font-bold">{filteredProducts.length}</span>
                            {products.length !== filteredProducts.length && (
                                <span className="text-[10px] text-[#5e6673]">({products.length})</span>
                            )}
                        </div>

                        {/* Unsaved Changes Indicator & Bulk Save */}
                        {Object.keys(editData).length > 0 && (
                            <button
                                onClick={handleSaveAll}
                                disabled={isSavingAll}
                                className="flex items-center gap-2 px-4 py-1.5 bg-[#fcd535] text-black text-xs font-extrabold uppercase rounded-md hover:bg-[#f0c832] active:scale-95 transition-all shadow-md shadow-[#fcd535]/10 disabled:opacity-50 animate-pulse"
                            >
                                {isSavingAll ? <Spinner size="xs" /> : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                )}
                                {t.save_all || 'រក្សាទុកទាំងអស់'} ({Object.keys(editData).length})
                            </button>
                        )}

                        {/* Refresh Button */}
                        <button
                            onClick={onRefresh}
                            className="p-2 bg-[#2b3139] text-[#848e9c] rounded-md hover:text-white hover:bg-[#3d4451] active:scale-95 transition-all border border-[#3d4451]"
                            title={t.refresh_data || 'ទាញយកទិន្នន័យឡើងវិញ'}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Category Quick Filters */}
                {allCategories.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                        <span className="text-[11px] font-bold text-[#5e6673] uppercase tracking-wider whitespace-nowrap mr-1">ប្រភេទ:</span>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                selectedCategory === null
                                    ? 'bg-[#0ecb81] text-black shadow-sm font-bold'
                                    : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b3139] hover:text-white hover:border-[#3d4451]'
                            }`}
                        >
                            ទាំងអស់ ({products.length})
                        </button>
                        {allCategories.map(cat => {
                            const isSelected = selectedCategory === cat;
                            const count = products.filter(p => p.Category && p.Category.toLowerCase().trim() === cat.toLowerCase().trim()).length;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(isSelected ? null : cat)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                        isSelected
                                            ? 'bg-[#0ecb81] text-black shadow-sm font-bold'
                                            : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b3139] hover:text-white hover:border-[#3d4451]'
                                    }`}
                                >
                                    {cat} <span className="opacity-60 text-[10px]">({count})</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Tag Quick Filters */}
                {allTags.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin border-t border-[#2b3139]/40 mt-1">
                        <span className="text-[11px] font-bold text-[#5e6673] uppercase tracking-wider whitespace-nowrap mr-1">Tags:</span>
                        <button
                            onClick={() => setSelectedTag(null)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                selectedTag === null
                                    ? 'bg-[#fcd535] text-black shadow-sm font-bold'
                                    : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b3139] hover:text-white hover:border-[#3d4451]'
                            }`}
                        >
                            ទាំងអស់ ({products.length})
                        </button>
                        {allTags.map(tag => {
                            const isSelected = selectedTag === tag;
                            const count = products.filter(p => p.Tags && p.Tags.toLowerCase().includes(tag.toLowerCase())).length;
                            return (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                        isSelected
                                            ? 'bg-[#fcd535] text-black shadow-sm font-bold'
                                            : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b3139] hover:text-white hover:border-[#3d4451]'
                                    }`}
                                >
                                    #{tag} <span className="opacity-60 text-[10px]">({count})</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Matrix Table Container */}
            <div className="flex-grow overflow-auto border border-[#2b3139] bg-[#0b0e11] rounded-lg relative shadow-inner">
                <table className="w-full border-collapse text-left">
                    {/* Header */}
                    <thead className="sticky top-0 z-20 bg-[#181a20] shadow-md">
                        <tr className="border-b border-[#2b3139]">
                            <th className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-10 text-center">#</th>
                            <th className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-14 text-center">{t.product_image || 'រូបភាព'}</th>
                            
                            {/* Sortable Name */}
                            <th 
                                onClick={() => handleSort('name')} 
                                className="px-4 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-1">
                                    <span>{t.product_name || 'ឈ្មោះផលិតផល'}</span>
                                    {sortField === 'name' && (
                                        <span className="text-[#fcd535]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </div>
                            </th>

                            {/* Sortable Barcode */}
                            <th 
                                onClick={() => handleSort('barcode')}
                                className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-40 cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-1">
                                    <span>{t.field_Barcode || 'BARCODE'}</span>
                                    {sortField === 'barcode' && (
                                        <span className="text-[#fcd535]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </div>
                            </th>

                            {/* Sortable Category */}
                            <th 
                                onClick={() => handleSort('category')}
                                className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-36 cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-1">
                                    <span>{t.field_Category || 'ប្រភេទ (CATEGORY)'}</span>
                                    {sortField === 'category' && (
                                        <span className="text-[#fcd535]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </div>
                            </th>

                            {/* Sortable Price */}
                            <th 
                                onClick={() => handleSort('price')}
                                className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-32 cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-1">
                                    <span>{t.field_Price || 'តម្លៃ ($)'}</span>
                                    {sortField === 'price' && (
                                        <span className="text-[#0ecb81]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </div>
                            </th>

                            {/* Sortable Cost */}
                            <th 
                                onClick={() => handleSort('cost')}
                                className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-32 cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-1">
                                    <span>{t.field_Cost || 'តម្លៃដើម ($)'}</span>
                                    {sortField === 'cost' && (
                                        <span className="text-[#f6465d]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </div>
                            </th>

                            {/* Tags */}
                            <th className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-36">{t.tags || 'TAGS'}</th>

                            {/* Actions */}
                            <th className="px-3 py-3 text-[10px] font-bold text-[#848e9c] uppercase tracking-wider w-24 text-center">{t.actions || 'សកម្មភាព'}</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[#2b3139]/60">
                        {/* Inline Add Row */}
                        <tr className="bg-[#fcd535]/5 border-b-2 border-[#fcd535]/30">
                            <td className="px-3 py-3 text-center text-[#fcd535] font-black text-sm">+</td>
                            
                            {/* Add Image Upload Box */}
                            <td className="px-3 py-3">
                                <div className="relative group/newimg w-11 h-11 bg-[#181a20] rounded-md border border-dashed border-[#fcd535]/50 flex items-center justify-center text-[#fcd535]/60 transition-all overflow-hidden shadow-inner">
                                    {(newProductImagePreview || newProduct.ImageURL) ? (
                                        <img 
                                            src={newProductImagePreview || convertGoogleDriveUrl(newProduct.ImageURL!)} 
                                            className="w-full h-full object-cover rounded-md cursor-pointer" 
                                            alt=""
                                            onClick={() => setLightboxImage(newProductImagePreview || convertGoogleDriveUrl(newProduct.ImageURL!))}
                                        />
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                                        </svg>
                                    )}
                                    
                                    {/* Actions Overlay */}
                                    <div className="absolute inset-0 bg-black/75 flex items-center justify-center gap-1.5 opacity-0 group-hover/newimg:opacity-100 transition-opacity">
                                        <button 
                                            className="p-1.5 hover:text-[#fcd535] text-white transition-colors bg-[#2b3139]/80 rounded"
                                            title="Upload File"
                                            onClick={() => document.getElementById('new-product-upload')?.click()}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                            </svg>
                                        </button>
                                        <button 
                                            className="p-1.5 hover:text-[#fcd535] text-white transition-colors bg-[#2b3139]/80 rounded"
                                            title="Set Image URL"
                                            onClick={() => {
                                                const url = window.prompt("Enter Image URL", newProduct.ImageURL || "");
                                                if (url !== null) {
                                                    setNewProduct(prev => ({ ...prev, ImageURL: url.trim() }));
                                                    setNewProductImagePreview(null);
                                                    setNewProductFile(null);
                                                }
                                            }}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                        </button>
                                    </div>
                                    <input 
                                        type="file" 
                                        id="new-product-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setNewProductFile(file);
                                            setNewProduct(prev => ({ ...prev, ImageURL: '' }));
                                            const url = URL.createObjectURL(file);
                                            setNewProductImagePreview(url);
                                        }}
                                    />
                                </div>
                            </td>

                            {/* New Product Name */}
                            <td className="px-4 py-3">
                                <input
                                    type="text"
                                    placeholder={t.product_name || 'ឈ្មោះផលិតផលថ្មី...'}
                                    value={newProduct.ProductName}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, ProductName: e.target.value }))}
                                    className="w-full bg-[#0b0e11] border border-[#fcd535]/40 rounded-md px-3 py-1.5 text-sm font-bold text-white focus:border-[#fcd535] focus:ring-1 focus:ring-[#fcd535] outline-none transition-all placeholder:text-[#5e6673]"
                                />
                            </td>

                            {/* New Barcode */}
                            <td className="px-3 py-3">
                                <input
                                    type="text"
                                    placeholder={t.field_Barcode || 'Barcode'}
                                    value={newProduct.Barcode}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, Barcode: e.target.value }))}
                                    className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#fcd535] focus:border-[#fcd535] outline-none transition-all placeholder:text-[#5e6673]"
                                />
                            </td>

                            {/* New Category - Searchable Dropdown */}
                            <td className="px-3 py-3">
                                <div className="relative" ref={newCategoryRef}>
                                    <input
                                        type="text"
                                        placeholder={t.field_Category || 'ប្រភេទ...'}
                                        value={newCategoryOpen ? newCategorySearch : (newProduct.Category || '')}
                                        onFocus={() => { setNewCategoryOpen(true); setNewCategorySearch(newProduct.Category || ''); }}
                                        onBlur={() => setTimeout(() => setNewCategoryOpen(false), 150)}
                                        onChange={(e) => { setNewCategorySearch(e.target.value); setNewProduct(prev => ({ ...prev, Category: e.target.value })); }}
                                        className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1.5 pr-7 text-xs text-[#eaecef] focus:border-[#fcd535] outline-none transition-all placeholder:text-[#5e6673]"
                                    />
                                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#5e6673] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    {newCategoryOpen && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1e2329] border border-[#2b3139] rounded-md shadow-2xl max-h-48 overflow-y-auto">
                                            {productCategoryOptions
                                                .filter(c => c.toLowerCase().includes(newCategorySearch.toLowerCase()))
                                                .map(cat => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onMouseDown={() => { setNewProduct(prev => ({ ...prev, Category: cat })); setNewCategorySearch(cat); setNewCategoryOpen(false); }}
                                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#2b3139] transition-colors ${ newProduct.Category === cat ? 'text-[#fcd535] font-bold' : 'text-[#eaecef]' }`}
                                                    >{cat}</button>
                                                ))
                                            }
                                            {productCategoryOptions.filter(c => c.toLowerCase().includes(newCategorySearch.toLowerCase())).length === 0 && newCategorySearch && (
                                                <div className="px-3 py-2 text-xs text-[#848e9c] italic">មិនមានប្រភេទ — នឹងបង្កើតថ្មី</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* New Price */}
                            <td className="px-3 py-3">
                                <div className="flex items-center bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1.5 focus-within:border-[#0ecb81] transition-all">
                                    <span className="text-[#5e6673] text-xs font-extrabold mr-1.5 select-none">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={newProduct.Price || ''}
                                        onChange={(e) => setNewProduct(prev => ({ ...prev, Price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-transparent text-xs font-extrabold text-[#0ecb81] outline-none border-none p-0 focus:ring-0"
                                    />
                                </div>
                            </td>

                            {/* New Cost */}
                            <td className="px-3 py-3">
                                <div className="flex items-center bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1.5 focus-within:border-[#f6465d] transition-all">
                                    <span className="text-[#5e6673] text-xs font-extrabold mr-1.5 select-none">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={newProduct.Cost || ''}
                                        onChange={(e) => setNewProduct(prev => ({ ...prev, Cost: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-transparent text-xs font-extrabold text-[#f6465d] outline-none border-none p-0 focus:ring-0"
                                    />
                                </div>
                                {renderProfitMargin(newProductPrice, newProductCost)}
                            </td>

                            {/* New Tags */}
                            <td className="px-3 py-3">
                                <input
                                    type="text"
                                    placeholder="tag1, tag2..."
                                    value={newProduct.Tags}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, Tags: e.target.value }))}
                                    className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1.5 text-xs text-[#848e9c] focus:border-[#fcd535] outline-none transition-all placeholder:text-[#5e6673]"
                                />
                            </td>

                            {/* Add Button */}
                            <td className="px-3 py-3 text-center">
                                <button
                                    onClick={handleAddNewProduct}
                                    disabled={isAddingNew || !newProduct.ProductName?.trim()}
                                    className="w-full py-1.5 px-3 bg-[#fcd535] text-black text-[11px] font-black uppercase rounded-md hover:bg-[#f0c832] active:scale-95 transition-all shadow-sm disabled:opacity-40"
                                >
                                    {isAddingNew ? <Spinner size="xs" /> : (t.add_new || 'បន្ថែម')}
                                </button>
                            </td>
                        </tr>

                        {/* Product Rows */}
                        {filteredProducts.map((product, idx) => {
                            const isUpdating = updating === product.ProductName;
                            const changes = editData[product.ProductName] || {};
                            const hasChanges = Object.keys(changes).length > 0;

                            const currentName = changes.ProductName !== undefined ? changes.ProductName : product.ProductName;
                            const currentBarcode = changes.Barcode !== undefined ? changes.Barcode : product.Barcode;
                            const currentCategory = changes.Category !== undefined ? changes.Category : (product.Category || '');
                            const currentPrice = changes.Price !== undefined ? changes.Price : (product.Price || 0);
                            const currentCost = changes.Cost !== undefined ? changes.Cost : (product.Cost || 0);
                            const currentTags = changes.Tags !== undefined ? changes.Tags : (product.Tags || '');
                            const currentImg = changes.ImageURL !== undefined ? changes.ImageURL : product.ImageURL;

                            const formattedImgUrl = currentImg ? convertGoogleDriveUrl(currentImg) : null;
                            const tagList = currentTags.split(/[,;\s]+/).map(t => t.trim()).filter(Boolean);

                            return (
                                <tr 
                                    key={product.ProductName} 
                                    className={`hover:bg-[#1e2329]/70 transition-colors group ${
                                        hasChanges ? 'bg-[#fcd535]/10 border-l-4 border-l-[#fcd535]' : ''
                                    }`}
                                >
                                    {/* Index */}
                                    <td className="px-3 py-3 text-xs font-bold text-[#5e6673] text-center">{idx + 1}</td>

                                    {/* Image Thumbnail */}
                                    <td className="px-3 py-3">
                                        <div className="relative group/img w-11 h-11 bg-[#181a20] rounded-md border border-[#2b3139] overflow-hidden shadow-inner flex items-center justify-center">
                                            {formattedImgUrl ? (
                                                <img 
                                                    src={formattedImgUrl} 
                                                    alt={product.ProductName} 
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={() => setLightboxImage(formattedImgUrl)}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#1e2329] to-[#0b0e11] flex flex-col items-center justify-center text-[#3d4451]">
                                                    <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Hover Upload Overlay */}
                                            <div className="absolute inset-0 bg-black/75 flex items-center justify-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                <button 
                                                    className="p-1 hover:text-[#fcd535] text-white transition-colors bg-[#2b3139]/80 rounded"
                                                    title="Upload File"
                                                    onClick={() => document.getElementById(`upload-${product.ProductName}`)?.click()}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                                    </svg>
                                                </button>
                                                <button 
                                                    className="p-1 hover:text-[#fcd535] text-white transition-colors bg-[#2b3139]/80 rounded"
                                                    title="Set Image URL"
                                                    onClick={() => {
                                                        const url = window.prompt("Enter Image URL", currentImg || "");
                                                        if (url !== null) {
                                                            handleFieldChange(product.ProductName, 'ImageURL', url.trim());
                                                        }
                                                    }}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <input 
                                                type="file" 
                                                id={`upload-${product.ProductName}`} 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(product, e)}
                                            />
                                        </div>
                                    </td>

                                    {/* Product Name (Editable Input) */}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <input
                                                type="text"
                                                value={currentName}
                                                onChange={(e) => handleFieldChange(product.ProductName, 'ProductName', e.target.value)}
                                                className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1 text-xs font-bold text-[#eaecef] focus:border-[#fcd535] outline-none transition-all"
                                            />
                                            {tagList.length > 0 && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {tagList.map((tag, tIdx) => (
                                                        <span key={tIdx} className="px-1.5 py-0.2 text-[9px] bg-[#2b3139] text-[#848e9c] rounded font-medium">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Barcode with Copy Action */}
                                    <td className="px-3 py-3">
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                value={currentBarcode || ''}
                                                onChange={(e) => handleFieldChange(product.ProductName, 'Barcode', e.target.value)}
                                                className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md pl-2.5 pr-7 py-1 text-xs font-mono text-[#fcd535] focus:border-[#fcd535] outline-none transition-all"
                                            />
                                            {currentBarcode && (
                                                <button
                                                    onClick={() => handleCopyBarcode(currentBarcode)}
                                                    className="absolute right-1.5 text-[#5e6673] hover:text-[#fcd535] p-1 transition-colors"
                                                    title="Copy Barcode"
                                                >
                                                    {copiedBarcode === currentBarcode ? (
                                                        <svg className="w-3.5 h-3.5 text-[#0ecb81]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* Category Searchable Dropdown */}
                                    <td className="px-3 py-3">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={editCategoryOpen[product.ProductName] ? (editCategorySearch[product.ProductName] ?? currentCategory) : currentCategory}
                                                onFocus={() => { setEditCategoryOpen(prev => ({ ...prev, [product.ProductName]: true })); setEditCategorySearch(prev => ({ ...prev, [product.ProductName]: currentCategory })); }}
                                                onBlur={() => setTimeout(() => setEditCategoryOpen(prev => ({ ...prev, [product.ProductName]: false })), 150)}
                                                onChange={(e) => { setEditCategorySearch(prev => ({ ...prev, [product.ProductName]: e.target.value })); handleFieldChange(product.ProductName, 'Category', e.target.value); }}
                                                placeholder="ប្រភេទ..."
                                                className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1 pr-7 text-xs text-[#eaecef] focus:border-[#fcd535] outline-none transition-all"
                                            />
                                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#5e6673] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            {editCategoryOpen[product.ProductName] && (
                                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1e2329] border border-[#2b3139] rounded-md shadow-2xl max-h-48 overflow-y-auto">
                                                    {productCategoryOptions
                                                        .filter(c => c.toLowerCase().includes((editCategorySearch[product.ProductName] || '').toLowerCase()))
                                                        .map(cat => (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onMouseDown={() => { handleFieldChange(product.ProductName, 'Category', cat); setEditCategorySearch(prev => ({ ...prev, [product.ProductName]: cat })); setEditCategoryOpen(prev => ({ ...prev, [product.ProductName]: false })); }}
                                                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#2b3139] transition-colors ${ currentCategory === cat ? 'text-[#fcd535] font-bold' : 'text-[#eaecef]' }`}
                                                            >{cat}</button>
                                                        ))
                                                    }
                                                    {productCategoryOptions.filter(c => c.toLowerCase().includes((editCategorySearch[product.ProductName] || '').toLowerCase())).length === 0 && editCategorySearch[product.ProductName] && (
                                                        <div className="px-3 py-2 text-xs text-[#848e9c] italic">មិនមានប្រភេទ — នឹងរក្សាទុកជាប្រភេទថ្មី</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Price Input (Flex Alignment) */}
                                    <td className="px-3 py-3">
                                        <div className="flex items-center bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1 focus-within:border-[#0ecb81] transition-all">
                                            <span className="text-[#5e6673] text-xs font-extrabold mr-1.5 select-none">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={currentPrice}
                                                onChange={(e) => handleFieldChange(product.ProductName, 'Price', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-transparent text-xs font-extrabold text-[#0ecb81] outline-none border-none p-0 focus:ring-0"
                                            />
                                        </div>
                                    </td>

                                    {/* Cost Input & Profit Badge (Flex Alignment) */}
                                    <td className="px-3 py-3">
                                        <div className="flex items-center bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1 focus-within:border-[#f6465d] transition-all">
                                            <span className="text-[#5e6673] text-xs font-extrabold mr-1.5 select-none">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={currentCost}
                                                onChange={(e) => handleFieldChange(product.ProductName, 'Cost', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-transparent text-xs font-extrabold text-[#f6465d] outline-none border-none p-0 focus:ring-0"
                                            />
                                        </div>
                                        {renderProfitMargin(currentPrice, currentCost)}
                                    </td>

                                    {/* Tags Input */}
                                    <td className="px-3 py-3">
                                        <input
                                            type="text"
                                            value={currentTags}
                                            onChange={(e) => handleFieldChange(product.ProductName, 'Tags', e.target.value)}
                                            placeholder="tag1, tag2..."
                                            className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-md px-2.5 py-1 text-xs text-[#848e9c] focus:border-[#fcd535] outline-none transition-all"
                                        />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {hasChanges ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSaveRow(product)}
                                                        disabled={isUpdating}
                                                        className="p-1.5 bg-[#0ecb81]/20 text-[#0ecb81] border border-[#0ecb81]/40 rounded-md hover:bg-[#0ecb81] hover:text-white transition-all shadow-sm"
                                                        title="Save changes"
                                                    >
                                                        {isUpdating ? <Spinner size="xs" /> : (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetRow(product.ProductName)}
                                                        disabled={isUpdating}
                                                        className="p-1.5 bg-[#2b3139] text-[#848e9c] rounded-md hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                                                        title="Discard changes"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteProduct(product)}
                                                    disabled={isUpdating}
                                                    className="p-1.5 text-[#5e6673] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete product"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Empty State */}
                {filteredProducts.length === 0 && (
                    <div className="py-16 text-center text-[#5e6673] flex flex-col items-center justify-center gap-2">
                        <svg className="w-12 h-12 text-[#2b3139]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="font-bold text-sm">រកមិនឃើញផលិតផលដែលអ្នកស្វែងរកទេ</p>
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
                                className="text-xs text-[#fcd535] hover:underline mt-1"
                            >
                                លុបការស្វែងរក
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-2xl max-h-[85vh] bg-[#1e2329] p-2 rounded-xl border border-[#2b3139] shadow-2xl overflow-hidden">
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white hover:bg-black/90 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img 
                            src={lightboxImage} 
                            alt="Preview" 
                            className="w-full h-full max-h-[80vh] object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagementMatrix;


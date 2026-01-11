
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { MasterProduct } from '../../types';
import { convertGoogleDriveUrl, fileToBase64 } from '../../utils/fileUtils';
import { compressImage } from '../../utils/imageCompressor';
import Modal from '../common/Modal';
import { AppContext } from '../../context/AppContext';
import { WEB_APP_URL } from '../../constants';
import Spinner from '../common/Spinner';

interface ProductSelectionConfirmProps {
    product: MasterProduct | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (productName: string, tags: string) => void;
    showTagEditor?: boolean;
}

const ProductSelectionConfirm: React.FC<ProductSelectionConfirmProps> = ({
    product,
    isOpen,
    onClose,
    onConfirm,
    showTagEditor = true
}) => {
    const { refreshData } = useContext(AppContext);
    const [localTags, setLocalTags] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [isSavingTags, setIsSavingTags] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (product && isOpen) {
            setLocalTags(product.Tags || '');
            setPreviewUrl(product.ImageURL);
            setUploadSuccess(false);
        }
    }, [product, isOpen]);

    const hasRealImage = useMemo(() => {
        if (!product) return false;
        const currentImg = previewUrl || product.ImageURL;
        return currentImg && !currentImg.includes('placehold.co') && !currentImg.includes('text=N/A');
    }, [product, previewUrl]);

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = localTags.trim();
            if (val && !val.endsWith(',')) {
                setLocalTags(val + ', ');
            }
        }
    };

    const handleFinalConfirm = async () => {
        if (!product) return;
        setIsSavingTags(true);
        try {
            const cleanedTags = localTags.split(',').map(t => t.trim()).filter(t => t !== '').join(', ');
            if (cleanedTags !== (product.Tags || '')) {
                const response = await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sheetName: 'Products',
                        primaryKey: { 'ProductName': product.ProductName },
                        newData: { 'Tags': cleanedTags }
                    })
                });
                if (!response.ok) throw new Error('Failed to update product tags');
                await refreshData();
                onConfirm(product.ProductName, cleanedTags);
            } else {
                onConfirm(product.ProductName, cleanedTags);
            }
        } catch (err: any) {
            console.error(err);
            alert(`Save failed: ${err.message}`);
            onConfirm(product.ProductName, localTags);
        } finally {
            setIsSavingTags(false);
        }
    };

    const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !product) return;
        setIsUploading(true);
        setUploadSuccess(false);
        try {
            const compressedBlob = await compressImage(file, 0.7, 1024);
            const base64Data = await fileToBase64(compressedBlob);
            const uploadRes = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileData: base64Data, fileName: file.name, mimeType: compressedBlob.type })
            });
            const result = await uploadRes.json();
            if (!uploadRes.ok || result.status !== 'success') throw new Error(result.message);
            const newImageUrl = result.url;
            
            await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetName: 'Products',
                    primaryKey: { 'ProductName': product.ProductName },
                    newData: { 'ImageURL': newImageUrl }
                })
            });
            
            setPreviewUrl(newImageUrl);
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 2500);
            await refreshData();
        } catch (err: any) {
            alert(`Update Error: ${err.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth={isMobile ? "max-w-[95vw]" : "max-w-4xl"}>
            {/* 
                LAYOUT STRATEGY:
                Desktop: Horizontal Split (Left Image, Right Details). Fixed Height (500px).
                Mobile: Vertical Stack (Top Image, Bottom Details). Viewport Height (85vh).
            */}
            <div className={`
                bg-[#09090b] border border-white/10 overflow-hidden relative flex flex-col
                ${isMobile ? 'h-[85vh] rounded-[2rem]' : 'h-[500px] rounded-[2rem] md:flex-row'}
                shadow-2xl transition-all duration-300
            `}>
                
                {/* === LEFT SIDE (Image) === */}
                <div className={`
                    relative group flex items-center justify-center bg-black/20
                    ${isMobile ? 'h-[40%] w-full border-b border-white/5' : 'w-[40%] h-full border-r border-white/5'}
                `}>
                    <div 
                        className="relative w-full h-full flex items-center justify-center cursor-pointer p-6"
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                        {hasRealImage ? (
                            <>
                                <img 
                                    src={convertGoogleDriveUrl(previewUrl || product.ImageURL)} 
                                    className={`
                                        w-full h-full object-contain relative z-10 transition-all duration-500 rounded-xl
                                        ${isUploading ? 'opacity-30 grayscale blur-sm' : 'group-hover:scale-105'}
                                    `} 
                                    alt={product.ProductName} 
                                />
                                {/* Edit Overlay Hint */}
                                {!isUploading && !uploadSuccess && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px] z-20">
                                        <div className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-2">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 text-gray-600 group-hover:text-blue-400 transition-colors">
                                <div className="p-4 rounded-full border-2 border-dashed border-gray-700 group-hover:border-blue-500/50 transition-all">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Upload Image</span>
                            </div>
                        )}

                        {/* Loading State */}
                        {isUploading && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
                                <Spinner size="md" />
                                <span className="text-[9px] font-bold text-gray-400 mt-2 uppercase tracking-wider">Uploading...</span>
                            </div>
                        )}

                        {/* Success State */}
                        {uploadSuccess && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg mb-2 animate-scale-in">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Success</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* === RIGHT SIDE (Content) === */}
                <div className={`
                    flex flex-col p-6 md:p-10 relative
                    ${isMobile ? 'h-[60%] justify-between' : 'w-[60%] h-full justify-center gap-8'}
                `}>
                    <div className="space-y-4">
                        {/* Meta Badge */}
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-gray-400 border border-white/5">
                                #{product.Barcode || 'NO-CODE'}
                            </span>
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">
                                ${product.Price.toFixed(2)}
                            </span>
                        </div>

                        {/* Title */}
                        <h2 className={`font-black text-white leading-tight ${isMobile ? 'text-2xl line-clamp-2' : 'text-4xl line-clamp-3'}`}>
                            {product.ProductName}
                        </h2>

                        {/* Tag Input */}
                        {showTagEditor && (
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Operational Tags</label>
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        value={localTags} 
                                        onChange={e => setLocalTags(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        className="w-full bg-transparent border-b border-gray-700 py-2 text-sm font-medium text-gray-200 focus:border-blue-500 outline-none transition-colors placeholder:text-gray-700"
                                        placeholder="Add tags..."
                                    />
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-600 opacity-0 group-focus-within:opacity-100 transition-opacity">ENTER</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-4 rounded-xl border border-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider hover:bg-white/5 hover:text-white transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleFinalConfirm} 
                            disabled={isSavingTags}
                            className="flex-1 px-6 py-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingTags ? <Spinner size="sm" /> : 'Confirm Selection'}
                            {!isSavingTags && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </button>
                    </div>
                </div>
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpdate} />

                <style>{`
                    @keyframes scale-in {
                        0% { transform: scale(0); opacity: 0; }
                        60% { transform: scale(1.1); opacity: 1; }
                        100% { transform: scale(1); }
                    }
                    .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
                `}</style>
            </div>
        </Modal>
    );
};

export default ProductSelectionConfirm;

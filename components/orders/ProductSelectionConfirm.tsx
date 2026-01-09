
import React, { useState, useEffect, useRef, useContext } from 'react';
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
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);
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
            const timer = setTimeout(() => {
                if (modalContentRef.current) {
                    modalContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [product, isOpen]);

    const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !product) return;

        setIsUploading(true);
        try {
            // 1. Compress Image before upload to ensure success
            const compressedBlob = await compressImage(file, 0.7, 1024);
            const base64Data = await fileToBase64(compressedBlob);
            
            // 2. Upload to Server
            const uploadRes = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    fileData: base64Data, 
                    fileName: file.name, 
                    mimeType: compressedBlob.type 
                })
            });
            const uploadResult = await uploadRes.json();
            
            if (!uploadRes.ok || uploadResult.status !== 'success') {
                throw new Error(uploadResult.message || 'Upload failed');
            }

            const newImageUrl = uploadResult.url;

            // 3. Update Product Database (Google Sheet)
            const updateRes = await fetch(`${WEB_APP_URL}/api/admin/update-sheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetName: 'Products',
                    primaryKey: { 'ProductName': product.ProductName },
                    newData: { 'ImageURL': newImageUrl }
                })
            });

            if (!updateRes.ok) throw new Error('Failed to update product database');

            setPreviewUrl(newImageUrl);
            await refreshData(); // Sync global app data to reflect changes everywhere
        } catch (err: any) {
            console.error("Image Update Error:", err);
            alert(`ការ Update រូបភាពបរាជ័យ: ${err.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth={isMobile ? "max-w-[95vw]" : "max-w-2xl"}>
            <div ref={modalContentRef} className="bg-[#0f172a] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/5 relative">
                {/* Product Image Section */}
                <div className="relative h-48 sm:h-72 w-full group">
                    <div className="absolute inset-0 z-0">
                        <img src={convertGoogleDriveUrl(previewUrl || product.ImageURL)} className="w-full h-full object-cover blur-3xl opacity-30" alt="" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center z-10 p-6">
                        <div className="relative h-full aspect-square group/img">
                            <img 
                                src={convertGoogleDriveUrl(previewUrl || product.ImageURL)} 
                                className={`h-full w-auto object-contain rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 transform transition-all duration-500 ${isUploading ? 'opacity-40 blur-sm scale-95' : 'group-hover/img:scale-105'}`} 
                                alt={product.ProductName} 
                            />
                            
                            {/* Update Button Overlay */}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-2xl sm:rounded-3xl cursor-pointer disabled:cursor-not-allowed"
                            >
                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 mb-2">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">ប្តូររូបភាព</span>
                            </button>

                            {isUploading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 rounded-2xl">
                                    <Spinner size="lg" />
                                    <span className="text-[10px] font-black text-blue-400 uppercase mt-2 animate-pulse">Uploading...</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpdate} 
                    />

                    <div className="absolute top-4 right-4 z-20">
                        <div className="bg-emerald-500 text-white font-black px-4 py-2 rounded-2xl shadow-xl border-2 border-white/20 text-lg">
                            ${product.Price.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8 bg-gradient-to-b from-transparent to-black/40">
                    <div>
                        <p className="text-blue-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] mb-3">បញ្ជាក់ការជ្រើសរើស</p>
                        <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight break-words">
                            {product.ProductName}
                        </h3>
                        
                        {showTagEditor && (
                            <div className="mt-6 text-left space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tags ផលិតផល (ឧ. Promotion, New...)</label>
                                <input 
                                    type="text" 
                                    value={localTags} 
                                    onChange={e => setLocalTags(e.target.value)}
                                    className="form-input !py-3.5 bg-black/40 border-gray-700 focus:border-blue-500/50 rounded-2xl font-bold text-gray-200"
                                    placeholder="បញ្ចូល tags..."
                                />
                            </div>
                        )}

                        {product.Barcode && (
                            <div className="mt-4 inline-flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <span className="text-gray-400 font-mono text-xs tracking-widest">{product.Barcode}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                        <button 
                            onClick={onClose} 
                            className="order-2 sm:order-1 flex-1 py-4 sm:py-5 bg-gray-800/50 hover:bg-gray-800 text-gray-400 font-black rounded-2xl uppercase text-[11px] tracking-widest transition-all active:scale-95 border border-white/5"
                        >
                            បោះបង់
                        </button>
                        <button 
                            onClick={() => onConfirm(product.ProductName, localTags)} 
                            className="order-1 sm:order-2 flex-[2] py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            ជ្រើសរើសយក
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                </div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none"></div>
            </div>
        </Modal>
    );
};

export default ProductSelectionConfirm;

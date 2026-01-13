
import React, { useState, useRef, useCallback } from 'react';
import { MasterProduct, Product } from '../../types';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import Spinner from '../common/Spinner';
import ScannerOverlay from './scanner/ScannerOverlay';
import HistoryDrawer, { ScannedHistoryItem } from './scanner/HistoryDrawer';

interface ProductUIState extends Product {
    discountType: 'percent' | 'amount' | 'custom';
    discountAmountInput: string; 
    discountPercentInput: string; 
    finalPriceInput: string;
    applyDiscountToTotal: boolean;
}

interface BarcodeScannerModalProps {
    onClose: () => void;
    onCodeScanned: (code: string) => void;
    scanMode: 'single' | 'increment';
    setScanMode: (mode: 'single' | 'increment') => void;
    productsInOrder: ProductUIState[];
    masterProducts: MasterProduct[];
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
    onClose,
    onCodeScanned,
    scanMode,
    setScanMode,
    productsInOrder,
    masterProducts,
}) => {
    const [scanHistory, setScanHistory] = useState<ScannedHistoryItem[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [lastScannedInfo, setLastScannedInfo] = useState<{ status: 'success' | 'error' | 'warning', message: string, product?: MasterProduct } | null>(null);
    const [scanSuccessFlash, setScanSuccessFlash] = useState(false);
    
    // Focus Point State
    const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);

    // Gestures
    const touchStartDist = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartTime = useRef<number>(0);
    const startZoom = useRef<number>(1);
    const lastTapTime = useRef<number>(0);

    const handleScan = useCallback((decodedText: string) => {
        // Trigger Animations
        setScanSuccessFlash(true);
        setTimeout(() => setScanSuccessFlash(false), 400);

        const foundMasterProduct = masterProducts.find(
            (p: MasterProduct) => p.Barcode && p.Barcode.trim() === decodedText.trim()
        );

        // Update History
        setScanHistory(prev => {
            const existingIndex = prev.findIndex(item => item.code === decodedText);
            const now = Date.now();
            if (existingIndex > -1) {
                const newHistory = [...prev];
                newHistory[existingIndex] = {
                    ...newHistory[existingIndex],
                    count: newHistory[existingIndex].count + 1,
                    timestamp: now
                };
                const item = newHistory.splice(existingIndex, 1)[0];
                return [item, ...newHistory];
            }
            return [{ code: decodedText, product: foundMasterProduct, timestamp: now, count: 1 }, ...prev];
        });

        if (foundMasterProduct) {
            const productInOrder = productsInOrder.find(p => p.name === foundMasterProduct.ProductName);
            if (scanMode === 'single' && productInOrder) {
                setLastScannedInfo({ status: 'warning', message: 'មានក្នុងបញ្ជីរួចហើយ', product: foundMasterProduct });
            } else {
                onCodeScanned(decodedText);
                setLastScannedInfo({ status: 'success', message: 'បានបន្ថែមជោគជ័យ', product: foundMasterProduct });
            }
        } else {
            setLastScannedInfo({ status: 'error', message: `រកមិនឃើញ: ${decodedText}`, product: undefined });
        }

        setTimeout(() => setLastScannedInfo(null), 2000);
    }, [masterProducts, productsInOrder, scanMode, onCodeScanned]);

    const { 
        isInitializing, error, zoom, zoomCapabilities, handleZoomChange, 
        isTorchOn, isTorchSupported, toggleTorch, trackingBox, isAutoZooming,
        triggerFocus
    } = useBarcodeScanner("barcode-reader-container", handleScan, scanMode);

    // Touch Event Handlers (Zoom & Swipe & Focus)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            touchStartDist.current = dist;
            startZoom.current = zoom;
        } else if (e.touches.length === 1) {
            touchStartY.current = e.touches[0].clientY;
            touchStartX.current = e.touches[0].clientX;
            touchStartTime.current = Date.now();
            
            const now = Date.now();
            if (now - lastTapTime.current < 300) {
                // Double Tap logic: reset zoom
                handleZoomChange(zoomCapabilities?.min || 1); 
            }
            lastTapTime.current = now;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchStartDist.current !== null && zoomCapabilities) {
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            const scale = dist / touchStartDist.current;
            const range = zoomCapabilities.max - zoomCapabilities.min;
            const delta = (scale - 1) * range * 0.8;
            handleZoomChange(startZoom.current + delta);
        } else if (e.touches.length === 1 && touchStartY.current !== null) {
            const deltaY = e.touches[0].clientY - touchStartY.current;
            if (deltaY < -50 && !isHistoryOpen) {
                setIsHistoryOpen(true);
                touchStartY.current = null; 
            } else if (deltaY > 50 && isHistoryOpen) {
                setIsHistoryOpen(false);
                touchStartY.current = null;
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current !== null && touchStartY.current !== null) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = Math.abs(touchEndX - touchStartX.current);
            const deltaY = Math.abs(touchEndY - touchStartY.current);
            const duration = Date.now() - touchStartTime.current;

            // Detect Tap (Short duration, minimal movement)
            if (duration < 300 && deltaX < 15 && deltaY < 15) {
                // Trigger Focus Visual & Logic
                setFocusPoint({ x: touchEndX, y: touchEndY });
                triggerFocus();
                
                // Clear visual after animation
                setTimeout(() => setFocusPoint(null), 1000);
            }
        }
        
        touchStartDist.current = null; 
        touchStartY.current = null;
        touchStartX.current = null;
    };

    return (
        <div 
            className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in touch-none overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <style>{`
              #barcode-reader-container { width: 100%; height: 100%; background: #000; overflow: hidden; }
              #barcode-reader-container video { object-fit: cover; width: 100%; height: 100%; }
              @keyframes pop-in { 0% { transform: translate(-50%, -40%) scale(0.8); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
              .animate-pop-in { animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `}</style>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-safe-top flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white font-black text-xs uppercase tracking-widest">LIVE SCAN</span>
                    {isAutoZooming && <span className="text-[9px] text-blue-400 font-bold ml-1 animate-pulse">AUTO-ZOOM</span>}
                </div>
                
                <div className="flex gap-3 pointer-events-auto">
                    {/* Torch Button - Always visible, but opacity lowered if not supported */}
                    <button 
                        onClick={toggleTorch} 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${isTorchOn ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-gray-800/60 text-gray-300 border-white/10'}`}
                        style={{ opacity: isTorchSupported ? 1 : 0.5 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </button>
                    
                    <button onClick={onClose} className="w-10 h-10 bg-gray-800/60 backdrop-blur-md rounded-full text-white border border-white/10 flex items-center justify-center active:scale-90 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Main Scanner */}
            <div className="relative flex-grow w-full overflow-hidden bg-black">
                <div id="barcode-reader-container"></div>
                
                <ScannerOverlay 
                    isScanning={isInitializing} 
                    error={error} 
                    scanSuccessFlash={scanSuccessFlash} 
                    zoom={zoom} 
                    useSimulatedZoom={false} // Native zoom used
                    trackingBox={trackingBox}
                    focusPoint={focusPoint}
                />
                
                {/* Result Popup */}
                {lastScannedInfo && (
                     <div className="absolute top-1/2 left-1/2 w-[85%] max-w-sm z-50 animate-pop-in transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className={`
                            bg-gray-900/95 backdrop-blur-2xl border p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4
                            ${lastScannedInfo.status === 'success' ? 'border-emerald-500 shadow-emerald-900/30' : lastScannedInfo.status === 'warning' ? 'border-yellow-500 shadow-yellow-900/30' : 'border-red-500 shadow-red-900/30'}
                        `}>
                            {lastScannedInfo.product ? (
                                <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 overflow-hidden flex-shrink-0">
                                    <img src={convertGoogleDriveUrl(lastScannedInfo.product.ImageURL)} className="w-full h-full object-cover" alt="" />
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center text-red-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg></div>
                            )}
                            <div className="min-w-0 flex-grow">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${lastScannedInfo.status === 'success' ? 'text-emerald-400' : lastScannedInfo.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {lastScannedInfo.status === 'success' ? 'SUCCESS' : lastScannedInfo.status === 'warning' ? 'ALREADY ADDED' : 'ERROR'}
                                </p>
                                <h3 className="text-white font-bold text-sm truncate">{lastScannedInfo.product?.ProductName || 'Unknown Product'}</h3>
                                {lastScannedInfo.product && <p className="text-white font-mono font-black text-lg mt-0.5">${lastScannedInfo.product.Price.toFixed(2)}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 p-6 text-center">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg></div>
                        <p className="text-red-400 font-bold text-sm">{error}</p>
                    </div>
                )}

                {isInitializing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                        <Spinner size="lg" />
                        <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mt-4 animate-pulse">Initializing...</p>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            {!isHistoryOpen && (
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe-bottom z-40 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-6 pointer-events-none">
                    
                    {/* Zoom Slider */}
                    {zoomCapabilities && (
                        <div className="flex items-center gap-3 px-2 pointer-events-auto">
                            <span className="text-[9px] font-black text-gray-500 w-6 text-center">1x</span>
                            <input 
                                type="range" 
                                min={zoomCapabilities.min} 
                                max={zoomCapabilities.max} 
                                step={zoomCapabilities.step} 
                                value={zoom} 
                                onChange={(e) => handleZoomChange(parseFloat(e.target.value))} 
                                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-[9px] font-black text-gray-500 w-6 text-center">{zoomCapabilities.max}x</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center gap-3 pointer-events-auto">
                        {/* Segmented Control for Scan Mode */}
                        <div className="flex bg-gray-800 p-1.5 rounded-2xl border border-white/10 shadow-lg flex-grow max-w-[200px] mx-auto">
                            <button 
                                onClick={() => setScanMode('single')} 
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${scanMode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Single
                            </button>
                            <button 
                                onClick={() => setScanMode('increment')} 
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${scanMode === 'increment' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Multi
                            </button>
                        </div>
                    </div>

                    {/* Swipe Up Indicator */}
                    <div 
                        className="w-full flex justify-center pb-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity pointer-events-auto"
                        onClick={() => setIsHistoryOpen(true)}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Swipe for History</span>
                        </div>
                    </div>
                </div>
            )}

            {/* History Drawer */}
            <HistoryDrawer 
                history={scanHistory} 
                isOpen={isHistoryOpen} 
                setIsOpen={setIsHistoryOpen} 
                onClear={() => setScanHistory([])} 
            />
        </div>
    );
};

export default BarcodeScannerModal;


import React, { useState, useEffect, useRef, useCallback } from 'react';
import Spinner from '../common/Spinner';
import { Product, MasterProduct } from '../../types';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';

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
    const scannerRef = useRef<any>(null);
    const [lastScannedInfo, setLastScannedInfo] = useState<{ status: 'success' | 'error' | 'warning', message: string, product?: MasterProduct } | null>(null);
    const [isScannerInitializing, setIsScannerInitializing] = useState(true);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [scannedItemsCount, setScannedItemsCount] = useState(0);

    // Beep sound effect
    const beepSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);
        if (scannerRef.current?.isScanning) {
            scannerRef.current.applyVideoConstraints({ advanced: [{ zoom: newZoom }] })
                .catch((err: any) => console.error("Failed to apply zoom", err));
        }
    }, []);
    
    const toggleTorch = useCallback(async () => {
        if (scannerRef.current?.isScanning && isTorchSupported) {
            const newTorchState = !isTorchOn;
            try {
                await scannerRef.current.applyVideoConstraints({
                    advanced: [{ torch: newTorchState }],
                });
                setIsTorchOn(newTorchState);
            } catch (err) {
                console.error("Failed to toggle torch", err);
            }
        }
    }, [isTorchOn, isTorchSupported]);

    useEffect(() => {
        // @ts-ignore
        const scanner = new window.Html5Qrcode("barcode-reader-container");
        scannerRef.current = scanner;

        let lastScanTime = 0;
        
        const onScanSuccess = (decodedText: string, decodedResult: any) => {
            const now = Date.now();
            if (now - lastScanTime < 1500) return; // Debounce scan to 1.5s
            lastScanTime = now;
            
            // Play Beep
            beepSound.current.currentTime = 0;
            beepSound.current.play().catch(() => {});

            // Vibrate if on mobile
            if (navigator.vibrate) navigator.vibrate(200);

            const foundMasterProduct = masterProducts.find(
                (p: MasterProduct) => p.Barcode && p.Barcode.trim() === decodedText.trim()
            );

            if (foundMasterProduct) {
                const productInOrder = productsInOrder.find(p => p.name === foundMasterProduct.ProductName);
                
                if (scanMode === 'single' && productInOrder) {
                    setLastScannedInfo({ 
                        status: 'warning', 
                        message: 'មានក្នុងបញ្ជីរួចហើយ', 
                        product: foundMasterProduct 
                    });
                } else {
                    onCodeScanned(decodedText);
                    setScannedItemsCount(prev => prev + 1);
                    setLastScannedInfo({ 
                        status: 'success', 
                        message: 'បានបន្ថែមជោគជ័យ', 
                        product: foundMasterProduct 
                    });
                }
            } else {
                setLastScannedInfo({ 
                    status: 'error', 
                    message: `រកមិនឃើញ Barcode: ${decodedText}`,
                    product: undefined
                });
            }

            // Clear info after delay
            setTimeout(() => {
                setLastScannedInfo(null);
            }, 2500);
        };

        const config = { 
            fps: 15, // Higher FPS for smoother scanning
            qrbox: { width: 280, height: 280 }, 
            aspectRatio: 1.0
        };
        
        scanner.start({ facingMode: "environment" }, config, onScanSuccess, () => {})
            .then(() => {
                const capabilities = scanner.getRunningTrackCapabilities();
                if (capabilities) {
                    if (capabilities.zoom) {
                        setZoomCapabilities({min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step});
                        setZoom(capabilities.zoom.min || 1);
                    }
                    if (capabilities.torch) setIsTorchSupported(true);
                }
                setIsScannerInitializing(false);
            })
            .catch((err: any) => {
                console.error(err);
                setScannerError("សូមអនុញ្ញាត Camera ដើម្បីប្រើប្រាស់មុខងារនេះ។");
                setIsScannerInitializing(false);
            });

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [onCodeScanned, productsInOrder, masterProducts, scanMode]);

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in">
            <style>{`
              #barcode-reader-container { width: 100%; height: 100%; overflow: hidden; background: black; }
              #barcode-reader-container video { width: 100% !important; height: 100% !important; object-fit: cover; }
              
              @keyframes scanner-line {
                0% { top: 10%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 90%; opacity: 0; }
              }
              .scanner-laser {
                position: absolute;
                left: 10%;
                width: 80%;
                height: 2px;
                background: #3b82f6;
                box-shadow: 0 0 10px #3b82f6, 0 0 20px #3b82f6;
                animation: scanner-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                z-index: 20;
              }
            `}</style>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent pt-safe-top">
                <div className="flex justify-between items-center">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white font-bold text-xs uppercase tracking-wider">Live Scan</span>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-800/50 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-90 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            {/* Main Scanner Area */}
            <div className="relative flex-grow w-full h-full overflow-hidden">
                 <div id="barcode-reader-container"></div>
                 
                 {/* Scanner Overlay UI */}
                 {!isScannerInitializing && !scannerError && (
                     <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Frame */}
                        <div className="relative w-[280px] h-[280px]">
                            {/* Corner Markers */}
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl"></div>
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl"></div>
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-3xl"></div>
                            
                            {/* Laser Animation */}
                            <div className="scanner-laser"></div>
                            
                            {/* Center Target */}
                            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                        </div>
                     </div>
                 )}

                {/* Loading State */}
                {isScannerInitializing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                        <Spinner size="lg" />
                        <p className="mt-6 text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing Optical Sensor...</p>
                    </div>
                )}

                {/* Error State */}
                {scannerError && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-8 text-center z-30">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/50">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <p className="font-bold text-red-400 text-lg mb-2">Camera Access Denied</p>
                        <p className="text-gray-400 text-sm">{scannerError}</p>
                    </div>
                )}

                {/* Scanned Result Popup Card */}
                {lastScannedInfo && (
                     <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-40 animate-fade-in-scale">
                        <div className={`
                            bg-[#0f172a]/95 backdrop-blur-xl border-l-4 p-4 rounded-r-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4
                            ${lastScannedInfo.status === 'success' ? 'border-emerald-500' : lastScannedInfo.status === 'warning' ? 'border-yellow-500' : 'border-red-500'}
                        `}>
                            {lastScannedInfo.product ? (
                                <img src={convertGoogleDriveUrl(lastScannedInfo.product.ImageURL)} className="w-16 h-16 rounded-xl object-cover bg-black border border-white/10" alt="" />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                    lastScannedInfo.status === 'success' ? 'text-emerald-400' : lastScannedInfo.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {lastScannedInfo.status === 'success' ? 'Scanned Successfully' : lastScannedInfo.status === 'warning' ? 'Already Added' : 'Not Found'}
                                </p>
                                <h3 className="text-white font-bold text-sm truncate">{lastScannedInfo.product?.ProductName || 'Unknown Item'}</h3>
                                {lastScannedInfo.product && (
                                    <p className="text-blue-400 font-mono font-black text-sm mt-0.5">${lastScannedInfo.product.Price.toFixed(2)}</p>
                                )}
                                {!lastScannedInfo.product && <p className="text-gray-400 text-xs">{lastScannedInfo.message}</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer Controls */}
            {!isScannerInitializing && !scannerError && (
                 <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent pb-safe-bottom z-40 space-y-6">
                    
                    {/* Zoom Slider */}
                    {zoomCapabilities && (
                        <div className="flex items-center gap-4 px-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase">1x</span>
                            <input 
                                type="range" 
                                min={zoomCapabilities.min} 
                                max={zoomCapabilities.max} 
                                step={zoomCapabilities.step} 
                                value={zoom} 
                                onChange={handleZoomChange} 
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-[10px] font-black text-gray-500 uppercase">{zoomCapabilities.max}x</span>
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                        {/* Mode Toggle */}
                        <div className="flex bg-gray-800/80 backdrop-blur-md p-1 rounded-2xl border border-white/10">
                            <button 
                                onClick={() => setScanMode('single')} 
                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${scanMode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}
                            >
                                Single
                            </button>
                            <button 
                                onClick={() => setScanMode('increment')} 
                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${scanMode === 'increment' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'}`}
                            >
                                Multi (+1)
                            </button>
                        </div>

                        {/* Scanned Counter */}
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Items Scanned</span>
                            <span className="text-3xl font-black text-white">{scannedItemsCount}</span>
                        </div>

                        {/* Flashlight */}
                        {isTorchSupported && (
                            <button 
                                onClick={toggleTorch} 
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border ${isTorchOn ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-gray-800/80 text-white border-white/10 hover:bg-gray-700'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarcodeScannerModal;

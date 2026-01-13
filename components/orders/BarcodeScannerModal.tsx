
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

interface ScannedHistoryItem {
    code: string;
    product?: MasterProduct;
    timestamp: number;
    count: number;
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
    
    // Zoom States
    const [zoom, setZoom] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
    const [useSimulatedZoom, setUseSimulatedZoom] = useState(false);

    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    
    // New State for History & UI
    const [scanHistory, setScanHistory] = useState<ScannedHistoryItem[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [scanSuccessFlash, setScanSuccessFlash] = useState(false);

    // Pinch Zoom Refs
    const touchStartDist = useRef<number | null>(null);
    const startZoom = useRef<number>(1);
    const lastTapTime = useRef<number>(0);

    // Beep sound effect
    const beepSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    const handleZoomChange = useCallback((value: number) => {
        if (!zoomCapabilities) return;
        const newZoom = Math.min(Math.max(value, zoomCapabilities.min), zoomCapabilities.max);
        setZoom(newZoom);
        
        if (useSimulatedZoom) {
            // Apply Digital Zoom via CSS Transform
            const videoElement = document.querySelector('#barcode-reader-container video') as HTMLVideoElement;
            if (videoElement) {
                videoElement.style.transform = `scale(${newZoom})`;
                // Adjust origin to center to feel natural
                videoElement.style.transformOrigin = "center center"; 
            }
        } else if (scannerRef.current) {
            // Apply Native Optical Zoom
            try {
                const track = scannerRef.current.getRunningTrackCamera?.() || 
                              scannerRef.current.html5QrCode?.getRunningTrackCamera?.();
                if (track && track.applyConstraints) {
                    track.applyConstraints({ advanced: [{ zoom: newZoom }] })
                        .catch((err: any) => console.warn("Native zoom failed:", err));
                }
            } catch (e) {
                console.warn("Failed to apply native zoom", e);
            }
        }
    }, [zoomCapabilities, useSimulatedZoom]);
    
    const toggleTorch = useCallback(async () => {
        if (!scannerRef.current || !isTorchSupported) return;
        
        const newTorchState = !isTorchOn;
        try {
             const track = scannerRef.current.getRunningTrackCamera?.() || 
                          scannerRef.current.html5QrCode?.getRunningTrackCamera?.();
            
            if (track && track.applyConstraints) {
                await track.applyConstraints({
                    advanced: [{ torch: newTorchState }],
                });
                setIsTorchOn(newTorchState);
            }
        } catch (err) {
            console.error("Failed to toggle torch", err);
        }
    }, [isTorchOn, isTorchSupported]);

    // Touch handlers for Pinch-to-Zoom & Double Tap
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            touchStartDist.current = dist;
            startZoom.current = zoom;
        } else if (e.touches.length === 1) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTapTime.current;
            if (tapLength < 300 && tapLength > 0) {
                // Double tap detected: Reset zoom or toggle max zoom
                if (zoomCapabilities) {
                    const targetZoom = zoom > zoomCapabilities.min ? zoomCapabilities.min : Math.min(2.5, zoomCapabilities.max);
                    handleZoomChange(targetZoom);
                }
                e.preventDefault();
            }
            lastTapTime.current = currentTime;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchStartDist.current !== null && zoomCapabilities) {
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const scale = dist / touchStartDist.current;
            const range = zoomCapabilities.max - zoomCapabilities.min;
            const delta = (scale - 1) * range * 0.8; // Increased sensitivity
            handleZoomChange(startZoom.current + delta);
        }
    };

    const handleTouchEnd = () => {
        touchStartDist.current = null;
    };

    useEffect(() => {
        // @ts-ignore
        const scanner = new window.Html5Qrcode("barcode-reader-container");
        scannerRef.current = scanner;

        let lastScanTime = 0;
        
        const onScanSuccess = (decodedText: string, decodedResult: any) => {
            const now = Date.now();
            if (now - lastScanTime < 1500) return; // Debounce scan to 1.5s
            lastScanTime = now;
            
            // Visual & Audio Feedback
            setScanSuccessFlash(true);
            setTimeout(() => setScanSuccessFlash(false), 300);
            
            beepSound.current.currentTime = 0;
            beepSound.current.play().catch(() => {});
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            const foundMasterProduct = masterProducts.find(
                (p: MasterProduct) => p.Barcode && p.Barcode.trim() === decodedText.trim()
            );

            // Update History
            setScanHistory(prev => {
                const existingIndex = prev.findIndex(item => item.code === decodedText);
                if (existingIndex > -1) {
                    const newHistory = [...prev];
                    newHistory[existingIndex] = {
                        ...newHistory[existingIndex],
                        count: newHistory[existingIndex].count + 1,
                        timestamp: now
                    };
                    const item = newHistory.splice(existingIndex, 1)[0];
                    return [item, ...newHistory];
                } else {
                    return [{ 
                        code: decodedText, 
                        product: foundMasterProduct, 
                        timestamp: now, 
                        count: 1 
                    }, ...prev];
                }
            });

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

            setTimeout(() => {
                setLastScannedInfo(null);
            }, 2500);
        };

        const config = { 
            fps: 30, 
            qrbox: { width: 250, height: 250 }, 
            aspectRatio: 1.0,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };
        
        const constraints = { 
            facingMode: "environment" 
        };

        scanner.start(constraints, config, onScanSuccess, () => {})
            .then(() => {
                try {
                    const track = scanner.getRunningTrackCamera?.() || 
                                  scanner.html5QrCode?.getRunningTrackCamera?.();
                    
                    if (track) {
                        const capabilities = track.getCapabilities();
                        
                        // Hybrid Zoom Logic
                        if (capabilities.zoom) {
                            // Native Zoom Available
                            setZoomCapabilities({
                                min: capabilities.zoom.min, 
                                max: capabilities.zoom.max, 
                                step: capabilities.zoom.step
                            });
                            setZoom(capabilities.zoom.min || 1);
                            setUseSimulatedZoom(false);
                        } else {
                            // Fallback to Digital Zoom
                            console.log("Native zoom not supported, enabling digital zoom.");
                            setZoomCapabilities({ min: 1, max: 4, step: 0.1 });
                            setZoom(1);
                            setUseSimulatedZoom(true);
                        }

                        if (capabilities.torch) setIsTorchSupported(true);

                        // Try to force continuous focus
                        if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
                            track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
                                .catch(() => console.log("Continuous focus not supported."));
                        }
                    } else {
                        // Fallback if track is inaccessible (rare)
                        setZoomCapabilities({ min: 1, max: 4, step: 0.1 });
                        setUseSimulatedZoom(true);
                    }
                } catch (e) {
                    console.warn("Could not retrieve camera capabilities, defaulting to simulated zoom:", e);
                    setZoomCapabilities({ min: 1, max: 4, step: 0.1 });
                    setUseSimulatedZoom(true);
                }
                setIsScannerInitializing(false);
            })
            .catch((err: any) => {
                let errorMessage = "សូមអនុញ្ញាត Camera ដើម្បីប្រើប្រាស់មុខងារនេះ។";
                if (err.name === 'NotAllowedError') errorMessage = "ការចូលប្រើកាមេរ៉ាត្រូវបានបដិសេធ។";
                setScannerError(errorMessage);
                setIsScannerInitializing(false);
            });

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [onCodeScanned, productsInOrder, masterProducts, scanMode]);

    return (
        <div 
            className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in touch-none overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <style>{`
              #barcode-reader-container { width: 100%; height: 100%; overflow: hidden; background: #000; }
              #barcode-reader-container video { width: 100% !important; height: 100% !important; object-fit: cover; transition: transform 0.1s linear; }
              
              /* HUD Grid Animation */
              .hud-grid {
                background-size: 40px 40px;
                background-image:
                  linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
                animation: grid-move 20s linear infinite;
              }
              @keyframes grid-move { 0% { transform: translateY(0); } 100% { transform: translateY(40px); } }

              /* Laser Scanning Line */
              .scanner-laser {
                position: absolute;
                left: 0;
                width: 100%;
                height: 2px;
                background: #3b82f6;
                box-shadow: 0 0 15px #3b82f6, 0 0 30px #3b82f6;
                animation: laser-scan 2s ease-in-out infinite;
                z-index: 20;
              }
              @keyframes laser-scan {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
              }

              /* Success Flash */
              .scan-flash {
                animation: flash-green 0.3s ease-out;
              }
              @keyframes flash-green {
                0% { box-shadow: inset 0 0 0 0 rgba(16, 185, 129, 0); }
                50% { box-shadow: inset 0 0 0 50px rgba(16, 185, 129, 0.3); border-color: #10b981; }
                100% { box-shadow: inset 0 0 0 0 rgba(16, 185, 129, 0); }
              }
            `}</style>

            {/* Header / Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/90 to-transparent pt-safe-top flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-500/30 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></div>
                        <span className="text-white font-black text-xs uppercase tracking-widest">LIVE TRACKING</span>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 bg-gray-800/60 backdrop-blur-md rounded-full text-white border border-white/10 flex items-center justify-center active:scale-90 transition-all hover:bg-red-500/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {/* Main Scanner Viewport */}
            <div className="relative flex-grow w-full overflow-hidden bg-black">
                 <div id="barcode-reader-container" className="opacity-80"></div>
                 
                 {/* HUD Overlay Layer */}
                 {!isScannerInitializing && !scannerError && (
                     <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* Moving Grid Background */}
                        <div className="absolute inset-0 hud-grid opacity-30"></div>
                        
                        {/* Center Focus Box */}
                        <div className={`
                            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                            w-[280px] h-[280px] border-2 transition-colors duration-200
                            ${scanSuccessFlash ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)] scan-flash' : 'border-white/20'}
                            rounded-3xl
                        `}>
                            {/* Corner Accents */}
                            <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl ${scanSuccessFlash ? 'border-emerald-400' : 'border-blue-500'} -translate-x-1 -translate-y-1`}></div>
                            <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl ${scanSuccessFlash ? 'border-emerald-400' : 'border-blue-500'} translate-x-1 -translate-y-1`}></div>
                            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl ${scanSuccessFlash ? 'border-emerald-400' : 'border-blue-500'} -translate-x-1 translate-y-1`}></div>
                            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl ${scanSuccessFlash ? 'border-emerald-400' : 'border-blue-500'} translate-x-1 translate-y-1`}></div>
                            
                            {/* Laser */}
                            <div className="scanner-laser"></div>
                            
                            {/* Central Reticle */}
                            <div className="absolute top-1/2 left-1/2 w-10 h-10 border border-white/20 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center">
                                <div className="w-1 h-1 bg-red-500 rounded-full shadow-[0_0_5px_#ef4444]"></div>
                            </div>
                        </div>

                        {/* Data Metrics */}
                        <div className="absolute top-[20%] right-4 flex flex-col gap-2 items-end">
                            <div className="text-[10px] font-mono text-blue-400 bg-black/60 px-2 py-1 rounded border border-blue-500/20 flex items-center gap-2">
                                ZOOM: {zoom.toFixed(1)}x
                                {useSimulatedZoom && <span className="text-[8px] bg-white/20 px-1 rounded">DIGITAL</span>}
                            </div>
                            <div className="text-[10px] font-mono text-blue-400 bg-black/60 px-2 py-1 rounded border border-blue-500/20">
                                FPS: 30
                            </div>
                        </div>
                     </div>
                 )}

                {/* Loading State */}
                {isScannerInitializing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-blue-500 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Optics...</p>
                    </div>
                )}

                {/* Error State */}
                {scannerError && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-8 text-center z-30">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border-2 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <p className="font-bold text-white text-xl mb-2">Camera Access Error</p>
                        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">{scannerError}</p>
                    </div>
                )}

                {/* Result Popup (Top Center) */}
                {lastScannedInfo && (
                     <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-40 animate-fade-in-scale">
                        <div className={`
                            bg-[#0f172a]/95 backdrop-blur-xl border-l-4 p-4 rounded-r-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4
                            ${lastScannedInfo.status === 'success' ? 'border-emerald-500' : lastScannedInfo.status === 'warning' ? 'border-yellow-500' : 'border-red-500'}
                        `}>
                            {lastScannedInfo.product ? (
                                <img src={convertGoogleDriveUrl(lastScannedInfo.product.ImageURL)} className="w-14 h-14 rounded-xl object-cover bg-black border border-white/10" alt="" />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${
                                    lastScannedInfo.status === 'success' ? 'text-emerald-400' : lastScannedInfo.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {lastScannedInfo.status === 'success' ? 'SCANNED' : lastScannedInfo.status === 'warning' ? 'DUPLICATE' : 'INVALID'}
                                </p>
                                <h3 className="text-white font-bold text-sm truncate">{lastScannedInfo.product?.ProductName || 'Unknown Item'}</h3>
                                {lastScannedInfo.product && (
                                    <p className="text-blue-400 font-mono font-black text-xs mt-0.5">${lastScannedInfo.product.Price.toFixed(2)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Bottom Sheet UI */}
            <div className={`
                absolute bottom-0 left-0 right-0 bg-[#0f172a] rounded-t-[2rem] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 transition-all duration-300 ease-out flex flex-col
                ${isHistoryOpen ? 'h-[70vh]' : 'h-auto pb-safe-bottom'}
            `}>
                {/* Drag Handle */}
                <div 
                    className="w-full flex justify-center py-3 cursor-pointer active:opacity-70" 
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                >
                    <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
                </div>

                {/* Main Controls (Visible when collapsed) */}
                <div className={`px-6 pb-6 pt-2 space-y-5 ${isHistoryOpen ? 'hidden' : 'block'}`}>
                    
                    {/* Zoom Slider */}
                    {zoomCapabilities && (
                        <div className="flex items-center gap-4 bg-black/30 p-2 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-black text-gray-500 w-6 text-center">1x</span>
                            <input 
                                type="range" 
                                min={zoomCapabilities.min} 
                                max={zoomCapabilities.max} 
                                step={zoomCapabilities.step} 
                                value={zoom} 
                                onChange={(e) => handleZoomChange(parseFloat(e.target.value))} 
                                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-[10px] font-black text-gray-500 w-6 text-center">{zoomCapabilities.max}x</span>
                        </div>
                    )}

                    <div className="flex justify-between items-end gap-4">
                        {/* Mode Toggle */}
                        <div className="flex bg-gray-800 p-1 rounded-xl border border-white/5 flex-shrink-0">
                            <button onClick={() => setScanMode('single')} className={`px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${scanMode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>1x</button>
                            <button onClick={() => setScanMode('increment')} className={`px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${scanMode === 'increment' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'}`}>+1</button>
                        </div>

                        {/* History Trigger */}
                        <button 
                            onClick={() => setIsHistoryOpen(true)}
                            className="flex-grow bg-gray-800 p-3 rounded-2xl border border-white/5 flex items-center justify-between px-5 active:scale-95 transition-all"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">History</span>
                                <span className="text-white font-black text-sm">{scanHistory.length} Items</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                            </div>
                        </button>

                        {/* Flashlight */}
                        {isTorchSupported && (
                            <button 
                                onClick={toggleTorch} 
                                className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all border ${isTorchOn ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* History List (Visible when expanded) */}
                {isHistoryOpen && (
                    <div className="flex-grow flex flex-col overflow-hidden px-4 pb-4 animate-fade-in">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Scanned Session</h3>
                            <button onClick={() => setScanHistory([])} className="text-[10px] text-red-400 font-bold uppercase tracking-widest bg-red-900/20 px-3 py-1.5 rounded-lg">Clear All</button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pb-safe-bottom">
                            {scanHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 opacity-30">
                                    <svg className="w-12 h-12 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                                    <p className="text-xs font-black uppercase text-gray-500">No Items Scanned</p>
                                </div>
                            ) : (
                                scanHistory.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-2xl border border-white/5">
                                        <div className="w-12 h-12 bg-black rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                            {item.product ? (
                                                <img src={convertGoogleDriveUrl(item.product.ImageURL)} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600 font-black text-xs">?</div>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <h4 className="text-white font-bold text-sm truncate">{item.product?.ProductName || 'Unknown Product'}</h4>
                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.code}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-blue-400 font-black text-lg">x{item.count}</span>
                                            <span className="text-[9px] text-gray-600 font-bold uppercase">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BarcodeScannerModal;

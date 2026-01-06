
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Spinner from '../common/Spinner';
import { Product, MasterProduct } from '../../types';

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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [lastScannedInfo, setLastScannedInfo] = useState<string | null>(null);
    const [isScannerInitializing, setIsScannerInitializing] = useState(true);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [scannedItemsCount, setScannedItemsCount] = useState(0);

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
            if (now - lastScanTime < 1000) return; 
            lastScanTime = now;
            
            const foundMasterProduct = masterProducts.find(
                (p: MasterProduct) => p.Barcode && p.Barcode.trim() === decodedText.trim()
            );

            if (foundMasterProduct) {
                const productInOrder = productsInOrder.find(p => p.name === foundMasterProduct.ProductName);
                const currentQuantity = productInOrder ? productInOrder.quantity : 0;

                if (scanMode === 'single' && productInOrder) {
                    setLastScannedInfo(`⚠️ ${foundMasterProduct.ProductName} (មានរួចហើយ)`);
                } else {
                    const nextQuantity = scanMode === 'increment' ? currentQuantity + 1 : 1;
                    setLastScannedInfo(`✅ ${foundMasterProduct.ProductName} (ចំនួន: ${nextQuantity})`);
                    setScannedItemsCount(prev => prev + 1);
                }
            } else {
                setLastScannedInfo(`❌ រកមិនឃើញ Barcode: ${decodedText}`);
            }

            onCodeScanned(decodedText);
            
            const canvas = canvasRef.current;
            const video = document.querySelector<HTMLVideoElement>('#barcode-reader-container video');
            if (canvas && video && decodedResult.result?.points) {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = video.clientWidth;
                canvas.height = video.clientHeight;
                const scaleX = video.clientWidth / video.videoWidth;
                const scaleY = video.clientHeight / video.videoHeight;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                const points = decodedResult.result.points;
                ctx.moveTo(points[0].x * scaleX, points[0].y * scaleY);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x * scaleX, points[i].y * scaleY);
                }
                ctx.closePath();
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#4ade80';
                ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
                ctx.stroke();
                ctx.fill();

                setTimeout(() => {
                    setLastScannedInfo(null);
                     if(canvasRef.current) {
                       const currentCtx = canvasRef.current.getContext('2d');
                       currentCtx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                }, 1500);
            }
        };

        const config = { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [] };
        
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
                setScannerError("មិនអាចបើក Camera បានទេ។");
                setIsScannerInitializing(false);
            });

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [onCodeScanned, productsInOrder, masterProducts, scanMode]);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col p-2 sm:p-4 animate-fade-in">
            <style>{`
              #barcode-reader-container { width: 100%; height: 100%; overflow: hidden; }
              #barcode-reader-container video { width: 100% !important; height: 100% !important; object-fit: cover; }
            `}</style>
            <div className="flex-shrink-0 flex justify-between items-center text-white mb-2 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold">
                    Scan Barcode 
                    <span className="text-gray-400 text-base font-normal ml-2">({scannedItemsCount} scanned)</span>
                </h2>
                <button onClick={onClose} className="p-2 bg-gray-700/50 rounded-full hover:bg-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="flex-grow relative flex items-center justify-center min-h-0 w-full max-w-2xl mx-auto">
                 <div id="barcode-reader-container" className="w-full h-full aspect-square bg-gray-900 rounded-lg overflow-hidden"></div>
                 <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"></canvas>
                 <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 border-[20px] sm:border-[30px] border-black/50 box-border rounded-lg"></div>

                {isScannerInitializing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                        <Spinner size="lg" />
                        <p className="mt-4 font-semibold">កំពុងបើក Camera...</p>
                    </div>
                )}
                {scannerError && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                        <p className="font-semibold text-red-400">កំហុស Camera</p>
                        <p className="mt-2 text-sm">{scannerError}</p>
                    </div>
                )}
                {lastScannedInfo && (
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800/80 border border-gray-600 text-white px-4 py-2 rounded-lg font-semibold z-20">
                        {lastScannedInfo}
                    </div>
                )}
            </div>
            
            {!isScannerInitializing && !scannerError && (
                 <div className="flex-shrink-0 mt-4 space-y-4 w-full max-w-2xl mx-auto">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 items-center">
                        <div className="flex justify-center items-center space-x-2 bg-gray-800 p-1 rounded-lg">
                            <button onClick={() => setScanMode('increment')} className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${scanMode === 'increment' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                                បូកចំនួន
                            </button>
                            <button onClick={() => setScanMode('single')} className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${scanMode === 'single' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                                រាប់មួយ
                            </button>
                        </div>
                         <div className="flex justify-center">
                            {isTorchSupported && (
                                <button onClick={toggleTorch} className={`p-3 rounded-full transition-colors ${isTorchOn ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2zM5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {zoomCapabilities && (
                        <div className="flex items-center gap-2 sm:gap-4 bg-gray-800 p-2 rounded-lg">
                           <input type="range" min={zoomCapabilities.min} max={zoomCapabilities.max} step={zoomCapabilities.step} value={zoom} onChange={handleZoomChange} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BarcodeScannerModal;

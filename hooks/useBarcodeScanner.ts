
import { useState, useEffect, useRef, useCallback } from 'react';
import { isIOS } from '../utils/platform';
import { useSmartZoom } from './useSmartZoom';

interface ScannerConfig {
    fps: number;
    qrbox: number | { width: number, height: number };
    aspectRatio: number;
    videoConstraints?: any;
    experimentalFeatures?: any;
}

export const useBarcodeScanner = (
    elementId: string, 
    onScan: (decodedText: string) => void,
    scanMode: 'single' | 'increment'
) => {
    const scannerRef = useRef<any>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Zoom & Camera Controls
    const [zoom, setZoom] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const beepSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    // --- Core Camera Functions ---

    const switchCamera = useCallback(() => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }, []);

    const getActiveTrack = (): MediaStreamTrack | null => {
        if (trackRef.current && trackRef.current.readyState === 'live') return trackRef.current;
        if (scannerRef.current?.html5QrCode) {
            const track = scannerRef.current.html5QrCode.getRunningTrackCamera?.();
            if (track) return track;
        }
        const videoElement = document.querySelector(`#${elementId} video`) as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track) return track;
        }
        return null;
    };

    const applyConstraints = useCallback(async (constraints: any) => {
        const track = getActiveTrack();
        if (!track) return;
        const isIosDevice = isIOS();
        try {
            await track.applyConstraints(constraints);
        } catch (e) {
            // iOS Zoom Fix
            if (constraints.zoom && isIosDevice) {
                try {
                    await track.applyConstraints({ advanced: [{ zoom: constraints.zoom }] } as any);
                } catch (e2) {
                    console.warn("Zoom failed on iOS:", e2);
                }
            }
        }
    }, []);

    // --- Smooth Zoom Logic ---
    const setSmoothZoom = useCallback(async (targetZoom: number) => {
        const track = getActiveTrack();
        if (!track) return;
        
        let z = targetZoom;
        if (zoomCapabilities) {
            // Ensure we don't go out of bounds, but allow values < 1 if capabilities allow (Ultrawide)
            z = Math.max(zoomCapabilities.min, Math.min(targetZoom, zoomCapabilities.max));
        }
        setZoom(z);
        await applyConstraints({ zoom: z });
    }, [zoomCapabilities, applyConstraints]);

    // --- NEW: Integrate Custom Smart Zoom Hook ---
    const { trackingBox, isAutoZooming, notifyManualZoom } = useSmartZoom(
        videoRef.current,
        trackRef.current,
        zoom,
        setZoom, 
        (z) => applyConstraints({ zoom: z }) 
    );

    // Wrapper to notify auto-zoom to pause when manual zoom is used
    const handleManualZoom = useCallback((z: number) => {
        notifyManualZoom();
        setSmoothZoom(z);
    }, [notifyManualZoom, setSmoothZoom]);

    // --- Torch Logic ---
    const toggleTorch = useCallback(async () => {
        const track = getActiveTrack();
        if (!track) return;
        if (isIOS()) return; 

        const newStatus = !isTorchOn;
        try {
            await track.applyConstraints({ advanced: [{ torch: newStatus } as any] });
            setIsTorchOn(newStatus);
        } catch (err) {
            try {
                await track.applyConstraints({ torch: newStatus } as any);
                setIsTorchOn(newStatus);
            } catch(e2) { }
        }
    }, [isTorchOn]);

    // --- Focus Logic ---
    const triggerFocus = useCallback(async () => {
        const track = getActiveTrack();
        if (!track) return;
        const capabilities = track.getCapabilities() as any;
        if (!capabilities.focusMode) return;
        try {
            if (capabilities.focusMode.includes('single-shot') && capabilities.focusMode.includes('continuous')) {
                await applyConstraints({ focusMode: 'single-shot' });
                setTimeout(async () => {
                    await applyConstraints({ focusMode: 'continuous' });
                }, 1000);
            } 
        } catch (err) { }
    }, [applyConstraints]);

    useEffect(() => {
        // @ts-ignore
        if (!window.Html5Qrcode) {
            setError("Scanner library missing.");
            return;
        }

        const initScanner = async () => {
            setIsInitializing(true);
            setIsTorchOn(false);
            setZoom(1);
            
            // @ts-ignore
            const html5QrCode = new window.Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;

            const isIosDevice = isIOS();

            const videoConstraints = isIosDevice 
                ? {
                    facingMode: facingMode,
                    width: { ideal: 1080 }, 
                    height: { ideal: 1080 },
                    aspectRatio: 1.0,
                    // Try to request zoom starting at 1 (or lower if device supports it automatically)
                    zoom: 1 
                  }
                : {
                    facingMode: facingMode,
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    aspectRatio: 1.777777778,
                    focusMode: "continuous"
                  };

            const config: ScannerConfig = { 
                fps: 30,
                qrbox: { width: 250, height: 250 }, 
                aspectRatio: 1.0,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: false 
                },
                videoConstraints: videoConstraints
            };

            let lastScanTime = 0;
            const onScanSuccess = (decodedText: string) => {
                const now = Date.now();
                if (now - lastScanTime < 1500) return;
                lastScanTime = now;
                
                beepSound.current.currentTime = 0;
                beepSound.current.play().catch(() => {});
                if (navigator.vibrate) navigator.vibrate(50);
                
                onScan(decodedText);
            };

            try {
                await html5QrCode.start({ facingMode: facingMode }, config, onScanSuccess, undefined);
                
                const videoEl = document.querySelector(`#${elementId} video`) as HTMLVideoElement;
                if (videoEl) {
                    videoRef.current = videoEl;
                    videoEl.setAttribute('playsinline', 'true'); 
                }

                const track = getActiveTrack();
                if (track) {
                    trackRef.current = track;
                    const capabilities = track.getCapabilities() as any;
                    const settings = track.getSettings();

                    if (!isIosDevice && 'torch' in capabilities) {
                        setIsTorchSupported(true);
                    } else {
                        setIsTorchSupported(false);
                    }

                    if (isIosDevice) {
                        // iOS Zoom Fix: We try to detect valid range, or fallback to wide range
                        // If iPhone 11+ Pro, min zoom can be 0.5
                        // @ts-ignore
                        const minZ = settings.zoom ? Math.min(settings.zoom, 1) : 1; 
                        setZoomCapabilities({ min: minZ >= 1 ? 1 : 0.5, max: 5, step: 0.1 });
                        
                        // @ts-ignore
                        setZoom(settings.zoom || 1);
                    } 
                    // @ts-ignore
                    else if (capabilities.zoom) {
                        setZoomCapabilities({
                            // @ts-ignore
                            min: capabilities.zoom.min, 
                            // @ts-ignore
                            max: capabilities.zoom.max, 
                            // @ts-ignore
                            step: capabilities.zoom.step
                        });
                        // @ts-ignore
                        setZoom(settings.zoom || capabilities.zoom.min);
                    } else {
                        setZoomCapabilities(null);
                    }
                }

                setIsInitializing(false);

            } catch (err: any) {
                console.error("Camera Start Error:", err);
                setError(err.name === 'NotAllowedError' ? "Camera permission denied." : "Camera error.");
                setIsInitializing(false);
            }
        };

        initScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(console.error);
            }
        };
    }, [facingMode]);

    return {
        isInitializing,
        error,
        zoom,
        zoomCapabilities,
        handleZoomChange: handleManualZoom, // Use wrapped function
        isTorchOn,
        isTorchSupported,
        toggleTorch,
        trackingBox, 
        isAutoZooming, 
        triggerFocus,
        switchCamera,
        facingMode
    };
};

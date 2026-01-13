
import { useState, useEffect, useRef, useCallback } from 'react';
import { isIOS } from '../utils/platform';

interface ScannerConfig {
    fps: number;
    qrbox: number | { width: number, height: number };
    aspectRatio: number;
    videoConstraints?: any;
    experimentalFeatures?: any;
}

interface TrackingBox {
    x: number;      // %
    y: number;      // %
    width: number;  // %
    height: number; // %
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
    
    // Camera Facing Mode State
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

    // Smart Tracking & Auto-Zoom State
    const [trackingBox, setTrackingBox] = useState<TrackingBox | null>(null);
    const [isAutoZooming, setIsAutoZooming] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const beepSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    // --- Core Camera Functions ---

    const switchCamera = useCallback(() => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }, []);

    const getActiveTrack = (): MediaStreamTrack | null => {
        if (trackRef.current && trackRef.current.readyState === 'live') return trackRef.current;
        
        // Fallback: try to find track from Html5QrCode instance
        if (scannerRef.current?.html5QrCode) {
            const track = scannerRef.current.html5QrCode.getRunningTrackCamera?.();
            if (track) return track;
        }
        
        // Fallback: Try DOM
        const videoElement = document.querySelector(`#${elementId} video`) as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track) return track;
        }
        return null;
    };

    const applyConstraints = async (constraints: any) => {
        const track = getActiveTrack();
        if (!track) return;
        
        try {
            await track.applyConstraints(constraints);
        } catch (e) {
            // IOS often fails on advanced constraints, ignore silently or try 'advanced' block
            try {
                await track.applyConstraints({ advanced: [constraints] });
            } catch (e2) {
                // Ignore
            }
        }
    };

    // --- Focus Logic ---
    const triggerFocus = useCallback(async () => {
        const track = getActiveTrack();
        if (!track) return;

        // iOS doesn't support manual focus via JS usually, but Android does
        const capabilities = track.getCapabilities() as any;
        if (!capabilities.focusMode) return;

        try {
            if (capabilities.focusMode.includes('single-shot') && capabilities.focusMode.includes('continuous')) {
                await applyConstraints({ focusMode: 'single-shot' });
                setTimeout(async () => {
                    await applyConstraints({ focusMode: 'continuous' });
                }, 1000);
            } 
        } catch (err) {
            console.warn("Focus trigger failed", err);
        }
    }, []);

    // --- Torch Logic ---
    const toggleTorch = useCallback(async () => {
        const track = getActiveTrack();
        if (!track) return;

        // IOS WebKit does NOT support torch yet via JS. This will mostly work on Android.
        if (isIOS()) return; 

        const newStatus = !isTorchOn;
        try {
            await track.applyConstraints({ advanced: [{ torch: newStatus } as any] });
            setIsTorchOn(newStatus);
        } catch (err) {
            try {
                await track.applyConstraints({ torch: newStatus } as any);
                setIsTorchOn(newStatus);
            } catch(e2) {
                // Fail silently
            }
        }
    }, [isTorchOn]);

    // --- Smooth Zoom Logic ---
    const setSmoothZoom = useCallback(async (targetZoom: number) => {
        const track = getActiveTrack();
        if (!track || !zoomCapabilities) return;

        let z = Math.max(zoomCapabilities.min, Math.min(targetZoom, zoomCapabilities.max));
        setZoom(z);
        await applyConstraints({ zoom: z });
    }, [zoomCapabilities]);

    // --- AI Tracking & Auto-Zoom Loop ---
    const startSmartTracking = () => {
        // Feature detection: Check if BarcodeDetector is supported (iOS 17+, Chrome 88+)
        // @ts-ignore
        if (!window.BarcodeDetector) return; 

        const detectLoop = async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
                animationFrameRef.current = requestAnimationFrame(detectLoop);
                return;
            }

            try {
                // @ts-ignore
                const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'code_39'] });
                const barcodes = await detector.detect(videoRef.current);

                if (barcodes.length > 0) {
                    const target = barcodes[0];
                    const { x, y, width, height } = target.boundingBox;
                    const vWidth = videoRef.current.videoWidth;
                    const vHeight = videoRef.current.videoHeight;

                    // Update UI Tracking Box
                    setTrackingBox({
                        x: (x / vWidth) * 100,
                        y: (y / vHeight) * 100,
                        width: (width / vWidth) * 100,
                        height: (height / vHeight) * 100
                    });

                    // --- Auto Zoom Logic ---
                    // Calculate how much width the barcode takes up (0 to 1)
                    const widthRatio = width / vWidth;
                    const track = getActiveTrack();
                    
                    // If barcode is small (< 30% of screen width) and we have a track
                    if (track && widthRatio < 0.30) {
                        const caps = track.getCapabilities();
                        const settings = track.getSettings();
                        // @ts-ignore
                        const currentZoom = settings.zoom || 1;
                        // @ts-ignore
                        // Cap auto-zoom at 2.5x to prevent becoming too shaky/blurry
                        const maxZoom = Math.min(caps.zoom?.max || 3, 2.5); 

                        if (currentZoom < maxZoom) {
                            setIsAutoZooming(true);
                            // Smooth increment: Zoom in by small steps
                            // Dynamic step: The smaller the code, the faster we zoom
                            const zoomStep = widthRatio < 0.15 ? 0.05 : 0.02; 
                            const newZoom = Math.min(currentZoom + zoomStep, maxZoom);
                            
                            applyConstraints({ zoom: newZoom });
                            setZoom(newZoom);
                        }
                    } else if (widthRatio > 0.6) {
                        // If too big, maybe zoom out slightly? (Optional, kept simple for now)
                        setIsAutoZooming(false);
                    } else {
                        setIsAutoZooming(false);
                    }

                } else {
                    setTrackingBox(null);
                    setIsAutoZooming(false);
                }
            } catch (err) {
                // Squelch detection errors (common if frame is blurry)
            }
            // Loop
            animationFrameRef.current = requestAnimationFrame(detectLoop);
        };

        detectLoop();
    };

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

            // OPTIMIZATION FOR IOS: 
            // 1. Lower resolution to prevent freezing/lag
            // 2. Strict aspect ratio (square) often works best
            // 3. Do not set focusMode initially on iOS
            const videoConstraints = isIosDevice 
                ? {
                    facingMode: facingMode,
                    width: { ideal: 1080 }, // Ask for high quality, system scales down if needed
                    height: { ideal: 1080 },
                    aspectRatio: 1.0 
                  }
                : {
                    facingMode: facingMode,
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    aspectRatio: 1.777777778,
                    focusMode: "continuous"
                  };

            const config: ScannerConfig = { 
                fps: isIosDevice ? 15 : 30, // 15 FPS is sufficient for scanning and saves resources
                qrbox: { width: 250, height: 250 }, 
                aspectRatio: 1.0,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true // Important: Uses native iOS API if available
                },
                videoConstraints: videoConstraints
            };

            const cameraConfig = { facingMode: facingMode };

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
                await html5QrCode.start(cameraConfig, config, onScanSuccess, undefined);
                
                // Get the video element created by the library
                const videoEl = document.querySelector(`#${elementId} video`) as HTMLVideoElement;
                if (videoEl) {
                    videoRef.current = videoEl;
                    // IMPORTANT: Ensure playsInline for iOS
                    videoEl.setAttribute('playsinline', 'true'); 
                    
                    // Start Smart Tracking (AI Zoom) once metadata is loaded
                    videoEl.addEventListener('loadedmetadata', () => {
                        startSmartTracking();
                    });
                }

                const track = getActiveTrack();
                if (track) {
                    trackRef.current = track;
                    const capabilities = track.getCapabilities() as any;
                    const settings = track.getSettings();

                    // Check Torch - Disable on iOS immediately (WebKit JS constraint)
                    if (!isIosDevice && 'torch' in capabilities) {
                        setIsTorchSupported(true);
                    } else {
                        setIsTorchSupported(false);
                    }

                    // Check Zoom Capability
                    // @ts-ignore
                    if (capabilities.zoom) {
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
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
        handleZoomChange: setSmoothZoom,
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

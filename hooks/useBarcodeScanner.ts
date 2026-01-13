
import { useState, useEffect, useRef, useCallback } from 'react';

interface ScannerConfig {
    fps: number;
    qrbox: number;
    aspectRatio: number;
    videoConstraints?: any;
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
            // Try standard constraints application first (widely supported)
            await track.applyConstraints(constraints);
        } catch (e) {
            // Fallback to 'advanced' constraints if standard fails (older Android/Chrome)
            try {
                await track.applyConstraints({ advanced: [constraints] });
            } catch (e2) {
                console.warn("Constraint application failed:", e2);
            }
        }
    };

    // --- Focus Logic ---
    const triggerFocus = useCallback(async () => {
        const track = getActiveTrack();
        if (!track) return;

        const capabilities = track.getCapabilities() as any;
        if (!capabilities.focusMode) return;

        console.log("Triggering focus. Capabilities:", capabilities.focusMode);

        try {
            // Strategy: Toggle to 'single-shot' (macro/lock) then back to 'continuous' to force a hunt
            if (capabilities.focusMode.includes('single-shot') && capabilities.focusMode.includes('continuous')) {
                // Switch to single-shot to lock/refocus at current point
                await applyConstraints({ focusMode: 'single-shot' });
                
                // Revert to continuous after a delay to ensure it stays focused but resumes tracking
                setTimeout(async () => {
                    await applyConstraints({ focusMode: 'continuous' });
                }, 1500);
            } 
            else if (capabilities.focusMode.includes('continuous')) {
                // If only continuous is supported, just re-apply it
                await applyConstraints({ focusMode: 'continuous' });
            } 
            else if (capabilities.focusMode.includes('single-shot')) {
                // Force a single focus attempt
                await applyConstraints({ focusMode: 'single-shot' });
            }
        } catch (err) {
            console.warn("Focus trigger failed", err);
        }
    }, []);

    // --- Torch Logic ---
    const toggleTorch = useCallback(async () => {
        const track = getActiveTrack();
        if (!track) return;

        const newStatus = !isTorchOn;
        try {
            // Torch is often treated as an advanced constraint
            await track.applyConstraints({ advanced: [{ torch: newStatus } as any] });
            setIsTorchOn(newStatus);
        } catch (err) {
            console.error("Torch toggle failed", err);
            // Retry with standard constraint
            try {
                await track.applyConstraints({ torch: newStatus } as any);
                setIsTorchOn(newStatus);
            } catch(e2) {
                // If it fails, assume not supported
                const capabilities = track.getCapabilities() as any;
                if (!capabilities.torch) setIsTorchSupported(false);
            }
        }
    }, [isTorchOn]);

    // --- Smooth Zoom Logic ---
    const setSmoothZoom = useCallback(async (targetZoom: number) => {
        const track = getActiveTrack();
        if (!track || !zoomCapabilities) return;

        // Clamp target
        let z = Math.max(zoomCapabilities.min, Math.min(targetZoom, zoomCapabilities.max));
        
        // Update UI state immediately
        setZoom(z);

        // Apply to camera
        await applyConstraints({ zoom: z });
    }, [zoomCapabilities]);

    // --- AI Tracking & Auto-Zoom Loop ---
    const startSmartTracking = () => {
        // @ts-ignore
        if (!window.BarcodeDetector) return; // Feature detection

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

                    // Update UI Overlay (Percentages)
                    setTrackingBox({
                        x: (x / vWidth) * 100,
                        y: (y / vHeight) * 100,
                        width: (width / vWidth) * 100,
                        height: (height / vHeight) * 100
                    });

                    // --- Auto Zoom Logic ---
                    // If barcode width is less than 35% of screen width, zoom in
                    const widthRatio = width / vWidth;
                    const track = getActiveTrack();
                    
                    if (track && widthRatio < 0.35) {
                        const caps = track.getCapabilities();
                        // @ts-ignore
                        const currentZoom = track.getSettings().zoom || 1;
                        // @ts-ignore
                        const maxZoom = Math.min(caps.zoom?.max || 3, 3); // Limit auto-zoom to 3x

                        if (currentZoom < maxZoom) {
                            setIsAutoZooming(true);
                            // Calculate gradual step
                            const newZoom = Math.min(currentZoom + 0.02, maxZoom); // Slower zoom step for smoothness
                            
                            // Use the robust applyConstraints helper
                            applyConstraints({ zoom: newZoom });
                            setZoom(newZoom);
                        }
                    } else {
                        setIsAutoZooming(false);
                    }

                } else {
                    setTrackingBox(null);
                    setIsAutoZooming(false);
                }
            } catch (err) {
                // Squelch detection errors
            }
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
            setIsTorchOn(false); // Reset torch state on camera switch
            setZoom(1); // Reset zoom
            
            // @ts-ignore
            const html5QrCode = new window.Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;

            // Improved Camera Config: Ensure rear camera is used with facingMode inside videoConstraints
            const videoConstraints = {
                facingMode: facingMode, // DYNAMIC FACING MODE
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                focusMode: "continuous"
            };

            const config: ScannerConfig = { 
                fps: 30, 
                qrbox: 280, // Slightly larger box
                aspectRatio: 1.0,
                videoConstraints: videoConstraints
            };

            // This is the first argument for start(), keep it minimal to avoid "exact key" errors
            const cameraConfig = { 
                facingMode: facingMode
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
                await html5QrCode.start(cameraConfig, config, onScanSuccess, undefined);
                
                // --- Post-Start Configuration ---
                
                // 1. Grab Video Element for Tracking
                const videoEl = document.querySelector(`#${elementId} video`) as HTMLVideoElement;
                if (videoEl) {
                    videoRef.current = videoEl;
                    // Wait for metadata to load to ensure dimensions are correct
                    videoEl.addEventListener('loadedmetadata', () => {
                        startSmartTracking();
                    });
                }

                // 2. Initialize Capabilities (Zoom/Torch/Focus)
                const track = getActiveTrack();
                if (track) {
                    trackRef.current = track;
                    const capabilities = track.getCapabilities() as any;
                    const settings = track.getSettings();

                    // Check Torch - Assuming support if capabilities exist, or let user try.
                    // We default to true in UI, but check here for state accuracy.
                    if ('torch' in capabilities) {
                        setIsTorchSupported(true);
                        // @ts-ignore
                        setIsTorchOn(settings.torch || false);
                    } else {
                        // Fallback: Assume supported on mobile rear camera only
                        setIsTorchSupported(facingMode === 'environment'); 
                    }

                    // Check Zoom
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

                    // Auto-enable continuous focus if available (Double check)
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                        applyConstraints({ focusMode: 'continuous' });
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
    }, [facingMode]); // Re-run when facingMode changes

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

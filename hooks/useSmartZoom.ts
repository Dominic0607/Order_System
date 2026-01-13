
import { useState, useRef, useEffect, useCallback } from 'react';
import { detectBarcodeRegion } from '../utils/visionAlgorithm';

interface TrackingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Helper: Linear Interpolation for smooth movement
const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
};

export const useSmartZoom = (
    videoElement: HTMLVideoElement | null, 
    track: MediaStreamTrack | null,
    currentZoom: number,
    setZoom: (z: number) => void,
    applyZoom: (z: number) => Promise<void>
) => {
    const [trackingBox, setTrackingBox] = useState<TrackingBox | null>(null);
    const [isAutoZooming, setIsAutoZooming] = useState(false);
    
    const requestRef = useRef<number>(0);
    const lastZoomTime = useRef<number>(0);
    const stableFramesRef = useRef<number>(0);
    const lostFramesRef = useRef<number>(0);
    const targetBoxRef = useRef<TrackingBox | null>(null);
    const cooldownRef = useRef<number>(0); 
    
    // Native Barcode Detector Reference (For Android/Chrome)
    const nativeDetectorRef = useRef<any>(null);

    // Initialize Native Detector if available
    useEffect(() => {
        // @ts-ignore
        if ('BarcodeDetector' in window) {
            try {
                // @ts-ignore
                nativeDetectorRef.current = new window.BarcodeDetector({
                    formats: ['qr_code', 'ean_13', 'code_128', 'ean_8', 'code_39', 'upc_a']
                });
            } catch (e) {
                // Fallback to custom vision
            }
        }
    }, []);

    const notifyManualZoom = () => {
        // Increased cooldown for iOS stability
        cooldownRef.current = Date.now() + 3000; 
        setIsAutoZooming(false);
    };

    const runLoop = useCallback(async () => {
        if (!videoElement || videoElement.paused || videoElement.ended) {
            requestRef.current = requestAnimationFrame(runLoop);
            return;
        }

        let result = null;

        // 1. Try Native AI Detection (Android/Chrome)
        // Native is always preferred if available as it reads the actual QR data location
        if (nativeDetectorRef.current) {
            try {
                const features = await nativeDetectorRef.current.detect(videoElement);
                if (features.length > 0) {
                    // Pick the largest code
                    const f = features.sort((a: any, b: any) => (b.boundingBox.width * b.boundingBox.height) - (a.boundingBox.width * a.boundingBox.height))[0];
                    const bb = f.boundingBox;
                    const vw = videoElement.videoWidth;
                    const vh = videoElement.videoHeight;
                    
                    if (vw > 0 && vh > 0) {
                        result = {
                            x: (bb.x + bb.width / 2) / vw * 100,
                            y: (bb.y + bb.height / 2) / vh * 100,
                            width: bb.width / vw * 100,
                            height: bb.height / vh * 100
                        };
                    }
                }
            } catch (e) { }
        }

        // 2. Fallback to Custom Vision Algorithm (iOS/Safari/Telegram)
        // Only run if native didn't find anything
        if (!result) {
            result = detectBarcodeRegion(videoElement);
        }

        if (result) {
            lostFramesRef.current = 0; 
            
            // Initialization: If target doesn't exist, set it immediately without smoothing
            if (!targetBoxRef.current) {
                targetBoxRef.current = result;
            } else {
                // Data Smoothing: Filter out jittery measurements from the algorithm
                // We use a slower lerp (0.3) for the internal target to ignore single-frame glitches
                targetBoxRef.current = {
                    x: lerp(targetBoxRef.current.x, result.x, 0.3),
                    y: lerp(targetBoxRef.current.y, result.y, 0.3),
                    width: lerp(targetBoxRef.current.width, result.width, 0.3),
                    height: lerp(targetBoxRef.current.height, result.height, 0.3)
                };
            }

            // UI Smoothing: Update the visible state very smoothly
            setTrackingBox(prev => {
                if (!prev) return targetBoxRef.current;
                
                // Very smooth movement for UI (slower lerp factor 0.15)
                // This makes the box feel "heavy" and stable on iOS
                return {
                    x: lerp(prev.x, targetBoxRef.current!.x, 0.15),
                    y: lerp(prev.y, targetBoxRef.current!.y, 0.15),
                    width: lerp(prev.width, targetBoxRef.current!.width, 0.1),
                    height: lerp(prev.height, targetBoxRef.current!.height, 0.1)
                };
            });

            // --- AUTO ZOOM LOGIC ---
            if (Date.now() > cooldownRef.current) {
                // Stricter center check (40-60% of screen) to avoid zooming on edge noise
                const isCentered = result.x > 35 && result.x < 65 && result.y > 35 && result.y < 65;
                
                // We want the barcode to fill about 45% of the frame width
                const targetWidthPercent = 45;
                const isSmall = result.width < targetWidthPercent;
                
                if (isCentered && isSmall) {
                    stableFramesRef.current++;
                } else {
                    // Decrease stability slowly instead of resetting to 0
                    stableFramesRef.current = Math.max(0, stableFramesRef.current - 2);
                }

                // Android/Native usually runs faster, so we can use a lower threshold (15 frames)
                if (stableFramesRef.current > 15) { 
                    const now = Date.now();
                    // Update zoom every 100ms for responsiveness
                    if (now - lastZoomTime.current > 100) {
                        
                        // Get Hardware Capabilities
                        // @ts-ignore
                        const capabilities = track?.getCapabilities?.();
                        // Allow up to 5x zoom if hardware supports it, default to 5 if unknown
                        const hardwareMax = (capabilities as any)?.zoom?.max || 5.0;
                        const effectiveMax = Math.min(hardwareMax, 5.0);

                        if (currentZoom < effectiveMax) {
                            setIsAutoZooming(true);
                            
                            // Proportional Zoom Logic:
                            // The smaller the barcode (larger error), the faster we zoom.
                            // Error = Goal Size - Current Size
                            const error = targetWidthPercent - result.width;
                            
                            // Gain factor (K) - adjust for speed vs stability
                            const kP = 0.008; 
                            
                            // Calculate step based on error, scaled by current zoom level
                            let step = error * kP * currentZoom;
                            
                            // Clamp step to reasonable limits (min 0.02 for slow crawl, max 0.5 for fast jump)
                            step = Math.max(0.02, Math.min(step, 0.5));

                            const newZoom = Math.min(currentZoom + step, effectiveMax);
                            
                            // Only apply if the change is significant enough to matter
                            if (Math.abs(newZoom - currentZoom) > 0.01) {
                                setZoom(newZoom);
                                applyZoom(newZoom);
                            }
                            lastZoomTime.current = now;
                        }
                    }
                } else {
                    setIsAutoZooming(false);
                }
            } else {
                setIsAutoZooming(false);
            }

        } else {
            lostFramesRef.current++;
            // Wait longer (15 frames) before hiding box to prevent flickering during scan
            if (lostFramesRef.current > 15) {
                setTrackingBox(null);
                targetBoxRef.current = null;
                setIsAutoZooming(false);
                stableFramesRef.current = 0;
            }
        }

        requestRef.current = requestAnimationFrame(runLoop);
    }, [videoElement, currentZoom, setZoom, applyZoom, track]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(runLoop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [runLoop]);

    return { trackingBox, isAutoZooming, notifyManualZoom };
};


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
                console.warn("Native fallback");
            }
        }
    }, []);

    const notifyManualZoom = () => {
        cooldownRef.current = Date.now() + 3000; // Increased cooldown for iOS stability
        setIsAutoZooming(false);
    };

    const runLoop = useCallback(async () => {
        if (!videoElement || videoElement.paused || videoElement.ended) {
            requestRef.current = requestAnimationFrame(runLoop);
            return;
        }

        let result = null;

        // 1. Try Native AI Detection (Android/Chrome)
        if (nativeDetectorRef.current) {
            try {
                const features = await nativeDetectorRef.current.detect(videoElement);
                if (features.length > 0) {
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

        // 2. Fallback to Custom Vision Algorithm (iOS/Safari)
        if (!result) {
            result = detectBarcodeRegion(videoElement);
        }

        if (result) {
            lostFramesRef.current = 0; 
            
            // If target doesn't exist, set it immediately
            if (!targetBoxRef.current) {
                targetBoxRef.current = result;
            } else {
                // Smooth target transition (filter out jittery measurements)
                // Use a slower lerp for the target itself to ignore single-frame glitches
                targetBoxRef.current = {
                    x: lerp(targetBoxRef.current.x, result.x, 0.3),
                    y: lerp(targetBoxRef.current.y, result.y, 0.3),
                    width: lerp(targetBoxRef.current.width, result.width, 0.3),
                    height: lerp(targetBoxRef.current.height, result.height, 0.3)
                };
            }

            setTrackingBox(prev => {
                if (!prev) return targetBoxRef.current;
                
                // Very smooth movement for UI (slower lerp factor)
                return {
                    x: lerp(prev.x, targetBoxRef.current!.x, 0.15),
                    y: lerp(prev.y, targetBoxRef.current!.y, 0.15),
                    width: lerp(prev.width, targetBoxRef.current!.width, 0.1),
                    height: lerp(prev.height, targetBoxRef.current!.height, 0.1)
                };
            });

            // --- AUTO ZOOM LOGIC ---
            if (Date.now() > cooldownRef.current) {
                // Stricter center check
                const isCentered = result.x > 40 && result.x < 60 && result.y > 40 && result.y < 60;
                const isSmall = result.width < 25; // Only zoom if it's quite small
                
                if (isCentered && isSmall) {
                    stableFramesRef.current++;
                } else {
                    // Decrease slowly instead of reset to 0 to be more forgiving
                    stableFramesRef.current = Math.max(0, stableFramesRef.current - 2);
                }

                if (stableFramesRef.current > 20) { // Require more stable frames
                    const now = Date.now();
                    if (now - lastZoomTime.current > 150) {
                        setIsAutoZooming(true);
                        const step = result.width < 10 ? 0.2 : 0.05; // Gentle zoom steps
                        const newZoom = Math.min(currentZoom + step, 3.0); 
                        
                        if (Math.abs(newZoom - currentZoom) > 0.01) {
                            setZoom(newZoom);
                            applyZoom(newZoom);
                        }
                        lastZoomTime.current = now;
                    }
                } else {
                    setIsAutoZooming(false);
                }
            } else {
                setIsAutoZooming(false);
            }

        } else {
            lostFramesRef.current++;
            // Wait longer before hiding box to prevent flickering
            if (lostFramesRef.current > 15) {
                setTrackingBox(null);
                targetBoxRef.current = null;
                setIsAutoZooming(false);
                stableFramesRef.current = 0;
            }
        }

        requestRef.current = requestAnimationFrame(runLoop);
    }, [videoElement, currentZoom, setZoom, applyZoom]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(runLoop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [runLoop]);

    return { trackingBox, isAutoZooming, notifyManualZoom };
};

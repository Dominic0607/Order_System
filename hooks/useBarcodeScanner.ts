
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
                console.log("Using Native AI BarcodeDetector");
            } catch (e) {
                console.warn("Native BarcodeDetector failed to init, using fallback.");
            }
        }
    }, []);

    const notifyManualZoom = () => {
        cooldownRef.current = Date.now() + 2000;
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
                    // Get the biggest code found
                    const f = features.sort((a: any, b: any) => (b.boundingBox.width * b.boundingBox.height) - (a.boundingBox.width * a.boundingBox.height))[0];
                    const bb = f.boundingBox;
                    
                    // Convert pixels to percentages
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
            } catch (e) {
                // Silently fail to fallback
            }
        }

        // 2. Fallback to Custom Vision Algorithm (iOS/Safari) if Native returned nothing
        if (!result) {
            result = detectBarcodeRegion(videoElement);
        }

        if (result) {
            lostFramesRef.current = 0; 
            
            targetBoxRef.current = {
                x: result.x,
                y: result.y,
                width: result.width,
                height: result.height
            };

            setTrackingBox(prev => {
                if (!prev) return targetBoxRef.current;
                if (!targetBoxRef.current) return prev;
                return {
                    x: lerp(prev.x, targetBoxRef.current.x, 0.2),
                    y: lerp(prev.y, targetBoxRef.current.y, 0.2),
                    width: lerp(prev.width, targetBoxRef.current.width, 0.1),
                    height: lerp(prev.height, targetBoxRef.current.height, 0.1)
                };
            });

            // --- AUTO ZOOM LOGIC ---
            if (Date.now() > cooldownRef.current) {
                // Center Check: 35-65%
                const isCentered = result.x > 35 && result.x < 65 && result.y > 35 && result.y < 65;
                // Small Check: < 30% width
                const isSmall = result.width < 30; 
                
                if (isCentered && isSmall) {
                    stableFramesRef.current++;
                } else {
                    stableFramesRef.current = 0;
                }

                if (stableFramesRef.current > 15) {
                    const now = Date.now();
                    if (now - lastZoomTime.current > 100) {
                        setIsAutoZooming(true);
                        // Zoom faster if using Native AI (more confident)
                        const step = result.width < 15 ? 0.3 : 0.1;
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
            if (lostFramesRef.current > 10) {
                setTrackingBox(null);
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

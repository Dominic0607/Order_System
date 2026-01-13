
import { useState, useRef, useEffect, useCallback } from 'react';
import { detectBarcodeRegion } from '../utils/visionAlgorithm';
import { isIOS } from '../utils/platform';

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
    const stableFramesRef = useRef<number>(0);
    const lostFramesRef = useRef<number>(0);
    const targetBoxRef = useRef<TrackingBox | null>(null);
    const cooldownRef = useRef<number>(0); 
    
    // Locks
    const isApplyingZoomRef = useRef(false);
    const isDetectingRef = useRef(false); // Prevents Native API queue stacking
    
    // Native Barcode Detector Reference (For Android/Chrome - Hardware Accelerated)
    const nativeDetectorRef = useRef<any>(null);

    // Initialize Native Detector if available
    useEffect(() => {
        // @ts-ignore
        if ('BarcodeDetector' in window && !isIOS()) {
            try {
                console.log("Initializing Native BarcodeDetector...");
                // @ts-ignore
                nativeDetectorRef.current = new window.BarcodeDetector({
                    // Only detect common formats for speed
                    formats: ['qr_code', 'ean_13', 'code_128', 'code_39'] 
                });
            } catch (e) {
                console.warn("Native BarcodeDetector failed to init:", e);
            }
        }
    }, []);

    const notifyManualZoom = () => {
        cooldownRef.current = Date.now() + 3000; 
        setIsAutoZooming(false);
    };

    const runLoop = useCallback(async () => {
        // *** CRITICAL IOS CHECK ***
        if (isIOS()) return;

        if (!videoElement || videoElement.paused || videoElement.ended) {
            requestRef.current = requestAnimationFrame(runLoop);
            return;
        }

        let result = null;

        // 1. Native AI Detection (Android/Desktop Chrome)
        // We use a lock (isDetectingRef) to ensure we don't spam the async detect() call
        // which can cause frame drops on some Android devices.
        if (nativeDetectorRef.current) {
            if (!isDetectingRef.current) {
                isDetectingRef.current = true;
                try {
                    const features = await nativeDetectorRef.current.detect(videoElement);
                    if (features.length > 0) {
                        // Pick the largest barcode
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
                } catch (e) {
                    // Ignore detection errors
                } finally {
                    isDetectingRef.current = false;
                }
            } else {
                // If detection is still running, skip this frame to save resources
                // But keep the old result if we had one (to prevent flickering)
                if (targetBoxRef.current) {
                    // Logic to keep old box momentarily could go here, 
                    // but usually we just wait for the next loop.
                }
            }
        } 
        // 2. Fallback Custom Vision (Only if Native failed/missing)
        else {
            result = detectBarcodeRegion(videoElement);
        }

        // Processing Logic (Only runs if we got a new result this frame)
        if (result) {
            lostFramesRef.current = 0; 
            
            // Smoothing for Target Box (Internal)
            if (!targetBoxRef.current) {
                targetBoxRef.current = result;
            } else {
                targetBoxRef.current = {
                    x: lerp(targetBoxRef.current.x, result.x, 0.4), // Faster tracking response
                    y: lerp(targetBoxRef.current.y, result.y, 0.4),
                    width: lerp(targetBoxRef.current.width, result.width, 0.4),
                    height: lerp(targetBoxRef.current.height, result.height, 0.4)
                };
            }

            // Smoothing for UI Box (Visual)
            setTrackingBox(prev => {
                if (!prev) return targetBoxRef.current;
                return {
                    x: lerp(prev.x, targetBoxRef.current!.x, 0.25),
                    y: lerp(prev.y, targetBoxRef.current!.y, 0.25),
                    width: lerp(prev.width, targetBoxRef.current!.width, 0.2),
                    height: lerp(prev.height, targetBoxRef.current!.height, 0.2)
                };
            });

            // --- AGGRESSIVE AUTO ZOOM LOGIC (ANDROID) ---
            if (Date.now() > cooldownRef.current) {
                const isCentered = result.x > 30 && result.x < 70 && result.y > 30 && result.y < 70;
                
                // Target width is 60% of screen (Very close zoom)
                const targetWidthPercent = 60; 
                const isSmall = result.width < targetWidthPercent;
                
                if (isCentered && isSmall) {
                    stableFramesRef.current++;
                } else {
                    stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
                }

                // Fast reaction: Zoom after 3 stable frames
                if (stableFramesRef.current > 3) { 
                    let hardwareMax = 5.0;
                    try {
                        // @ts-ignore
                        const capabilities = track?.getCapabilities ? track.getCapabilities() : {};
                        // @ts-ignore
                        if (capabilities.zoom && capabilities.zoom.max) {
                            // @ts-ignore
                            hardwareMax = capabilities.zoom.max;
                        }
                    } catch(e) {}
                    const effectiveMax = Math.min(hardwareMax, 8.0);

                    const error = targetWidthPercent - result.width;

                    // Dead band: 2%
                    if (Math.abs(error) > 2 && currentZoom < effectiveMax && !isApplyingZoomRef.current) {
                        setIsAutoZooming(true);
                        
                        // High Gain
                        const kP = 0.01; 
                        let delta = error * kP * currentZoom;
                        delta = Math.max(-0.2, Math.min(delta, 0.2)); // Cap speed

                        const newZoom = Math.min(Math.max(currentZoom + delta, 1.0), effectiveMax);
                        
                        if (Math.abs(newZoom - currentZoom) > 0.02) {
                            isApplyingZoomRef.current = true;
                            setZoom(newZoom);
                            applyZoom(newZoom)
                                .catch(e => {})
                                .finally(() => {
                                    isApplyingZoomRef.current = false;
                                });
                        }
                    } 
                }
            }

        } else {
            lostFramesRef.current++;
            if (lostFramesRef.current > 10) {
                setTrackingBox(null);
                targetBoxRef.current = null;
                setIsAutoZooming(false);
                stableFramesRef.current = 0;
            }
        }

        requestRef.current = requestAnimationFrame(runLoop);
    }, [videoElement, currentZoom, setZoom, applyZoom, track]);

    useEffect(() => {
        if (!isIOS()) {
            requestRef.current = requestAnimationFrame(runLoop);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [runLoop]);

    return { trackingBox, isAutoZooming, notifyManualZoom };
};

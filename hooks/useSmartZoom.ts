
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
    
    // Lock to prevent overlapping hardware zoom calls which causes stutter
    const isApplyingZoomRef = useRef(false);
    
    // Native Barcode Detector Reference (For Android/Chrome - Hardware Accelerated)
    const nativeDetectorRef = useRef<any>(null);

    // Initialize Native Detector if available
    useEffect(() => {
        // @ts-ignore
        if ('BarcodeDetector' in window && !isIOS()) {
            try {
                // @ts-ignore
                nativeDetectorRef.current = new window.BarcodeDetector({
                    formats: ['qr_code', 'ean_13', 'code_128', 'ean_8', 'code_39', 'upc_a']
                });
            } catch (e) {
                // Fallback
            }
        }
    }, []);

    const notifyManualZoom = () => {
        cooldownRef.current = Date.now() + 3000; 
        setIsAutoZooming(false);
    };

    const runLoop = useCallback(async () => {
        // *** CRITICAL IOS CHECK ***
        // Disable all AI tracking and zooming logic for iOS to maximize performance and clarity
        if (isIOS()) {
            return;
        }

        if (!videoElement || videoElement.paused || videoElement.ended) {
            requestRef.current = requestAnimationFrame(runLoop);
            return;
        }

        let result = null;

        // 1. Native AI Detection (Android/Desktop Chrome)
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

        // 2. Fallback Custom Vision (Only if not iOS and Native failed)
        if (!result && !isIOS()) {
            result = detectBarcodeRegion(videoElement);
        }

        if (result) {
            lostFramesRef.current = 0; 
            
            // Smoothing for Target Box (Internal)
            if (!targetBoxRef.current) {
                targetBoxRef.current = result;
            } else {
                targetBoxRef.current = {
                    x: lerp(targetBoxRef.current.x, result.x, 0.3),
                    y: lerp(targetBoxRef.current.y, result.y, 0.3),
                    width: lerp(targetBoxRef.current.width, result.width, 0.3),
                    height: lerp(targetBoxRef.current.height, result.height, 0.3)
                };
            }

            // Smoothing for UI Box (Visual)
            setTrackingBox(prev => {
                if (!prev) return targetBoxRef.current;
                return {
                    x: lerp(prev.x, targetBoxRef.current!.x, 0.15),
                    y: lerp(prev.y, targetBoxRef.current!.y, 0.15),
                    width: lerp(prev.width, targetBoxRef.current!.width, 0.1),
                    height: lerp(prev.height, targetBoxRef.current!.height, 0.1)
                };
            });

            // --- SMOOTH AUTO ZOOM LOGIC ---
            if (Date.now() > cooldownRef.current) {
                const isCentered = result.x > 35 && result.x < 65 && result.y > 35 && result.y < 65;
                const targetWidthPercent = 45; // Goal: Barcode takes up 45% of screen
                const isSmall = result.width < targetWidthPercent;
                
                if (isCentered && isSmall) {
                    stableFramesRef.current++;
                } else {
                    stableFramesRef.current = Math.max(0, stableFramesRef.current - 2);
                }

                if (stableFramesRef.current > 10) { 
                    // Get Hardware Constraints
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
                    const effectiveMax = Math.min(hardwareMax, 5.0);

                    // Error = Goal - Current
                    const error = targetWidthPercent - result.width;

                    // DEAD BAND: If error is small (< 3%), don't zoom. This stops "breathing/jittering".
                    if (Math.abs(error) > 3 && currentZoom < effectiveMax && !isApplyingZoomRef.current) {
                        setIsAutoZooming(true);
                        
                        // Lower gain for smoother transitions (0.004)
                        const kP = 0.004; 
                        
                        // Calculate step. Scale by currentZoom so zooming gets faster as we zoom in (logarithmic feel)
                        let delta = error * kP * currentZoom;
                        
                        // Clamp delta to avoid massive jumps, but allow small smooth ones
                        delta = Math.max(-0.1, Math.min(delta, 0.1));

                        const newZoom = Math.min(Math.max(currentZoom + delta, 1.0), effectiveMax);
                        
                        // Only apply if the change is significant enough for the hardware to register (usually > 0.05 steps)
                        // This prevents flooding the driver with micro-adjustments
                        if (Math.abs(newZoom - currentZoom) > 0.02) {
                            isApplyingZoomRef.current = true;
                            
                            // Optimistically update state
                            setZoom(newZoom);
                            
                            // Apply to hardware and release lock when done
                            applyZoom(newZoom)
                                .catch(e => {
                                    console.warn("Zoom failed", e);
                                })
                                .finally(() => {
                                    isApplyingZoomRef.current = false;
                                });
                        } else {
                            // If change is too small, just reset lock immediately
                            isApplyingZoomRef.current = false;
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
            if (lostFramesRef.current > 20) {
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

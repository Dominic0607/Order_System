
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
    
    // Lock to prevent overlapping hardware zoom calls
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

        // 1. Native AI Detection (Android/Desktop Chrome) - PRIORITIZED FOR SPEED
        if (nativeDetectorRef.current) {
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
                    x: lerp(prev.x, targetBoxRef.current!.x, 0.2), // Faster visual update
                    y: lerp(prev.y, targetBoxRef.current!.y, 0.2),
                    width: lerp(prev.width, targetBoxRef.current!.width, 0.15),
                    height: lerp(prev.height, targetBoxRef.current!.height, 0.15)
                };
            });

            // --- AGGRESSIVE AUTO ZOOM LOGIC (ANDROID) ---
            if (Date.now() > cooldownRef.current) {
                // Check if centered with wider tolerance
                const isCentered = result.x > 30 && result.x < 70 && result.y > 30 && result.y < 70;
                
                // Target width is 55% of screen (Zoom closer)
                const targetWidthPercent = 55; 
                const isSmall = result.width < targetWidthPercent;
                
                if (isCentered && isSmall) {
                    stableFramesRef.current++;
                } else {
                    stableFramesRef.current = Math.max(0, stableFramesRef.current - 1); // Decay slower
                }

                // Fast reaction: Zoom after 5 stable frames (approx 160ms @ 30fps)
                if (stableFramesRef.current > 5) { 
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
                    const effectiveMax = Math.min(hardwareMax, 8.0); // Allow up to 8x if hardware supports

                    // Error = Goal - Current
                    const error = targetWidthPercent - result.width;

                    // Dead band: 2% (Zoom even on small differences)
                    if (Math.abs(error) > 2 && currentZoom < effectiveMax && !isApplyingZoomRef.current) {
                        setIsAutoZooming(true);
                        
                        // Higher Gain for Speed: 0.008 (Double previous)
                        const kP = 0.008; 
                        
                        // Calculate step. Scale by currentZoom for logarithmic feel
                        let delta = error * kP * currentZoom;
                        
                        // Allow larger jumps for speed
                        delta = Math.max(-0.15, Math.min(delta, 0.15));

                        const newZoom = Math.min(Math.max(currentZoom + delta, 1.0), effectiveMax);
                        
                        // Apply if change is significant enough
                        if (Math.abs(newZoom - currentZoom) > 0.02) {
                            isApplyingZoomRef.current = true;
                            
                            setZoom(newZoom);
                            
                            applyZoom(newZoom)
                                .catch(e => {
                                    // console.warn("Zoom failed", e);
                                })
                                .finally(() => {
                                    isApplyingZoomRef.current = false;
                                });
                        } else {
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
            if (lostFramesRef.current > 15) { // Reset faster if lost
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

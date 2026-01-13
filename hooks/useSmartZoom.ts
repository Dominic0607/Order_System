
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
    
    // Cooldown prevents auto-zoom from triggering immediately after manual zoom
    const cooldownRef = useRef<number>(0); 

    // Function to notify that user manually zoomed
    const notifyManualZoom = () => {
        cooldownRef.current = Date.now() + 2000; // 2 seconds cooldown
        setIsAutoZooming(false);
    };

    const runLoop = useCallback(() => {
        if (!videoElement || videoElement.paused || videoElement.ended) {
            requestRef.current = requestAnimationFrame(runLoop);
            return;
        }

        // Run the "AI" Detection
        const result = detectBarcodeRegion(videoElement);

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
            // Only run if not in cooldown
            if (Date.now() > cooldownRef.current) {
                // If code is centered (35-65%) AND small (<30%), zoom in
                const isCentered = result.x > 35 && result.x < 65 && result.y > 35 && result.y < 65;
                const isSmall = result.width < 30; 
                
                if (isCentered && isSmall) {
                    stableFramesRef.current++;
                } else {
                    stableFramesRef.current = 0;
                }

                // If stable for ~0.5s, trigger zoom
                if (stableFramesRef.current > 15) {
                    const now = Date.now();
                    if (now - lastZoomTime.current > 100) {
                        setIsAutoZooming(true);
                        // Smart Step: If very small, zoom faster
                        const step = result.width < 15 ? 0.2 : 0.05;
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
            // Lost tracking logic
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

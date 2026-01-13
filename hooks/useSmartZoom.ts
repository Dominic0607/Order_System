
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
    const lostFramesRef = useRef<number>(0); // To handle momentary loss of tracking

    // Keep track of target values for smooth animation
    const targetBoxRef = useRef<TrackingBox | null>(null);

    const runLoop = useCallback(() => {
        if (!videoElement || videoElement.paused || videoElement.ended) {
            requestRef.current = requestAnimationFrame(runLoop);
            return;
        }

        // Run the "AI" Detection
        const result = detectBarcodeRegion(videoElement);

        if (result) {
            lostFramesRef.current = 0; // Reset lost counter
            
            // Set the new target
            targetBoxRef.current = {
                x: result.x,
                y: result.y,
                width: result.width,
                height: result.height
            };

            // Smoothly move current box towards target (Lerp factor 0.15 = moderately fast but smooth)
            setTrackingBox(prev => {
                if (!prev) return targetBoxRef.current;
                if (!targetBoxRef.current) return prev;

                return {
                    x: lerp(prev.x, targetBoxRef.current.x, 0.2),
                    y: lerp(prev.y, targetBoxRef.current.y, 0.2),
                    width: lerp(prev.width, targetBoxRef.current.width, 0.1), // Width/Height change slower
                    height: lerp(prev.height, targetBoxRef.current.height, 0.1)
                };
            });

            // --- AUTO ZOOM LOGIC ---
            // If the code is centered (30-70%) AND small (<35%), zoom in
            const isCentered = result.x > 30 && result.x < 70 && result.y > 30 && result.y < 70;
            const isSmall = result.width < 35; 
            
            if (isCentered && isSmall) {
                stableFramesRef.current++;
            } else {
                stableFramesRef.current = 0;
            }

            // If stable for ~0.5s (15 frames), trigger zoom
            if (stableFramesRef.current > 15) {
                const now = Date.now();
                if (now - lastZoomTime.current > 100) {
                    setIsAutoZooming(true);
                    // Zoom in slowly
                    const newZoom = Math.min(currentZoom + 0.1, 3.0); 
                    
                    if (Math.abs(newZoom - currentZoom) > 0.05) {
                        setZoom(newZoom);
                        applyZoom(newZoom);
                    }
                    lastZoomTime.current = now;
                }
            } else {
                setIsAutoZooming(false);
            }

        } else {
            // If lost detection, don't remove box immediately. Wait 5 frames (hysteresis).
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

    return { trackingBox, isAutoZooming };
};

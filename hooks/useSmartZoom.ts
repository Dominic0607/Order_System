
import { useState, useRef, useEffect, useCallback } from 'react';
import { detectBarcodeRegion } from '../utils/visionAlgorithm';

interface TrackingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

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

    const runLoop = useCallback(() => {
        if (!videoElement || videoElement.paused || videoElement.ended) {
            requestRef.current = requestAnimationFrame(runLoop);
            return;
        }

        // Run detection
        const result = detectBarcodeRegion(videoElement);

        if (result) {
            // Smoothly interpolate UI Box position (Low-pass filter)
            setTrackingBox(prev => {
                if (!prev) return { x: result.x, y: result.y, width: result.width, height: result.height };
                return {
                    x: prev.x + (result.x - prev.x) * 0.2, // Smooth ease
                    y: prev.y + (result.y - prev.y) * 0.2,
                    width: prev.width + (result.width - prev.width) * 0.2,
                    height: prev.height + (result.height - prev.height) * 0.2,
                };
            });

            // --- AUTO ZOOM LOGIC ---
            // If the object is centered BUT small (far away), Zoom in.
            const isCentered = result.x > 35 && result.x < 65 && result.y > 35 && result.y < 65;
            const isSmall = result.width < 40; // Less than 40% of screen
            
            if (isCentered && isSmall) {
                stableFramesRef.current++;
            } else {
                stableFramesRef.current = 0;
            }

            // Only zoom if stable for 10 frames (approx 0.3s) to prevent jitter
            if (stableFramesRef.current > 10) {
                const now = Date.now();
                // Limit zoom updates to every 50ms
                if (now - lastZoomTime.current > 50) {
                    setIsAutoZooming(true);
                    // Zoom Step: Small increment
                    const newZoom = Math.min(currentZoom + 0.05, 3.0); // Max zoom 3x
                    
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
            // No barcode found -> Reset tracking
            setTrackingBox(null);
            setIsAutoZooming(false);
            stableFramesRef.current = 0;
            
            // Optional: Slowly zoom out if nothing found for a long time?
            // For now, we keep the zoom level to allow manual control.
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


/**
 * Advanced Computer Vision Algorithm for Web-based Barcode/QR Tracking
 * Simulates "Native AI" behavior using Texture Energy Analysis with Center Weighting.
 */

interface RegionOfInterest {
    x: number;      // Center X %
    y: number;      // Center Y %
    width: number;  // Width %
    height: number; // Height %
    score: number;  // Confidence score
}

let analysisCanvas: HTMLCanvasElement | null = null;
let analysisCtx: CanvasRenderingContext2D | null = null;

export const detectBarcodeRegion = (video: HTMLVideoElement): RegionOfInterest | null => {
    if (!video || video.videoWidth === 0) return null;

    // 1. Downsample for Performance (120x120 offers better granularity than 100x100)
    const w = 120;
    const h = 120;

    if (!analysisCanvas) {
        analysisCanvas = document.createElement('canvas');
        analysisCanvas.width = w;
        analysisCanvas.height = h;
        analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!analysisCtx) return null;

    // Draw video frame to canvas
    analysisCtx.drawImage(video, 0, 0, w, h);
    const imageData = analysisCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    let totalX = 0;
    let totalY = 0;
    let totalEnergy = 0;
    let minX = w, maxX = 0, minY = h, maxY = 0;

    // Center coordinates for weighting
    const cx = w / 2;
    const cy = h / 2;

    // 2. Texture Energy Scan (Simplified Sobel Operator) with Center Bias
    for (let y = 1; y < h - 1; y += 2) { 
        for (let x = 1; x < w - 1; x += 2) { 
            const i = (y * w + x) * 4;

            // Simple Grayscale
            const pixel = (data[i] + data[i+1] + data[i+2]) / 3;
            
            // Compare neighbors (Horizontal & Vertical Edges)
            const rightI = i + 4;
            const downI = i + (w * 4);
            
            const rightPixel = (data[rightI] + data[rightI+1] + data[rightI+2]) / 3;
            const downPixel = (data[downI] + data[downI+1] + data[downI+2]) / 3;

            const edgeH = Math.abs(pixel - rightPixel);
            const edgeV = Math.abs(pixel - downPixel);
            let energy = edgeH + edgeV;

            // --- IMPROVEMENT: Center Weighting ---
            // Calculate distance from center (normalized 0 to 1)
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (Math.sqrt(cx**2 + cy**2));
            // Boost energy if closer to center (1.0 at center, 0.5 at corners)
            const centerWeight = 1.0 - (dist * 0.5); 
            
            energy = energy * centerWeight;

            // Threshold: Only consider strong textures
            if (energy > 45) {
                totalX += x * energy;
                totalY += y * energy;
                totalEnergy += energy;

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // 3. Filter Noise
    if (totalEnergy < 18000) return null;

    // 4. Calculate Center of Mass
    const centerX = totalX / totalEnergy;
    const centerY = totalY / totalEnergy;

    // 5. Dynamic Bounding Box with Padding
    let boxW = (maxX - minX);
    let boxH = (maxY - minY);
    
    // Clamp box size (10% to 85%)
    boxW = Math.max(10, Math.min(boxW, 85));
    boxH = Math.max(10, Math.min(boxH, 85));

    return {
        x: (centerX / w) * 100,
        y: (centerY / h) * 100,
        width: (boxW / w) * 100,
        height: (boxH / h) * 100,
        score: Math.min(1, totalEnergy / 150000)
    };
};

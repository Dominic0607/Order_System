
/**
 * Advanced Computer Vision Algorithm for Web-based Barcode/QR Tracking
 * Simulates "Native AI" behavior using Texture Energy Analysis.
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

    // 1. Downsample for Performance (100x100 is enough for "blob" detection)
    const w = 100;
    const h = 100;

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

    // 2. Texture Energy Scan (Simplified Sobel Operator)
    // We look for high contrast changes (Edges) which represent barcodes/QR codes
    for (let y = 1; y < h - 1; y += 2) { // Skip rows for speed
        for (let x = 1; x < w - 1; x += 2) { // Skip cols for speed
            const i = (y * w + x) * 4;

            // Simple Grayscale: (R+G+B)/3
            const pixel = (data[i] + data[i+1] + data[i+2]) / 3;
            
            // Compare with neighbor to finding edges (Horizontal & Vertical)
            const rightI = i + 4;
            const downI = i + (w * 4);
            
            const rightPixel = (data[rightI] + data[rightI+1] + data[rightI+2]) / 3;
            const downPixel = (data[downI] + data[downI+1] + data[downI+2]) / 3;

            // Calculate Energy (Contrast difference)
            const edgeH = Math.abs(pixel - rightPixel);
            const edgeV = Math.abs(pixel - downPixel);
            const energy = edgeH + edgeV;

            // Threshold: Only consider areas with high texture (Barcodes are high texture)
            if (energy > 40) {
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
    // If total energy is too low, it's just a plain wall or blurry image
    if (totalEnergy < 15000) return null;

    // 4. Calculate Center of Mass
    const centerX = totalX / totalEnergy;
    const centerY = totalY / totalEnergy;

    // 5. Dynamic Bounding Box
    // We constrain the box size to avoid it jumping to the whole screen
    let boxW = (maxX - minX);
    let boxH = (maxY - minY);
    
    // Clamp box size to be realistic for a barcode (usually 10-80% of screen)
    boxW = Math.max(15, Math.min(boxW, 80));
    boxH = Math.max(15, Math.min(boxH, 80));

    return {
        x: (centerX / w) * 100,
        y: (centerY / h) * 100,
        width: (boxW / w) * 100,
        height: (boxH / h) * 100,
        score: Math.min(1, totalEnergy / 100000)
    };
};

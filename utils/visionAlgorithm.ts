
/**
 * Lightweight Vision Algorithm to detect high-contrast vertical edges (Barcodes)
 * Optimized for iOS Safari (uses low-res canvas for performance).
 */

interface RegionOfInterest {
    x: number;      // Center X %
    y: number;      // Center Y %
    width: number;  // Width %
    height: number; // Height %
    score: number;  // Confidence score (0-1)
}

// Reuse canvas to prevent memory leaks
let analysisCanvas: HTMLCanvasElement | null = null;
let analysisCtx: CanvasRenderingContext2D | null = null;

export const detectBarcodeRegion = (video: HTMLVideoElement): RegionOfInterest | null => {
    if (!video || video.videoWidth === 0) return null;

    // 1. Setup Low-Res Canvas (Downsample for Speed)
    // 150px width is enough to detect barcode patterns
    const w = 150;
    const h = 150; 

    if (!analysisCanvas) {
        analysisCanvas = document.createElement('canvas');
        analysisCanvas.width = w;
        analysisCanvas.height = h;
        analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!analysisCtx) return null;

    // 2. Draw current video frame
    analysisCtx.drawImage(video, 0, 0, w, h);

    // 3. Get Pixel Data
    const imageData = analysisCtx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;
    let minX = w, maxX = 0, minY = h, maxY = 0;

    // 4. Edge Detection Loop (Simplified Sobel - Vertical Edges only)
    // We scan with a stride of 2 to save CPU
    for (let y = 0; y < h; y += 2) {
        for (let x = 1; x < w - 1; x += 2) {
            const i = (y * w + x) * 4;
            
            // Convert to grayscale roughly: (R+G+B)/3
            const left = (data[i - 4] + data[i - 3] + data[i - 2]) / 3;
            const right = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
            
            // Calculate vertical edge difference
            const diff = Math.abs(left - right);

            // Threshold: Only consider strong edges (Barcode lines)
            if (diff > 40) { 
                totalX += x * diff;
                totalY += y * diff;
                totalWeight += diff;

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // 5. Result Analysis
    // If not enough edges found, return null (no barcode)
    if (totalWeight < 20000) return null; 

    const centerX = totalX / totalWeight;
    const centerY = totalY / totalWeight;
    const boxW = maxX - minX;
    const boxH = maxY - minY;

    // Normalize to percentages (0-100)
    return {
        x: (centerX / w) * 100,
        y: (centerY / h) * 100,
        width: Math.max(10, (boxW / w) * 100),
        height: Math.max(10, (boxH / h) * 100),
        score: Math.min(1, totalWeight / 100000)
    };
};

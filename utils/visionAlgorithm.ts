
/**
 * Advanced Computer Vision Algorithm for Web-based Barcode/QR Tracking
 * Uses Projection Histogram Analysis to tightly fit the bounding box and ignore background noise.
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

    // Use a slightly smaller resolution for speed on iOS
    const w = 80;
    const h = 80;

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

    // Projection Arrays (Histograms)
    const rowEnergy = new Float32Array(h).fill(0);
    const colEnergy = new Float32Array(w).fill(0);
    let totalFrameEnergy = 0;

    // 1. Texture Energy Scan (Laplacian-like)
    for (let y = 1; y < h - 1; y++) { 
        let rowSum = 0;
        for (let x = 1; x < w - 1; x++) { 
            const i = (y * w + x) * 4;

            // Current Pixel Gray
            const p = (data[i] + data[i+1] + data[i+2]) / 3;
            
            // Neighbors
            const left = (data[i - 4] + data[i - 3] + data[i - 2]) / 3;
            const up = (data[i - (w*4)] + data[i - (w*4) + 1] + data[i - (w*4) + 2]) / 3;

            // Simple Edge Detection (Gradient)
            const edgeH = Math.abs(p - left);
            const edgeV = Math.abs(p - up);
            
            // Only count if it looks like a strong edge (barcode line)
            // Increased threshold to ignore carpet/wood grain textures
            let energy = (edgeH + edgeV) > 30 ? (edgeH + edgeV) : 0;

            rowEnergy[y] += energy;
            colEnergy[x] += energy;
            totalFrameEnergy += energy;
        }
    }

    // 2. Filter Low Energy Frames (Blurry or Plain images)
    // Threshold adjusted for 80x80 grid
    if (totalFrameEnergy < 15000) return null;

    // 3. Find Range using Histogram Peaks (1D Sliding Window)
    // This finds the tightest cluster of energy
    const getRange = (arr: Float32Array, size: number) => {
        // Smooth array first
        const smoothed = new Float32Array(size);
        for(let i=2; i<size-2; i++) {
            smoothed[i] = (arr[i-2] + arr[i-1] + arr[i] + arr[i+1] + arr[i+2]) / 5;
        }

        // Find Max Peak
        let maxVal = 0;
        let maxIdx = size / 2;
        for(let i=0; i<size; i++) {
            if (smoothed[i] > maxVal) {
                maxVal = smoothed[i];
                maxIdx = i;
            }
        }

        // Threshold relative to peak (e.g., 25% of peak energy)
        const threshold = maxVal * 0.25;

        // Walk out from peak to find edges
        let min = maxIdx, max = maxIdx;
        while (min > 0 && smoothed[min] > threshold) min--;
        while (max < size - 1 && smoothed[max] > threshold) max++;

        // Add padding
        return { 
            min: Math.max(0, min - 2), 
            max: Math.min(size, max + 2) 
        };
    };

    const xRange = getRange(colEnergy, w);
    const yRange = getRange(rowEnergy, h);

    // 4. Calculate Box Dimensions
    const boxW = ((xRange.max - xRange.min) / w) * 100;
    const boxH = ((yRange.max - yRange.min) / h) * 100;
    const centerX = ((xRange.min + xRange.max) / 2 / w) * 100;
    const centerY = ((yRange.min + yRange.max) / 2 / h) * 100;

    // 5. Sanity Checks
    // Too huge? Likely noise. Too small? Likely nothing.
    if (boxW > 90 || boxH > 90) return null; // Reject full screen noise
    if (boxW < 5 || boxH < 5) return null;

    return {
        x: centerX,
        y: centerY,
        width: boxW,
        height: boxH,
        score: Math.min(1, totalFrameEnergy / 200000)
    };
};

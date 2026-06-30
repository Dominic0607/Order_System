import { WEB_APP_URL } from '../constants';
import { CacheService, CACHE_KEYS } from '../services/cacheService';

/**
 * Converts a Blob (like a File) into a Base64 encoded string, without the data URI prefix.
 * @param file The Blob or File to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // The result is "data:mime/type;base64,the_base_64_string"
            // We only need the part after the comma.
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

/**
 * Converts a Blob (like a File) into a Data URL string (e.g., "data:mime/type;base64,...").
 * @param file The Blob or File to convert.
 * @returns A promise that resolves with the Data URL string.
 */
export const fileToDataUrl = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

/**
 * Converts various Google Drive URL formats into a direct, embeddable image URL.
 * Also handles standard image URLs.
 * @param url The original URL from Google Drive or another source.
 * @param type The type of content, 'image' for image URLs, 'audio' for audio download links.
 * @returns A processed, directly usable URL or a fallback for images.
 */
export const convertGoogleDriveUrl = (url?: string, type: 'image' | 'audio' | 'preview' = 'image'): string => {
    const fallbackImage = 'https://placehold.co/100x100/1f2937/4b5563?text=N/A';
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return type === 'image' ? fallbackImage : '';
    }

    const trimmedUrl = url.trim();

    // 0. Handle R2 URLs
    if (trimmedUrl.startsWith('r2://')) {
        const key = trimmedUrl.substring(5);
        const token = localStorage.getItem('token');
        return `${WEB_APP_URL}/api/r2-proxy?key=${encodeURIComponent(key)}${token ? `&token=${token}` : ''}`;
    }

    // 1. Handle direct content URLs
    if (trimmedUrl.includes('lh3.googleusercontent.com') || trimmedUrl.includes('googleusercontent.com/d/')) {
        if (type === 'preview') return trimmedUrl; // Direct content is its own preview
        if (trimmedUrl.includes('lh3.googleusercontent.com')) {
            if (trimmedUrl.includes('=s')) return trimmedUrl;
            return `${trimmedUrl}=s1000`;
        }
        return trimmedUrl;
    }

    // 2. Extract File ID
    let fileId = '';
    const idRegex = /(?:id=|d\/|file\/d\/|open\?id=|thumbnail\?id=|uc\?id=)([a-zA-Z0-9_-]{25,45})/;
    const match = trimmedUrl.match(idRegex);
    if (match && match[1]) {
        fileId = match[1];
    } else if (/^[a-zA-Z0-9_-]{28,35}$/.test(trimmedUrl) && !trimmedUrl.includes('/') && !['product_assets', 'order_assets'].includes(trimmedUrl)) {
        fileId = trimmedUrl;
    }

    // 3. Construct URL based on type
    if (fileId) {
        if (type === 'image') {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        } else if (type === 'preview') {
            return `https://drive.google.com/file/d/${fileId}/preview`;
        } else {
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
    }

    return (trimmedUrl.startsWith('http') || trimmedUrl.startsWith('data:')) ? trimmedUrl : (type === 'image' ? fallbackImage : '');
};

// Global in-memory cache to bypass storage limits and ensure zero UI lag
const inMemoryPhotoCache = new Map<string, string>();

/**
 * Saves a package photo in the fast, in-memory cache.
 */
export const setOptimisticPackagePhotoInMemory = (orderId: string, dataUrl: string) => {
    inMemoryPhotoCache.set(orderId, dataUrl);
};

/**
 * Gets the best available URL for a package photo, prioritizing the server-provided Drive URL,
 * but falling back to a locally cached version (from memory or localStorage) if the server URL is missing.
 * This ensures "Immediate Preview" as requested.
 * @param orderId The ID of the order.
 * @param serverUrl The URL provided by the server.
 * @returns The best available image URL or null if none found.
 */
export const getOptimisticPackagePhoto = (orderId: string, serverUrl?: string): string | null => {
    // If we have a real URL from the server (Drive, R2, or absolute URL), use it.
    if (serverUrl && (
        serverUrl.startsWith('https://') || 
        serverUrl.startsWith('http://') || 
        serverUrl.startsWith('r2://')
    )) {
        // Once synced on server, purge local cache to save localStorage space
        localStorage.removeItem(`package_photo_${orderId}`);
        localStorage.removeItem(`package_photo_upload_${orderId}`);
        inMemoryPhotoCache.delete(orderId);
        return convertGoogleDriveUrl(serverUrl);
    }

    // 1. Look in-memory cache (ultra-fast, bypasses Chrome/Safari localStorage blocking)
    if (inMemoryPhotoCache.has(orderId)) {
        return inMemoryPhotoCache.get(orderId)!;
    }

    // 2. Fallback to localStorage
    const localPhoto = localStorage.getItem(`package_photo_${orderId}`);
    if (localPhoto && localPhoto.startsWith('data:image')) {
        // Hydrate the memory cache so subsequent lookups are instantaneous
        inMemoryPhotoCache.set(orderId, localPhoto);
        return localPhoto;
    }

    // No photo found
    return null;
};

// Keep track of active uploads to prevent parallel duplicate uploads for the same order
const activeSyncUploads = new Set<string>();

/**
 * Scans localStorage for failed or offline package photos and uploads them.
 */
export const syncPendingPackagePhotos = async () => {
    // Find all package_photo_upload_ keys in localStorage
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('package_photo_upload_')) {
            keys.push(key);
        }
    }

    if (keys.length === 0) return;

    // Check online status
    if (!navigator.onLine) {
        console.log("✈️ [Sync Queue] Device is offline, skipping sync.");
        return;
    }

    const session = await CacheService.get<{ token: string }>(CACHE_KEYS.SESSION);
    const token = session?.token || localStorage.getItem('token') || '';
    if (!token) {
        console.log("⚠️ [Sync Queue] No authentication session found, deferring sync.");
        return;
    }

    for (const key of keys) {
        const orderId = key.replace('package_photo_upload_', '');
        
        if (activeSyncUploads.has(orderId)) {
            continue; // Already uploading
        }

        const uploadDataStr = localStorage.getItem(key);
        const packagePhoto = localStorage.getItem(`package_photo_${orderId}`);

        if (!uploadDataStr || !packagePhoto) {
            // Cleanup incomplete or stale cache records
            localStorage.removeItem(key);
            localStorage.removeItem(`package_photo_${orderId}`);
            continue;
        }

        activeSyncUploads.add(orderId);
        console.log(`🛰️ [Sync Queue] Retrying upload for order: ${orderId}...`);

        try {
            const uploadData = JSON.parse(uploadDataStr);
            const base64Data = packagePhoto.includes(',') ? packagePhoto.split(',')[1] : packagePhoto;

            const response = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...uploadData,
                    fileData: base64Data
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success' || result.status === 'accepted') {
                    console.log(`✅ [Sync Queue] Successfully synced package photo for order ${orderId}`);
                    // Success: Purge metadata and big base64 string from local storage to free quota.
                    // Keep in-memory cache so UI doesn't flicker while waiting for websocket refresh.
                    localStorage.removeItem(key);
                    localStorage.removeItem(`package_photo_${orderId}`);
                } else {
                    console.warn(`⚠️ [Sync Queue] Server rejected retry for ${orderId}:`, result.message);
                }
            } else {
                console.warn(`⚠️ [Sync Queue] Upload attempt failed for ${orderId} (HTTP ${response.status})`);
            }
        } catch (error) {
            console.error(`❌ [Sync Queue] Network/fetch error on retry for ${orderId}:`, error);
        } finally {
            activeSyncUploads.delete(orderId);
        }
    }
};

/**
 * Fetches an image from a URL and converts it to a Base64 string.
 * Useful for embedding images in PDFs.
 * @param url The URL of the image.
 * @returns A promise that resolves to the Base64 string (without prefix) or empty string if failed.
 */
export const imageUrlToBase64 = async (url: string): Promise<string> => {
    try {
        const processedUrl = convertGoogleDriveUrl(url);
        if (!processedUrl || processedUrl.includes('placehold.co')) return '';

        // Try standard CORS fetch first
        let response;
        try {
            response = await fetch(processedUrl, { mode: 'cors' });
        } catch (e) {
            // Some CDNs might block requests with cookies/creds
            response = await fetch(processedUrl, { mode: 'cors', credentials: 'omit' });
        }

        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        return await fileToBase64(blob);
    } catch (error) {
        console.warn("Error converting image to base64 for PDF:", error);
        return '';
    }
};

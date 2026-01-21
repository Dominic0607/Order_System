
export const CACHE_KEYS = {
    APP_DATA: 'appDataCache',
    SESSION: 'orderAppSession',
    CHAT_HISTORY: 'chatHistoryCache'
};

// Default expiration set to 48 hours
const DEFAULT_EXPIRY = 48 * 60 * 60 * 1000; 

export const CacheService = {
    /**
     * Save data to local storage with timestamp and expiry duration
     * @param key Storage key
     * @param data Data to store
     * @param expiry Duration in milliseconds (default 48h)
     */
    set: (key: string, data: any, expiry: number = DEFAULT_EXPIRY) => {
        try {
            const payload = {
                value: data,
                timestamp: Date.now(),
                expiry: expiry
            };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch (e) {
            console.warn("Cache write failed (likely quota exceeded):", e);
            // Optional: Clear old cache keys if quota exceeded
        }
    },

    /**
     * Retrieve data from local storage if valid (not expired)
     * @param key Storage key
     * @returns Data or null if expired/not found
     */
    get: <T>(key: string): T | null => {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            const now = Date.now();

            // Check if expired
            if (now - item.timestamp > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value as T;
        } catch (e) {
            console.warn("Cache read failed:", e);
            return null;
        }
    },

    /**
     * Remove specific key from storage
     */
    remove: (key: string) => {
        localStorage.removeItem(key);
    },

    /**
     * Clear all app data from local storage
     */
    clearAll: () => {
        localStorage.clear();
    }
};

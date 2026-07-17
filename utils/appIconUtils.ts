import {
    APP_ICON_FILES,
    APP_ICON_STORAGE_KEY,
    APP_ICON_VERSION,
    getAppIconUrl,
} from '../constants/appIcon';

export type AppIconStatus = 'new' | 'old' | 'unknown';

export function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export function getStoredAppIconVersion(): string | null {
    try {
        return localStorage.getItem(APP_ICON_STORAGE_KEY);
    } catch {
        return null;
    }
}

export function hasLatestAppIcon(): boolean {
    return getStoredAppIconVersion() === APP_ICON_VERSION;
}

export function needsAppIconUpdate(): boolean {
    return !hasLatestAppIcon();
}

export function getAppIconStatus(): AppIconStatus {
    if (hasLatestAppIcon()) return 'new';
    if (isStandalonePWA() || getStoredAppIconVersion() !== null) return 'old';
    return needsAppIconUpdate() ? 'old' : 'unknown';
}

function updateIconLinkTags(version: string = APP_ICON_VERSION): void {
    const bustedLogo = getAppIconUrl('logo.png', version);

    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((node) => {
        const link = node as HTMLLinkElement;
        link.href = bustedLogo;
    });
}

async function clearCachedLogoAssets(): Promise<void> {
    if (!('caches' in window)) return;

    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            await Promise.all(
                requests.map(async (request) => {
                    if (/logo(-\d+)?\.(png|webp)/i.test(request.url)) {
                        await cache.delete(request);
                    }
                })
            );
        })
    );
}

async function refreshServiceWorkerIcons(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    registration.active?.postMessage({ type: 'CLEAR_ICON_CACHE' });

    if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    await registration.update();
}

export async function applyAppIconUpdate(version: string = APP_ICON_VERSION): Promise<void> {
    updateIconLinkTags(version);
    await clearCachedLogoAssets();
    await refreshServiceWorkerIcons();

    const iconUrls = APP_ICON_FILES.map((file) => getAppIconUrl(file, version));
    await Promise.allSettled(
        iconUrls.map((url) => fetch(url, { cache: 'reload' }))
    );

    try {
        localStorage.setItem(APP_ICON_STORAGE_KEY, version);
    } catch (error) {
        console.warn('[AppIcon] Failed to persist icon version:', error);
    }

    console.log(`[AppIcon] ✅ Applied icon update v${version}`);
}

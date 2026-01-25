
import { APP_LOGO_URL } from '../constants';
import { convertGoogleDriveUrl } from './fileUtils';

/**
 * Requests permission for system notifications if supported.
 * Returns true if granted.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.warn("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

/**
 * Sends a system native notification using Service Worker (if available) or standard Notification API.
 * Optimized for high reliability on Android and Windows.
 */
export const sendSystemNotification = async (title: string, body: string) => {
    if (!('Notification' in window)) return;

    // Check permission again
    if (Notification.permission !== 'granted') {
        return;
    }

    // Prepare Icon (Use a fallback if the main logo is complex, but try logo first)
    const iconUrl = convertGoogleDriveUrl(APP_LOGO_URL) || 'https://cdn-icons-png.flaticon.com/512/733/733585.png';

    // Options configuration
    // Note: We append Date.now() to the tag to force the browser to treat it as a NEW notification every time
    // This solves the issue where notifications stop appearing if they have the same tag.
    const options: any = {
        body: body,
        icon: iconUrl,
        badge: iconUrl, // Small icon for Android status bar
        vibrate: [200, 100, 200, 100, 200], // Longer vibration pattern
        tag: 'osystem-alert-' + Date.now(), // FORCE UNIQUE TAG
        renotify: true,
        requireInteraction: true, // Keep notification on screen until user interacts (Desktop)
        data: {
            url: window.location.href // Used by SW to focus window
        }
    };

    try {
        // Method 1: Try Service Worker (Most reliable for Mobile/PWA)
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            
            if (registration) {
                // Check if active
                if(registration.active) {
                    await registration.showNotification(title, options);
                    console.log("Notification sent via Service Worker");
                    return;
                }
            }
        }
    } catch (e) {
        console.warn("SW Notification failed, falling back to classic API", e);
    }

    // Method 2: Classic Web Notification API (Fallback for Desktop)
    try {
        const notification = new Notification(title, options);
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        console.log("Notification sent via Classic API");
    } catch (e) {
        console.error("All notification methods failed:", e);
    }
};

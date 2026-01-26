
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
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (e) {
            console.error("Permission request failed", e);
            return false;
        }
    }

    return false;
};

/**
 * Sends a system native notification using Service Worker (if available) or standard Notification API.
 * Optimized for Chrome/Android compatibility by using registration.showNotification().
 */
export const sendSystemNotification = async (title: string, body: string) => {
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
        return;
    }

    // Use a static, safe icon URL because Google Drive redirects can be blocked by Chrome notifications
    const safeIcon = "https://cdn-icons-png.flaticon.com/512/1827/1827404.png"; 

    const uniqueTag = 'osystem-alert-' + Date.now();

    // Use 'any' to avoid TS error about 'vibrate' not existing in NotificationOptions in some environments
    const options: any = {
        body: body,
        icon: safeIcon, 
        badge: safeIcon,
        vibrate: [200, 100, 200],
        tag: uniqueTag,
        renotify: true,
        requireInteraction: true,
        data: {
            url: window.location.href
        },
        silent: false
    };

    // 1. Preferred Method: Service Worker Registration (Required for Android/Mobile Chrome)
    if ('serviceWorker' in navigator) {
        try {
            // Wait for the service worker to be ready
            const registration = await navigator.serviceWorker.ready;
            
            if (registration && registration.active) {
                await registration.showNotification(title, options);
                console.log("Notification sent via Service Worker");
                return;
            } else {
                console.warn("Service Worker ready but not active/found.");
            }
        } catch (e) {
            console.warn("Service Worker notification failed, falling back to legacy API...", e);
        }
    }

    // 2. Fallback Method: Classic Web API (Works for Safari/Desktop Firefox if SW fails)
    try {
        const notification = new Notification(title, options);
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        console.log("Notification sent via Legacy Web API");
    } catch (e) {
        console.error("All notification methods failed:", e);
    }
};
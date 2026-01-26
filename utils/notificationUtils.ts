
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
 * Optimized for Chrome compatibility.
 */
export const sendSystemNotification = async (title: string, body: string) => {
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
        return;
    }

    // CHROME FIX: Google Drive images (redirects) often break Chrome Notifications.
    // We use a safe, static CDN image for the notification icon to ensure it displays.
    const safeIcon = "https://cdn-icons-png.flaticon.com/512/1827/1827404.png"; // Bell Icon

    const uniqueTag = 'osystem-alert-' + Date.now();

    const options: any = {
        body: body,
        icon: safeIcon, 
        badge: safeIcon,
        vibrate: [200, 100, 200],
        tag: uniqueTag,
        renotify: true,
        requireInteraction: true, // Forces notification to stay until user clicks (Good for Chrome)
        data: {
            url: window.location.href
        },
        silent: false
    };

    // 1. Try Service Worker (Preferred for Chrome/Android)
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.active) {
                await registration.showNotification(title, options);
                console.log("Notification sent via Service Worker");
                return;
            }
        } catch (e) {
            console.warn("Service Worker notification failed, trying fallback...", e);
        }
    }

    // 2. Fallback to Classic API (Works for Safari/Desktop if SW fails)
    try {
        const notification = new Notification(title, options);
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        console.log("Notification sent via Web API");
    } catch (e) {
        console.error("Notification failed completely:", e);
    }
};

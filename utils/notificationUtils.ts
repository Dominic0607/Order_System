
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
 * This works for both Desktop and Mobile (Android/iOS PWA).
 * @param title The title of the notification
 * @param body The body text of the notification
 */
export const sendSystemNotification = async (title: string, body: string) => {
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
        // Try requesting permission one last time if not strictly denied
        const granted = await requestNotificationPermission();
        if (!granted) return;
    }

    // Use 'any' to allow 'vibrate' property
    const options: any = {
        body: body,
        icon: convertGoogleDriveUrl(APP_LOGO_URL),
        badge: convertGoogleDriveUrl(APP_LOGO_URL),
        vibrate: [200, 100, 200],
        tag: 'system-alert',
        renotify: true,
        requireInteraction: false,
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    try {
        // 1. Try Service Worker Registration (Best for Mobile/PWA)
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.showNotification) {
                await registration.showNotification(title, options);
                return; // Success via SW
            }
        }
    } catch (e) {
        console.warn("Service Worker notification failed, trying fallback...", e);
    }

    // 2. Fallback to Standard Web API (Best for Desktop)
    try {
        const notification = new Notification(title, options);
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    } catch (e) {
        console.error("Standard Notification API failed:", e);
    }
};

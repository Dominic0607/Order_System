
import { APP_LOGO_URL } from '../constants';
import { convertGoogleDriveUrl } from './fileUtils';

/**
 * Requests permission for system notifications if supported.
 */
export const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }
};

/**
 * Sends a system native notification using Service Worker (if available) or standard Notification API.
 * This works for both Desktop and Mobile (Android/iOS PWA).
 * @param title The title of the notification
 * @param body The body text of the notification
 */
export const sendSystemNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;

    // Use 'any' to allow 'vibrate' property which may not be in standard NotificationOptions in all TS environments
    const options: any = {
        body: body,
        icon: convertGoogleDriveUrl(APP_LOGO_URL), // Show App Logo
        badge: convertGoogleDriveUrl(APP_LOGO_URL),
        vibrate: [200, 100, 200],
        tag: 'system-alert',
        renotify: true,
        requireInteraction: false
    };

    if (Notification.permission === "granted") {
        // Try Service Worker first (Better for Mobile PWA background)
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
                // Some browsers might not support showNotification on registration
                if (registration.showNotification) {
                    registration.showNotification(title, options);
                } else {
                    new Notification(title, options);
                }
            }).catch((err) => {
                console.warn("Service Worker notification failed, falling back to standard API", err);
                new Notification(title, options);
            });
        } else {
            // Standard Desktop/Fallback
            try {
                new Notification(title, options);
            } catch (e) {
                console.error("Notification API error:", e);
            }
        }
    }
};


import { APP_LOGO_URL } from '../constants';
import { convertGoogleDriveUrl } from './fileUtils';

/**
 * Requests permission for system notifications if supported.
 * Returns true if granted.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    // ឆែកមើលថាតើ Browser គាំទ្រ Notification ដែរឬទេ
    if (!('Notification' in window)) {
        console.warn("Browser នេះមិនគាំទ្រប្រព័ន្ធ Notification ទេ។");
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    // បើសិនជាមិនទាន់បានអនុញ្ញាត (Granted) ទេ យើងនឹងស្នើសុំ
    if (Notification.permission !== 'denied') {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log("ទទួលបានការអនុញ្ញាត (Permission Granted) ជោគជ័យ!");
                return true;
            }
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

    if (Notification.permission === 'default') {
        await requestNotificationPermission();
    }

    if (Notification.permission !== 'granted') {
        console.warn("Notification permission not granted. Cannot send notification.");
        return;
    }

    // Use the local logo asset as the notification icon
    const safeIcon = window.location.origin + APP_LOGO_URL;

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

    let sent = false;

    // 1. Preferred Method: Service Worker Registration (Required for Android/Mobile Chrome)
    if ('serviceWorker' in navigator) {
        try {
            // Use getRegistration() to avoid hanging indefinitely if no SW is active (unlike .ready)
            const registration = await navigator.serviceWorker.getRegistration();
            
            if (registration && registration.active) {
                await registration.showNotification(title, options);
                console.log("Notification sent via Service Worker");
                sent = true;
            } else {
                console.warn("Service Worker not active or not found. Falling back...");
            }
        } catch (e) {
            console.warn("Service Worker notification failed, falling back to legacy API...", e);
        }
    }

    // 2. Fallback Method: Classic Web API (Works for Safari/Desktop Firefox if SW fails)
    if (!sent) {
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
    }
};

/**
 * Subscribes the current user to Web Push Notifications on the backend.
 */
export const subscribeUserToPush = async (webAppUrl: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn("Push Notifications are not supported in this browser.");
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 1. Get Service Worker registration
        const registration = await navigator.serviceWorker.ready;
        if (!registration) {
            console.warn("Service Worker not ready.");
            return;
        }

        // 2. Request notification permission
        const permissionGranted = await requestNotificationPermission();
        if (!permissionGranted) {
            console.warn("Notification permission was not granted.");
            return;
        }

        // 3. Fetch VAPID Public Key from backend
        const keyRes = await fetch(`${webAppUrl}/api/push/vapid-public-key`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!keyRes.ok) {
            console.error("Failed to fetch VAPID public key:", await keyRes.text());
            return;
        }
        const keyData = await keyRes.json();
        const vapidPublicKey = keyData.publicKey;
        if (!vapidPublicKey) {
            console.error("VAPID public key is empty");
            return;
        }

        // 4. Subscribe the user
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });
        }

        // 5. Send subscription to backend
        const subscribeRes = await fetch(`${webAppUrl}/api/push/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(subscription)
        });

        if (subscribeRes.ok) {
            console.log("Successfully subscribed to Push Notifications!");
        } else {
            console.error("Failed to store push subscription on backend:", await subscribeRes.text());
        }
    } catch (e) {
        console.error("Error during Push Notification subscription:", e);
    }
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
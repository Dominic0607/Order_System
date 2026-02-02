
import { WEB_APP_URL } from '../constants';
import { UserActivityLog, EditLog } from '../types';

// Function to log general user activity (Navigation, Clicks, etc.)
export const logUserActivity = async (user: string, action: string, details: string) => {
    try {
        // Sends to backend endpoint that writes to 'UserActivityLogs' sheet
        await fetch(`${WEB_APP_URL}/api/logging/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user,
                action,
                details,
                timestamp: new Date().toISOString(),
                // Add fallback keys for backend compatibility
                User: user,
                Action: action,
                Details: details
            })
        });
    } catch (error) {
        // Silently fail for logging to not disrupt user flow
        // console.warn("[Audit] Failed to log activity:", error);
    }
};

// Function to log specific edits to orders (Data changes)
export const logOrderEdit = async (orderId: string, user: string, field: string, oldValue: string, newValue: string) => {
    if (!field) return; 

    try {
        // Construct payload with multiple key variations to ensure Backend compatibility
        // Some backends expect "Old Value" (Sheet Header) or "OldValue" (PascalCase)
        const payload = {
            // Standard camelCase
            orderId,
            user,
            field,
            oldValue,
            newValue,
            timestamp: new Date().toISOString(),

            // PascalCase / Spaced (Likely required by Google Apps Script mapping)
            "OrderID": orderId,
            "Requester": user,
            "Field Changed": field,
            "Old Value": oldValue,
            "New Value": newValue,
            
            // Additional variations just in case
            "OldValue": oldValue,
            "NewValue": newValue
        };

        await fetch(`${WEB_APP_URL}/api/logging/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        // Silently fail
        console.warn("[Audit] Failed to log edit:", error);
    }
};

// --- Fetch Logs ---
export const fetchAuditLogs = async (type: 'activity' | 'edit'): Promise<UserActivityLog[] | EditLog[]> => {
    try {
        const response = await fetch(`${WEB_APP_URL}/api/admin/logs?type=${type}`);
        
        if (!response.ok) {
            // If endpoint doesn't exist (404), return empty array without throwing error
            if (response.status === 404) {
                console.debug(`[Audit] Endpoint not found for ${type}.`);
                return [];
            }
            throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.status === 'success') {
            return result.data;
        }
        return [];
    } catch (error) {
        console.warn("[Audit] Data unavailable:", error);
        return [];
    }
};

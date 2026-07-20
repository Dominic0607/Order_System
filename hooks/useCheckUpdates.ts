import { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { CLIENT_VERSION } from '../constants/version';
import { WEB_APP_URL } from '../constants';

export const useCheckUpdates = () => {
    const { currentUser, language, showNotification } = useContext(AppContext);
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

    const checkUpdates = async (onDone?: () => void) => {
        setIsCheckingUpdates(true);
        try {
            const res = await fetch(`${WEB_APP_URL}/api/system-version`);
            if (res.ok) {
                const result = await res.json();
                if (result.status === 'success' && result.version) {
                    const serverVersion = result.version;
                    
                    const compareVersions = (v1: string, v2: string) => {
                        const parts1 = v1.split('.').map(Number);
                        const parts2 = v2.split('.').map(Number);
                        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                            const p1 = parts1[i] || 0;
                            const p2 = parts2[i] || 0;
                            if (p1 > p2) return 1;
                            if (p1 < p2) return -1;
                        }
                        return 0;
                    };

                    const versionCandidates = [
                        currentUser?.SystemVersion,
                        localStorage.getItem('system_update_acknowledged_version') || '',
                        sessionStorage.getItem('system_update_acknowledged_version') || '',
                        localStorage.getItem('system_update_last_seen_version') || '',
                        CLIENT_VERSION
                    ].filter(Boolean) as string[];

                    const effectiveCurrentVersion = versionCandidates.reduce((latest, version) => {
                        return compareVersions(version, latest) > 0 ? version : latest;
                    }, '0');

                    const systemUpdateNeeded = compareVersions(serverVersion, effectiveCurrentVersion) > 0;
                    const currentAcknowledged = localStorage.getItem('system_update_acknowledged_version') || '';
                    const iconUpdateNeeded = compareVersions(serverVersion, '1.1.1') >= 0 && compareVersions(currentAcknowledged, '1.1.1') < 0;

                    if (systemUpdateNeeded || iconUpdateNeeded) {
                        window.dispatchEvent(new CustomEvent('show-system-update', { detail: { version: serverVersion } }));
                        showNotification(
                            language === 'km' 
                                ? 'រកឃើញកំណែថ្មី! កំពុងបើកផ្ទាំងដំឡើង...' 
                                : 'New version found! Opening update screen...', 
                            'info'
                        );
                    } else {
                        showNotification(
                            language === 'km' 
                                ? `ប្រព័ន្ធដំណើរការលើកំណែថ្មីបំផុតរួចរាល់ហើយ (v${serverVersion})` 
                                : `System is already up to date (v${serverVersion})`, 
                            'success'
                        );
                    }
                } else {
                    showNotification(
                        language === 'km' ? 'មិនអាចពិនិត្យកំណែកម្មវិធីបានទេ' : 'Could not check for system version', 
                        'error'
                    );
                }
            } else {
                showNotification(
                    language === 'km' ? 'មិនអាចពិនិត្យកំណែកម្មវិធីបានទេ' : 'Could not check for system version', 
                    'error'
                );
            }
        } catch (err) {
            console.error(err);
            showNotification(
                language === 'km' ? 'មិនអាចពិនិត្យកំណែកម្មវិធីបានទេ' : 'Could not check for system version', 
                'error'
            );
        } finally {
            setIsCheckingUpdates(false);
            if (onDone) onDone();
        }
    };

    return { checkUpdates, isCheckingUpdates };
};

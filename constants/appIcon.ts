export const APP_ICON_VERSION = '1.1.1';
export const APP_ICON_STORAGE_KEY = 'app_icon_version';

export const APP_ICON_FILES = ['logo.png', 'logo.webp', 'logo-192.png', 'logo-512.png'] as const;

export const getAppIconUrl = (file: string, version: string = APP_ICON_VERSION) => {
    const baseUrl = import.meta.env?.BASE_URL ?? '/';
    return `${baseUrl}${file}?v=${version}`;
};

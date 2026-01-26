
export type FieldType = 'text' | 'number' | 'password' | 'checkbox' | 'image_url';

export interface ConfigField {
    name: string;
    label: string;
    type: FieldType;
}

export interface ConfigSection {
    id: string;
    title: string;
    description: string;
    icon: string;
    dataKey: string; 
    sheetName: string; 
    primaryKeyField: string;
    fields: ConfigField[];
    displayField: string;
}

export const configSections: ConfigSection[] = [
    { 
        id: 'users', 
        title: 'អ្នកប្រើប្រាស់', 
        description: 'គ្រប់គ្រងគណនីបុគ្គលិក និងសិទ្ធិប្រើប្រាស់',
        icon: '👤', 
        dataKey: 'users', 
        sheetName: 'Users', 
        primaryKeyField: 'UserName', 
        fields: [ 
            { name: 'FullName', label: 'ឈ្មោះពេញ', type: 'text' }, 
            { name: 'UserName', label: 'ឈ្មោះគណនី (Login)', type: 'text' }, 
            { name: 'Password', label: 'ពាក្យសម្ងាត់', type: 'password' }, 
            { name: 'Role', label: 'តួនាទី (Role)', type: 'text' }, 
            { name: 'Team', label: 'ក្រុម (Team)', type: 'text' }, 
            { name: 'ProfilePictureURL', label: 'URL រូបភាព', type: 'image_url' }, 
            { name: 'IsSystemAdmin', label: 'System Admin?', type: 'checkbox' } 
        ], 
        displayField: 'FullName' 
    },
    { 
        id: 'products', 
        title: 'ផលិតផល', 
        description: 'គ្រប់គ្រងបញ្ជីទំនិញ តម្លៃ និង Barcode',
        icon: '🛍️', 
        dataKey: 'products', 
        sheetName: 'Products', 
        primaryKeyField: 'ProductName', 
        fields: [ 
            { name: 'ProductName', label: 'ឈ្មោះផលិតផល', type: 'text' }, 
            { name: 'Barcode', label: 'Barcode', type: 'text' }, 
            { name: 'Price', label: 'តម្លៃ ($)', type: 'number' }, 
            { name: 'Cost', label: 'តម្លៃដើម ($)', type: 'number' }, 
            { name: 'ImageURL', label: 'URL រូបភាព', type: 'image_url' },
            { name: 'Tags', label: 'Tags (comma separated)', type: 'text' }
        ], 
        displayField: 'ProductName' 
    },
    { 
        id: 'pages', 
        title: 'ក្រុម & Page', 
        description: 'កំណត់ឈ្មោះក្រុម និងទិន្នន័យ Facebook Page',
        icon: '👥', 
        dataKey: 'pages',
        sheetName: 'TeamsPages', 
        primaryKeyField: 'PageName', 
        fields: [ 
            { name: 'PageName', label: 'ឈ្មោះ Page', type: 'text' }, 
            { name: 'Team', label: 'ក្រុម', type: 'text' }, 
            { name: 'TelegramValue', label: 'Telegram Value', type: 'text' }, 
            { name: 'PageLogoURL', label: 'URL ឡូហ្គោ', type: 'image_url' } 
        ], 
        displayField: 'PageName' 
    },
    { 
        id: 'shippingMethods', 
        title: 'សេវាដឹកជញ្ជូន', 
        description: 'កំណត់ក្រុមហ៊ុនដឹកជញ្ជូន និងលក្ខខណ្ឌដឹក',
        icon: '🚚', 
        dataKey: 'shippingMethods', 
        sheetName: 'ShippingMethods', 
        primaryKeyField: 'MethodName', 
        fields: [ 
            { name: 'MethodName', label: 'ឈ្មោះសេវា', type: 'text' }, 
            { name: 'RequireDriverSelection', label: 'ត្រូវការអ្នកដឹក?', type: 'checkbox' }, 
            { name: 'LogosURL', label: 'URL ឡូហ្គោ', type: 'image_url' } 
        ], 
        displayField: 'MethodName' 
    },
    { 
        id: 'drivers', 
        title: 'អ្នកដឹក', 
        description: 'គ្រប់គ្រងព័ត៌មានអ្នកដឹកជញ្ជូនផ្ទាល់ខ្លួន',
        icon: '🛵', 
        dataKey: 'drivers', 
        sheetName: 'Drivers', 
        primaryKeyField: 'DriverName', 
        fields: [ 
            { name: 'DriverName', label: 'ឈ្មោះអ្នកដឹក', type: 'text' }, 
            { name: 'ImageURL', label: 'URL រូបថត', type: 'image_url' } 
        ], 
        displayField: 'DriverName' 
    },
    { 
        id: 'bankAccounts', 
        title: 'គណនីធនាគារ', 
        description: 'គ្រប់គ្រងបញ្ជីធនាគារសម្រាប់ទទួលប្រាក់',
        icon: '🏦', 
        dataKey: 'bankAccounts', 
        sheetName: 'BankAccounts', 
        primaryKeyField: 'BankName', 
        fields: [ 
            { name: 'BankName', label: 'ឈ្មោះធនាគារ', type: 'text' }, 
            { name: 'LogoURL', label: 'URL ឡូហ្គោ', type: 'image_url' } 
        ], 
        displayField: 'BankName' 
    },
    { 
        id: 'phoneCarriers', 
        title: 'ក្រុមហ៊ុនទូរស័ព្ទ', 
        description: 'កំណត់ Prefixes របស់ក្រុមហ៊ុនទូរស័ព្ទ',
        icon: '📱', 
        dataKey: 'phoneCarriers', 
        sheetName: 'PhoneCarriers', 
        primaryKeyField: 'CarrierName', 
        fields: [ 
            { name: 'CarrierName', label: 'ឈ្មោះក្រុមហ៊ុន', type: 'text' }, 
            { name: 'Prefixes', label: 'Prefixes (បំបែកដោយក្បៀស)', type: 'text' }, 
            { name: 'CarrierLogoURL', label: 'URL ឡូហ្គោ', type: 'image_url' } 
        ], 
        displayField: 'CarrierName' 
    },
];

export const getValueCaseInsensitive = (item: any, key: string) => {
    if (!item || typeof item !== 'object' || !key) return undefined;
    if (item[key] !== undefined) return item[key];
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(item).find(k => k.toLowerCase() === lowerKey || k.toLowerCase().replace(/_/g, '') === lowerKey.replace(/_/g, ''));
    return foundKey ? item[foundKey] : undefined;
};

export const getArrayCaseInsensitive = (data: any, key: string): any[] => {
    if (!data || typeof data !== 'object') return [];
    
    // 1. Exact Match
    if (Array.isArray(data[key])) return data[key];
    
    // 2. Case Insensitive Match
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(data).find(k => k.toLowerCase() === lowerKey);
    if (foundKey && Array.isArray(data[foundKey])) return data[foundKey];
    
    // 3. Special Case: 'pages' maps to 'TeamsPages'
    if (key === 'pages') {
        const altKey = Object.keys(data).find(k => k.toLowerCase().includes('teampage') || k.toLowerCase().includes('page'));
        if (altKey && Array.isArray(data[altKey])) return data[altKey];
    }
    
    return [];
};

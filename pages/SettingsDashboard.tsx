
import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import { WEB_APP_URL } from '../constants';
import { fileToBase64, convertGoogleDriveUrl } from '../utils/fileUtils';
import PagesPdfExportModal from '../components/admin/PagesPdfExportModal';

interface SettingsDashboardProps {
    onBack: () => void;
    initialSection?: string;
}

type FieldType = 'text' | 'number' | 'password' | 'checkbox' | 'image_url';

interface ConfigField {
    name: string;
    label: string;
    type: FieldType;
}

interface ConfigSection {
    id: string;
    title: string;
    description: string;
    icon: string;
    dataKey: string; // ឈ្មោះ Key ក្នុង AppData state
    sheetName: string; // ឈ្មោះ Sheet ក្នុង Google Sheet
    primaryKeyField: string;
    fields: ConfigField[];
    displayField: string;
}

const configSections: ConfigSection[] = [
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
        dataKey: 'pages', // ធានាថាត្រូវជាមួយ interface AppData
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

const getValueCaseInsensitive = (item: any, key: string) => {
    if (!item || typeof item !== 'object' || !key) return undefined;
    if (item[key] !== undefined) return item[key];
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(item).find(k => k.toLowerCase() === lowerKey || k.toLowerCase().replace(/_/g, '') === lowerKey.replace(/_/g, ''));
    return foundKey ? item[foundKey] : undefined;
};

const getArrayCaseInsensitive = (data: any, key: string): any[] => {
    if (!data || typeof data !== 'object') return [];
    
    // ១. ឆែករកឈ្មោះចំ (ឧទាហរណ៍: data.pages)
    if (Array.isArray(data[key])) return data[key];
    
    // ២. ឆែករកឈ្មោះមិនប្រកាន់អក្សរតូចធំ (ឧទាហរណ៍: data.Pages)
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(data).find(k => k.toLowerCase() === lowerKey);
    if (foundKey && Array.isArray(data[foundKey])) return data[foundKey];
    
    // ៣. ករណីពិសេស៖ បើ dataKey ជា 'pages' តែក្នុង AppData អាចជា 'TeamsPages'
    if (key === 'pages') {
        const altKey = Object.keys(data).find(k => k.toLowerCase().includes('teampage') || k.toLowerCase().includes('page'));
        if (altKey && Array.isArray(data[altKey])) return data[altKey];
    }
    
    return [];
};

const ConfigEditModal = ({ section, item, onClose, onSave }: { section: ConfigSection, item: any | null, onClose: () => void, onSave: (item: any) => void }) => {
    const { refreshData } = useContext(AppContext);
    const [formData, setFormData] = useState<any>({}); 
    const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (item) {
            const dataToLoad: any = {};
            section.fields.forEach(field => {
                let val = getValueCaseInsensitive(item, field.name);
                if (val === undefined || val === null) {
                    val = field.type === 'checkbox' ? false : field.type === 'number' ? 0 : '';
                }
                dataToLoad[field.name] = val;
            });
            if (section.id === 'users') dataToLoad.Password = ''; 
            setFormData(dataToLoad);
        } else {
            const defaultData = section.fields.reduce((acc, field) => {
                acc[field.name] = field.type === 'checkbox' ? false : field.type === 'number' ? 0 : '';
                return acc;
            }, {} as any);
            setFormData(defaultData);
        }
    }, [item, section]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleImageUpload = async (fieldName: string, file: File) => {
        if (!file) return;
        setUploadingFields(prev => ({ ...prev, [fieldName]: true }));
        try {
            const base64Data = await fileToBase64(file);
            const response = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileData: base64Data, fileName: file.name, mimeType: file.type })
            });
            const result = await response.json();
            if (!response.ok || result.status !== 'success') throw new Error(result.message || 'Upload failed');
            setFormData((prev: any) => ({ ...prev, [fieldName]: result.url }));
        } catch (err: any) { setError(err.message); } finally { setUploadingFields(prev => ({ ...prev, [fieldName]: false })); }
    };
    
    const handleSave = async () => {
        setError('');
        for (const field of section.fields) {
            if (field.type !== 'checkbox' && (formData[field.name] === undefined || formData[field.name] === '') && field.name !== 'Password' && !item) {
                 setError(`សូមបំពេញចន្លោះ "${field.label}"`);
                 return;
            }
        }
        setIsLoading(true);
        try {
            const endpoint = item ? '/api/admin/update-sheet' : '/api/admin/add-row';
            const payloadData = { ...formData };
            section.fields.forEach(field => { if (field.type === 'number') payloadData[field.name] = Number(payloadData[field.name]); });
            if (item && section.id === 'users' && !payloadData.Password) delete payloadData.Password;
            const payload: any = { sheetName: section.sheetName, newData: payloadData };
            if (item) payload.primaryKey = { [section.primaryKeyField]: getValueCaseInsensitive(item, section.primaryKeyField) };
            const response = await fetch(`${WEB_APP_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Save failed');
            await refreshData();
            onSave(formData);
        } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
    };
    
    return (
        <Modal isOpen={true} onClose={onClose} maxWidth="max-w-xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white">{(item ? 'កែសម្រួល' : 'បន្ថែម')} {section.title}</h2>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                {section.fields.map(field => (
                    <div key={field.name} className="space-y-1.5">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">{field.label}</label>
                        {field.type === 'checkbox' ? (
                            <div className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-xl border border-gray-700">
                                <input type="checkbox" name={field.name} checked={!!formData[field.name]} onChange={handleChange} className="h-6 w-6 rounded-lg border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-300">បើកដំណើរការមុខងារនេះ</span>
                            </div>
                        ) : field.type === 'image_url' ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input type="text" name={field.name} value={formData[field.name] || ''} onChange={handleChange} placeholder="បិទភ្ជាប់ Link ឬ Upload រូបភាព" className="form-input flex-grow !py-2.5" />
                                    <input type="file" accept="image/*" ref={el => { fileInputRefs.current[field.name] = el; }} onChange={(e) => e.target.files && handleImageUpload(field.name, e.target.files[0])} className="hidden" />
                                    <button type="button" onClick={() => fileInputRefs.current[field.name]?.click()} className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all" disabled={uploadingFields[field.name]}>
                                        {uploadingFields[field.name] ? <Spinner size="sm" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                    </button>
                                </div>
                                {formData[field.name] && <div className="relative w-32 h-32 bg-gray-900 rounded-2xl border border-gray-700 p-2 overflow-hidden shadow-inner mx-auto sm:mx-0"><img src={convertGoogleDriveUrl(formData[field.name])} className="w-full h-full object-contain" alt="preview" /></div>}
                            </div>
                        ) : field.type === 'password' ? (
                            <div className="relative">
                                <input type={passwordVisibility[field.name] ? 'text' : 'password'} name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="form-input !py-2.5 pr-12" placeholder={item ? 'ទុកទទេបើមិនចង់ប្តូរ' : 'បញ្ចូលពាក្យសម្ងាត់'} />
                                <button type="button" onClick={() => setPasswordVisibility(prev => ({ ...prev, [field.name]: !prev[field.name] }))} className="absolute inset-y-0 right-0 px-4 text-gray-500 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={passwordVisibility[field.name] ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.67 .126 2.454 .364m-3.033 2.446a3 3 0 11-4.243 4.243m4.242-4.242l4.243 4.243M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg></button>
                            </div>
                        ) : (
                            <input type={field.type} name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="form-input !py-2.5" readOnly={item && field.name === section.primaryKeyField} />
                        )}
                    </div>
                ))}
            </div>
            {error && <div className="mt-4 p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold">{error}</div>}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-700/50">
                <button type="button" onClick={onClose} className="px-6 py-2.5 text-gray-400 hover:text-white font-bold transition-colors">បោះបង់</button>
                <button type="button" onClick={handleSave} className="btn btn-primary px-8 shadow-lg shadow-blue-600/20 active:scale-95" disabled={isLoading}>{isLoading ? <Spinner size="sm" /> : 'រក្សាទុក'}</button>
            </div>
        </Modal>
    );
};

const SettingsDashboard: React.FC<SettingsDashboardProps> = ({ onBack, initialSection }) => {
    const { appData, refreshData } = useContext(AppContext);
    const [desktopSection, setDesktopSection] = useState<string>(initialSection || 'users');
    const [mobileSection, setMobileSection] = useState<string | null>(initialSection || null);
    const [modal, setModal] = useState<{ isOpen: boolean, sectionId: string, item: any | null }>({ isOpen: false, sectionId: '', item: null });
    const [localUsers, setLocalUsers] = useState<any[]>([]);
    const [isPdfOpen, setIsPdfOpen] = useState(false);

    const activeId = (window.innerWidth < 768) ? mobileSection : desktopSection;
    const activeSection = configSections.find(s => s.id === activeId);

    useEffect(() => {
        if (activeId === 'users') {
            const fetchUsers = async () => {
                const appUsers = getArrayCaseInsensitive(appData, 'users');
                if (appUsers.length === 0) {
                    const res = await fetch(`${WEB_APP_URL}/api/users`);
                    const json = await res.json();
                    if (json.status === 'success') setLocalUsers(json.data || []);
                }
            };
            fetchUsers();
        }
    }, [activeId, appData]);

    const dataList = useMemo(() => {
        if (!activeSection) return [];
        if (activeSection.id === 'users') {
            const au = getArrayCaseInsensitive(appData, 'users');
            return au.length > 0 ? au : localUsers;
        }
        return getArrayCaseInsensitive(appData, activeSection.dataKey);
    }, [activeSection, appData, localUsers]);

    const handleDelete = async (section: ConfigSection, item: any) => {
        if (!window.confirm(`តើអ្នកប្រាកដទេថាចង់លុប "${getValueCaseInsensitive(item, section.displayField)}"?`)) return;
        try {
            await fetch(`${WEB_APP_URL}/api/admin/delete-row`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetName: section.sheetName, primaryKey: { [section.primaryKeyField]: getValueCaseInsensitive(item, section.primaryKeyField) } })
            });
            await refreshData();
        } catch (err) { alert('Delete failed'); }
    };

    // Mobile Categories View
    if (!activeId) {
        return (
            <div className="p-4 md:hidden animate-fade-in pb-10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-white">ការកំណត់</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Settings & Management</p>
                    </div>
                    <button onClick={onBack} className="p-2 bg-gray-800 text-gray-400 rounded-xl border border-gray-700 active:scale-95 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {configSections.map(s => (
                        <button key={s.id} onClick={() => setMobileSection(s.id)} className="flex items-center gap-4 bg-gray-800/40 border border-gray-700/50 p-4 rounded-2xl hover:bg-gray-700/40 active:scale-[0.98] transition-all text-left">
                            <span className="text-3xl bg-gray-800 p-3 rounded-xl shadow-inner border border-gray-700">{s.icon}</span>
                            <div className="flex-grow">
                                <h3 className="text-base font-black text-white leading-tight">{s.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.description}</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Desktop/Tablet Sidebar + Detail View
    return (
        <div className="w-full max-w-[100rem] mx-auto p-4 lg:p-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => { if(window.innerWidth < 768) setMobileSection(null); else onBack(); }} className="md:hidden p-2 bg-gray-800 text-white rounded-xl border border-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
                             <span className="hidden md:inline">{activeSection?.icon}</span>
                             {activeSection?.title}
                        </h1>
                        <p className="text-xs lg:text-sm text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">{activeSection?.description}</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {activeId === 'pages' && <button onClick={() => setIsPdfOpen(true)} className="flex-1 sm:flex-none btn btn-secondary px-6">PDF Export</button>}
                    <button onClick={() => setModal({ isOpen: true, sectionId: activeId, item: null })} className="flex-1 sm:flex-none btn btn-primary px-10 shadow-lg shadow-blue-600/20 font-black">+ បន្ថែមថ្មី</button>
                    <button onClick={onBack} className="hidden md:flex btn btn-secondary px-6">ត្រឡប់</button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex flex-col gap-2 w-72 flex-shrink-0">
                    {configSections.map(s => (
                        <button key={s.id} onClick={() => setDesktopSection(s.id)} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${desktopSection === s.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                            <span className="text-xl">{s.icon}</span>
                            <span className="font-black text-sm uppercase tracking-wider">{s.title}</span>
                        </button>
                    ))}
                </aside>

                {/* Content Area */}
                <main className="flex-grow min-w-0">
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto custom-scrollbar">
                            <table className="admin-table w-full">
                                <thead>
                                    <tr className="bg-gray-900/50 border-b border-gray-700">
                                        <th className="w-12 text-center">#</th>
                                        {activeSection?.fields.map(f => <th key={f.name}>{f.label}</th>)}
                                        <th className="w-32 text-center uppercase tracking-widest text-[10px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/30">
                                    {dataList.length > 0 ? dataList.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-blue-600/5 transition-colors group">
                                            <td className="text-center text-gray-500 font-bold text-xs">{idx + 1}</td>
                                            {activeSection?.fields.map(f => {
                                                const val = getValueCaseInsensitive(item, f.name);
                                                return (
                                                    <td key={f.name} className="py-4">
                                                        {f.type === 'image_url' && val ? (
                                                            <img src={convertGoogleDriveUrl(String(val))} className="w-10 h-10 rounded-xl object-contain bg-gray-900 border border-gray-700 p-1" alt="logo" />
                                                        ) : (
                                                            <span className={`text-sm font-bold ${f.type === 'password' ? 'text-gray-600' : 'text-gray-200'}`}>
                                                                {f.type === 'password' ? '••••••••' : (typeof val === 'boolean' ? (val ? '✅ Active' : '❌ Inactive') : String(val || '-'))}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setModal({ isOpen: true, sectionId: activeId, item })} className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                    <button onClick={() => handleDelete(activeSection!, item)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={10} className="py-20 text-center text-gray-500 font-bold">មិនមានទិន្នន័យត្រូវបានរកឃើញទេ</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="md:hidden divide-y divide-gray-700/50">
                            {dataList.length > 0 ? dataList.map((item: any, idx: number) => {
                                const title = getValueCaseInsensitive(item, activeSection?.displayField || '');
                                const imgField = activeSection?.fields.find(f => f.type === 'image_url');
                                const imgVal = imgField ? getValueCaseInsensitive(item, imgField.name) : null;

                                return (
                                    <div key={idx} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {imgVal && <img src={convertGoogleDriveUrl(imgVal)} className="w-12 h-12 rounded-xl object-contain bg-gray-900 border border-gray-700 p-1 flex-shrink-0" alt="logo" />}
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-white truncate">{String(title || '-')}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Item #{idx + 1}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setModal({ isOpen: true, sectionId: activeId, item })} className="p-2.5 bg-gray-800 text-blue-400 rounded-xl border border-gray-700 active:scale-95 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={() => handleDelete(activeSection!, item)} className="p-2.5 bg-gray-800 text-red-400 rounded-xl border border-gray-700 active:scale-95 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="py-20 text-center text-gray-500 font-bold">មិនមានទិន្នន័យ</div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Floating Action Button (Mobile Only) */}
            <button 
                onClick={() => setModal({ isOpen: true, sectionId: activeId, item: null })}
                className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-gray-900"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </button>

            {modal.isOpen && activeSection && (
                <ConfigEditModal 
                    section={activeSection}
                    item={modal.item}
                    onClose={() => setModal({ ...modal, isOpen: false })}
                    onSave={() => { setModal({ ...modal, isOpen: false }); refreshData(); }}
                />
            )}

            {isPdfOpen && (
                <PagesPdfExportModal 
                    isOpen={isPdfOpen} 
                    onClose={() => setIsPdfOpen(false)}
                    pages={getArrayCaseInsensitive(appData, 'pages')}
                />
            )}
        </div>
    );
};

export default SettingsDashboard;

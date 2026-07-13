
import React, { useState, useContext } from 'react';
import { AppData, ParsedOrder } from '../../../types';
import SearchableProvinceDropdown from '../SearchableProvinceDropdown';
import SearchablePageDropdown from '../../common/SearchablePageDropdown';
import { convertGoogleDriveUrl } from '../../../utils/fileUtils';
import { AppContext } from '../../../context/AppContext';

interface EditCustomerPanelProps {
    formData: ParsedOrder;
    appData: AppData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onPageSelect: (val: string) => void;
    onProvinceSelect: (val: string) => void;
    onDistrictChange: (val: string) => void;
    onSangkatChange: (val: string) => void;
    selectedDistrict: string;
    selectedSangkat: string;
}

const EditCustomerPanel: React.FC<EditCustomerPanelProps> = ({
    formData, appData, onChange, onPageSelect, onProvinceSelect, onDistrictChange, onSangkatChange,
    selectedDistrict, selectedSangkat
}) => {
    const { advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    // Derived state for dropdowns based on appData and current selection
    const provinces = [...new Set(appData.locations.map((loc: any) => loc.Province))];
    const districts = [...new Set(appData.locations.filter((loc: any) => loc.Province === formData.Location).map((loc: any) => loc.District))].sort();
    const sangkats = [...new Set(appData.locations.filter((loc: any) => loc.Province === formData.Location && loc.District === selectedDistrict).map((loc: any) => loc.Sangkat))].sort();
    
    const carrierLogo = React.useMemo(() => {
        const phoneNumber = formData['Customer Phone'] || '';
        if (phoneNumber.length < 2 || !appData.phoneCarriers) return '';
        const foundCarrier = appData.phoneCarriers.find((carrier: any) => 
            (carrier.Prefixes || '').split(',').some((prefix: string) => phoneNumber.startsWith(prefix.trim()))
        );
        return foundCarrier ? convertGoogleDriveUrl(foundCarrier.CarrierLogoURL) : '';
    }, [formData['Customer Phone'], appData.phoneCarriers]);

    return (
        <div className="flex flex-col gap-3">
            {/* Customer Info Card */}
            <div className={`border-l-4 border-t border-r border-b rounded-none p-4 flex-shrink-0 ${
                isLightMode 
                    ? 'bg-white border-l-blue-500 border-slate-200 shadow-sm' 
                    : 'bg-[#1E2329] border-l-[#FCD535] border-[#2B3139]'
            }`}>
                <h3 className={`text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                    isLightMode ? 'text-blue-600' : 'text-[#FCD535]'
                }`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Customer Information
                </h3>
                <div className="space-y-4 relative z-10">
                    <div className="mb-3">
                        <SearchablePageDropdown 
                            pages={appData.pages.filter(p => p.Team === formData.Team)} 
                            selectedPageName={formData.Page || ''} 
                            onSelect={(page) => onPageSelect(page.PageName)} 
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={`text-[10px] font-black uppercase tracking-wider ml-1 ${
                                isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                            }`}>Customer Name</label>
                            <input 
                                type="text" 
                                name="Customer Name" 
                                value={formData['Customer Name'] || ''} 
                                onChange={onChange} 
                                className={`w-full border rounded-none py-2 px-3 text-sm outline-none transition-all font-bold h-11 ${
                                    isLightMode 
                                        ? 'bg-slate-50 border-slate-200 text-slate-805 placeholder-slate-400 focus:bg-white focus:border-blue-500' 
                                        : 'bg-[#0B0E11] border-[#2B3139] text-[#EAECEF] placeholder-[#474D57] focus:border-[#FCD535]'
                                }`} 
                                placeholder="Name" 
                                required 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={`text-[10px] font-black uppercase tracking-wider ml-1 ${
                                isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                            }`}>Phone Number</label>
                            <div className="relative">
                                <input 
                                    type="tel" 
                                    name="Customer Phone" 
                                    value={formData['Customer Phone'] || ''} 
                                    onChange={onChange} 
                                    className={`w-full border rounded-none py-2 px-3 font-mono text-sm outline-none transition-all pr-10 font-bold h-11 ${
                                        isLightMode 
                                            ? 'bg-slate-50 border-slate-200 text-slate-805 placeholder-slate-400 focus:bg-white focus:border-blue-500' 
                                            : 'bg-[#0B0E11] border-[#2B3139] text-[#EAECEF] placeholder-[#474D57] focus:border-[#FCD535]'
                                    }`} 
                                    placeholder="012345678" 
                                    required 
                                />
                                <div className="absolute right-3 top-0 bottom-0 flex items-center justify-center pointer-events-none">
                                    {carrierLogo && <img src={carrierLogo} alt="Carrier" className="h-5 w-auto object-contain" />}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                        {/* Address Grid: Province, District, Sangkat in one row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-wider ml-1 ${
                                    isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                                }`}>Province / Location</label>
                                <SearchableProvinceDropdown provinces={provinces} selectedProvince={formData.Location || ''} onSelect={onProvinceSelect} />
                            </div>
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-wider ml-1 ${
                                    isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                                }`}>District</label>
                                <select 
                                    value={selectedDistrict} 
                                    onChange={(e) => onDistrictChange(e.target.value)} 
                                    className={`w-full border rounded-none py-2 px-2 text-[11px] font-black outline-none disabled:opacity-50 appearance-none cursor-pointer h-11 ${
                                        isLightMode 
                                            ? 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white focus:border-blue-500' 
                                            : 'bg-[#0B0E11] border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535]'
                                    }`} 
                                    disabled={!formData.Location}
                                >
                                    <option value="">Select District</option>
                                    {districts.map((d: string) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-wider ml-1 ${
                                    isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                                }`}>Sangkat</label>
                                <select 
                                    value={selectedSangkat} 
                                    onChange={(e) => onSangkatChange(e.target.value)} 
                                    className={`w-full border rounded-none py-2 px-2 text-[11px] font-black outline-none disabled:opacity-50 appearance-none cursor-pointer h-11 ${
                                        isLightMode 
                                            ? 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white focus:border-blue-500' 
                                            : 'bg-[#0B0E11] border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535]'
                                    }`} 
                                    disabled={!selectedDistrict}
                                >
                                    <option value="">Select Sangkat</option>
                                    {sangkats.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Full Width Fields: Address Details & Note */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-wider ml-1 ${
                                    isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                                }`}>Address Details</label>
                                <input 
                                    type="text" 
                                    name="Address Details" 
                                    value={formData['Address Details'] || ''} 
                                    onChange={onChange} 
                                    className={`w-full border rounded-none py-2 px-3 text-lg font-bold outline-none transition-all h-14 ${
                                        isLightMode 
                                            ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500' 
                                            : 'bg-[#0B0E11] border-[#2B3139] text-[#FCD535] placeholder-[#474D57] focus:border-[#FCD535]'
                                    }`} 
                                    placeholder="House #, Street, Landmarks..." 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-wider ml-1 ${
                                    isLightMode ? 'text-slate-400' : 'text-[#848E9C]'
                                }`}>Additional Notes</label>
                                <textarea 
                                    name="Note" 
                                    value={formData.Note || ''} 
                                    onChange={onChange} 
                                    rows={2}
                                    className={`w-full border rounded-none py-3 px-3 text-base font-medium outline-none transition-all resize-none ${
                                        isLightMode 
                                            ? 'bg-slate-50 border-slate-200 text-slate-805 placeholder-slate-400 focus:bg-white focus:border-blue-500' 
                                            : 'bg-[#0B0E11] border-[#2B3139] text-[#EAECEF] placeholder-[#474D57] focus:border-[#FCD535]'
                                    }`} 
                                    placeholder="Add any specific instructions or internal notes here..." 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditCustomerPanel;

import React, { useContext } from 'react';
import { ShippingMethod } from '../../types';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { AppContext } from '../../context/AppContext';

interface ShippingMethodDropdownProps {
    methods: ShippingMethod[];
    selectedMethodName: string;
    onSelect: (method: ShippingMethod) => void;
    placeholder?: string;
}

const ShippingMethodDropdown: React.FC<ShippingMethodDropdownProps> = ({ 
    methods, 
    selectedMethodName, 
    onSelect 
}) => {
    const { advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    return (
        <div className="w-full py-1">
            {methods.length === 0 ? (
                <div className={`p-6 text-center border-2 border-dashed rounded-none ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E11]/50 border-[#2B3139]'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest italic animate-pulse ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>No Methods Found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 p-1">
                    {methods.map((method) => {
                        const isSelected = selectedMethodName === method.MethodName;
                        
                        return (
                            <ShippingMethodChip 
                                key={method.MethodName}
                                method={method}
                                isSelected={isSelected}
                                isLightMode={isLightMode}
                                onSelect={() => onSelect(method)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

interface ShippingMethodChipProps {
    method: ShippingMethod;
    isSelected: boolean;
    isLightMode: boolean;
    onSelect: () => void;
}

const ShippingMethodChip: React.FC<ShippingMethodChipProps> = ({ method, isSelected, isLightMode, onSelect }) => {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`
                flex items-center justify-between sm:justify-start gap-2 pl-1.5 pr-2.5 py-1 rounded-full border-2 w-full sm:w-auto transition-all duration-300 active:scale-95
                ${isSelected 
                    ? (isLightMode ? 'bg-blue-50/80 border-blue-500 text-blue-600 shadow-sm shadow-blue-500/10' : 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535] shadow-sm shadow-[#FCD535]/10') 
                    : (isLightMode ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:border-[#FCD535]/30')
                }
            `}
        >
            {/* Left side: Logo + Name */}
            <div className="flex items-center gap-2 min-w-0">
                <img 
                    src={convertGoogleDriveUrl(method.LogoURL)} 
                    className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 border border-black/5 flex-shrink-0 shadow-sm"
                    alt="" 
                />
                <span className="text-[10px] font-black uppercase tracking-wider">{method.MethodName}</span>
            </div>
            
            {/* Right side: Rec Cost badge / Icons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {method.InternalCost !== undefined && method.InternalCost > 0 && (
                    <span className={`text-[8px] px-1.5 py-0.5 font-bold font-mono rounded-full transition-colors ${isSelected ? (isLightMode ? 'bg-blue-600 text-white' : 'bg-[#181A20] text-[#FCD535]') : (isLightMode ? 'bg-slate-200 text-slate-500' : 'bg-gray-800 text-gray-500')}`}>
                        ${method.InternalCost.toFixed(2)}
                    </span>
                )}

                {method.RequireDriverSelection && (
                    <span className={`inline-flex items-center justify-center p-0.5 rounded-full ${isSelected ? (isLightMode ? 'bg-blue-100 text-blue-700' : 'bg-[#FCD535]/20 text-[#FCD535]') : (isLightMode ? 'bg-slate-200/50 text-slate-400' : 'bg-gray-800/80 text-gray-500')}`} title="Driver Required">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </span>
                )}

                {isSelected && (
                    <svg className="w-3 h-3 stroke-[3.5] text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
        </button>
    );
};

export default ShippingMethodDropdown;

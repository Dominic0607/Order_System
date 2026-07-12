import React, { useMemo, useContext } from 'react';
import { Driver } from '../../types';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';
import { AppContext } from '../../context/AppContext';

interface DriverSelectorProps {
    drivers?: Driver[];
    selectedDriverName: string;
    onSelect: (driverName: string) => void;
}

const DriverSelector: React.FC<DriverSelectorProps> = ({ drivers = [], selectedDriverName, onSelect }) => {
    const safeDrivers = useMemo(() => Array.isArray(drivers) ? drivers : [], [drivers]);
    const { advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    const handleSelect = (name: string) => {
        if (selectedDriverName !== name) {
            onSelect(name);
        }
    };

    return (
        <div className="w-full py-1">
            {safeDrivers.length === 0 ? (
                <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-none ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E11]/50 border-[#2B3139]'}`}>
                    <div className={`w-8 h-8 border-4 border-t-blue-500 rounded-full animate-spin mb-3 ${isLightMode ? 'border-slate-200' : 'border-[#2B3139]'}`}></div>
                    <p className={`font-black uppercase tracking-[0.2em] text-[10px] italic ${isLightMode ? 'text-slate-400' : 'text-[#474D57]'}`}>NO DRIVERS DETECTED</p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2.5 p-1">
                    {safeDrivers.map((d) => (
                        <DriverChip 
                            key={d.DriverName}
                            driver={d}
                            isSelected={selectedDriverName === d.DriverName}
                            isLightMode={isLightMode}
                            onSelect={() => handleSelect(d.DriverName)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface DriverChipProps {
    driver: Driver;
    isSelected: boolean;
    isLightMode: boolean;
    onSelect: () => void;
}

const DriverChip: React.FC<DriverChipProps> = ({ driver, isSelected, isLightMode, onSelect }) => {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`
                flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border-2 transition-all duration-200 active:scale-95
                ${isSelected 
                    ? (isLightMode ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-md shadow-blue-500/5' : 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535] shadow-md shadow-[#FCD535]/5') 
                    : (isLightMode ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:border-[#FCD535]/30')
                }
            `}
        >
            {/* Avatar with status dot */}
            <div className="relative flex-shrink-0">
                <img 
                    src={convertGoogleDriveUrl(driver.ImageURL)} 
                    className="w-7 h-7 rounded-full object-cover object-top border border-black/10"
                    alt="" 
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
            </div>
            
            <span className="text-xs font-black uppercase tracking-wider">{driver.DriverName}</span>
            
            {isSelected && (
                <svg className="w-3.5 h-3.5 stroke-[3] ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            )}
        </button>
    );
};

export default DriverSelector;

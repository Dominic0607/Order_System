
import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { Check, Search, X, ChevronDown, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { AppContext } from '../../../context/AppContext';

interface SelectFilterProps {
    label: string;
    value: string; // Stores comma-separated values for multi-select
    onChange: (value: string) => void;
    options: (string | { label: string; value: string })[];
    placeholder?: string;
    variant?: 'default' | 'payment' | 'modal';
    multiple?: boolean;
    searchable?: boolean;
    isInline?: boolean; // New prop for direct rendering
}

const SelectFilter: React.FC<SelectFilterProps> = ({ 
    label, 
    value, 
    onChange, 
    options, 
    placeholder = "All",
    variant = 'default',
    multiple = false,
    searchable = true,
    isInline = false // Default to false
}) => {
    const { advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    const [isOpen, setIsOpen] = useState(isInline);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (isInline) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search on close
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isInline]);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen, searchable]);

    // Parse current values
    const selectedValues = useMemo(() => value ? value.split(',').filter(v => v) : [], [value]);

    // Helper to get label/value
    const getOptionLabel = (opt: string | { label: string; value: string }) => {
        return typeof opt === 'string' ? opt : opt.label;
    };

    const getOptionValue = (opt: string | { label: string; value: string }) => {
        return typeof opt === 'string' ? opt : opt.value;
    };

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerTerm = searchTerm.toLowerCase();
        return options.filter(opt => {
            const label = getOptionLabel(opt).toLowerCase();
            const val = getOptionValue(opt).toLowerCase();
            return label.includes(lowerTerm) || val.includes(lowerTerm);
        });
    }, [options, searchTerm]);

    const handleSelect = (optionValue: string) => {
        if (multiple) {
            let newValues;
            if (selectedValues.includes(optionValue)) {
                newValues = selectedValues.filter(v => v !== optionValue);
            } else {
                newValues = [...selectedValues, optionValue];
            }
            onChange(newValues.join(','));
            // Keep open for multiple selection
        } else {
            onChange(optionValue);
            if (!isInline) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        const allValues = options.map(opt => getOptionValue(opt));
        onChange(allValues.join(','));
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        if (!multiple && !isInline) setIsOpen(false);
    };

    if (isInline) {
        return (
            <div className="w-full flex flex-col space-y-4">
                <div className="flex items-center justify-between px-1">
                    {searchable && (
                        <div className="relative flex-grow mr-4">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                                isLightMode ? 'text-slate-400' : 'text-gray-600'
                            }`} />
                            <input
                                type="text"
                                className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none transition-all border ${
                                    isLightMode
                                        ? 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 shadow-sm placeholder:text-slate-400'
                                        : 'bg-[#0B0E11] border-[#2B3139] text-white focus:border-[#FCD535]'
                                }`}
                                placeholder="ស្វែងរក..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                    {multiple && (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSelectAll}
                                className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all flex items-center gap-1.5 ${
                                    isLightMode 
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                                        : 'bg-[#FCD535]/10 text-[#FCD535] border-[#FCD535]/20 hover:bg-[#FCD535]/20'
                                }`}
                            >
                                <CheckSquare size={14} /> All
                            </button>
                            <button 
                                onClick={handleClearAll}
                                className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all flex items-center gap-1.5 ${
                                    isLightMode 
                                        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                                        : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20 hover:bg-[#F6465D]/20'
                                }`}
                            >
                                <RotateCcw size={14} /> Clear
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-1 px-1">
                    {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => {
                        const optValue = getOptionValue(opt);
                        const optLabel = getOptionLabel(opt);
                        const isSelected = selectedValues.includes(optValue);
                        return (
                            <div 
                                key={`${optValue}-${idx}`}
                                onClick={() => handleSelect(optValue)}
                                className={`px-4 py-3.5 flex items-center justify-between cursor-pointer rounded-xl transition-all border ${
                                    isSelected 
                                        ? (isLightMode ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-[#FCD535]/10 text-[#FCD535] border-[#FCD535]/30')
                                        : (isLightMode ? 'bg-white text-slate-700 hover:bg-slate-100 border-slate-100 shadow-sm' : 'bg-[#1e2329] text-gray-400 hover:bg-[#2B3139] border-transparent')
                                }`}
                            >
                                <span className={`text-[13px] font-bold tracking-tight ${
                                    isSelected ? (isLightMode ? 'text-blue-600' : 'text-[#FCD535]') : ''
                                }`}>{optLabel}</span>
                                {isSelected ? (
                                    <div className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center shrink-0 ${
                                        isLightMode ? 'bg-blue-600 text-white' : 'bg-[#FCD535] text-black'
                                    }`}>
                                        <Check className="w-4 h-4" strokeWidth={4} />
                                    </div>
                                ) : multiple && (
                                    <div className={`w-5.5 h-5.5 rounded-lg shrink-0 border ${
                                        isLightMode ? 'border-slate-300' : 'border-[#474D57]'
                                    }`}></div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className={`py-14 text-center flex flex-col items-center gap-3 opacity-50 border-2 border-dashed rounded-xl ${
                            isLightMode ? 'border-slate-200' : 'border-[#2B3139]'
                        }`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                isLightMode ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-gray-400'
                            }`}>
                                <Search className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">No Matches Found</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── variant-aware style tokens ──────────────────────────────────────────
    const isModal = variant === 'modal';
    const r = 'rounded-xl';
    const rItem = 'rounded-lg';
    const bgTrigger = isModal 
        ? (isLightMode ? 'bg-white' : 'bg-[#1e2329]') 
        : (isLightMode ? 'bg-white' : 'bg-[#0B0E11]');
    const bgHover = isLightMode 
        ? 'hover:bg-slate-50' 
        : (isModal ? 'hover:bg-[#252a33]' : 'hover:bg-[#181A20]');
    const bgMenu = isLightMode 
        ? 'bg-white border-slate-200 shadow-2xl' 
        : (isModal ? 'bg-[#1e2329] border-[#2B3139]' : 'bg-[#181A20] border-[#2B3139]');
    const bgSearch = isLightMode 
        ? 'bg-slate-50 border-slate-200 text-slate-800' 
        : (isModal ? 'bg-[#181a20] border-[#2B3139]' : 'bg-[#0B0E11] border-[#2B3139]');
    const borderFocus = isLightMode 
        ? 'focus:border-blue-500' 
        : (isModal ? 'focus:border-[#fcd535]/50' : 'focus:border-[#FCD535]');

    let displayText = placeholder;
    if (selectedValues.length > 0) {
        if (selectedValues.length === 1) {
            const found = options.find(o => getOptionValue(o) === selectedValues[0]);
            displayText = found ? getOptionLabel(found) : selectedValues[0];
        } else {
            displayText = `${selectedValues.length} Selected`;
        }
    }

    let baseClass = `relative w-full cursor-pointer ${bgTrigger} border ${
        isLightMode ? 'border-slate-200 shadow-sm' : 'border-[#2B3139]'
    } py-3 px-4 ${r} font-bold transition-all ${bgHover} flex justify-between items-center group/select`;
    
    let textClass = isLightMode ? 'text-slate-600' : (isModal ? 'text-[#848e9c]' : 'text-gray-400');

    if (variant === 'payment') {
        if (selectedValues.includes('Paid')) {
            baseClass += " !border-[#0ECB81]/50 !bg-[#0ECB81]/10";
            textClass = "text-[#0ECB81]";
        } else if (selectedValues.includes('Unpaid')) {
            baseClass += " !border-[#F6465D]/50 !bg-[#F6465D]/10";
            textClass = "text-[#F6465D]";
        }
    } else if (selectedValues.length > 0) {
        textClass = isLightMode ? "text-blue-600 font-black" : "text-[#FCD535]";
        baseClass += isLightMode ? " !border-blue-500/50 !bg-blue-50/70 shadow-sm" : " !border-[#FCD535]/40 !bg-[#FCD535]/8";
    }

    if (isOpen) baseClass += isLightMode 
        ? " !border-blue-500 bg-white ring-2 ring-blue-500/20" 
        : (isModal ? " !border-[#fcd535]/50" : " border-[#FCD535] bg-[#181A20]");

    return (
        <div className={`w-full transition-all ${isOpen ? 'relative z-[60]' : 'relative z-10'}`} ref={dropdownRef}>
            {(label || (!isModal && multiple)) && (
                <label className={`text-[10px] font-black mb-2 uppercase tracking-widest flex items-center justify-between ${
                    isLightMode ? 'text-slate-500' : 'text-[#707A8A]'
                }`}>
                    <span>{label}</span>
                    {multiple && (
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border ${
                            isLightMode 
                                ? 'text-blue-600 bg-blue-50 border-blue-200' 
                                : 'text-[#FCD535] bg-[#FCD535]/10 border-[#FCD535]/20'
                        }`}>MULTI</span>
                    )}
                </label>
            )}

            <div className={baseClass} onClick={() => setIsOpen(!isOpen)}>
                <span className={`truncate mr-2 text-sm ${textClass}`}>{displayText}</span>
                <div className="flex items-center gap-1.5">
                    {selectedValues.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className={`p-1.5 rounded-lg transition-all active:scale-90 ${
                                isLightMode 
                                    ? 'hover:bg-slate-200/80 text-slate-400 hover:text-slate-700' 
                                    : 'hover:bg-white/10 text-gray-500 hover:text-white'
                            }`}
                        >
                            <X className="w-3 h-3" strokeWidth={3} />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                        isOpen 
                            ? (isLightMode ? 'rotate-180 text-blue-600' : 'rotate-180 text-[#fcd535]') 
                            : (isLightMode ? 'text-slate-400 group-hover/select:text-slate-600' : 'text-[#5e6673] group-hover/select:text-gray-300')
                    }`} strokeWidth={2.5} />
                </div>

                {isOpen && (
                    <div className={`absolute top-full left-0 w-full mt-1.5 ${bgMenu} ${r} z-50 overflow-hidden animate-dropdown-in max-h-[350px] flex flex-col border ${
                        isLightMode ? 'border-slate-200 shadow-2xl' : 'border-[#2B3139]'
                    }`}>
                        <div className={`p-2 border-b sticky top-0 z-10 ${
                            isLightMode ? 'border-slate-100 bg-white' : 'border-[#2B3139] bg-[#181A20]'
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {searchable && (
                                    <div className="relative flex-grow">
                                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                                            isLightMode ? 'text-slate-400' : 'text-[#5e6673]'
                                        }`} />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            className={`w-full ${bgSearch} ${rItem} pl-9 pr-4 py-2 text-xs font-bold ${borderFocus} outline-none transition-all ${
                                                isLightMode ? 'placeholder:text-slate-400 text-slate-800' : 'placeholder:text-[#5e6673] text-white'
                                            }`}
                                            placeholder="ស្វែងរក..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </div>
                            {multiple && (
                                <div className="flex gap-2 px-1 pb-1">
                                    <button 
                                        onClick={handleSelectAll}
                                        className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 border ${
                                            isLightMode 
                                                ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                                                : 'bg-[#2B3139] hover:bg-[#FCD535]/10 hover:text-[#FCD535] border-transparent text-gray-400'
                                        }`}
                                    >
                                        <CheckSquare size={12} /> Select All
                                    </button>
                                    <button 
                                        onClick={handleClearAll}
                                        className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 border ${
                                            isLightMode 
                                                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                                                : 'bg-[#2B3139] hover:bg-[#F6465D]/10 hover:text-[#F6465D] border-transparent text-gray-400'
                                        }`}
                                    >
                                        <RotateCcw size={12} /> Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-grow py-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => {
                                    const optValue = getOptionValue(opt);
                                    const optLabel = getOptionLabel(opt);
                                    const isSelected = selectedValues.includes(optValue);

                                    return (
                                        <div
                                            key={`${optValue}-${idx}`}
                                            onClick={(e) => { e.stopPropagation(); handleSelect(optValue); }}
                                            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-all mx-1.5 my-0.5 ${rItem} ${
                                                isSelected 
                                                    ? (isLightMode ? 'bg-blue-50 text-blue-600 font-black' : 'bg-[#fcd535]/10 text-[#FCD535]') 
                                                    : (isLightMode ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'text-[#848e9c] hover:bg-[#2B3139] hover:text-[#eaecef]')
                                            }`}
                                        >
                                            <span className={`text-xs font-bold truncate ${
                                                isSelected ? (isLightMode ? 'text-blue-600' : 'text-[#FCD535]') : ''
                                            }`}>
                                                {optLabel}
                                            </span>
                                            {isSelected ? (
                                                <div className={`w-4 h-4 ${rItem} flex items-center justify-center flex-shrink-0 ml-2 ${
                                                    isLightMode ? 'bg-blue-600 text-white' : 'bg-[#FCD535] text-black'
                                                }`}>
                                                    <Check className="w-2.5 h-2.5" strokeWidth={4} />
                                                </div>
                                            ) : multiple && (
                                                <div className={`w-4 h-4 ${rItem} border flex-shrink-0 ml-2 ${
                                                    isLightMode ? 'border-slate-300' : 'border-[#3d4451]'
                                                }`}></div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-6 text-center flex flex-col items-center gap-2">
                                    <div className={`w-9 h-9 ${rItem} flex items-center justify-center ${
                                        isLightMode ? 'bg-slate-100 text-slate-400' : 'bg-[#2B3139] text-[#5e6673]'
                                    }`}>
                                        <Search className="w-4 h-4" />
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${
                                        isLightMode ? 'text-slate-400' : 'text-[#5e6673]'
                                    }`}>រកមិនឃើញ</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes dropdown-in {
                    from { transform: translateY(-6px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .animate-dropdown-in { animation: dropdown-in 0.15s cubic-bezier(0,0,0.2,1) forwards; }
            `}</style>
        </div>
    );
};

export default SelectFilter;

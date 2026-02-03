
import React, { useState, useRef, useEffect, useMemo } from 'react';

interface SelectFilterProps {
    label: string;
    value: string; // Stores comma-separated values for multi-select
    onChange: (value: string) => void;
    options: (string | { label: string; value: string })[];
    placeholder?: string;
    variant?: 'default' | 'payment';
    multiple?: boolean;
    searchable?: boolean; // New prop to enable/disable search
}

const SelectFilter: React.FC<SelectFilterProps> = ({ 
    label, 
    value, 
    onChange, 
    options, 
    placeholder = "All",
    variant = 'default',
    multiple = false,
    searchable = true // Default to true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search on close
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen, searchable]);

    // Parse current values
    const selectedValues = value ? value.split(',') : [];

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
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        if (!multiple) setIsOpen(false);
    };

    // Display Text Logic
    let displayText = placeholder;
    if (selectedValues.length > 0) {
        if (selectedValues.length === 1) {
            const found = options.find(o => getOptionValue(o) === selectedValues[0]);
            // If checking specifically for Customer Name, try to show just the name part if it's too long, 
            // but usually showing the label is safer.
            displayText = found ? getOptionLabel(found) : selectedValues[0];
        } else {
            displayText = `${selectedValues.length} Selected`;
        }
    }

    // Style logic
    let baseClass = "relative w-full cursor-pointer bg-gray-900 border border-gray-800 py-3.5 px-4 rounded-2xl font-bold transition-all focus:border-blue-500/50 flex justify-between items-center";
    let textClass = "text-gray-400";

    if (variant === 'payment') {
        if (selectedValues.includes('Paid')) {
            baseClass += " border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
            textClass = "text-emerald-400";
        } else if (selectedValues.includes('Unpaid')) {
            baseClass += " border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
            textClass = "text-red-400";
        }
    } else {
        if (selectedValues.length > 0) {
            textClass = "text-white";
            baseClass += " border-blue-500/30";
        }
    }

    return (
        <div className="w-full" ref={dropdownRef}>
            <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">
                {label} {multiple && <span className="text-[9px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded ml-1">MULTI</span>}
            </label>
            
            <div 
                className={baseClass} 
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`truncate mr-2 text-sm ${textClass}`}>{displayText}</span>
                
                <div className="flex items-center gap-2">
                    {selectedValues.length > 0 && (
                        <button 
                            onClick={handleClear}
                            className="p-1 hover:bg-gray-700 rounded-full text-gray-500 hover:text-white transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1a2235] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-down max-h-72 flex flex-col">
                        {/* Search Bar */}
                        {searchable && (
                            <div className="p-2 border-b border-white/5 sticky top-0 bg-[#1a2235] z-10">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-gray-600"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}

                        <div className="overflow-y-auto custom-scrollbar flex-grow">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => {
                                    const optValue = getOptionValue(opt);
                                    const optLabel = getOptionLabel(opt);
                                    const isSelected = selectedValues.includes(optValue);

                                    return (
                                        <div 
                                            key={`${optValue}-${idx}`}
                                            onClick={(e) => { e.stopPropagation(); handleSelect(optValue); }}
                                            className={`
                                                px-4 py-3 flex items-center justify-between cursor-pointer border-b border-white/5 last:border-none transition-colors
                                                ${isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'}
                                            `}
                                        >
                                            <span className={`text-sm font-bold truncate ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                                                {optLabel}
                                            </span>
                                            {isSelected && (
                                                <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0 ml-2">
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                            {!isSelected && multiple && (
                                                <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 ml-2"></div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-500 font-bold uppercase">No Matches Found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectFilter;

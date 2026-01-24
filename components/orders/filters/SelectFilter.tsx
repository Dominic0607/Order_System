
import React from 'react';

interface SelectFilterProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: (string | { label: string; value: string })[];
    placeholder?: string;
    variant?: 'default' | 'payment';
}

const SelectFilter: React.FC<SelectFilterProps> = ({ 
    label, 
    value, 
    onChange, 
    options, 
    placeholder = "All",
    variant = 'default'
}) => {
    
    // Style calculation
    let selectClass = "form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold w-full transition-all focus:border-blue-500/50";
    
    if (variant === 'payment') {
        if (value === 'Paid') {
            selectClass += " text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
        } else if (value === 'Unpaid') {
            selectClass += " text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
        } else {
            selectClass += " text-gray-200";
        }
    } else {
        selectClass += value ? " text-white border-blue-500/30" : " text-gray-400";
    }

    return (
        <div className="w-full">
            <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">
                {label}
            </label>
            <div className="relative">
                <select 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className={selectClass}
                >
                    <option value="">{placeholder}</option>
                    {options.map((opt, idx) => {
                        const optValue = typeof opt === 'string' ? opt : opt.value;
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        return <option key={idx} value={optValue}>{optLabel}</option>;
                    })}
                </select>
                
                {variant === 'payment' && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                        {value === 'Paid' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>}
                        {value === 'Unpaid' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectFilter;

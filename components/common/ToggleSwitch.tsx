import React from 'react';

export interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    onLabel?: string;
    offLabel?: string;
    variant?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
    isLightMode?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    checked,
    onChange,
    disabled = false,
    size = 'md',
    label,
    onLabel,
    offLabel,
    variant = 'emerald',
    isLightMode = false
}) => {
    // Dimension mapping
    const dimensions = {
        sm: {
            track: 'w-9 h-5 p-0.5',
            knob: 'w-4 h-4',
            translate: 'translate-x-4',
            icon: 'w-2.5 h-2.5',
            text: 'text-[11px]'
        },
        md: {
            track: 'w-11 h-6 p-0.5',
            knob: 'w-5 h-5',
            translate: 'translate-x-5',
            icon: 'w-3 h-3',
            text: 'text-xs'
        },
        lg: {
            track: 'w-14 h-7 p-0.5',
            knob: 'w-6 h-6',
            translate: 'translate-x-7',
            icon: 'w-3.5 h-3.5',
            text: 'text-sm'
        }
    }[size];

    // Variant gradient mapping
    const variantGradients = {
        emerald: isLightMode ? 'bg-emerald-500 border-emerald-400 text-emerald-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/20 border-emerald-400/40 text-emerald-600',
        blue: isLightMode ? 'bg-blue-600 border-blue-500 text-blue-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-500/20 border-blue-400/40 text-blue-600',
        amber: isLightMode ? 'bg-amber-500 border-amber-400 text-amber-600' : 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-sm shadow-amber-500/20 border-amber-400/40 text-amber-600',
        purple: isLightMode ? 'bg-purple-600 border-purple-500 text-purple-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-sm shadow-purple-500/20 border-purple-400/40 text-purple-600',
        rose: isLightMode ? 'bg-rose-500 border-rose-400 text-rose-600' : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-sm shadow-rose-500/20 border-rose-400/40 text-rose-600'
    }[variant];

    const activeTextClass = {
        emerald: isLightMode ? 'text-emerald-700' : 'text-emerald-400',
        blue: isLightMode ? 'text-blue-700' : 'text-blue-400',
        amber: isLightMode ? 'text-amber-700' : 'text-amber-400',
        purple: isLightMode ? 'text-purple-700' : 'text-purple-400',
        rose: isLightMode ? 'text-rose-700' : 'text-rose-400'
    }[variant];

    return (
        <label className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {label && (
                <span className={`font-bold ${dimensions.text} ${isLightMode ? 'text-slate-700' : 'text-gray-200'}`}>
                    {label}
                </span>
            )}

            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`
                    relative inline-flex items-center rounded-full border transition-all duration-300 ease-in-out flex-shrink-0 outline-none
                    ${checked 
                        ? `${variantGradients} shadow-md` 
                        : (isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-gray-800 border-white/10')
                    }
                    ${dimensions.track}
                    ${disabled ? 'pointer-events-none' : 'hover:scale-[1.04] active:scale-[0.98]'}
                `}
            >
                {/* Knob with sliding animation */}
                <span
                    className={`
                        inline-flex items-center justify-center rounded-full bg-white shadow-md transform transition-all duration-300 ease-out flex-shrink-0
                        ${dimensions.knob}
                        ${checked ? dimensions.translate : 'translate-x-0'}
                    `}
                >
                    {checked ? (
                        <svg className={`${dimensions.icon} text-emerald-600 stroke-[3]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className={`${dimensions.icon} ${isLightMode ? 'text-slate-400' : 'text-gray-500'} stroke-[3]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </span>
            </button>

            {(onLabel || offLabel) && (
                <span className={`font-black ${dimensions.text} tracking-wide transition-colors ${
                    checked ? activeTextClass : (isLightMode ? 'text-slate-400' : 'text-gray-500')
                }`}>
                    {checked ? onLabel : offLabel}
                </span>
            )}
        </label>
    );
};

export default ToggleSwitch;

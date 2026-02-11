
import React from 'react';
import { COLOR_PALETTE, REVENUE_THRESHOLDS } from '../../../utils/mapUtils';

const MapLegend: React.FC = () => {
    return (
        <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 z-10 shadow-xl pointer-events-none">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Revenue Scale</p>
            <div className="flex flex-col gap-1">
                {REVENUE_THRESHOLDS.map((val, i) => {
                    if (i === 0) return null; 
                    const color = COLOR_PALETTE[i];
                    const prev = REVENUE_THRESHOLDS[i-1];
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></span>
                            <span className="text-[9px] text-gray-300 font-mono">${prev / 1000}k - ${val / 1000}k</span>
                        </div>
                    );
                })}
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_PALETTE[5] }}></span>
                    <span className="text-[9px] text-gray-300 font-mono">&gt; ${REVENUE_THRESHOLDS[5] / 1000}k</span>
                </div>
            </div>
        </div>
    );
};

export default MapLegend;

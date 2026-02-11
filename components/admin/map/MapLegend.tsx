
import React from 'react';
import { MAP_COLORS, REVENUE_LEVELS } from './mapStyles';

const MapLegend: React.FC = () => {
    return (
        <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/50 z-10 shadow-xl pointer-events-none min-w-[180px]">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Revenue Density</h5>
            <div className="flex flex-col gap-2">
                {REVENUE_LEVELS.map((val, i) => {
                    if (i === 0) return null; 
                    const color = MAP_COLORS.levels[i]; 
                    const prev = REVENUE_LEVELS[i-1];
                    
                    const label = i === REVENUE_LEVELS.length - 1 
                        ? `> $${(val / 1000).toFixed(0)}k` 
                        : `$${(prev / 1000).toFixed(0)}k - $${(val / 1000).toFixed(0)}k`;

                    return (
                        <div key={i} className="flex items-center gap-3">
                            <span 
                                className="w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-white/10" 
                                style={{ backgroundColor: color }}
                            ></span>
                            <span className="text-[10px] text-slate-300 font-medium font-mono">{label}</span>
                        </div>
                    );
                })}
            </div>
            
            {/* Height Indicator - Simplified */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3">
                 <div className="h-8 w-1.5 rounded-full bg-gradient-to-t from-red-900 to-orange-400 shadow-inner"></div>
                 <div className="flex flex-col">
                     <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">3D Height</span>
                     <span className="text-[9px] text-slate-500">Volume</span>
                 </div>
            </div>
        </div>
    );
};

export default MapLegend;

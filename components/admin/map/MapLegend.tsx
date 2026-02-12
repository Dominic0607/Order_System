
import React from 'react';
import { MAP_COLORS, REVENUE_LEVELS } from './mapStyles';

const MapLegend: React.FC = () => {
    return (
        <div className="absolute bottom-6 left-6 bg-[#0f0518]/60 backdrop-blur-2xl p-5 rounded-[2rem] border border-purple-500/20 z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-none min-w-[200px]">
            <div className="flex items-center gap-2 mb-4 border-b border-purple-500/10 pb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></div>
                <h5 className="text-[11px] font-black text-purple-300 uppercase tracking-[0.2em]">Data Metrics</h5>
            </div>
            
            <div className="space-y-2.5">
                {REVENUE_LEVELS.map((val, i) => {
                    if (i === 0) return null; 
                    const color = MAP_COLORS.levels[i]; 
                    const prev = REVENUE_LEVELS[i-1];
                    
                    const label = i === REVENUE_LEVELS.length - 1 
                        ? `$${(val / 1000).toFixed(0)}k+` 
                        : `$${(prev / 1000).toFixed(1)}k - $${(val / 1000).toFixed(1)}k`;

                    return (
                        <div key={i} className="flex items-center gap-4 group">
                            <div 
                                className="w-3 h-3 rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.05)] transition-transform duration-300 group-hover:scale-110" 
                                style={{ 
                                    backgroundColor: color,
                                    boxShadow: `0 0 15px ${color}33`
                                }}
                            ></div>
                            <span className="text-[10px] text-purple-400 font-bold font-mono tracking-tight">{label}</span>
                        </div>
                    );
                })}
            </div>
            
            {/* Height Indicator - Modernized */}
            <div className="mt-5 pt-4 border-t border-purple-500/10 flex items-center gap-4">
                 <div className="h-10 w-2 rounded-full bg-gradient-to-t from-purple-900 via-purple-500 to-yellow-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]"></div>
                 <div className="flex flex-col gap-0.5">
                     <span className="text-[10px] text-purple-100 font-black uppercase tracking-wider">3D Density</span>
                     <span className="text-[9px] text-purple-500 font-medium">Visual Projection</span>
                 </div>
            </div>
        </div>
    );
};

export default MapLegend;

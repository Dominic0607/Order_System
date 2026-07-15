import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ChartData {
    label?: string;
    name?: string;
    value: number;
}

interface SimpleLineChartProps {
    data: ChartData[];
    title?: string;
    color?: string;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, title, color }) => {
    const { advancedSettings } = useContext(AppContext);
    const uiTheme = advancedSettings?.uiTheme || 'default';
    const isLightMode = advancedSettings?.themeMode === 'light';

    // Normalize data structure dynamically to handle various key schemas
    const formattedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return data.map(d => ({
            name: d.label || d.name || '',
            value: Number(d.value) || 0
        }));
    }, [data]);

    // Theme-specific colors and visual aesthetics
    const themeConfig = useMemo(() => {
        switch (uiTheme) {
            case 'binance':
                return {
                    strokeColor: color || '#FCD535',
                    fillColor: color || '#FCD535',
                    gridColor: '#2B3139',
                    textColor: '#848E9C',
                    tooltipBg: '#1E2329',
                    tooltipBorder: '#2B3139',
                    tooltipText: '#EAECEF',
                };
            case 'netflix':
                return {
                    strokeColor: color || '#E50914',
                    fillColor: color || '#E50914',
                    gridColor: 'rgba(255,255,255,0.05)',
                    textColor: '#9ca3af',
                    tooltipBg: '#181818',
                    tooltipBorder: 'rgba(255,255,255,0.05)',
                    tooltipText: '#ffffff',
                };
            default:
                return {
                    strokeColor: color || '#3b82f6',
                    fillColor: color || '#3b82f6',
                    gridColor: isLightMode ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                    textColor: isLightMode ? '#64748b' : '#94a3b8',
                    tooltipBg: isLightMode ? '#ffffff' : '#1e293b',
                    tooltipBorder: isLightMode ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                    tooltipText: isLightMode ? '#0f172a' : '#f8fafc',
                };
        }
    }, [uiTheme, isLightMode, color]);

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] opacity-35 uppercase font-black tracking-widest text-[10px]">
                <i className="fa-solid fa-chart-line text-4xl mb-4"></i>
                No data available for chart
            </div>
        );
    }

    // Custom Glassmorphic Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const val = payload[0].value;
        return (
            <div 
                className="p-3 shadow-2xl backdrop-blur-xl border text-[11px] font-bold rounded-2xl"
                style={{
                    backgroundColor: themeConfig.tooltipBg,
                    borderColor: themeConfig.tooltipBorder,
                    color: themeConfig.tooltipText,
                }}
            >
                <div className="opacity-60 mb-1">{label}</div>
                <div className="text-[13px] font-black tabular-nums" style={{ color: themeConfig.strokeColor }}>
                    ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </div>
            </div>
        );
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            {title && (
                <h3 className="text-sm font-black mb-6 text-center uppercase tracking-widest" style={{ color: themeConfig.textColor }}>
                    {title}
                </h3>
            )}
            <div className="flex-grow w-full relative min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={themeConfig.fillColor} stopOpacity={0.25}/>
                                <stop offset="95%" stopColor={themeConfig.fillColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.gridColor} vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            tick={{ fill: themeConfig.textColor, fontSize: 10, fontWeight: '700' }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis 
                            tick={{ fill: themeConfig.textColor, fontSize: 10, fontWeight: '700' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                            dx={-5}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: themeConfig.gridColor, strokeWidth: 1 }} />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={themeConfig.strokeColor} 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#chartGradient)" 
                            activeDot={{ r: 6, strokeWidth: 0, fill: themeConfig.strokeColor }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SimpleLineChart;

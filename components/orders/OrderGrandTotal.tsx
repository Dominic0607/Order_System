
import React, { useMemo, useContext } from 'react';
import { ParsedOrder } from '../../types';
import { AppContext } from '../../context/AppContext';
import { translations } from '../../translations';

// --- Hook for Calculation ---
export const useOrderTotals = (orders: ParsedOrder[]) => {
    return useMemo(() => {
        return orders.reduce((acc, curr) => {
            const fs = curr.FulfillmentStatus || curr['Fulfillment Status'] || 'Pending';
            const isCancelled = fs === 'Cancelled';
            const isReturned = fs === 'Returned';
            const isExcluded = isCancelled || isReturned;
            
            return {
                grandTotal: acc.grandTotal + (isExcluded ? 0 : (Number(curr['Grand Total']) || 0)),
                internalCost: acc.internalCost + (isExcluded ? 0 : (Number(curr['Internal Cost']) || 0)),
                count: acc.count + 1,
                paidCount: acc.paidCount + (curr['Payment Status'] === 'Paid' ? 1 : 0),
                unpaidCount: acc.unpaidCount + (curr['Payment Status'] === 'Unpaid' ? 1 : 0)
            };
        }, { grandTotal: 0, internalCost: 0, count: 0, paidCount: 0, unpaidCount: 0 });
    }, [orders]);
};

// --- Desktop Row Component ---
interface DesktopGrandTotalRowProps {
    totals: { grandTotal: number; internalCost: number; count: number; paidCount: number; unpaidCount: number };
    isVisible: (key: string) => boolean;
    showSelection: boolean;
    getColWidth: (key: string) => number;
    showBorders?: boolean;
}

export const DesktopGrandTotalRow: React.FC<DesktopGrandTotalRowProps> = ({ totals, isVisible, showSelection, getColWidth, showBorders = false }) => {
    const { language, advancedSettings } = useContext(AppContext);
    const t = translations[language];
    const isBinance = advancedSettings?.uiTheme === 'binance';
    const isLightMode = advancedSettings?.themeMode === 'light';
    
    if (totals.count === 0) return null;

    const check = isVisible;

    // Theme Variables - Enhanced for a borderless layout
    const rowBg = isLightMode
        ? 'bg-slate-50 border-b border-slate-200'
        : isBinance 
            ? 'bg-[#1E2329]' 
            : 'bg-[#0f172a]/90 backdrop-blur-3xl';
    
    const greenText = isLightMode ? 'text-emerald-600' : (isBinance ? 'text-[#0ECB81]' : 'text-emerald-400');
    const redText = isLightMode ? 'text-rose-600' : (isBinance ? 'text-[#F6465D]' : 'text-red-400');
    const isNumericColumn = (key: string) => ['total', 'shippingCost'].includes(key);

    const renderCell = (key: string, content: React.ReactNode, extraClasses = "") => {
        if (!check(key)) return null;
        return (
            <div 
                style={{ width: `${getColWidth(key)}px` }} 
                className={`order-column-cell ${isNumericColumn(key) ? 'is-numeric' : ''} flex-shrink-0 flex items-center px-4 py-3 ${extraClasses} ${showBorders ? (isLightMode ? 'border-r border-slate-200' : isBinance ? 'border-r border-[#2B3139]' : 'border-r border-white/10') : ''}`}
            >
                {content}
            </div>
        );
    };

    return (
        <div className={`flex w-full ${rowBg} transition-all duration-300 group z-10 relative overflow-hidden ${isLightMode ? 'border-b border-slate-200' : isBinance ? 'border-b border-[#2B3139]' : 'border-b border-white/10'}`}>
            {/* Animated Ambient Light (Default Theme Only) */}
            {!isBinance && !isLightMode && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                    <div className="absolute top-[-50%] left-[-10%] w-[40%] h-[200%] bg-blue-600/10 blur-[100px] rotate-45 animate-pulse"></div>
                    <div className="absolute bottom-[-50%] right-[-10%] w-[40%] h-[200%] bg-emerald-500/5 blur-[100px] rotate-45 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
            )}

            {showSelection && (
                <div className={`order-column-cell flex-shrink-0 flex items-center justify-center px-0.5 ${showBorders ? (isLightMode ? 'border-r border-slate-200' : isBinance ? 'border-r border-[#2B3139]' : 'border-r border-white/10') : ''}`} style={{ width: '40px' }}></div>
            )}
            
            {renderCell('index', (
                <div className="flex flex-col items-center justify-center w-full transition-transform group-hover:scale-105">
                    <span className={`text-[7px] font-black uppercase tracking-[0.2em] mb-0.5 ${isLightMode ? 'text-slate-500' : isBinance ? 'text-[#848E9C]' : 'text-blue-500/50'}`}>
                        {language === 'km' ? 'ចំនួន' : 'COUNT'}
                    </span>
                    <div className={`px-2 py-0.5 rounded-sm ${isLightMode ? 'bg-slate-200 text-slate-800' : isBinance ? 'bg-[#2B3139] text-[#EAECEF]' : 'bg-blue-500/10 text-white'} font-black text-[11px] tabular-nums border border-transparent`}>
                        {totals.count}
                    </div>
                </div>
            ), "justify-center")}
            
            {renderCell('actions', (
                <div className="flex flex-col items-center justify-center w-full opacity-60">
                   <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${isLightMode ? 'text-slate-500' : isBinance ? 'text-[#848E9C]' : 'text-gray-500 italic'}`}>
                        {language === 'km' ? 'សរុប' : 'SUMMARY'}
                    </span>
                    {isBinance && !isLightMode && <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1 h-1 bg-[#0ECB81] rounded-full animate-pulse"></span>
                        <span className="text-[6px] font-bold text-[#0ECB81]">LIVE</span>
                    </div>}
                </div>
            ), "justify-center")}
            
            {renderCell('customerName', (
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                        <div className={`w-1 h-8 rounded-full relative z-10 ${isLightMode ? 'bg-blue-500' : isBinance ? 'bg-[#FCD535]' : 'bg-gradient-to-b from-blue-400 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`}></div>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${isLightMode ? 'text-slate-500' : isBinance ? 'text-[#848E9C]' : 'text-blue-500/60'}`}>SYSTEM TOTALS</span>
                        <h4 className={`font-black uppercase tracking-tight leading-none ${isLightMode ? 'text-[14px] text-slate-800' : isBinance ? 'text-[14px] text-[#EAECEF]' : 'text-[16px] text-white italic'}`}>
                            {t.grand_total}
                        </h4>
                    </div>
                </div>
            ))}
            
            {renderCell('productInfo', null)}
            {renderCell('location', null)}
            {renderCell('pageInfo', null)}
            {renderCell('brandSales', null)}
            {renderCell('fulfillment', null)}
            
            {renderCell('total', (
                <div className="flex flex-col items-start w-full relative">
                    <span className={`text-[8px] font-black uppercase mb-0.5 tracking-wider ${isLightMode ? 'text-emerald-600' : isBinance ? 'text-[#848E9C]' : 'text-emerald-500/70'}`}>
                        {t.total_revenue}
                    </span>
                    <div className="flex items-baseline gap-0.5">
                        <span className={`font-black ${isLightMode ? 'text-[12px] text-emerald-600' : isBinance ? 'text-[12px] text-[#0ECB81]' : 'text-[12px] text-emerald-500'}`}>$</span>
                        <span className={`font-black tabular-nums tracking-tighter ${isLightMode ? 'text-[20px] text-slate-900' : isBinance ? 'text-[20px] text-[#EAECEF]' : 'text-[22px] text-white shadow-emerald-500/20'}`}>
                            {totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            ))}
            
            {renderCell('shippingService', null)}
            {renderCell('driver', null)}
            
            {renderCell('shippingCost', (
                <div className="flex flex-col items-start w-full opacity-90">
                    <span className={`text-[8px] font-black uppercase mb-0.5 tracking-wider ${isLightMode ? 'text-slate-500' : isBinance ? 'text-[#848E9C]' : 'text-orange-500/70'}`}>
                        {t.total_cost}
                    </span>
                    <div className="flex items-baseline gap-0.5">
                        <span className={`font-black ${isLightMode ? 'text-[11px] text-slate-500' : isBinance ? 'text-[11px] text-[#848E9C]' : 'text-[11px] text-orange-500'}`}>$</span>
                        <span className={`font-black tabular-nums tracking-tight ${isLightMode ? 'text-[15px] text-slate-800' : isBinance ? 'text-[15px] text-[#EAECEF]' : 'text-[17px] text-white/90'}`}>
                            {totals.internalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            ))}
            
            {renderCell('status', (
                <div className="flex items-center gap-3 justify-center w-full">
                    <div className="flex flex-col items-center group/stat">
                        <div className={`font-black tabular-nums leading-none ${isLightMode ? 'text-[13px]' : isBinance ? 'text-[13px]' : 'text-[15px]'} ${greenText} group-hover/stat:scale-110 transition-transform`}>
                            {totals.paidCount}
                        </div>
                        <span className={`font-black uppercase mt-0.5 tracking-widest ${isLightMode ? 'text-[6px] text-slate-500' : isBinance ? 'text-[6px] text-[#848E9C]' : 'text-[6px] text-gray-500'}`}>{t.paid}</span>
                    </div>
                    <div className={`w-px h-5 ${isLightMode ? 'bg-slate-200' : isBinance ? 'bg-[#2B3139]' : 'bg-white/10'}`}></div>
                    <div className="flex flex-col items-center group/stat">
                        <div className={`font-black tabular-nums leading-none ${isLightMode ? 'text-[13px]' : isBinance ? 'text-[13px]' : 'text-[15px]'} ${redText} group-hover/stat:scale-110 transition-transform`}>
                            {totals.unpaidCount}
                        </div>
                        <span className={`font-black uppercase mt-0.5 tracking-widest ${isLightMode ? 'text-[6px] text-slate-500' : isBinance ? 'text-[6px] text-[#848E9C]' : 'text-[6px] text-gray-500'}`}>{t.unpaid}</span>
                    </div>
                </div>
            ), "justify-center")}

            {renderCell('date', null)}
            {renderCell('note', null)}
            {renderCell('print', null)}
            {renderCell('check', null)}
            {renderCell('orderId', null)}
            {renderCell('telegramStatus', null)}
        </div>
    );
};

// --- Mobile Card Component ---
interface MobileGrandTotalCardProps {
    totals: { grandTotal: number; internalCost: number; count: number; paidCount: number; unpaidCount: number };
}

export const MobileGrandTotalCard: React.FC<MobileGrandTotalCardProps> = ({ totals }) => {
    const { language, advancedSettings } = useContext(AppContext);
    const t = translations[language];
    const isBinance = advancedSettings?.uiTheme === 'binance';
    
    if (totals.count === 0) return null;

    // Theme Variables
    const isLightMode = advancedSettings?.themeMode === 'light';
    const cardBg = isLightMode
        ? 'bg-white border-slate-200/80 shadow-md'
        : (isBinance ? 'bg-[#1E2329]' : 'bg-[#0f172a]/95 backdrop-blur-3xl');
    const cardBorder = isLightMode ? 'border-slate-200/80' : (isBinance ? 'border-[#2B3139]' : 'border-white/10');
    const textTitle = isLightMode ? 'text-slate-800' : 'text-white';
    const textSubTitle = isLightMode ? 'text-slate-500' : 'text-gray-400';
    const textMuted = isLightMode ? 'text-slate-400' : 'text-gray-500';
    const kpiCellBg = isLightMode ? 'bg-slate-50/80 border border-slate-100/50' : 'bg-white/[0.02] border border-white/5';

    if (isBinance) {
        return (
            <div className="bg-[#1E2329] border border-[#2B3139] rounded p-4 shadow-lg mt-6 mx-1">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2B3139]">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#FCD535] rounded-sm"></div>
                        <span className="text-[12px] font-bold text-[#EAECEF] uppercase tracking-tight">
                            {language === 'km' ? 'ស្ថិតិសរុប' : 'Order Summary'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-medium text-[#848E9C]">LIVE</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#0B0E11] p-3 rounded">
                        <p className="text-[10px] font-medium text-[#848E9C] uppercase mb-1">{language === 'km' ? 'ចំនួនការកម្មង់' : 'Total Orders'}</p>
                        <p className="text-xl font-bold text-[#EAECEF] tabular-nums">{totals.count}</p>
                    </div>
                    <div className="bg-[#0B0E11] p-3 rounded">
                        <p className="text-[10px] font-medium text-[#848E9C] uppercase mb-1">{t.paid}</p>
                        <p className="text-xl font-bold text-[#0ECB81] tabular-nums">{totals.paidCount}</p>
                    </div>
                </div>

                <div className="bg-[#0B0E11] p-4 rounded mb-3">
                    <p className="text-[10px] font-medium text-[#848E9C] uppercase mb-1">{t.total_revenue}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[#0ECB81] font-bold text-sm">$</span>
                        <p className="text-3xl font-bold text-[#EAECEF] tabular-nums tracking-tight">
                            {totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-[#2B3139]/30 px-3 py-2 rounded">
                    <div className="flex flex-col">
                        <p className="text-[9px] font-medium text-[#848E9C] uppercase">{t.total_cost}</p>
                        <p className="text-[14px] font-bold text-[#EAECEF] tabular-nums">${totals.internalCost.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-medium text-[#848E9C] uppercase">Unpaid</p>
                        <p className="text-[14px] font-bold text-[#F6465D] tabular-nums">{totals.unpaidCount}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${cardBg} border ${cardBorder} rounded-2xl p-3.5 shadow-lg animate-fade-in-up mt-4 mx-1 relative overflow-hidden`}>
            {/* Ambient Background Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600"></div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${isLightMode ? 'text-slate-700' : 'text-white'}`}>
                        {language === 'km' ? 'ស្ថិតិសរុប' : 'Summary Statistics'}
                    </span>
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-gray-300'}`}>
                    {totals.count} {language === 'km' ? 'ការកម្មង់' : 'Orders'}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-2.5 items-stretch">
                {/* Left Column: Revenue (span 7) */}
                <div className={`col-span-7 flex flex-col justify-center ${kpiCellBg} p-2.5 rounded-xl`}>
                    <span className={`text-[8px] font-black uppercase tracking-wider mb-0.5 ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {language === 'km' ? 'ចំណូលសរុប' : 'Revenue'}
                    </span>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-emerald-500 font-bold text-xs">$</span>
                        <span className={`text-xl font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                            {totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Right Column: Logistics & Badges (span 5) */}
                <div className={`col-span-5 flex flex-col justify-between ${kpiCellBg} p-2.5 rounded-xl`}>
                    <div className="flex flex-col mb-1.5">
                        <span className={`text-[8px] font-black uppercase tracking-wider mb-0.5 ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {language === 'km' ? 'សេវាដឹក' : 'Logistics'}
                        </span>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-orange-400 font-bold text-[9px]">$</span>
                            <span className={`text-[13px] font-black ${isLightMode ? 'text-slate-700' : 'text-white/90'}`}>
                                {totals.internalCost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <span className={`flex-1 text-center py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-500`}>
                            {totals.paidCount} P
                        </span>
                        <span className={`flex-1 text-center py-0.5 rounded text-[8px] font-black bg-red-500/10 text-red-500`}>
                            {totals.unpaidCount} C
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

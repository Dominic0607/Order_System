
import React from 'react';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';

interface SalesByPageMobileProps {
    data: any[];
    onPreviewImage: (url: string) => void;
}

const SalesByPageMobile: React.FC<SalesByPageMobileProps> = ({ data, onPreviewImage }) => {
    return (
        <div className="md:hidden space-y-4 pb-12 px-1">
            <h3 className="text-lg font-black text-white px-2 flex items-center gap-2 mb-4">
                <span className="w-1.5 h-5 bg-indigo-500 rounded-full"></span>
                របាយការណ៍តាម Page (Mobile)
            </h3>
            {data.map((item: any) => {
                const aov = item.orderCount > 0 ? item.revenue / item.orderCount : 0;
                return (
                    <div key={item.pageName} className="bg-gray-800/40 border border-white/10 rounded-[2.5rem] p-6 shadow-xl space-y-5 animate-fade-in-up group relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-700 bg-gray-950 shadow-inner p-0.5">
                                    <img src={convertGoogleDriveUrl(item.logoUrl)} className="w-full h-full object-cover rounded-lg" alt="" onClick={() => onPreviewImage(convertGoogleDriveUrl(item.logoUrl))} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-base font-black text-white truncate leading-tight uppercase tracking-tight">{item.pageName}</h4>
                                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">{item.teamName}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">ចំណូលសរុប</p>
                                <p className="text-lg font-black text-blue-400 tracking-tighter">${item.revenue.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">ប្រាក់ចំណេញ</p>
                                <p className="text-lg font-black text-emerald-400 tracking-tighter">${item.profit.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.orderCount} Orders</span>
                            </div>
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AOV: ${aov.toFixed(0)}</span>
                        </div>
                        
                        <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-600/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                    </div>
                );
            })}
        </div>
    );
};

export default SalesByPageMobile;

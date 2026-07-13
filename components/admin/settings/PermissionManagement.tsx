
import React, { useContext } from 'react';
import { AppContext } from '../../../context/AppContext';
import PermissionMatrix from './PermissionMatrix';

const PermissionManagement: React.FC = () => {
    const { currentUser, advancedSettings } = useContext(AppContext);
    const isLightMode = advancedSettings?.themeMode === 'light';

    return (
        <div className={`font-sans animate-fade-in w-full min-h-full ${isLightMode ? 'bg-slate-50' : 'bg-[#181a20]'}`}>
            <div className="max-w-6xl mx-auto space-y-8 p-6 lg:p-10">
                {/* Header */}
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${isLightMode ? 'border-slate-200' : 'border-[#2b3139]'}`}>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-6 rounded-full ${isLightMode ? 'bg-blue-600' : 'bg-[#fcd535]'}`}></div>
                            <h3 className={`text-2xl font-black tracking-tight ${isLightMode ? 'text-slate-800' : 'text-[#eaecef]'}`}>ការកំណត់សិទ្ធិប្រើប្រាស់</h3>
                        </div>
                        <p className={`text-sm ml-4.5 ${isLightMode ? 'text-slate-500' : 'text-[#848e9c]'}`}>គ្រប់គ្រង និងកំណត់សិទ្ធិសម្រាប់តួនាទីនីមួយៗក្នុងប្រព័ន្ធ</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-[#0ecb81] shadow-[0_0_8px_rgba(14,203,129,0.5)] animate-pulse"></div>
                        <span className="text-xs font-bold text-[#0ecb81] uppercase tracking-wider">ប្រព័ន្ធកំពុងដំណើរការ</span>
                    </div>
                </div>

                <div className="relative z-10 min-h-[400px]">
                    <PermissionMatrix />
                </div>
                
                {/* Footer Notice */}
                <div className="flex flex-col md:flex-row justify-center items-center gap-4 py-8">
                    <div className={`h-px flex-grow max-w-xs ${isLightMode ? 'bg-slate-200' : 'bg-[#2b3139]'}`}></div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-[#5e6673]'}`}>Authorized Personnel Only</p>
                    <div className={`h-px flex-grow max-w-xs ${isLightMode ? 'bg-slate-200' : 'bg-[#2b3139]'}`}></div>
                </div>
            </div>
        </div>
    );
};

export default PermissionManagement;


import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, colorClass }) => (
    <div className="relative group overflow-hidden bg-gray-800/30 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] transition-all duration-500 hover:bg-gray-800/50 hover:border-white/10 hover:shadow-2xl">
        <div className="relative z-10 flex justify-between items-center">
            <div>
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1.5">{label}</p>
                <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xl shadow-lg shadow-blue-900/20 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                {icon}
            </div>
        </div>
        <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10 blur-[40px] transition-opacity duration-700`}></div>
    </div>
);

export default StatCard;

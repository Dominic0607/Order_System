
import React from 'react';
import UserAvatar from '../common/UserAvatar';

interface TargetsTabProps {
    data: any[];
}

const TargetsTab: React.FC<TargetsTabProps> = ({ data }) => {
    const getAchievementText = (percent: number) => {
        if (percent >= 100) return 'text-emerald-400';
        if (percent >= 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getAchievementColor = (percent: number) => {
        if (percent >= 100) return 'bg-emerald-500';
        if (percent >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.map(user => (
                <div key={user.userName} className="glass-card p-6 rounded-3xl shadow-xl hover:border-blue-500/50 transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <UserAvatar avatarUrl={user.profilePictureURL} name={user.fullName} size="md" className="ring-4 ring-blue-500/10 group-hover:ring-blue-500/20 transition-all" />
                            <div>
                                <h4 className="text-white font-black leading-none mb-1 group-hover:text-blue-300 transition-colors">{user.fullName}</h4>
                                <span className="text-[9px] bg-blue-900/40 text-blue-300 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-blue-500/20">{user.team || 'No Team'}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">គោលដៅខែនេះ</p>
                            <p className="text-blue-400 font-black text-lg tracking-tight">${user.target.toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">វឌ្ឍនភាពសម្រេចបាន</span>
                                <span className={`text-sm font-black ${getAchievementText(user.achievement)}`}>{user.achievement.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-3.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner p-0.5">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.5)] ${getAchievementColor(user.achievement)}`} 
                                    style={{ width: `${Math.min(user.achievement, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-800/50">
                            <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-800">
                                <p className="text-[10px] text-gray-500 font-black uppercase mb-1">លក់បាន</p>
                                <p className="text-white font-black">${user.revenue.toLocaleString()}</p>
                            </div>
                            <div className={`p-3 rounded-xl border ${user.achievement >= 100 ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                                <p className="text-[10px] text-gray-500 font-black uppercase mb-1">នៅសល់</p>
                                <p className={`font-black ${user.achievement >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {user.achievement >= 100 ? 'SUCCESS 🏆' : `$${Math.max(0, user.target - user.revenue).toLocaleString()}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TargetsTab;


import React from 'react';
import RankMedal from './RankMedal';
import UserAvatar from '../common/UserAvatar';
import { convertGoogleDriveUrl } from '../../utils/fileUtils';

interface LeaderboardTabProps {
    data: any[];
    metric: string;
    onMetricChange: (metric: any) => void;
    datePreset: string;
    previewImage: (url: string) => void;
}

const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ data, metric, onMetricChange, datePreset, previewImage }) => {
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
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">តារាងចំណាត់ថ្នាក់អ្នកលក់ឆ្នើម</h2>
                    <p className="text-gray-500 text-xs mt-1 uppercase tracking-wider font-bold">ផ្អែកលើ: {datePreset.replace('_', ' ')}</p>
                </div>
                <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                    {(['revenue', 'orderCount', 'achievement'] as const).map(m => (
                        <button 
                            key={m}
                            onClick={() => onMetricChange(m)}
                            className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${metric === m ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {m === 'revenue' ? 'ចំណូល' : m === 'orderCount' ? 'ការកម្មង់' : '% សម្រេច'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-card rounded-3xl shadow-2xl overflow-hidden border border-gray-700/50">
                <div className="block md:hidden divide-y divide-gray-800">
                    {data.map((user, index) => (
                        <div key={user.userName} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <RankMedal rank={index + 1} />
                                <div className="flex items-center gap-3">
                                    <UserAvatar avatarUrl={user.profilePictureURL} name={user.fullName} size="sm" className="ring-2 ring-blue-500/20" />
                                    <div>
                                        <p className="text-sm font-bold text-white leading-none">{user.fullName}</p>
                                        <p className="text-[10px] text-gray-500 mt-1 font-bold">{user.team}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-blue-400">${user.revenue.toLocaleString()}</p>
                                <p className={`text-[10px] font-bold ${getAchievementText(user.achievement)}`}>{user.achievement.toFixed(1)}%</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800">
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-24">Rank</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">អ្នកលក់</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">ចំណូលសរុប</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">ការកម្មង់</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">ការសម្រេចគោលដៅ (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {data.map((user, index) => (
                                <tr key={user.userName} className="hover:bg-blue-600/5 transition-all group">
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center"><RankMedal rank={index + 1} /></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar 
                                                avatarUrl={user.profilePictureURL} 
                                                name={user.fullName} 
                                                size="md" 
                                                className="border border-gray-700 shadow-md group-hover:scale-110 transition-transform"
                                                onClick={() => previewImage(convertGoogleDriveUrl(user.profilePictureURL))}
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{user.fullName}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">{user.team}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-blue-400 font-black text-lg">${user.revenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center font-black text-gray-300">{user.orderCount}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-black mb-1.5 ${getAchievementText(user.achievement)}`}>
                                                {user.achievement.toFixed(1)}%
                                            </span>
                                            <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700 shadow-inner">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out progress-glow ${getAchievementColor(user.achievement)}`} 
                                                    style={{ width: `${Math.min(user.achievement, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardTab;

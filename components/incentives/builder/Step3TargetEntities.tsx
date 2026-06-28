import React, { useState } from 'react';
import { IncentiveCalculator, AppData } from '../../../types';
import { MousePointer2, Target, Users, ShieldCheck, Box, UserX, Search, Info, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { getArrayCaseInsensitive, getValueCaseInsensitive } from '../../../constants/settingsConfig';
import Modal from '../../common/Modal';

interface Step3TargetEntitiesProps {
    calcData: Partial<IncentiveCalculator>;
    appData: AppData;
    updateField: (field: keyof IncentiveCalculator, value: any) => void;
    toggleApplyTo: (item: string) => void;
    toggleExcludeTarget: (item: string) => void;
}

const Step3TargetEntities: React.FC<Step3TargetEntitiesProps> = ({ calcData, appData, updateField, toggleApplyTo, toggleExcludeTarget }) => {
    const roles = getArrayCaseInsensitive(appData, 'roles');
    const [userSearch, setUserSearch] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailSearch, setDetailSearch] = useState('');

    const isUserInTeam = (userTeamStr: string, teamName: string) => {
        if (!userTeamStr || !teamName) return false;
        const targetTeam = teamName.trim().toLowerCase();
        return userTeamStr.split(',').some(t => t.trim().toLowerCase() === targetTeam);
    };

    const isUserIncluded = (user: any) => {
        const applyTo = calcData.applyTo || [];
        if (applyTo.length === 0) return true;
        return applyTo.some(rule => {
            if (rule.startsWith('Role:')) {
                return user.Role === rule.replace('Role:', '');
            }
            if (rule.startsWith('Team:')) {
                return isUserInTeam(user.Team, rule.replace('Team:', ''));
            }
            if (rule.startsWith('User:')) {
                return user.UserName === rule.replace('User:', '');
            }
            return false;
        });
    };

    const isUserExcluded = (user: any) => {
        const excludeTargets = calcData.excludeTargets || [];
        return excludeTargets.some(rule => {
            if (rule.startsWith('Role:')) {
                return user.Role === rule.replace('Role:', '');
            }
            if (rule.startsWith('User:')) {
                return user.UserName === rule.replace('User:', '');
            }
            if (rule.startsWith('TeamUser:')) {
                const parts = rule.replace('TeamUser:', '').split(':');
                if (parts.length === 2) {
                    const [teamName, userName] = parts;
                    return user.UserName === userName && isUserInTeam(user.Team, teamName);
                }
            }
            return rule === user.UserName;
        });
    };

    const receivesBenefit = (user: any) => {
        return isUserIncluded(user) && !isUserExcluded(user);
    };

    const filteredUsers = (appData.users || []).filter(u => 
        u.FullName.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.UserName.toLowerCase().includes(userSearch.toLowerCase())
    ).slice(0, 10);

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-4 border-b border-[#1A1A1A] pb-6">
                <div className="w-10 h-10 rounded bg-[#050505] border border-[#1A1A1A] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#F0B90B]" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-[#EAECEF] uppercase tracking-[0.2em]">Target Scope Definition</h3>
                    <p className="text-[9px] font-mono text-[#707A8A] uppercase tracking-widest mt-0.5">Map protocol to specific roles, teams, or metrics</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inclusion Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <MousePointer2 className="w-3.5 h-3.5 text-[#707A8A]" />
                        <label className="text-[9px] font-black text-[#707A8A] uppercase tracking-[0.2em]">Inclusion Matrix</label>
                    </div>
                    <div className="bg-[#050505] border border-[#1A1A1A] rounded p-5 max-h-[400px] overflow-y-auto space-y-6 custom-scrollbar transition-all hover:border-[#F0B90B]/20">
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-[#F0B90B] uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" />
                                Roles Protocol
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {roles.map((r, idx) => {
                                    const roleName = getValueCaseInsensitive(r, 'RoleName') || getValueCaseInsensitive(r, 'Role');
                                    return (
                                        <button 
                                            key={roleName || idx} 
                                            type="button" 
                                            onClick={() => toggleApplyTo(`Role:${roleName}`)} 
                                            className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all uppercase tracking-widest ${calcData.applyTo?.includes(`Role:${roleName}`) ? 'bg-[#F0B90B] text-black border-[#F0B90B] shadow-lg shadow-[#F0B90B]/10' : 'bg-[#121212] border-[#1A1A1A] text-[#707A8A] hover:text-[#EAECEF]'}`}
                                        >
                                            {roleName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-[#1A1A1A]">
                            <span className="text-[10px] font-black text-[#F0B90B] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                Teams Sync
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(appData.pages?.map(p => p.Team))).filter(t => t).map(team => {
                                    const isSelected = calcData.applyTo?.includes(`Team:${team}`);
                                    return (
                                        <div key={team} className="relative group">
                                            <button 
                                                type="button" 
                                                onClick={() => toggleApplyTo(`Team:${team}`)} 
                                                className={`pl-3 pr-8 py-1.5 rounded text-[10px] font-bold border transition-all uppercase tracking-widest ${
                                                    isSelected 
                                                    ? 'bg-[#F0B90B] text-black border-[#F0B90B] shadow-lg shadow-[#F0B90B]/10' 
                                                    : 'bg-[#121212] border-[#1A1A1A] text-[#707A8A] hover:text-[#EAECEF] hover:border-[#F0B90B]/30'
                                                }`}
                                            >
                                                {team}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTeam(team);
                                                    setIsModalOpen(true);
                                                }}
                                                className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${
                                                    isSelected 
                                                    ? 'text-black hover:bg-black/10' 
                                                    : 'text-[#707A8A] hover:text-[#EAECEF] hover:bg-[#1C2025]'
                                                }`}
                                                title="View Team Details"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exclusion Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <UserX className="w-3.5 h-3.5 text-red-500" />
                        <label className="text-[9px] font-black text-red-500/80 uppercase tracking-[0.2em]">Exclusion List</label>
                    </div>
                    <div className="bg-[#050505] border border-red-500/10 rounded p-5 max-h-[400px] overflow-y-auto space-y-6 custom-scrollbar transition-all hover:border-red-500/30">
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#707A8A]" />
                                <input 
                                    type="text"
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    placeholder="SEARCH STAFF TO EXCLUDE..."
                                    className="w-full bg-[#121212] border border-[#1A1A1A] rounded-xl pl-9 pr-4 py-2.5 text-[10px] font-bold text-[#EAECEF] focus:border-red-500/40 outline-none transition-all placeholder:text-[#333]"
                                />
                            </div>
                            
                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                                {filteredUsers.map(u => (
                                    <button 
                                        key={u.UserName}
                                        type="button"
                                        onClick={() => toggleExcludeTarget(`User:${u.UserName}`)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all uppercase tracking-widest flex items-center gap-2 ${calcData.excludeTargets?.includes(`User:${u.UserName}`) ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-[#121212] border-[#1A1A1A] text-[#707A8A] hover:text-[#EAECEF] hover:border-red-500/20'}`}
                                    >
                                        {u.FullName}
                                        {calcData.excludeTargets?.includes(`User:${u.UserName}`) && <UserX size={10} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-[#1A1A1A]">
                            <span className="text-[10px] font-black text-[#707A8A] uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                Exclusion Rules (Roles)
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {roles.map((r, idx) => {
                                    const roleName = getValueCaseInsensitive(r, 'RoleName') || getValueCaseInsensitive(r, 'Role');
                                    return (
                                        <button 
                                            key={roleName || idx} 
                                            type="button" 
                                            onClick={() => toggleExcludeTarget(`Role:${roleName}`)} 
                                            className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all uppercase tracking-widest ${calcData.excludeTargets?.includes(`Role:${roleName}`) ? 'bg-red-500/20 text-red-500 border-red-500/40' : 'bg-[#121212] border-[#1A1A1A] text-[#707A8A] hover:text-[#EAECEF]'}`}
                                        >
                                            {roleName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-[#1A1A1A] grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-[#707A8A]" />
                        <label className="text-[9px] font-black text-[#707A8A] uppercase tracking-[0.2em]">Core Performance Metric</label>
                    </div>
                    <select 
                        value={calcData.metricType} onChange={e => updateField('metricType', e.target.value)}
                        className="w-full h-11 bg-[#050505] border border-[#1A1A1A] rounded px-4 text-[11px] font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]/50 transition-all cursor-pointer uppercase tracking-widest"
                    >
                        <option value="Sales Amount">Sales Amount Volume</option>
                        <option value="Number of Orders">Order Count</option>
                        <option value="Revenue">Gross Revenue</option>
                        <option value="Profit">Net Profit Margin</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Box className="w-3.5 h-3.5 text-[#707A8A]" />
                        <label className="text-[9px] font-black text-[#707A8A] uppercase tracking-[0.2em]">Measurement Unit</label>
                    </div>
                    <div className="flex p-1 bg-[#050505] rounded border border-[#1A1A1A]">
                        {['USD', 'Count', '%'].map(u => {
                            const isActive = calcData.metricUnit === u;
                            const isAchievement = calcData.type === 'Achievement';
                            return (
                                <button 
                                    key={u} 
                                    onClick={() => updateField('metricUnit', u)} 
                                    className={`flex-1 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                                        isActive 
                                            ? `active-segment-tab ${isAchievement ? 'active-achievement' : 'active-commission'}` 
                                            : 'text-[#707A8A] hover:text-[#EAECEF]'
                                    }`}
                                >
                                    {u === 'USD' ? 'Currency' : u === 'Count' ? 'Integer' : 'Percent'}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Team Detail Modal */}
            <Modal isOpen={isModalOpen && selectedTeam !== null} onClose={() => setIsModalOpen(false)} maxWidth="max-w-2xl">
                <div className="incentive-surface bg-[#050505] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden text-[#EAECEF] font-sans rounded-xl relative">
                    {/* Visual Accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent opacity-50"></div>
                    <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-20 bg-[#F0B90B]"></div>

                    {/* Modal Header */}
                    <div className="flex justify-between items-center px-6 py-5 bg-white/[0.02] border-b border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-[#121212] border border-white/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-[#F0B90B]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] leading-none mb-1.5">
                                    Team Details // {selectedTeam}
                                </h2>
                                <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">Target matching & benefit validation</span>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)} 
                            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-500 transition-all rounded border border-white/5 group"
                        >
                            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Summary Metrics */}
                        {(() => {
                            const teamMembers = (appData.users || []).filter(u => isUserInTeam(u.Team, selectedTeam || ''));
                            const eligibleCount = teamMembers.filter(receivesBenefit).length;
                            const excludedCount = teamMembers.filter(isUserExcluded).length;
                            
                            return (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#121212] border border-[#1A1A1A] p-3.5 rounded flex flex-col justify-center">
                                        <span className="text-[9px] font-black text-[#707A8A] uppercase tracking-widest">Total Members</span>
                                        <span className="text-xl font-bold text-[#EAECEF] mt-1">{teamMembers.length}</span>
                                    </div>
                                    <div className="bg-[#121212] border border-[#1A1A1A] p-3.5 rounded flex flex-col justify-center border-l-2 border-l-[#0ECB81]">
                                        <span className="text-[9px] font-black text-[#707A8A] uppercase tracking-widest">Active Benefit</span>
                                        <span className="text-xl font-bold text-[#0ECB81] mt-1">{eligibleCount}</span>
                                    </div>
                                    <div className="bg-[#121212] border border-[#1A1A1A] p-3.5 rounded flex flex-col justify-center border-l-2 border-l-red-500">
                                        <span className="text-[9px] font-black text-[#707A8A] uppercase tracking-widest">Excluded</span>
                                        <span className="text-xl font-bold text-red-500 mt-1">{excludedCount}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Search and Tabs/Sections */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-2">
                                <span className="text-[10px] font-black text-[#F0B90B] uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" />
                                    Members List
                                </span>
                                <div className="relative w-48">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#707A8A]" />
                                    <input 
                                        type="text"
                                        value={detailSearch}
                                        onChange={e => setDetailSearch(e.target.value)}
                                        placeholder="Filter members..."
                                        className="w-full bg-[#121212] border border-[#1A1A1A] rounded pl-8 pr-2.5 py-1.5 text-[9px] font-bold text-[#EAECEF] focus:border-[#F0B90B]/50 outline-none transition-all placeholder:text-[#333]"
                                    />
                                </div>
                            </div>

                            {/* Members Table */}
                            <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded overflow-hidden">
                                <table className="w-full text-left border-collapse text-[#EAECEF]">
                                    <thead>
                                        <tr className="bg-[#121212] border-b border-[#1A1A1A] text-[9px] text-[#707A8A] font-black uppercase tracking-[0.2em]">
                                            <th className="px-4 py-2.5">User</th>
                                            <th className="px-4 py-2.5">Role</th>
                                            <th className="px-4 py-2.5">Protocol Match</th>
                                            <th className="px-4 py-2.5">Benefit Status</th>
                                            <th className="px-4 py-2.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1A1A1A]">
                                        {(() => {
                                            const filteredMembers = (appData.users || [])
                                                .filter(u => isUserInTeam(u.Team, selectedTeam || ''))
                                                .filter(u => 
                                                    u.FullName.toLowerCase().includes(detailSearch.toLowerCase()) || 
                                                    u.UserName.toLowerCase().includes(detailSearch.toLowerCase()) ||
                                                    u.Role.toLowerCase().includes(detailSearch.toLowerCase())
                                                );

                                            if (filteredMembers.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-[10px] font-mono text-[#707A8A] uppercase tracking-widest">
                                                            No matching team members found
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return filteredMembers.map(u => {
                                                const included = isUserIncluded(u);
                                                const excluded = isUserExcluded(u);
                                                const hasBenefit = receivesBenefit(u);

                                                return (
                                                    <tr key={u.UserName} className="hover:bg-[#121212]/40 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#2B3139] flex items-center justify-center text-[9px] font-black text-[#F0B90B] uppercase overflow-hidden">
                                                                    {u.ProfilePictureURL ? (
                                                                        <img src={u.ProfilePictureURL} alt={u.FullName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        u.FullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-[#EAECEF]">{u.FullName}</div>
                                                                    <div className="text-[8px] font-mono text-[#707A8A]">@{u.UserName}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-[9px] font-bold text-[#707A8A] uppercase tracking-widest">
                                                                {u.Role}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${included ? 'bg-[#0ECB81]' : 'bg-[#707A8A]'}`}></div>
                                                                    <span className="text-[8px] font-mono text-[#707A8A]">
                                                                        {included ? 'INCLUDED' : 'NOT INCLUDED'}
                                                                    </span>
                                                                </div>
                                                                {excluded && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                                        <span className="text-[8px] font-mono text-red-500 uppercase">
                                                                            EXCLUDED
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {hasBenefit ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0ECB81]/10 border border-[#0ECB81]/20 text-[#0ECB81] text-[8px] font-black uppercase tracking-widest">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                                    ELIGIBLE
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest">
                                                                    <AlertCircle className="w-2.5 h-2.5" />
                                                                    BLOCKED
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {(() => {
                                                                const isExcludedGlobally = (calcData.excludeTargets || []).some(rule => (
                                                                    rule === `User:${u.UserName}` || 
                                                                    rule === u.UserName || 
                                                                    rule === `Role:${u.Role}`
                                                                ));
                                                                const isExcludedForThisTeam = (calcData.excludeTargets || []).includes(`TeamUser:${selectedTeam}:${u.UserName}`);

                                                                if (isExcludedGlobally) {
                                                                    return (
                                                                        <span className="text-[8px] font-bold text-[#707A8A] uppercase tracking-widest italic">
                                                                            GLOBAL BLOCK
                                                                        </span>
                                                                    );
                                                                }

                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleExcludeTarget(`TeamUser:${selectedTeam}:${u.UserName}`)}
                                                                        className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${
                                                                            isExcludedForThisTeam 
                                                                            ? 'bg-[#0ECB81]/10 border-[#0ECB81]/30 text-[#0ECB81] hover:bg-[#0ECB81]/20' 
                                                                            : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                                                                        }`}
                                                                    >
                                                                        {isExcludedForThisTeam ? 'Include' : 'Exclude'}
                                                                    </button>
                                                                );
                                                            })()}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Associated Pages */}
                        <div className="space-y-3 pt-4 border-t border-[#1A1A1A]">
                            <span className="text-[10px] font-black text-[#F0B90B] uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                Associated Pages & Channels
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                                {(() => {
                                    const teamPages = (appData.pages || []).filter(p => p.Team === selectedTeam);
                                    if (teamPages.length === 0) {
                                        return (
                                            <div className="col-span-2 text-center py-4 bg-[#121212] border border-[#1A1A1A] text-[9px] font-mono text-[#707A8A] uppercase tracking-widest rounded">
                                                No facebook pages mapped to this team
                                            </div>
                                        );
                                    }

                                    return teamPages.map(page => (
                                        <div key={page.PageName} className="bg-[#121212] border border-[#1A1A1A] p-3 rounded-lg flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-[#1A1A1A] border border-[#2B3139] flex items-center justify-center text-[9px] font-black overflow-hidden shrink-0">
                                                {page.PageLogoURL ? (
                                                    <img src={page.PageLogoURL} alt={page.PageName} className="w-full h-full object-cover" />
                                                ) : (
                                                    page.PageName[0]
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-[#EAECEF] truncate">{page.PageName}</div>
                                                <div className="text-[8px] font-mono text-[#707A8A] truncate">Bot: {page.TelegramValue || 'N/A'}</div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Step3TargetEntities;
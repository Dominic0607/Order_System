
import React from 'react';

interface TeamSelectionProps {
    teams: string[];
    onSelectTeam: (team: string) => void;
    onBack: () => void;
    canGoBack: boolean;
}

const TeamSelection: React.FC<TeamSelectionProps> = ({ teams, onSelectTeam, onBack, canGoBack }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Select Team</h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Choose your operational node</p>
            </div>
            
            <div className="w-full space-y-4 max-w-md">
                {teams.map((team, idx) => (
                    <button 
                        key={team} 
                        onClick={() => onSelectTeam(team)} 
                        className="group relative w-full overflow-hidden bg-gray-900/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 hover:border-blue-500/40 transition-all duration-500 active:scale-[0.97] shadow-xl flex items-center gap-6"
                    >
                        <div className="absolute top-4 left-6">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                            <div className="absolute top-0 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        </div>
                        
                        <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-3xl flex items-center justify-center border border-white/5 shadow-inner group-hover:bg-blue-600/10 group-hover:border-blue-500/20 transition-all duration-500 group-hover:rotate-6">
                                <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">{team.charAt(0)}</span>
                        </div>
                        
                        <div className="relative z-10 flex-grow text-left">
                            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-1">{team}</h3>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest opacity-60">Team Operational Node {idx + 1}</p>
                        </div>

                        <div className="relative z-10 p-3 bg-white/5 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500 opacity-0 group-hover:opacity-5 blur-[40px] transition-opacity"></div>
                    </button>
                ))}
            </div>
            
            {canGoBack && (
                <button 
                    onClick={onBack} 
                    className="mt-12 flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-blue-500 transition-all active:scale-95"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ត្រឡប់ទៅតួនាទី
                </button>
            )}
        </div>
    );
};

export default TeamSelection;

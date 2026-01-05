import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import UserAvatar from '../components/common/UserAvatar';

interface RoleSelectionPageProps {
    onSelect: (role: 'admin_dashboard' | 'user_journey') => void;
}

const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ onSelect }) => {
    const { currentUser } = useContext(AppContext);

    return (
        <div className="h-screen flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden">
            {/* Subtle Decorative Accents (Ultra-subtle to not distract from flare-light) */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-500/5 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-stagger-1 { animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .animate-stagger-2 { animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards; opacity: 0; }
                .animate-stagger-3 { animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards; opacity: 0; }
                .animate-stagger-4 { animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards; opacity: 0; }
                
                .role-card {
                    background: rgba(31, 41, 55, 0.4);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .role-card:hover { 
                    background: rgba(31, 41, 55, 0.6); 
                    border-color: rgba(59, 130, 246, 0.3);
                    transform: translateY(-4px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                }
                .role-card:active { transform: scale(0.97); }
            `}</style>

            <div className="w-full max-w-md z-10">
                {/* Header Section */}
                <div className="text-center mb-12 animate-stagger-1">
                    <div className="inline-block relative mb-6">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                        <UserAvatar 
                            avatarUrl={currentUser?.ProfilePictureURL} 
                            name={currentUser?.FullName || ''} 
                            size="xl"
                            className="border-4 border-gray-900 shadow-2xl relative z-10 ring-4 ring-blue-500/10"
                        />
                    </div>
                    <h2 className="text-gray-500 font-bold uppercase tracking-[0.25em] text-[10px] mb-2">សូមស្វាគមន៍ត្រឡប់មកវិញ</h2>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        {currentUser?.FullName.split(' ')[0]} <span className="text-blue-500 text-3xl font-normal">👋</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-3 font-medium opacity-80">តើអ្នកចង់បន្តការងារក្នុងតួនាទីអ្វី?</p>
                </div>

                {/* Selection Cards */}
                <div className="space-y-5 mb-12">
                    {/* Admin Role Card */}
                    <button 
                        onClick={() => onSelect('admin_dashboard')}
                        className="role-card w-full p-6 rounded-[2.5rem] text-left flex items-center gap-5 group animate-stagger-2 shadow-2xl"
                    >
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner group-hover:bg-blue-600 group-hover:shadow-blue-600/40 transition-all duration-500">
                            <svg className="w-8 h-8 text-blue-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-blue-400 transition-colors">គ្រប់គ្រងប្រព័ន្ធ</h3>
                            <p className="text-xs text-gray-500 font-bold leading-relaxed mt-1 uppercase tracking-widest opacity-60">Admin Panel & Analysis</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center group-hover:bg-blue-600 transition-colors border border-white/5">
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </button>

                    {/* User Role Card */}
                    <button 
                        onClick={() => onSelect('user_journey')}
                        className="role-card w-full p-6 rounded-[2.5rem] text-left flex items-center gap-5 group animate-stagger-3 shadow-2xl"
                    >
                        <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:bg-emerald-600 group-hover:shadow-emerald-600/40 transition-all duration-500">
                            <svg className="w-8 h-8 text-emerald-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-emerald-400 transition-colors">ផ្នែកលក់ (User)</h3>
                            <p className="text-xs text-gray-500 font-bold leading-relaxed mt-1 uppercase tracking-widest opacity-60">Order Entry & History</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center group-hover:bg-emerald-600 transition-colors border border-white/5">
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </button>
                </div>

                {/* Footer Section */}
                <div className="text-center animate-stagger-4 opacity-0">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Version 2.0 • Premium Experience</p>
                </div>
            </div>
        </div>
    );
};

export default RoleSelectionPage;
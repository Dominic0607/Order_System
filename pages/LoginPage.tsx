import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import Spinner from '../components/common/Spinner';
import { WEB_APP_URL, APP_LOGO_URL } from '../constants';
import { User } from '../types';
import { convertGoogleDriveUrl } from '../utils/fileUtils';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{
        status: 'checking' | 'success' | 'error' | 'warning';
        message: string;
    }>({ status: 'checking', message: 'កំពុងត្រួតពិនិត្យប្រព័ន្ធ...' });
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const { login } = useContext(AppContext);

    const verifyWebAppUrl = useCallback(async () => {
        if (!WEB_APP_URL || WEB_APP_URL.includes("your-app-name.onrender.com")) {
            setConnectionStatus({ 
                status: 'error', 
                message: 'Configuration Required: សូមកំណត់ Render URL ក្នុង constants.ts' 
            });
            return;
        }
        
        const maxRetries = 15;
        const retryDelay = 4000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                setConnectionStatus({ 
                    status: 'checking', 
                    message: attempt === 1 ? 'កំពុងភ្ជាប់ទៅកាន់មជ្ឈមណ្ឌលទិន្នន័យ...' : `កំពុងដាស់ Server ឱ្យភ្ញាក់ (លើកទី ${attempt}/${maxRetries})...` 
                });

                const response = await fetch(`${WEB_APP_URL}/api/ping?t=${Date.now()}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-store'
                });

                if (!response.ok) throw new Error(`Status: ${response.status}`);

                const data = await response.json();
                if (data.status === 'success') {
                    setConnectionStatus({ status: 'success', message: 'ប្រព័ន្ធដំណើរការធម្មតា - រួចរាល់សម្រាប់ការចូលប្រើ' });
                    return;
                } else {
                    throw new Error('Invalid signature');
                }
            } catch (err: any) {
                if (attempt === maxRetries) {
                    setConnectionStatus({ 
                        status: 'error', 
                        message: 'បរាជ័យក្នុងការតភ្ជាប់៖ សូមពិនិត្យអ៊ីនធឺណិត ឬទាក់ទងអ្នកគ្រប់គ្រង។' 
                    });
                } else {
                    await new Promise(res => setTimeout(res, retryDelay));
                }
            }
        }
    }, []);

    useEffect(() => {
        verifyWebAppUrl();
    }, [verifyWebAppUrl]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${WEB_APP_URL}/api/users`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Network error');
            
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Auth Failed');

            const users: User[] = result.data;
            const foundUser = users.find(u => u.UserName === username && u.Password === password);
            
            if (foundUser) {
                const userToLogin = { ...foundUser };
                delete userToLogin.Password;
                login(userToLogin);
            } else {
                setError('ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ');
            }
        } catch (err: any) {
            setError('មានបញ្ហាក្នុងការ Login៖ ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const statusIcons = {
        checking: <Spinner size="sm" />,
        success: <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>,
        error: <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>,
        warning: <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
    };

    const statusTextClasses = {
        checking: 'text-blue-400/80',
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400'
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0c10]">
            {/* Ambient Background Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Header / Logo */}
                <div className="text-center mb-10 animate-fade-in-down">
                    <div className="inline-block relative group">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-2xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                        <div className="relative w-24 h-24 bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl p-4 overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                            {APP_LOGO_URL ? (
                                <img src={convertGoogleDriveUrl(APP_LOGO_URL)} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <svg className="w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9H15V3H9V9H5L12 16L19 9ZM5 18V20H19V18H5Z"/></svg>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 space-y-1">
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Order <span className="text-blue-500">System</span></h1>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Premium Version 2.0</p>
                    </div>
                </div>

                {/* Login Form Card */}
                <div className="bg-gray-800/30 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-4 px-5 text-gray-200 outline-none transition-all placeholder:text-gray-700" 
                                    placeholder="បញ្ចូលឈ្មោះគណនីរបស់អ្នក"
                                    required 
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-blue-500/50 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <input 
                                    type={isPasswordVisible ? "text" : "password"} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-4 px-5 text-gray-200 outline-none transition-all placeholder:text-gray-700" 
                                    placeholder="បញ្ចូលពាក្យសម្ងាត់"
                                    required 
                                />
                                <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors">
                                    {isPasswordVisible ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.67 .126 2.454 .364m-3.033 2.446a3 3 0 11-4.243 4.243m4.242-4.242l4.243 4.243M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-start gap-3 animate-shake">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading || !['success', 'warning'].includes(connectionStatus.status)}
                            className="relative w-full group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 group-hover:scale-105 group-active:scale-95"></div>
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white"></div>
                            <div className="relative flex items-center justify-center py-4 px-6 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-600/20">
                                {loading ? <Spinner size="sm" /> : 'ចូលប្រើប្រាស់'}
                            </div>
                        </button>
                    </form>

                    {/* Server Status Footer */}
                    <div className="mt-10 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between px-2">
                             <div className="flex items-center gap-3">
                                {statusIcons[connectionStatus.status]}
                                <span className={`text-[10px] font-black uppercase tracking-widest ${statusTextClasses[connectionStatus.status]}`}>
                                    {connectionStatus.message}
                                </span>
                             </div>
                             {connectionStatus.status === 'error' && (
                                <button onClick={() => verifyWebAppUrl()} className="text-[10px] font-black text-blue-500 hover:text-white uppercase tracking-widest transition-colors underline decoration-2 underline-offset-4">Retry</button>
                             )}
                        </div>
                    </div>
                </div>

                {/* System Footer Info */}
                <div className="mt-8 text-center animate-fade-in opacity-50" style={{ animationDelay: '0.4s' }}>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">Authorized Access Only • Cloud Powered</p>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.4s ease-in-out; }

                .animate-fade-in { 
                    opacity: 0;
                    animation: fadeIn 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
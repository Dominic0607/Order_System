import{r as t,A as l,j as e,c as i,a as n}from"./index-CexLiTQQ.js";import{U as o}from"./UserAvatar-oOtZNpvI.js";const x=({onSelect:a})=>{const{currentUser:s}=t.useContext(l),[m,r]=t.useState(!1);return t.useEffect(()=>{r(!0)},[]),s?e.jsxs("div",{className:"min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-transparent relative overflow-hidden",children:[e.jsx("div",{className:"absolute top-[-5%] left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/10 rounded-full blur-[80px] sm:blur-[120px] animate-pulse pointer-events-none"}),e.jsx("div",{className:"absolute bottom-[-5%] right-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/10 rounded-full blur-[80px] sm:blur-[120px] animate-pulse pointer-events-none",style:{animationDelay:"2s"}}),e.jsx("style",{children:`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                .animate-float { animation: float 4s ease-in-out infinite; }
                
                @keyframes reveal {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); filter: blur(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                }
                
                @keyframes profile-reveal {
                    0% { opacity: 0; transform: scale(0.7) rotate(-10deg); filter: blur(15px); }
                    100% { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0); }
                }
                
                @keyframes ring-rotate-cw {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                
                @keyframes status-ripple {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
                    100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
                }

                .profile-entrance { animation: profile-reveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .reveal-0 { animation: reveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s forwards; opacity: 0; }
                .reveal-1 { animation: reveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards; opacity: 0; }
                .reveal-2 { animation: reveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s forwards; opacity: 0; }
                
                .premium-glass-mobile {
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(20px) saturate(160%);
                    -webkit-backdrop-filter: blur(20px) saturate(160%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 15px 35px -12px rgba(0, 0, 0, 0.6);
                }
                
                /* Mobile-specific button tap effect */
                .role-btn:active { 
                    transform: scale(0.96);
                    background: rgba(255, 255, 255, 0.05);
                }

                .status-ring-mobile { 
                    position: absolute; top: 50%; left: 50%; width: 120%; height: 120%; 
                    border: 1.5px dashed rgba(59, 130, 246, 0.3); border-radius: 50%;
                    animation: ring-rotate-cw 12s linear infinite;
                }
                
                .status-ripple-mobile {
                    position: absolute; top: 50%; left: 50%; width: 100%; height: 100%;
                    border-radius: 50%; border: 3px solid rgba(59, 130, 246, 0.3);
                    animation: status-ripple 2s infinite ease-out;
                }

                .tap-indicator {
                    width: 4px;
                    height: 4px;
                    background: #3b82f6;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #3b82f6;
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(3); opacity: 0; }
                }
            `}),e.jsxs("div",{className:"w-full max-w-lg sm:max-w-4xl z-10 space-y-10 sm:space-y-16",children:[e.jsxs("div",{className:"text-center px-2",children:[e.jsxs("div",{className:"inline-block relative mb-8 sm:mb-12 profile-entrance",children:[e.jsx("div",{className:"status-ripple-mobile"}),e.jsx("div",{className:"status-ring-mobile"}),e.jsx("div",{className:"absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse"}),e.jsx(o,{avatarUrl:s.ProfilePictureURL,name:s.FullName,size:"xl",className:"w-24 h-24 sm:w-36 sm:h-36 border-[4px] sm:border-[6px] border-gray-950 shadow-2xl relative z-10 ring-1 ring-white/10"}),e.jsx("div",{className:"absolute -bottom-0.5 -right-0.5 w-6 h-6 sm:w-10 sm:h-10 bg-blue-600 rounded-lg sm:rounded-2xl flex items-center justify-center border-2 sm:border-4 border-gray-950 shadow-lg text-white z-20 animate-float",children:e.jsx("svg",{className:"w-3 h-3 sm:w-6 sm:h-6",fill:"currentColor",viewBox:"0 0 20 20",children:e.jsx("path",{fillRule:"evenodd",d:"M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",clipRule:"evenodd"})})})]}),e.jsxs("div",{className:"reveal-0",children:[e.jsx("h2",{className:"text-blue-500 font-black uppercase tracking-[0.3em] text-[9px] sm:text-[10px] mb-3",children:"System Access Authorization"}),e.jsxs("h1",{className:"text-3xl sm:text-6xl font-black text-white tracking-tighter mb-3 italic leading-none",children:["សួស្តី, ",e.jsx("span",{className:"text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400",children:s.FullName.split(" ")[0]})]}),e.jsxs("p",{className:"text-gray-500 text-sm sm:text-lg font-bold max-w-xs sm:max-w-md mx-auto leading-relaxed opacity-80",children:["សូមជ្រើសរើសទិសដៅសម្រាប់ ",e.jsx("span",{className:"text-blue-500 font-black",children:"O-System"})]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 w-full",children:[e.jsxs("button",{onClick:()=>a("admin_dashboard"),className:"role-btn premium-glass-mobile p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-left transition-all duration-300 reveal-1 flex md:flex-col items-center md:items-start gap-5 sm:gap-0",children:[e.jsx("div",{className:"w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center text-white sm:mb-8 transition-all shadow-xl flex-shrink-0",children:e.jsxs("svg",{className:"w-7 h-7 sm:w-10 sm:h-10",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",strokeWidth:2.5,children:[e.jsx("path",{d:"M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"}),e.jsx("path",{d:"M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"})]})}),e.jsxs("div",{className:"flex-grow min-w-0",children:[e.jsx("h3",{className:"text-lg sm:text-3xl font-black text-white uppercase tracking-tight mb-1 sm:mb-3",children:"គ្រប់គ្រងប្រព័ន្ធ"}),e.jsx("p",{className:"text-[11px] sm:text-sm text-gray-500 font-bold leading-snug opacity-70 line-clamp-2",children:"ផ្ទាំងបញ្ជាលក់ របាយការណ៍សង្ខេប និងបច្ចេកទេស។"})]}),e.jsxs("div",{className:"md:mt-10 hidden sm:flex items-center gap-3 text-blue-500 font-black text-xs uppercase tracking-widest",children:[e.jsx("span",{children:"Admin Console"}),e.jsx("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",strokeWidth:3,children:e.jsx("path",{d:"M13 7l5 5-5 5M6 7l5 5-5 5"})})]}),e.jsx("div",{className:"sm:hidden text-gray-600",children:e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{d:"M9 5l7 7-7 7",strokeWidth:3,strokeLinecap:"round",strokeLinejoin:"round"})})})]}),e.jsxs("button",{onClick:()=>a("user_journey"),className:"role-btn premium-glass-mobile p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-left transition-all duration-300 reveal-2 flex md:flex-col items-center md:items-start gap-5 sm:gap-0",children:[e.jsx("div",{className:"w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center text-white sm:mb-8 transition-all shadow-xl flex-shrink-0",children:e.jsx("svg",{className:"w-7 h-7 sm:w-10 sm:h-10",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",strokeWidth:2.5,children:e.jsx("path",{d:"M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"})})}),e.jsxs("div",{className:"flex-grow min-w-0",children:[e.jsx("h3",{className:"text-lg sm:text-3xl font-black text-white uppercase tracking-tight mb-1 sm:mb-3",children:"ប្រតិបត្តិការលក់"}),e.jsx("p",{className:"text-[11px] sm:text-sm text-gray-500 font-bold leading-snug opacity-70 line-clamp-2",children:"បង្កើតកម្មង់ ពិនិត្យប្រវត្តិលក់ និងតាមដានទិន្នន័យ។"})]}),e.jsxs("div",{className:"md:mt-10 hidden sm:flex items-center gap-3 text-emerald-500 font-black text-xs uppercase tracking-widest",children:[e.jsx("span",{children:"Sales Portal"}),e.jsx("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",strokeWidth:3,children:e.jsx("path",{d:"M13 7l5 5-5 5M6 7l5 5-5 5"})})]}),e.jsx("div",{className:"sm:hidden text-gray-600",children:e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{d:"M9 5l7 7-7 7",strokeWidth:3,strokeLinecap:"round",strokeLinejoin:"round"})})})]})]}),e.jsx("div",{className:"mt-10 sm:mt-20 text-center reveal-2",style:{animationDelay:"0.8s"},children:e.jsxs("div",{className:"inline-flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 opacity-40 hover:opacity-100 transition-opacity duration-500",children:[e.jsx("img",{src:i(n),alt:"Logo",className:"w-5 h-5 object-contain"}),e.jsx("div",{className:"h-3 w-px bg-white/20"}),e.jsx("p",{className:"text-[8px] sm:text-[10px] text-white font-black uppercase tracking-[0.3em]",children:"O-System V2.0.1"})]})})]})]}):null};export{x as default};

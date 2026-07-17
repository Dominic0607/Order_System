import React, { useEffect, useRef, useCallback } from 'react';
import { CallState, CallType, CallParty } from '../../hooks/useVoiceCall';
import UserAvatar from '../common/UserAvatar';

interface VoiceCallModalProps {
  callState: CallState;
  callType: CallType;
  remoteParty: CallParty | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callDurationSeconds: number;
  localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  onAnswer: () => void;
  onReject: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  language?: string;
}

// ─── Format MM:SS ─────────────────────────────────────────────────────────────
function formatDuration(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

// ─── Animated audio waveform (voice call indicator) ───────────────────────────
const SoundWave: React.FC = () => (
  <div className="flex items-end gap-[3px] h-8">
    {[0.4, 0.75, 1, 0.6, 0.9, 0.5, 0.8, 0.45, 0.7, 1, 0.55].map((h, i) => (
      <div
        key={i}
        className="w-1 rounded-full bg-gradient-to-t from-emerald-500 to-teal-300"
        style={{
          height: `${h * 100}%`,
          animationName: 'soundBar',
          animationDuration: `${0.6 + i * 0.07}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
          animationDelay: `${i * 0.05}s`,
        }}
      />
    ))}
  </div>
);

// ─── Pulsing rings ────────────────────────────────────────────────────────────
const PulsingRing: React.FC<{ color?: string }> = ({ color = 'rgba(59,130,246,0.3)' }) => (
  <>
    {[1, 2, 3].map(i => (
      <div
        key={i}
        className="absolute inset-0 rounded-full border border-white/5"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          animation: `callPulse ${1.6 + i * 0.4}s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.3}s infinite`,
        }}
      />
    ))}
  </>
);

// ─── Icon helpers ─────────────────────────────────────────────────────────────
const PhoneIcon = () => (
  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
  </svg>
);
const EndCallIcon = () => (
  <svg className="w-7 h-7 text-white transform rotate-[135deg]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
  </svg>
);

// ─── Control button ───────────────────────────────────────────────────────────
interface CtrlBtnProps {
  id: string;
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
  inactiveClass?: string;
  label: string;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}
const CtrlBtn: React.FC<CtrlBtnProps> = ({
  id, onClick, active, activeClass, inactiveClass, label, children, size = 'md',
}) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2.5 group outline-none focus:outline-none" id={id}>
    <span className={`${size === 'lg' ? 'w-16 h-16' : 'w-14 h-14'} rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-95 ${active ? (activeClass || 'bg-white/20') : (inactiveClass || 'bg-white/10 hover:bg-white/20')}`}>
      {children}
    </span>
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400/90 group-hover:text-slate-200 transition-colors select-none">{label}</span>
  </button>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  callState,
  callType,
  remoteParty,
  isMuted,
  isCameraOff,
  callDurationSeconds,
  localVideoRef,
  remoteVideoRef,
  onAnswer,
  onReject,
  onHangUp,
  onToggleMute,
  onToggleCamera,
  language = 'en',
}) => {
  const isVisible =
    callState === 'calling'    ||
    callState === 'ringing'    ||
    callState === 'connecting' ||
    callState === 'connected'  ||
    callState === 'ended';

  const isVideoCall = callType === 'video';

  // ── Ringtone via Web Audio ──────────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  useEffect(() => {
    const playRingtone = () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const triggerRing = () => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const t = ctx.currentTime;
          const pattern = [
            { freq: 480, dur: 0.4, delay: 0 },
            { freq: 620, dur: 0.4, delay: 0.45 }
          ];

          pattern.forEach(({ freq, dur, delay }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.18, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur - 0.02);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + dur);
          });
        };

        // Play immediately
        triggerRing();

        // Loop every 2.5 seconds
        ringIntervalRef.current = setInterval(triggerRing, 2500);
      } catch (e) {
        console.error("Failed to play ringtone:", e);
      }
    };

    const stopRingtone = () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      try {
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
      } catch {}
    };

    if (callState === 'ringing') playRingtone();
    else stopRingtone();

    return () => stopRingtone();
  }, [callState]);

  // ── Attach remote video element ref to DOM node ─────────────────────────────
  const remoteVideoElRef = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    remoteVideoRef.current = el;
    el.autoplay = true;
    el.playsInline = true;
  }, [remoteVideoRef]);

  const localVideoElRef = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    localVideoRef.current = el;
    el.autoplay = true;
    el.muted = true;
    el.playsInline = true;
  }, [localVideoRef]);

  if (!isVisible || !remoteParty) return null;

  const lang = language === 'km' ? 'km' : 'en';
  const statusLabel: Record<CallState, Record<string, string>> = {
    calling:    { en: 'Calling…',      km: 'កំពុងហៅ…' },
    ringing:    { en: isVideoCall ? 'Incoming Video Call' : 'Incoming Call', km: isVideoCall ? 'វីដេអូហៅចូល' : 'ទូរស័ព្ទចូល' },
    connecting: { en: 'Connecting…',   km: 'កំពុងភ្ជាប់…' },
    connected:  { en: isVideoCall ? 'Video Call' : 'Voice Call', km: isVideoCall ? 'ការហៅវីដេអូ' : 'ការហៅ' },
    ended:      { en: 'Call Ended',    km: 'ការហៅបានបញ្ចប់' },
    idle:       { en: '',              km: '' },
  };

  const accentColor = isVideoCall ? 'rgba(168,85,247,0.25)' : 'rgba(59,130,246,0.25)';

  return (
    <>
      {/* ── Global keyframes ── */}
      <style>{`
        @keyframes callPulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes soundBar  { 0% { transform: scaleY(0.3); } 100% { transform: scaleY(1); } }
        @keyframes callModalIn { from { opacity: 0; transform: translateY(40px) scale(0.94); } to { opacity: 1; transform: none; } }
        @keyframes callEndOut  { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.9); } }
        @keyframes pipFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes callingGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.25; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.4; }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(16px)' }}>

        {/* ── Card / Video container ── */}
        <div
          className={`relative w-full overflow-hidden shadow-2xl transition-all duration-300
            ${isVideoCall && callState === 'connected'
              ? 'h-full sm:h-auto sm:max-w-2xl sm:rounded-[2rem] sm:mx-auto'
              : 'sm:max-w-sm sm:mx-auto bg-slate-950/80 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 backdrop-blur-2xl'
            }`}
          style={{
            animation: callState === 'ended'
              ? 'callEndOut 0.4s ease forwards'
              : 'callModalIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >

          {/* ════════════════════════════════════════════════════════════
              VIDEO CALL — CONNECTED STATE: Full-bleed video layout
          ════════════════════════════════════════════════════════════ */}
          {isVideoCall && callState === 'connected' ? (
            <div className="relative w-full bg-black" style={{ height: 'min(72vw, 520px)' }}>

              {/* Remote video — full frame */}
              <video
                ref={remoteVideoElRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                autoPlay
              />

              {/* Fallback if no remote video yet */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <UserAvatar avatarUrl={remoteParty.avatarUrl} name={remoteParty.fullName} size="xl"
                  className="opacity-30" />
              </div>

              {/* Local video — Picture-in-Picture (top-right) */}
              <div
                className="absolute top-4 right-4 w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 cursor-pointer hover:scale-105 transition-transform"
                style={{ animation: 'pipFloat 4s ease-in-out infinite' }}
              >
                {!isCameraOff ? (
                  <video
                    ref={localVideoElRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    playsInline
                    muted
                    autoPlay
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Overlaid controls bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-30 px-6 pb-6 pt-16"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
                {/* Timer + name */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-white font-black text-base">{remoteParty.fullName}</p>
                    <p className="text-emerald-400 font-mono text-sm">{formatDuration(callDurationSeconds)}</p>
                  </div>
                  {isMuted && (
                    <div className="flex items-center gap-1.5 bg-red-600/80 rounded-full px-3 py-1">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                      </svg>
                      <span className="text-white text-[9px] font-black uppercase tracking-widest">Muted</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-4">
                  {/* Mute */}
                  <CtrlBtn id="vid-mute-btn" onClick={onToggleMute}
                    active={isMuted} activeClass="bg-yellow-500 shadow-yellow-500/20"
                    inactiveClass="bg-white/20 hover:bg-white/30"
                    label={isMuted ? (lang === 'km' ? 'បើក' : 'Unmute') : (lang === 'km' ? 'បិទ' : 'Mute')}>
                    {isMuted
                      ? <svg className="w-6 h-6 text-gray-900" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
                      : <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H2c0 4.72 3.45 8.65 8 9.58V21h2v-5.49c4.55-.93 8-4.86 8-9.58h-2c0 4.08-3.06 7.44-7 7.93V15.93z"/></svg>
                    }
                  </CtrlBtn>

                  {/* Camera */}
                  <CtrlBtn id="vid-cam-btn" onClick={onToggleCamera}
                    active={isCameraOff} activeClass="bg-gray-700 hover:bg-gray-600"
                    inactiveClass="bg-white/20 hover:bg-white/30"
                    label={isCameraOff ? (lang === 'km' ? 'បើកកាម' : 'Cam On') : (lang === 'km' ? 'បិទកាម' : 'Cam Off')}>
                    {isCameraOff
                      ? <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4-4-9.91 9.91-2.1 4.69L9.69 15 21 6.5zm-9.56 9.56L5 22l6.44-6.44z"/></svg>
                      : <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                    }
                  </CtrlBtn>

                  {/* End call */}
                  <CtrlBtn id="vid-hangup-btn" onClick={onHangUp}
                    inactiveClass="bg-red-600 hover:bg-red-500 shadow-2xl shadow-red-600/30"
                    label={lang === 'km' ? 'បញ្ចប់' : 'End'} size="lg">
                    <EndCallIcon />
                  </CtrlBtn>
                </div>
              </div>
            </div>

          /* ═══════════════════════════════════════════════════════════
             AUDIO CALL — all non-video-connected states
          ═══════════════════════════════════════════════════════════ */ ) : (
            <>
              {/* Ambient dynamic background glow */}
              <div className="absolute top-[35%] left-1/2 w-80 h-80 rounded-full pointer-events-none filter blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${
                    isVideoCall 
                      ? 'rgba(168,85,247,0.3)' 
                      : callState === 'ringing' 
                      ? 'rgba(16,185,129,0.3)' 
                      : callState === 'connected' 
                      ? 'rgba(6,182,212,0.3)' 
                      : 'rgba(59,130,246,0.3)'
                  } 0%, transparent 70%)`,
                  animation: 'callingGlow 6s ease-in-out infinite',
                }} 
              />

              {/* Call type badge */}
              {isVideoCall && (
                <div className="flex justify-center mb-4 relative z-10">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-[10px] font-black uppercase tracking-widest shadow-md">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                    {lang === 'km' ? 'ការហៅជាមួយ Video' : 'Video Call'}
                  </span>
                </div>
              )}

              {/* Status label */}
              <div className="flex justify-center mb-6 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 bg-white/5 border border-white/5 rounded-full px-3 py-1 backdrop-blur-md shadow-sm">
                  {statusLabel[callState]?.[lang] ?? ''}
                </span>
              </div>

              {/* Avatar + rings */}
              <div className="flex justify-center mb-6 relative z-10">
                <div className="relative flex items-center justify-center w-28 h-28">
                  {(callState === 'calling' || callState === 'ringing' || callState === 'connecting') && (
                    <div className="absolute inset-[-24px]">
                      <PulsingRing color={
                        isVideoCall 
                          ? 'rgba(168,85,247,0.25)' 
                          : callState === 'ringing' 
                          ? 'rgba(16,185,129,0.25)' 
                          : 'rgba(59,130,246,0.25)'
                      } />
                    </div>
                  )}
                  <div className="relative z-10 ring-4 ring-white/10 rounded-full shadow-2xl overflow-hidden">
                    <UserAvatar avatarUrl={remoteParty.avatarUrl} name={remoteParty.fullName} size="xl" />
                  </div>
                </div>
              </div>

              <h2 className="text-center text-2.5xl font-black text-white tracking-tight mb-1 relative z-10">{remoteParty.fullName}</h2>
              <p className="text-center text-[11px] text-slate-500 font-mono mb-8 relative z-10">@{remoteParty.username}</p>

              {/* State-specific body */}
              <div className="relative z-10">
                {callState === 'connected' && (
                  <div className="flex flex-col items-center gap-3.5 mb-8">
                    <p className="text-3.5xl font-black tabular-nums text-emerald-400 tracking-widest drop-shadow-[0_0_12px_rgba(52,211,153,0.2)]">{formatDuration(callDurationSeconds)}</p>
                    <SoundWave />
                  </div>
                )}
                {callState === 'connecting' && (
                  <div className="flex justify-center gap-2.5 mb-8">
                    {[0, 150, 300].map(d => (
                      <div 
                        key={d} 
                        className="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.5)]" 
                        style={{ animationDelay: `${d}ms`, animationDuration: '0.8s' }} 
                      />
                    ))}
                  </div>
                )}
                {callState === 'calling' && <p className="text-center text-sm text-slate-400 mb-8 animate-pulse">{language === 'km' ? 'រង់ចាំការឆ្លើយតប…' : 'Waiting for answer…'}</p>}
                {callState === 'ringing' && <p className="text-center text-sm text-slate-300 mb-8">{language === 'km' ? 'ចង់ជជែកជាមួយអ្នក' : 'wants to talk to you'}</p>}
                {callState === 'ended' && <p className="text-slate-500 text-sm text-center mb-8 animate-pulse">{language === 'km' ? 'ការហៅបានបញ្ចប់' : 'Call ended'}</p>}
              </div>

              {/* Buttons */}
              <div className="flex justify-center gap-6 relative z-10 mt-2">
                {callState === 'ringing' && (
                  <>
                    <CtrlBtn id="call-reject-btn" onClick={onReject} size="lg"
                      inactiveClass="bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/45 hover:scale-105"
                      label={lang === 'km' ? 'បដិសេធ' : 'Decline'}>
                      <EndCallIcon />
                    </CtrlBtn>
                    <CtrlBtn id="call-answer-btn" onClick={onAnswer} size="lg"
                      inactiveClass="bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/45 hover:scale-105 animate-pulse"
                      label={lang === 'km' ? 'ទទួល' : 'Answer'}>
                      <PhoneIcon />
                    </CtrlBtn>
                  </>
                )}
                {callState === 'calling' && (
                  <CtrlBtn id="call-cancel-btn" onClick={onHangUp} size="lg"
                    inactiveClass="bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/45 hover:scale-105"
                    label={lang === 'km' ? 'បោះបង់' : 'Cancel'}>
                    <EndCallIcon />
                  </CtrlBtn>
                )}
                {(callState === 'connected' || callState === 'connecting') && (
                  <>
                    <CtrlBtn id="call-mute-btn" onClick={onToggleMute}
                      active={isMuted} 
                      activeClass="bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:scale-105"
                      inactiveClass="bg-white/10 hover:bg-white/15 text-white/95 border border-white/5 backdrop-blur-md hover:scale-105"
                      label={isMuted ? (lang === 'km' ? 'បើកសំឡេង' : 'Unmute') : (lang === 'km' ? 'បិទសំឡេង' : 'Mute')}>
                      {isMuted
                        ? <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
                        : <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H2c0 4.72 3.45 8.65 8 9.58V21h2v-5.49c4.55-.93 8-4.86 8-9.58h-2c0 4.08-3.06 7.44-7 7.93V15.93z"/></svg>
                      }
                    </CtrlBtn>
                    <CtrlBtn id="call-hangup-btn" onClick={onHangUp} size="lg"
                      inactiveClass="bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/45 hover:scale-105"
                      label={lang === 'km' ? 'បញ្ចប់ការហៅ' : 'End Call'}>
                      <EndCallIcon />
                    </CtrlBtn>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default VoiceCallModal;

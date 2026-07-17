import React, { useEffect, useRef, useCallback, useState } from 'react';
import { CallState, CallType, CallParty } from '../../hooks/useVoiceCall';
import UserAvatar from '../common/UserAvatar';
import { User } from '../../types';

interface VoiceCallModalProps {
  callState: CallState;
  callType: CallType;
  remoteParty: CallParty | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callDurationSeconds: number;
  localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAnswer: () => void;
  onReject: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  language?: string;

  // Group Call extensions
  isGroupCall?: boolean;
  participants?: CallParty[];
  remoteStreams?: { [username: string]: MediaStream };
  onInviteUser?: (user: CallParty) => void;
  allUsers?: User[];
  currentUsername?: string;
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

// ─── Group Participant Stream Renderer ───────────────────────────────────────
const ParticipantStream: React.FC<{
  participant: CallParty;
  stream?: MediaStream;
  isVideo: boolean;
}> = ({ participant, stream, isVideo }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream && isVideo) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideo]);

  return (
    <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/5 bg-slate-900/80 flex items-center justify-center group shadow-lg shadow-black/20">
      {isVideo && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="ring-4 ring-white/5 rounded-full overflow-hidden">
            <UserAvatar avatarUrl={participant.avatarUrl} name={participant.fullName} size="xl" />
          </div>
          <span className="text-xs font-black text-slate-300 select-none">{participant.fullName}</span>
        </div>
      )}
      {/* Name tag overlay */}
      <div className="absolute bottom-4 left-4 bg-slate-950/80 px-3 py-1 rounded-xl border border-white/5 backdrop-blur-md shadow-sm">
        <span className="text-[10px] font-black text-white tracking-wider">{participant.fullName}</span>
      </div>
    </div>
  );
};

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
  localStream,
  remoteStream,
  onAnswer,
  onReject,
  onHangUp,
  onToggleMute,
  onToggleCamera,
  language = 'en',

  // Group call extensions
  isGroupCall = false,
  participants = [],
  remoteStreams = {},
  onInviteUser,
  allUsers = [],
  currentUsername = '',
}) => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

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

  // Local state for HTML elements to trigger reactive bindings
  const [localVideoElement, setLocalVideoElement] = React.useState<HTMLVideoElement | null>(null);
  const [remoteVideoElement, setRemoteVideoElement] = React.useState<HTMLVideoElement | null>(null);

  // ── Attach remote video element ref to DOM node ─────────────────────────────
  const remoteVideoElRef = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el;
    setRemoteVideoElement(el);
  }, [remoteVideoRef]);

  const localVideoElRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    setLocalVideoElement(el);
  }, [localVideoRef]);

  // Bind remote stream reactively when element mounts or stream updates (1-on-1 only)
  useEffect(() => {
    if (remoteVideoElement && !isGroupCall) {
      if (remoteVideoElement.srcObject !== (remoteStream || null)) {
        remoteVideoElement.srcObject = remoteStream || null;
      }
      remoteVideoElement.autoplay = true;
      remoteVideoElement.playsInline = true;
    }
  }, [remoteVideoElement, remoteStream, isGroupCall]);

  // Bind local stream reactively when element mounts or stream updates
  useEffect(() => {
    if (localVideoElement) {
      if (localVideoElement.srcObject !== (localStream || null)) {
        localVideoElement.srcObject = localStream || null;
      }
      localVideoElement.autoplay = true;
      localVideoElement.muted = true;
      localVideoElement.playsInline = true;
    }
  }, [localVideoElement, localStream]);

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

  const eligibleUsers = allUsers.filter(u => {
    const username = u.UserName;
    if (username === currentUsername) return false;
    if (remoteParty && remoteParty.username === username) return false;
    if (participants && participants.some(p => p.username === username)) return false;
    
    const search = userSearch.toLowerCase();
    const fullName = (u.FullName || '').toLowerCase();
    return fullName.includes(search) || username.toLowerCase().includes(search);
  });

  const shouldRenderGroupConnected = isGroupCall && callState === 'connected';

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
            ${(isVideoCall && callState === 'connected') || shouldRenderGroupConnected
              ? 'h-full w-full sm:h-[600px] sm:max-w-2xl sm:rounded-[2rem] sm:mx-auto sm:border sm:border-white/10 sm:bg-slate-950'
              : 'sm:max-w-sm sm:mx-auto bg-slate-950/80 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 backdrop-blur-2xl'
            }`}
          style={{
            animation: callState === 'ended'
              ? 'callEndOut 0.4s ease forwards'
              : 'callModalIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >

          {/* ════════════════════════════════════════════════════════════
              GROUP CALL — CONNECTED STATE: Responsive grid layout
          ════════════════════════════════════════════════════════════ */}
          {shouldRenderGroupConnected ? (
            <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-6">
              
              {/* Header Info */}
              <div className="flex justify-between items-center z-10 shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    {lang === 'km' ? 'ការហៅជាក្រុម' : 'Group Call'}
                  </span>
                  <h3 className="text-white font-black text-sm mt-2">{lang === 'km' ? 'សមាជិកកំពុងចូលរួម' : 'Active Members'} ({participants.length + 1})</h3>
                </div>
                <span className="text-emerald-400 font-mono text-xs bg-slate-900 border border-white/5 px-3 py-1 rounded-full">
                  {formatDuration(callDurationSeconds)}
                </span>
              </div>

              {/* Grid of remote participants */}
              <div className="flex-grow overflow-y-auto no-scrollbar my-6 flex items-center justify-center">
                <div className={`grid gap-4 w-full max-h-full ${
                  participants.length <= 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2'
                }`}>
                  {/* Participant 1: Remote Party */}
                  <ParticipantStream 
                    participant={remoteParty} 
                    stream={remoteStreams[remoteParty.username]} 
                    isVideo={isVideoCall} 
                  />
                  {/* Additional participants */}
                  {participants.map(p => (
                    <ParticipantStream 
                      key={p.username} 
                      participant={p} 
                      stream={remoteStreams[p.username]} 
                      isVideo={isVideoCall} 
                    />
                  ))}
                </div>
              </div>

              {/* Local video - PIP overlay (bottom right or custom corner) */}
              <div
                className="absolute top-6 right-6 w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-20 cursor-pointer hover:scale-105 transition-transform"
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
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Bottom controls */}
              <div className="flex justify-center gap-5 z-10 shrink-0">
                {/* Mute */}
                <CtrlBtn id="grp-mute-btn" onClick={onToggleMute}
                  active={isMuted} 
                  activeClass="bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:scale-105"
                  inactiveClass="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md hover:scale-105"
                  label={isMuted ? (lang === 'km' ? 'បើកសំឡេង' : 'Unmute') : (lang === 'km' ? 'បិទសំឡេង' : 'Mute')}>
                  {isMuted
                    ? <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
                    : <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H2c0 4.72 3.45 8.65 8 9.58V21h2v-5.49c4.55-.93 8-4.86 8-9.58h-2c0 4.08-3.06 7.44-7 7.93V15.93z"/></svg>
                  }
                </CtrlBtn>

                {/* Camera */}
                <CtrlBtn id="grp-cam-btn" onClick={onToggleCamera}
                  active={isCameraOff} 
                  activeClass="bg-slate-800 text-white hover:scale-105"
                  inactiveClass="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md hover:scale-105"
                  label={isCameraOff ? (lang === 'km' ? 'បើកកាមេរ៉ា' : 'Cam On') : (lang === 'km' ? 'បិទកាមេរ៉ា' : 'Cam Off')}>
                  {isCameraOff
                    ? <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4-4-9.91 9.91-2.1 4.69L9.69 15 21 6.5zm-9.56 9.56L5 22l6.44-6.44z"/></svg>
                    : <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                  }
                </CtrlBtn>

                {/* Add User */}
                {onInviteUser && (
                  <CtrlBtn id="grp-add-btn" onClick={() => setIsAddUserOpen(true)}
                    inactiveClass="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md hover:scale-105"
                    label={lang === 'km' ? 'បន្ថែម' : 'Add User'}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </CtrlBtn>
                )}

                {/* Hang Up */}
                <CtrlBtn id="grp-hangup-btn" onClick={onHangUp} size="lg"
                  inactiveClass="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 hover:scale-105"
                  label={lang === 'km' ? 'បញ្ចប់' : 'Hang Up'}>
                  <EndCallIcon />
                </CtrlBtn>
              </div>

            </div>
          ) : isVideoCall && callState === 'connected' ? (
            /* ════════════════════════════════════════════════════════════
                1-ON-1 VIDEO CALL — CONNECTED STATE: Full-bleed video layout
            ════════════════════════════════════════════════════════════ */
            <div className="relative w-full h-full bg-slate-950">

              {/* Remote video — full frame */}
              <video
                ref={remoteVideoElRef}
                className="absolute inset-0 w-full h-full object-cover z-0"
                playsInline
                autoPlay
              />

              {/* Fallback if no remote video yet */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <UserAvatar avatarUrl={remoteParty.avatarUrl} name={remoteParty.fullName} size="xl"
                  className="opacity-30" />
              </div>

              {/* Local video — Picture-in-Picture (top-right) */}
              <div
                className="absolute top-6 right-6 w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-20 cursor-pointer hover:scale-105 transition-transform"
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
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Overlaid controls bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-30 px-6 pb-8 sm:pb-6 pt-24 flex flex-col items-center gap-6"
                style={{ background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.5) 60%, transparent 100%)' }}>
                
                {/* Info & Timer */}
                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-white font-black text-lg tracking-wide drop-shadow-md">{remoteParty.fullName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-mono text-xs bg-slate-950/80 px-3 py-0.5 rounded-full border border-emerald-500/20 backdrop-blur-md shadow-sm">
                      {formatDuration(callDurationSeconds)}
                    </span>
                    {isMuted && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                        </svg>
                        {lang === 'km' ? 'បិទសំឡេង' : 'Muted'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Video controls button row */}
                <div className="flex justify-center gap-6">
                  {/* Mute */}
                  <CtrlBtn id="vid-mute-btn" onClick={onToggleMute}
                    active={isMuted} 
                    activeClass="bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:scale-105"
                    inactiveClass="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md hover:scale-105"
                    label={isMuted ? (lang === 'km' ? 'បើកសំឡេង' : 'Unmute') : (lang === 'km' ? 'បិទសំឡេង' : 'Mute')}>
                    {isMuted
                      ? <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
                      : <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H2c0 4.72 3.45 8.65 8 9.58V21h2v-5.49c4.55-.93 8-4.86 8-9.58h-2c0 4.08-3.06 7.44-7 7.93V15.93z"/></svg>
                    }
                  </CtrlBtn>

                  {/* Camera */}
                  <CtrlBtn id="vid-cam-btn" onClick={onToggleCamera}
                    active={isCameraOff} 
                    activeClass="bg-slate-800 text-white hover:scale-105"
                    inactiveClass="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md hover:scale-105"
                    label={isCameraOff ? (lang === 'km' ? 'បើកកាមេរ៉ា' : 'Cam On') : (lang === 'km' ? 'បិទកាមេរ៉ា' : 'Cam Off')}>
                    {isCameraOff
                      ? <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4-4-9.91 9.91-2.1 4.69L9.69 15 21 6.5zm-9.56 9.56L5 22l6.44-6.44z"/></svg>
                      : <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                    }
                  </CtrlBtn>

                  {/* Add User */}
                  {onInviteUser && (
                    <CtrlBtn id="vid-add-btn" onClick={() => setIsAddUserOpen(true)}
                      inactiveClass="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md hover:scale-105"
                      label={lang === 'km' ? 'បន្ថែមមនុស្ស' : 'Add User'}>
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </CtrlBtn>
                  )}

                  {/* End call */}
                  <CtrlBtn id="vid-hangup-btn" onClick={onHangUp} size="lg"
                    inactiveClass="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 hover:scale-105"
                    label={lang === 'km' ? 'បញ្ចប់ការហៅ' : 'End Call'}>
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

              {/* If group call, list other participants under initiator */}
              {isGroupCall && participants.length > 0 && (
                <div className="mb-6 relative z-10 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{lang === 'km' ? 'សមាជិកផ្សេងទៀត' : 'Other Participants'}</span>
                  <div className="flex justify-center items-center gap-1.5 flex-wrap">
                    {participants.map(p => (
                      <span key={p.username} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-300 font-bold">
                        {p.fullName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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

                    {/* Add User */}
                    {onInviteUser && (
                      <CtrlBtn id="call-add-btn" onClick={() => setIsAddUserOpen(true)}
                        inactiveClass="bg-white/10 hover:bg-white/15 text-white/95 border border-white/5 backdrop-blur-md hover:scale-105"
                        label={lang === 'km' ? 'បន្ថែមមនុស្ស' : 'Add User'}>
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </CtrlBtn>
                    )}

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

      {/* ── Add User Overlay Dialog ── */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(2, 6, 23, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[80%]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-black text-md">{lang === 'km' ? 'បន្ថែមអ្នកចូលរួម' : 'Add Participant'}</h3>
              <button 
                onClick={() => { setIsAddUserOpen(false); setUserSearch(''); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder={lang === 'km' ? 'ស្វែងរកសមាជិក...' : 'Search members...'}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full py-2.5 px-4 bg-slate-950 border border-white/5 rounded-xl text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-500/40 transition-colors mb-4"
            />

            {/* User List */}
            <div className="flex-grow overflow-y-auto no-scrollbar space-y-2.5 pr-1">
              {eligibleUsers.length > 0 ? (
                eligibleUsers.map(u => (
                  <div
                    key={u.UserName}
                    onClick={() => {
                      if (onInviteUser) {
                        onInviteUser({
                          username: u.UserName,
                          fullName: u.FullName,
                          avatarUrl: u.ProfilePictureURL,
                        });
                      }
                      setIsAddUserOpen(false);
                      setUserSearch('');
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-transparent hover:border-white/5 hover:bg-white/10 transition-all duration-250 cursor-pointer"
                  >
                    <UserAvatar avatarUrl={u.ProfilePictureURL} name={u.FullName} size="md" />
                    <div className="min-w-0 flex-grow">
                      <p className="text-xs font-black text-white truncate">{u.FullName}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">@{u.UserName}</p>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm shrink-0">+</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 text-xs font-bold py-6">{lang === 'km' ? 'រកមិនឃើញសមាជិកទេ' : 'No members found'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceCallModal;

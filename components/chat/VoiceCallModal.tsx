import React, { useEffect, useRef } from 'react';
import { CallState, CallParty } from '../../hooks/useVoiceCall';
import UserAvatar from '../common/UserAvatar';

interface VoiceCallModalProps {
  callState: CallState;
  remoteParty: CallParty | null;
  isMuted: boolean;
  callDurationSeconds: number;
  onAnswer: () => void;
  onReject: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  language?: string;
}

// ─── Format MM:SS ─────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Animated sound-wave bars ─────────────────────────────────────────────────

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

// ─── Pulsing ring animation around avatar ─────────────────────────────────────

const PulsingRing: React.FC<{ color?: string }> = ({ color = 'rgba(59,130,246,0.4)' }) => (
  <>
    {[1, 2, 3].map(i => (
      <div
        key={i}
        className="absolute inset-0 rounded-full border-2"
        style={{
          borderColor: color,
          animation: `callPulse ${1.2 + i * 0.3}s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </>
);

// ─── VoiceCallModal ────────────────────────────────────────────────────────────

const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  callState,
  remoteParty,
  isMuted,
  callDurationSeconds,
  onAnswer,
  onReject,
  onHangUp,
  onToggleMute,
  language = 'en',
}) => {
  const isVisible =
    callState === 'calling' ||
    callState === 'ringing' ||
    callState === 'connecting' ||
    callState === 'connected' ||
    callState === 'ended';

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);

  // ── Ringtone (Web Audio API) — plays when call is ringing on our side ──────
  useEffect(() => {
    const playRingtone = () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const pattern = [
          { freq: 480, dur: 0.4 },
          { freq: 620, dur: 0.4 },
        ];
        let t = ctx.currentTime;
        const nodes: typeof ringtoneNodesRef.current = [];
        const scheduleRing = () => {
          pattern.forEach(({ freq, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.02);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + dur);
            nodes.push({ osc, gain });
            t += dur + 0.05;
          });
        };
        // Ring 6 times then loop
        for (let i = 0; i < 6; i++) scheduleRing();
        ringtoneNodesRef.current = nodes;
      } catch {}
    };

    const stopRingtone = () => {
      try {
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        ringtoneNodesRef.current = [];
      } catch {}
    };

    if (callState === 'ringing') {
      playRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callState]);

  if (!isVisible || !remoteParty) return null;

  const statusLabel: Record<string, Record<string, string>> = {
    calling:    { en: 'Calling…',       km: 'កំពុងហៅ…' },
    ringing:    { en: 'Incoming Call',  km: 'ទូរស័ព្ទចូល' },
    connecting: { en: 'Connecting…',   km: 'កំពុងភ្ជាប់…' },
    connected:  { en: 'Voice Call',     km: 'ការហៅ' },
    ended:      { en: 'Call Ended',     km: 'ការហៅបានបញ្ចប់' },
  };

  const lang = language === 'km' ? 'km' : 'en';
  const label = statusLabel[callState]?.[lang] ?? '';

  return (
    <>
      {/* ── Global keyframes injected once ── */}
      <style>{`
        @keyframes callPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes soundBar {
          0%   { transform: scaleY(0.3); }
          100% { transform: scaleY(1);   }
        }
        @keyframes callModalIn {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes callEndOut {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.88); }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}
      >
        {/* ── Card ── */}
        <div
          className="relative w-full sm:max-w-sm mx-0 sm:mx-auto bg-gradient-to-b from-gray-900 to-[#020617] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-[0_-30px_80px_rgba(0,0,0,0.6)] sm:shadow-2xl overflow-hidden"
          style={{
            animation:
              callState === 'ended'
                ? 'callEndOut 0.4s ease forwards'
                : 'callModalIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >
          {/* Decorative gradient blob */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full opacity-20 pointer-events-none"
            style={{
              background:
                callState === 'ringing'
                  ? 'radial-gradient(circle, #22c55e, transparent)'
                  : callState === 'connected'
                  ? 'radial-gradient(circle, #14b8a6, transparent)'
                  : 'radial-gradient(circle, #3b82f6, transparent)',
            }}
          />

          {/* ── Status label ── */}
          <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-6">
            {label}
          </p>

          {/* ── Avatar with pulsing ring ── */}
          <div className="flex justify-center mb-5">
            <div className="relative flex items-center justify-center">
              {(callState === 'calling' || callState === 'ringing') && (
                <div className="absolute inset-[-18px]">
                  <PulsingRing
                    color={
                      callState === 'ringing'
                        ? 'rgba(34,197,94,0.35)'
                        : 'rgba(59,130,246,0.35)'
                    }
                  />
                </div>
              )}
              <div className="relative z-10 ring-4 ring-white/10 rounded-full shadow-2xl">
                <UserAvatar
                  avatarUrl={remoteParty.avatarUrl}
                  name={remoteParty.fullName || remoteParty.username}
                  size="xl"
                />
              </div>
            </div>
          </div>

          {/* ── Name ── */}
          <h2 className="text-center text-2xl font-black text-white tracking-tight mb-1">
            {remoteParty.fullName || remoteParty.username}
          </h2>
          <p className="text-center text-[11px] text-gray-500 font-mono mb-6">
            @{remoteParty.username}
          </p>

          {/* ── Connected: timer + wave ── */}
          {callState === 'connected' && (
            <div className="flex flex-col items-center gap-3 mb-8">
              <p className="text-3xl font-black tabular-nums text-emerald-400 tracking-widest">
                {formatDuration(callDurationSeconds)}
              </p>
              <SoundWave />
            </div>
          )}

          {/* ── Connecting: dots ── */}
          {callState === 'connecting' && (
            <div className="flex justify-center gap-2 mb-8">
              {[0, 150, 300].map(d => (
                <div
                  key={d}
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}

          {/* ── Calling: subtitle ── */}
          {callState === 'calling' && (
            <p className="text-center text-sm text-gray-500 mb-8 animate-pulse">
              {language === 'km' ? 'រង់ចាំ…' : 'Waiting for answer…'}
            </p>
          )}

          {/* ── Ringing: subtitle ── */}
          {callState === 'ringing' && (
            <p className="text-center text-sm text-gray-400 mb-8">
              {language === 'km' ? 'ចង់ជជែករកអ្នក' : 'wants to talk to you'}
            </p>
          )}

          {/* ── Action buttons ── */}
          <div className="flex justify-center gap-5">
            {/* ── RINGING: Answer + Decline ── */}
            {callState === 'ringing' && (
              <>
                <button
                  onClick={onReject}
                  className="flex flex-col items-center gap-2 group"
                  id="call-reject-btn"
                >
                  <span className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-2xl shadow-red-600/30 transition-all active:scale-90 group-hover:shadow-red-500/40">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      <line x1="2" y1="2" x2="22" y2="22" stroke="white" strokeWidth="2" />
                    </svg>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                    {language === 'km' ? 'បដិសេធ' : 'Decline'}
                  </span>
                </button>
                <button
                  onClick={onAnswer}
                  className="flex flex-col items-center gap-2 group"
                  id="call-answer-btn"
                >
                  <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30 transition-all active:scale-90 group-hover:shadow-emerald-400/40">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    {language === 'km' ? 'ទទួល' : 'Answer'}
                  </span>
                </button>
              </>
            )}

            {/* ── CALLING: Cancel ── */}
            {callState === 'calling' && (
              <button
                onClick={onHangUp}
                className="flex flex-col items-center gap-2 group"
                id="call-cancel-btn"
              >
                <span className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-2xl shadow-red-600/30 transition-all active:scale-90">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    <line x1="2" y1="2" x2="22" y2="22" stroke="white" strokeWidth="2" />
                  </svg>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                  {language === 'km' ? 'បោះបង់' : 'Cancel'}
                </span>
              </button>
            )}

            {/* ── CONNECTED: Mute + Hang Up ── */}
            {(callState === 'connected' || callState === 'connecting') && (
              <>
                <button
                  onClick={onToggleMute}
                  className="flex flex-col items-center gap-2 group"
                  id="call-mute-btn"
                >
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${
                      isMuted
                        ? 'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/20'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {isMuted ? (
                      <svg className="w-6 h-6 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H2c0 4.72 3.45 8.65 8 9.58V21h2v-5.49c4.55-.93 8-4.86 8-9.58h-2c0 4.08-3.06 7.44-7 7.93V15.93z" />
                      </svg>
                    )}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {isMuted
                      ? language === 'km'
                        ? 'បើកសំឡេង'
                        : 'Unmute'
                      : language === 'km'
                      ? 'បិទសំឡេង'
                      : 'Mute'}
                  </span>
                </button>
                <button
                  onClick={onHangUp}
                  className="flex flex-col items-center gap-2 group"
                  id="call-hangup-btn"
                >
                  <span className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-2xl shadow-red-600/30 transition-all active:scale-90">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      <line x1="2" y1="2" x2="22" y2="22" stroke="white" strokeWidth="2" />
                    </svg>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                    {language === 'km' ? 'ទំនាក់ទំនងបញ្ចប់' : 'End Call'}
                  </span>
                </button>
              </>
            )}

            {/* ── ENDED ── */}
            {callState === 'ended' && (
              <p className="text-gray-500 text-sm animate-pulse">
                {language === 'km' ? 'ការហៅបានបញ្ចប់' : 'Call ended'}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default VoiceCallModal;

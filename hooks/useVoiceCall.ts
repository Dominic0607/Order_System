import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallState =
  | 'idle'        // No active call
  | 'calling'     // We initiated, waiting for remote answer
  | 'ringing'     // Remote called us, waiting for our answer
  | 'connecting'  // ICE negotiation in progress
  | 'connected'   // Audio flowing
  | 'ended';      // Call just finished (transitions back to idle)

export interface CallParty {
  username: string;
  fullName: string;
  avatarUrl?: string;
}

export interface VoiceCallState {
  callState: CallState;
  remoteParty: CallParty | null;
  isMuted: boolean;
  callDurationSeconds: number;
}

// ─── STUN Servers ─────────────────────────────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceCall(
  wsRef: React.MutableRefObject<WebSocket | null>,
  currentUsername: string,
) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteParty, setRemoteParty] = useState<CallParty | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef = useRef<any>(null);
  const callStateRef = useRef<CallState>('idle');

  // Keep ref in sync for use inside closures
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const sendSignal = useCallback(
    (type: string, to: string, payload?: object) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type, to, from: currentUsername, payload }));
    },
    [wsRef, currentUsername],
  );

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const startCallTimer = useCallback(() => {
    setCallDurationSeconds(0);
    callTimerRef.current = setInterval(() => {
      setCallDurationSeconds(s => s + 1);
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const teardown = useCallback(
    (nextState: CallState = 'idle') => {
      stopCallTimer();
      stopLocalStream();
      closePeerConnection();
      pendingCandidatesRef.current = [];
      setIsMuted(false);
      setCallDurationSeconds(0);
      setCallState(nextState);
      if (nextState !== 'ringing' && nextState !== 'calling') {
        setTimeout(() => setCallState('idle'), nextState === 'ended' ? 1500 : 0);
      }
    },
    [stopCallTimer, stopLocalStream, closePeerConnection],
  );

  // ─── Create RTCPeerConnection ─────────────────────────────────────────────

  const createPeerConnection = useCallback(
    (targetUsername: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          sendSignal('call_ice', targetUsername, { candidate: candidate.toJSON() });
        }
      };

      pc.ontrack = ({ streams }) => {
        const stream = streams[0];
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = stream;
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          setCallState('connected');
          startCallTimer();
        } else if (
          state === 'disconnected' ||
          state === 'failed' ||
          state === 'closed'
        ) {
          if (callStateRef.current !== 'idle' && callStateRef.current !== 'ended') {
            teardown('ended');
          }
        }
      };

      return pc;
    },
    [sendSignal, startCallTimer, teardown],
  );

  // ─── Outgoing Call ────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (target: CallParty) => {
      if (callStateRef.current !== 'idle') return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        const pc = createPeerConnection(target.username);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setRemoteParty(target);
        setCallState('calling');
        sendSignal('call_offer', target.username, { sdp: offer });
      } catch (err) {
        console.error('[VoiceCall] startCall failed:', err);
        teardown('ended');
        throw err; // Re-throw so UI can show mic permission error
      }
    },
    [createPeerConnection, sendSignal, teardown],
  );

  // ─── Answer Incoming Call ─────────────────────────────────────────────────

  const answerCall = useCallback(
    async (sdpOffer: RTCSessionDescriptionInit) => {
      if (!remoteParty) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        const pc = createPeerConnection(remoteParty.username);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));

        // Drain any ICE candidates that arrived before the peer connection was set up
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        setCallState('connecting');
        sendSignal('call_answer', remoteParty.username, { sdp: answer });
      } catch (err) {
        console.error('[VoiceCall] answerCall failed:', err);
        teardown('ended');
        throw err;
      }
    },
    [remoteParty, createPeerConnection, sendSignal, teardown],
  );

  // ─── Reject Incoming Call ─────────────────────────────────────────────────

  const rejectCall = useCallback(() => {
    if (remoteParty) {
      sendSignal('call_reject', remoteParty.username, {});
    }
    teardown('ended');
  }, [remoteParty, sendSignal, teardown]);

  // ─── Hang Up ──────────────────────────────────────────────────────────────

  const hangUp = useCallback(() => {
    if (remoteParty) {
      sendSignal('call_end', remoteParty.username, {});
    }
    teardown('ended');
  }, [remoteParty, sendSignal, teardown]);

  // ─── Toggle Mute ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  // ─── Incoming Signal Dispatcher ───────────────────────────────────────────
  // Call this from ChatWidget's ws.onmessage for signaling events.

  const handleIncomingSignal = useCallback(
    async (data: {
      type: string;
      from: string;
      payload?: any;
    }) => {
      const { type, from, payload } = data;

      switch (type) {
        case 'call_offer': {
          if (callStateRef.current !== 'idle') {
            // Already in a call — send busy
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'call_busy', to: from, from: currentUsername }));
            }
            return;
          }
          // Store the SDP offer so answerCall() can use it
          (window as any).__pendingCallSdp = payload?.sdp;
          setRemoteParty({ username: from, fullName: from, avatarUrl: undefined });
          setCallState('ringing');
          break;
        }

        case 'call_answer': {
          if (!pcRef.current || callStateRef.current !== 'calling') return;
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload?.sdp));
            // Drain pending ICE candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
            setCallState('connecting');
          } catch (err) {
            console.error('[VoiceCall] Failed to set remote description:', err);
          }
          break;
        }

        case 'call_ice': {
          const candidate = payload?.candidate;
          if (!candidate) return;
          if (pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
          } else {
            // Queue for later
            pendingCandidatesRef.current.push(candidate);
          }
          break;
        }

        case 'call_reject': {
          teardown('ended');
          break;
        }

        case 'call_end': {
          teardown('ended');
          break;
        }

        case 'call_busy': {
          teardown('ended');
          break;
        }

        case 'call_cancelled': {
          if (callStateRef.current === 'ringing') {
            teardown('ended');
          }
          break;
        }

        case 'call_not_available': {
          teardown('ended');
          break;
        }

        default:
          break;
      }
    },
    [wsRef, currentUsername, teardown],
  );

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopCallTimer();
      stopLocalStream();
      closePeerConnection();
    };
  }, [stopCallTimer, stopLocalStream, closePeerConnection]);

  return {
    callState,
    remoteParty,
    isMuted,
    callDurationSeconds,
    startCall,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    handleIncomingSignal,
    remoteAudioRef,
  };
}

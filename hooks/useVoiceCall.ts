import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallState =
  | 'idle'        // No active call
  | 'calling'     // We initiated, waiting for remote answer
  | 'ringing'     // Remote called us, waiting for our answer
  | 'connecting'  // ICE negotiation in progress
  | 'connected'   // Media flowing
  | 'ended';      // Call just finished (transitions back to idle)

export type CallType = 'audio' | 'video';

export interface CallParty {
  username: string;
  fullName: string;
  avatarUrl?: string;
}

// ─── STUN Servers ─────────────────────────────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.relay.metered.ca:80' },
  {
    urls: 'turn:global.relay.metered.ca:80',
    username: '4ee3a9c0e4ba870fc7576d35',
    credential: 'dHr1qSQERepEfnVK'
  },
  {
    urls: 'turn:global.relay.metered.ca:443',
    username: '4ee3a9c0e4ba870fc7576d35',
    credential: 'dHr1qSQERepEfnVK'
  },
  {
    urls: 'turn:global.relay.metered.ca:443?transport=tcp',
    username: '4ee3a9c0e4ba870fc7576d35',
    credential: 'dHr1qSQERepEfnVK'
  }
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceCall(
  wsRef: React.MutableRefObject<WebSocket | null>,
  currentUsername: string,
) {
  const [callState, setCallState]       = useState<CallState>('idle');
  const [callType, setCallType]         = useState<CallType>('audio');
  const [remoteParty, setRemoteParty]   = useState<CallParty | null>(null);
  const [isMuted, setIsMuted]           = useState(false);
  const [isCameraOff, setIsCameraOff]   = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Refs for media / WebRTC
  const pcRef                 = useRef<RTCPeerConnection | null>(null);
  const localStreamRef        = useRef<MediaStream | null>(null);
  const remoteAudioRef        = useRef<HTMLAudioElement | null>(null);
  const localVideoRef         = useRef<HTMLVideoElement | null>(null);  // local preview
  const remoteVideoRef        = useRef<HTMLVideoElement | null>(null);  // remote video
  const pendingCandidatesRef  = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef          = useRef<any>(null);
  const callStateRef          = useRef<CallState>('idle');
  const callTypeRef           = useRef<CallType>('audio');

  // Keep refs in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);

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
    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
      setIsCameraOff(false);
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

      pc.ontrack = ({ streams, track }) => {
        const stream = streams[0];
        if (track.kind === 'video') {
          // Video track — attach to video element
          if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== stream) {
              remoteVideoRef.current.srcObject = stream;
            }
          } else {
            // Create a detached video element as fallback
            const vid = document.createElement('video');
            vid.autoplay = true;
            vid.playsInline = true;
            vid.srcObject = stream;
            remoteVideoRef.current = vid;
          }
        } else {
          // Audio-only track
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
          }
          if (remoteAudioRef.current.srcObject !== stream) {
            remoteAudioRef.current.srcObject = stream;
          }
        }
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

  // ─── Attach local stream to local video element ────────────────────────────

  const attachLocalVideo = useCallback((stream: MediaStream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true; // Prevent feedback
      localVideoRef.current.play().catch(() => {});
    }
  }, []);

  // ─── Outgoing Call ────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (target: CallParty, type: CallType = 'audio') => {
      if (callStateRef.current !== 'idle') return;

      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (type === 'video') attachLocalVideo(stream);

        const pc = createPeerConnection(target.username);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setRemoteParty(target);
        setCallType(type);
        setCallState('calling');
        sendSignal('call_offer', target.username, { sdp: offer, callType: type });
      } catch (err) {
        console.error('[VoiceCall] startCall failed:', err);
        teardown('ended');
        throw err;
      }
    },
    [createPeerConnection, sendSignal, teardown, attachLocalVideo],
  );

  // ─── Answer Incoming Call ─────────────────────────────────────────────────

  const answerCall = useCallback(
    async (sdpOffer: RTCSessionDescriptionInit, incomingCallType: CallType = 'audio') => {
      if (!remoteParty) return;
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: incomingCallType === 'video'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (incomingCallType === 'video') attachLocalVideo(stream);
        setCallType(incomingCallType);

        const pc = createPeerConnection(remoteParty.username);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));

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
    [remoteParty, createPeerConnection, sendSignal, teardown, attachLocalVideo],
  );

  // ─── Reject Incoming Call ─────────────────────────────────────────────────

  const rejectCall = useCallback(() => {
    if (remoteParty) sendSignal('call_reject', remoteParty.username, {});
    teardown('ended');
  }, [remoteParty, sendSignal, teardown]);

  // ─── Hang Up ──────────────────────────────────────────────────────────────

  const hangUp = useCallback(() => {
    if (remoteParty) sendSignal('call_end', remoteParty.username, {});
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

  // ─── Toggle Camera ────────────────────────────────────────────────────────

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    }
  }, []);

  // ─── Incoming Signal Dispatcher ───────────────────────────────────────────

  const handleIncomingSignal = useCallback(
    async (data: {
      type: string;
      from: string;
      payload?: any;
      callerFullName?: string;
      callerAvatar?: string;
    }) => {
      const { type, from, payload } = data;

      switch (type) {
        case 'call_offer': {
          if (callStateRef.current !== 'idle') {
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'call_busy', to: from, from: currentUsername }));
            }
            return;
          }
          // Persist both SDP and callType so answerCall() can read them
          (window as any).__pendingCallSdp     = payload?.sdp;
          (window as any).__pendingCallType    = payload?.callType ?? 'audio';
          setRemoteParty({
            username: from,
            fullName: data.callerFullName || from,
            avatarUrl: data.callerAvatar,
          });
          setCallType(payload?.callType ?? 'audio');
          setCallState('ringing');
          break;
        }

        case 'call_answer': {
          if (!pcRef.current || callStateRef.current !== 'calling') return;
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload?.sdp));
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
            try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
          break;
        }

        case 'call_reject':
        case 'call_end':
        case 'call_busy':
        case 'call_not_available':
          teardown('ended');
          break;

        case 'call_cancelled':
          if (callStateRef.current === 'ringing') teardown('ended');
          break;

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
    callType,
    remoteParty,
    isMuted,
    isCameraOff,
    callDurationSeconds,
    startCall,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleCamera,
    handleIncomingSignal,
    // Video element refs — assign these to <video> elements in the UI
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
  };
}

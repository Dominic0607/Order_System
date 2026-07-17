import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  { urls: 'global.relay.metered.ca:80' },
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
  const [localStream, setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null); // Legacy single stream compatibility

  // Group call extensions
  const [isGroupCall, setIsGroupCall]   = useState(false);
  const [participants, setParticipants] = useState<CallParty[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<{ [username: string]: MediaStream }>({});

  // Refs for media / WebRTC
  const pcsRef                = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef        = useRef<MediaStream | null>(null);
  const remoteAudioRef        = useRef<HTMLAudioElement | null>(null);  // Legacy
  const remoteAudioRefs       = useRef<Map<string, HTMLAudioElement>>(new Map());
  const localVideoRef         = useRef<HTMLVideoElement | null>(null);  // local preview
  const remoteVideoRef        = useRef<HTMLVideoElement | null>(null);  // Legacy remote video
  const pendingCandidatesRef  = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const callTimerRef          = useRef<any>(null);
  const callingTimeoutRef      = useRef<any>(null);
  
  const callStateRef          = useRef<CallState>('idle');
  const callTypeRef           = useRef<CallType>('audio');
  const isGroupCallRef        = useRef<boolean>(false);
  const participantsRef       = useRef<CallParty[]>([]);
  const remotePartyRef        = useRef<CallParty | null>(null);

  // Keep refs in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { isGroupCallRef.current = isGroupCall; }, [isGroupCall]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);
  useEffect(() => { remotePartyRef.current = remoteParty; }, [remoteParty]);

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

  const closeAllPeerConnections = useCallback(() => {
    pcsRef.current.forEach((pc, username) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    });
    pcsRef.current.clear();

    remoteAudioRefs.current.forEach(audio => {
      audio.srcObject = null;
    });
    remoteAudioRefs.current.clear();

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
  }, []);

  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) return;
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
      if (callingTimeoutRef.current) {
        clearTimeout(callingTimeoutRef.current);
        callingTimeoutRef.current = null;
      }
      stopLocalStream();
      closeAllPeerConnections();
      pendingCandidatesRef.current.clear();
      setIsMuted(false);
      setIsCameraOff(false);
      setCallDurationSeconds(0);
      setLocalStream(null);
      setRemoteStream(null);
      setRemoteStreams({});
      setIsGroupCall(false);
      setParticipants([]);
      setRemoteParty(null);
      setCallState(nextState);
      if (nextState !== 'ringing' && nextState !== 'calling') {
        setTimeout(() => setCallState('idle'), nextState === 'ended' ? 1500 : 0);
      }
    },
    [stopCallTimer, stopLocalStream, closeAllPeerConnections],
  );

  // ─── Create RTCPeerConnection ─────────────────────────────────────────────

  const getOrCreatePeerConnection = useCallback(
    (targetUsername: string): RTCPeerConnection => {
      let pc = pcsRef.current.get(targetUsername);
      if (pc) return pc;

      console.log(`[VoiceCall] Creating RTCPeerConnection for ${targetUsername}`);
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          sendSignal('call_ice', targetUsername, { candidate: candidate.toJSON() });
        }
      };

      pc.ontrack = ({ streams, track }) => {
        const stream = streams[0];
        console.log(`[VoiceCall] Received remote track (${track.kind}) from ${targetUsername}`);
        
        setRemoteStreams(prev => ({
          ...prev,
          [targetUsername]: stream
        }));

        // Backwards compatibility for 1-on-1 view
        if (!isGroupCallRef.current) {
          setRemoteStream(stream);
          if (track.kind === 'video') {
            if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
              remoteVideoRef.current.srcObject = stream;
            }
          } else {
            if (!remoteAudioRef.current) {
              remoteAudioRef.current = new Audio();
              remoteAudioRef.current.autoplay = true;
            }
            if (remoteAudioRef.current.srcObject !== stream) {
              remoteAudioRef.current.srcObject = stream;
            }
          }
        } else {
          // Play audio tracks for group call participants in background
          if (track.kind === 'audio') {
            let audio = remoteAudioRefs.current.get(targetUsername);
            if (!audio) {
              audio = new Audio();
              audio.autoplay = true;
              remoteAudioRefs.current.set(targetUsername, audio);
            }
            if (audio.srcObject !== stream) {
              audio.srcObject = stream;
            }
          }
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[VoiceCall] Connection state with ${targetUsername} is: ${state}`);
        if (state === 'connected') {
          setCallState('connected');
          startCallTimer();
        } else if (
          state === 'disconnected' ||
          state === 'failed' ||
          state === 'closed'
        ) {
          cleanupPeer(targetUsername);
        }
      };

      // Add local stream tracks to this PC
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pcsRef.current.set(targetUsername, pc);
      return pc;
    },
    [sendSignal, startCallTimer],
  );

  const cleanupPeer = useCallback((username: string) => {
    console.log(`[VoiceCall] Cleaning up connection for participant ${username}`);
    const pc = pcsRef.current.get(username);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcsRef.current.delete(username);
    }

    const audio = remoteAudioRefs.current.get(username);
    if (audio) {
      audio.srcObject = null;
      remoteAudioRefs.current.delete(username);
    }

    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[username];
      return updated;
    });

    setParticipants(prev => prev.filter(p => p.username !== username));

    // If no more connections exist and we are in active call state, end call
    setTimeout(() => {
      if (pcsRef.current.size === 0 && callStateRef.current === 'connected') {
        teardown('ended');
      }
    }, 500);
  }, [teardown]);

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
        setLocalStream(stream);

        if (type === 'video') attachLocalVideo(stream);

        setRemoteParty(target);
        setCallType(type);
        setIsGroupCall(false);
        setParticipants([target]);
        setCallState('calling');

        const pc = getOrCreatePeerConnection(target.username);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignal('call_offer', target.username, { sdp: offer, callType: type });

        // Auto-abort if no answer in 30 seconds
        if (callingTimeoutRef.current) clearTimeout(callingTimeoutRef.current);
        callingTimeoutRef.current = setTimeout(() => {
          if (callStateRef.current === 'calling') {
            console.log('[VoiceCall] Outgoing call timeout (no answer)');
            sendSignal('call_cancelled', target.username, {});
            teardown('ended');
          }
        }, 30000);
      } catch (err) {
        console.error('[VoiceCall] startCall failed:', err);
        teardown('ended');
        throw err;
      }
    },
    [getOrCreatePeerConnection, sendSignal, teardown, attachLocalVideo],
  );

  // ─── Answer Incoming Call ─────────────────────────────────────────────────

  const answerCall = useCallback(
    async (sdpOffer?: RTCSessionDescriptionInit, incomingCallType: CallType = 'audio') => {
      if (!remotePartyRef.current) return;
      
      try {
        const type = incomingCallType || callTypeRef.current;
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: type === 'video'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);

        if (type === 'video') attachLocalVideo(stream);
        setCallType(type);

        if (isGroupCallRef.current) {
          // Mesh: Broadcast group_call_joined to all other participants so they call us
          setCallState('connecting');
          participantsRef.current.forEach(p => {
            sendSignal('group_call_joined', p.username, {});
          });
          if (remotePartyRef.current) {
            sendSignal('group_call_joined', remotePartyRef.current.username, {});
          }
        } else {
          // Standard 1-on-1
          const target = remotePartyRef.current.username;
          const pc = getOrCreatePeerConnection(target);

          if (sdpOffer) {
            await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));
          }

          const candidates = pendingCandidatesRef.current.get(target) || [];
          for (const candidate of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current.delete(target);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          setCallState('connecting');
          sendSignal('call_answer', target, { sdp: answer });
        }
      } catch (err) {
        console.error('[VoiceCall] answerCall failed:', err);
        teardown('ended');
        throw err;
      }
    },
    [getOrCreatePeerConnection, sendSignal, teardown, attachLocalVideo],
  );

  // ─── Invite User to Group Call ─────────────────────────────────────────────

  const inviteToGroupCall = useCallback(
    async (target: CallParty) => {
      const type = callTypeRef.current;
      console.log(`[VoiceCall] Inviting ${target.username} to group call`);
      
      setIsGroupCall(true);

      // Add target to participants
      setParticipants(prev => {
        if (prev.some(p => p.username === target.username)) return prev;
        return [...prev, target];
      });

      // Prepare list of existing participants to inform C
      const currentParticipants = [
        { username: currentUsername, fullName: 'Me' },
        ...(remotePartyRef.current ? [remotePartyRef.current] : []),
        ...participantsRef.current.filter(p => p.username !== target.username)
      ];

      // Send group call invite to C
      sendSignal('group_call_invite', target.username, {
        participants: currentParticipants,
        callType: type,
      });

      // Notify B and other users currently in call that C was invited
      if (remotePartyRef.current && remotePartyRef.current.username !== target.username) {
        sendSignal('group_call_joined', remotePartyRef.current.username, {
          addedParticipant: target
        });
      }
      participantsRef.current.forEach(p => {
        if (p.username !== target.username) {
          sendSignal('group_call_joined', p.username, {
            addedParticipant: target
          });
        }
      });
    },
    [currentUsername, sendSignal]
  );

  // ─── Reject Incoming Call ─────────────────────────────────────────────────

  const rejectCall = useCallback(() => {
    if (remotePartyRef.current) sendSignal('call_reject', remotePartyRef.current.username, {});
    teardown('ended');
  }, [sendSignal, teardown]);

  // ─── Hang Up ──────────────────────────────────────────────────────────────

  const hangUp = useCallback(() => {
    pcsRef.current.forEach((pc, username) => {
      sendSignal('call_end', username, {});
    });
    if (remotePartyRef.current) {
      sendSignal('call_end', remotePartyRef.current.username, {});
    }
    teardown('ended');
  }, [sendSignal, teardown]);

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
        case 'group_call_invite': {
          if (callStateRef.current !== 'idle') {
            sendSignal('call_busy', from, {});
            return;
          }
          const incomingParticipants = payload?.participants || [];
          const incomingCallType = payload?.callType ?? 'audio';

          setIsGroupCall(true);
          setCallType(incomingCallType);
          setRemoteParty({
            username: from,
            fullName: data.callerFullName || from,
            avatarUrl: data.callerAvatar,
          });
          setParticipants(incomingParticipants.filter((p: any) => p.username !== currentUsername));
          (window as any).__pendingCallType = incomingCallType;
          setCallState('ringing');
          break;
        }

        case 'group_call_joined': {
          if (payload?.addedParticipant) {
            // Notification that another user was invited. Add to local participants.
            const newParty = payload.addedParticipant as CallParty;
            setIsGroupCall(true);
            setParticipants(prev => {
              if (prev.some(p => p.username === newParty.username)) return prev;
              return [...prev, newParty];
            });
            break;
          }

          // A new peer (from) answered. We are the offerer, so initiate PeerConnection & send offer.
          console.log(`[VoiceCall] Peer ${from} joined. Sending WebRTC offer...`);
          setIsGroupCall(true);
          const newParty: CallParty = {
            username: from,
            fullName: data.callerFullName || from,
            avatarUrl: data.callerAvatar,
          };
          setParticipants(prev => {
            if (prev.some(p => p.username === from)) return prev;
            return [...prev, newParty];
          });

          try {
            const pc = getOrCreatePeerConnection(from);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal('call_offer', from, { sdp: offer, callType: callTypeRef.current, isGroupCall: true });
          } catch (err) {
            console.error(`[VoiceCall] Failed to initiate WebRTC offer to ${from}:`, err);
          }
          break;
        }

        case 'call_offer': {
          // If we are in a call and get a group call offer, or we get a 1-on-1 offer while idle
          const isGroupOffer = payload?.isGroupCall || isGroupCallRef.current;
          if (callStateRef.current !== 'idle' && !isGroupOffer) {
            sendSignal('call_busy', from, {});
            return;
          }

          console.log(`[VoiceCall] Received call offer from ${from}`);
          if (callStateRef.current === 'idle') {
            (window as any).__pendingCallSdp     = payload?.sdp;
            (window as any).__pendingCallType    = payload?.callType ?? 'audio';
            setRemoteParty({
              username: from,
              fullName: data.callerFullName || from,
              avatarUrl: data.callerAvatar,
            });
            setCallType(payload?.callType ?? 'audio');
            setCallState('ringing');
          } else {
            // Already connected/connecting in group call. Set remote description and send answer.
            try {
              const pc = getOrCreatePeerConnection(from);
              await pc.setRemoteDescription(new RTCSessionDescription(payload?.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignal('call_answer', from, { sdp: answer });
            } catch (err) {
              console.error(`[VoiceCall] Failed to answer incoming offer from ${from}:`, err);
            }
          }
          break;
        }

        case 'call_answer': {
          const pc = pcsRef.current.get(from);
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload?.sdp));
            const candidates = pendingCandidatesRef.current.get(from) || [];
            for (const candidate of candidates) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current.delete(from);
          } catch (err) {
            console.error(`[VoiceCall] Failed to set call answer remote description for ${from}:`, err);
          }
          break;
        }

        case 'call_ice': {
          const candidate = payload?.candidate;
          if (!candidate) return;
          const pc = pcsRef.current.get(from);
          if (pc && pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
          } else {
            let candidates = pendingCandidatesRef.current.get(from);
            if (!candidates) {
              candidates = [];
              pendingCandidatesRef.current.set(from, candidates);
            }
            candidates.push(candidate);
          }
          break;
        }

        case 'call_reject':
        case 'call_busy':
        case 'call_not_available':
          if (isGroupCallRef.current) {
            // A participant rejected or is busy. Just clean up that peer.
            cleanupPeer(from);
          } else {
            teardown('ended');
          }
          break;

        case 'call_end':
          if (isGroupCallRef.current) {
            cleanupPeer(from);
          } else {
            teardown('ended');
          }
          break;

        case 'call_cancelled':
          if (callStateRef.current === 'ringing') teardown('ended');
          break;

        default:
          break;
      }
    },
    [wsRef, currentUsername, getOrCreatePeerConnection, cleanupPeer, sendSignal, teardown],
  );

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopCallTimer();
      if (callingTimeoutRef.current) clearTimeout(callingTimeoutRef.current);
      stopLocalStream();
      closeAllPeerConnections();
    };
  }, [stopCallTimer, stopLocalStream, closeAllPeerConnections]);

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
    
    // Group call extensions
    isGroupCall,
    participants,
    remoteStreams,
    inviteToGroupCall,

    // Video element refs — assign these to <video> elements in 1-on-1 call UI
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    localStream,
    remoteStream,
  };
}

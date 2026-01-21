
import React, { useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { ChatMessage, User, BackendChatMessage } from '../../types';
import Spinner from '../common/Spinner';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { compressImage } from '../../utils/imageCompressor';
import { WEB_APP_URL, SOUND_URLS } from '../../constants';
import AudioPlayer from './AudioPlayer';
import { fileToBase64, convertGoogleDriveUrl } from '../../utils/fileUtils';
import UserAvatar from '../common/UserAvatar';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
type ActiveTab = 'chat' | 'users';

const MemoizedAudioPlayer = React.memo(AudioPlayer);

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose }) => {
    const { currentUser, appData, previewImage, setUnreadCount } = useContext(AppContext);
    const CACHE_KEY = useMemo(() => currentUser ? `chatHistoryCache_${currentUser.UserName}` : null, [currentUser]);

    // Audio Recorder Hook
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef<any>(null);

    // Sound Refs
    const soundNotification = useRef(new Audio(SOUND_URLS.NOTIFICATION));
    const soundSent = useRef(new Audio(SOUND_URLS.SENT));

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (!CACHE_KEY) return [];
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return (cached && cached !== "undefined") ? JSON.parse(cached) : [];
        } catch (e) { return []; }
    });

    // Initialize users from AppContext data instead of fetching again
    const [allUsers, setAllUsers] = useState<User[]>(appData.users || []);
    
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSendingAudio, setIsSendingAudio] = useState(false);
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('chatMuted') === 'true');
    const [isHistoryLoading, setIsHistoryLoading] = useState(false); 
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatBodyRef = useRef<HTMLDivElement>(null); // Ref for scroll container
    const wsRef = useRef<WebSocket | null>(null);
    const isOpenRef = useRef(isOpen);
    
    // Keep refs up to date for event handlers
    const allUsersRef = useRef(allUsers);
    const currentUserRef = useRef(currentUser);
    const isMutedRef = useRef(isMuted);

    useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // Sync users from AppData if they change
    useEffect(() => {
        if (appData.users && appData.users.length > 0) {
            setAllUsers(appData.users);
        }
    }, [appData.users]);

    // Reset Unread Count when chat is opened
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
        }
    }, [isOpen, setUnreadCount]);

    // Request Notification Permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // --- Audio Recording Logic ---
    const handleStartRecording = async () => {
        await startRecording();
        setRecordingTime(0);
        recordingIntervalRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const handleCancelRecording = async () => {
        await stopRecording(); 
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        setRecordingTime(0);
    };

    const handleStopAndSendAudio = async () => {
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        setIsSendingAudio(true);
        try {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64data = reader.result as string;
                    const content = base64data.split(',')[1]; 
                    await handleSendMessage(content, 'audio');
                };
            }
        } catch (e) {
            console.error("Failed to send audio", e);
        } finally {
            setIsSendingAudio(false);
            setRecordingTime(0);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
    // -----------------------------

    const setAndCacheMessages = useCallback((updater: React.SetStateAction<ChatMessage[]>) => {
        setMessages(prev => {
            const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
            // Only cache valid messages, not pending ones if possible, but simplest is to cache all
            if (CACHE_KEY) localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            return next;
        });
    }, [CACHE_KEY]);

    const transformBackendMessage = useCallback((msg: BackendChatMessage): ChatMessage => {
        const user = allUsersRef.current.find(u => u.UserName === msg.UserName);
        // Normalize type to lowercase to handle backend case inconsistency (e.g. 'Text' vs 'text')
        const normalizedType = (msg.MessageType || 'text').toLowerCase() as 'text' | 'image' | 'audio';
        
        return {
            id: msg.Timestamp, // Using timestamp as ID from backend
            user: msg.UserName,
            fullName: user?.FullName || msg.UserName,
            avatar: user?.ProfilePictureURL || '',
            content: normalizedType === 'image' ? convertGoogleDriveUrl(msg.Content) : 
                     normalizedType === 'audio' ? `${WEB_APP_URL}/api/chat/audio/${msg.FileID}` : msg.Content,
            timestamp: msg.Timestamp,
            type: normalizedType,
            fileID: msg.FileID,
            isOptimistic: false
        };
    }, []); 

    const fetchHistory = useCallback(async () => {
        if (!isOpenRef.current) return; // Optimization: Don't fetch if closed
        if (messages.length === 0) setIsHistoryLoading(true);
        try {
            const res = await fetch(`${WEB_APP_URL}/api/chat/messages`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const result = await res.json();
            if (result.status === 'success') {
                const history = result.data.map(transformBackendMessage);
                // Replace entire history to ensure sync
                setAndCacheMessages(history.sort((a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
            }
        } catch (e) { 
            // Suppress error log to avoid noise when chat service is offline
            console.warn("Chat history service unavailable"); 
        } finally { 
            setIsHistoryLoading(false); 
        }
    }, [transformBackendMessage, setAndCacheMessages, messages.length]);

    // WebSocket Logic
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = WEB_APP_URL.replace(/^https?:\/\//, '');
        const wsUrl = `${protocol}://${host}/api/chat/ws`;

        const setupWs = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            setConnectionStatus('connecting');
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnectionStatus('connected');
                // Re-fetch history on reconnect to sync missed messages
                if (isOpenRef.current) fetchHistory();
            };

            ws.onclose = () => {
                setConnectionStatus('disconnected');
                // Auto-reconnect after 3s
                setTimeout(setupWs, 3000);
            };

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.action === 'new_message') {
                        const msg = transformBackendMessage(data.payload);
                        
                        setAndCacheMessages(prev => {
                            // 1. Check if we already have this message ID (Backend ID)
                            if (prev.some(m => m.id === msg.id)) return prev;

                            // 2. Check for Optimistic Match (Deduplication)
                            // We look for a pending message from the same user with same content/type
                            const optimisticIndex = prev.findIndex(m => 
                                m.isOptimistic && 
                                m.user === msg.user && 
                                m.type === msg.type &&
                                (m.type === 'text' ? m.content === msg.content : true) // For media, content might differ (base64 vs url), so loose check
                            );

                            if (optimisticIndex !== -1) {
                                // Replace optimistic with real message
                                const newArr = [...prev];
                                newArr[optimisticIndex] = msg;
                                return newArr;
                            }

                            // 3. New Message
                            return [...prev, msg];
                        });

                        // Notification Logic
                        if (msg.user !== currentUserRef.current?.UserName) {
                            if (!isOpenRef.current) {
                                setUnreadCount(p => p + 1);
                            }
                            
                            if (!isMutedRef.current) {
                                soundNotification.current.currentTime = 0;
                                soundNotification.current.play().catch(() => {});
                            }

                            if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                                new Notification(`New message from ${msg.fullName}`, {
                                    body: msg.type === 'text' ? msg.content : `Sent a ${msg.type}`,
                                    icon: convertGoogleDriveUrl(msg.avatar)
                                });
                            }
                        }
                    }
                } catch (err) { console.error("WS Message Error", err); }
            };
        };

        setupWs();

        return () => {
            wsRef.current?.close();
        };
    }, []); // Run once on mount

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, fetchHistory]);

    // --- Smart Auto-Scroll Logic ---
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    // 1. Initial Scroll (Instant) when opening chat or finished loading history
    useEffect(() => {
        if (isOpen && activeTab === 'chat' && !isHistoryLoading) {
            scrollToBottom('auto');
        }
    }, [isOpen, activeTab, isHistoryLoading]);

    // 2. Conditional Scroll on New Messages
    useEffect(() => {
        if (!isOpen || activeTab !== 'chat' || isHistoryLoading) return;

        const container = chatBodyRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Check if user is near bottom (allow 250px buffer for large messages)
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 250;
            
            const lastMessage = messages[messages.length - 1];
            const isMe = lastMessage?.user === currentUser?.UserName;
            const isOptimistic = lastMessage?.isOptimistic;

            // Only auto-scroll if:
            // - I sent the message (isMe)
            // - It's a pending message (isOptimistic)
            // - I was already reading the latest messages (isAtBottom)
            if (isMe || isOptimistic || isAtBottom) {
                scrollToBottom('smooth');
            }
        } else {
            // Fallback if ref is missing
            scrollToBottom('smooth');
        }
    }, [messages]); // Dependency on messages only

    const handleSendMessage = async (content: string, type: 'text' | 'image' | 'audio') => {
        if (!content.trim()) return;

        // Ensure we have a user
        const sendingUser = currentUserRef.current;
        if (!sendingUser) {
            console.error("No user logged in to send message");
            alert("Please login to send messages.");
            return;
        }

        // 1. Optimistic Update (Immediate Feedback)
        const tempId = Date.now().toString();
        
        let displayContent = content;
        if (type === 'image' && !content.startsWith('http') && !content.startsWith('data:')) {
            displayContent = `data:image/jpeg;base64,${content}`;
        }
        if (type === 'audio' && !content.startsWith('http') && !content.startsWith('data:')) {
             displayContent = `data:audio/webm;base64,${content}`;
        }

        const optimisticMsg: ChatMessage = {
            id: tempId,
            user: sendingUser.UserName || 'Unknown',
            fullName: sendingUser.FullName || 'Me',
            avatar: sendingUser.ProfilePictureURL || '',
            content: displayContent,
            timestamp: new Date().toISOString(),
            type: type,
            isOptimistic: true
        };

        setMessages(prev => [...prev, optimisticMsg]);
        if (type === 'text') setNewMessage('');

        try {
            // Send payload with both naming conventions to support different backend expectations
            const payload = { 
                userName: sendingUser.UserName, 
                UserName: sendingUser.UserName,
                type: type,
                MessageType: type,
                content: content.trim(),
                Content: content.trim()
            };

            const response = await fetch(`${WEB_APP_URL}/api/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            // Play outgoing sound on success
            if (!isMuted) {
                soundSent.current.currentTime = 0;
                soundSent.current.play().catch(() => {});
            }
        } catch (e) {
            console.error("Send Error:", e);
            // Rollback optimistic update on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
            if (type === 'text') setNewMessage(content); // Restore text
            alert("ការបញ្ជូនសារបរាជ័យ (Send Failed). Please try again.");
        }
    };

    const handleFileUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const compressed = await compressImage(file);
            const base64 = await fileToBase64(compressed);
            await handleSendMessage(base64, 'image');
        } finally { setIsUploading(false); }
    };

    return (
        <div className={`chat-widget-container ${!isOpen ? 'closed' : ''}`}>
            <div className="chat-header">
                <div className="title-group flex items-center gap-2">
                    <div className={`connection-status w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-yellow-500 animate-pulse'}`}></div>
                    <h3 className="font-black text-white uppercase tracking-wider text-sm">Team Chat</h3>
                </div>
                <div className="controls flex items-center gap-2">
                    <button onClick={() => {
                        const newMuted = !isMuted;
                        setIsMuted(newMuted);
                        localStorage.setItem('chatMuted', String(newMuted));
                    }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        {isMuted ? '🔇' : '🔔'}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            <div className="chat-tabs bg-gray-900/50 p-1">
                <button onClick={() => setActiveTab('chat')} className={`text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'chat' ? 'active bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Chat Stream</button>
                <button onClick={() => setActiveTab('users')} className={`text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'users' ? 'active bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Members</button>
            </div>

            <div 
                className="chat-body custom-scrollbar bg-[#0f172a] relative"
                ref={chatBodyRef}
            >
                {activeTab === 'chat' ? (
                    <div className="chat-messages p-4 space-y-6 min-h-full">
                        {isHistoryLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                <Spinner size="md" />
                                <span className="text-xs text-gray-500">Loading history...</span>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                                <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-500">No messages yet</p>
                                <p className="text-[10px] text-gray-600 mt-1">Start the conversation!</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.user === currentUser?.UserName;
                                const user = allUsers.find(u => u.UserName === msg.user);
                                const showAvatar = index === 0 || messages[index - 1].user !== msg.user;
                                
                                return (
                                    <div key={msg.id + index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                                        <div className={`flex max-w-[85%] gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <div className={`flex-shrink-0 w-8 flex flex-col justify-end`}>
                                                {showAvatar ? (
                                                    <UserAvatar avatarUrl={user?.ProfilePictureURL || msg.avatar} name={user?.FullName || msg.fullName} size="sm" className="ring-2 ring-white/10" />
                                                ) : <div className="w-8"></div>}
                                            </div>
                                            
                                            <div className={`relative px-4 py-3 shadow-lg ${
                                                isMe 
                                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                                                : 'bg-gray-800 text-gray-200 rounded-2xl rounded-tl-sm border border-white/5'
                                            } ${msg.isOptimistic ? 'opacity-70' : ''}`}>
                                                {!isMe && showAvatar && <p className="text-[10px] font-black text-blue-400 mb-1 uppercase tracking-wider">{user?.FullName || msg.fullName}</p>}
                                                
                                                {msg.type === 'text' && <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>}
                                                {msg.type === 'image' && <img src={msg.content} className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition-opacity border border-black/20" onClick={() => previewImage(msg.content)} alt="attachment" />}
                                                {msg.type === 'audio' && <MemoizedAudioPlayer src={msg.content} isMe={isMe} />}
                                                
                                                <div className="flex items-center justify-end gap-1 mt-1.5">
                                                    <p className={`text-[9px] font-medium ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </p>
                                                    {msg.isOptimistic && <svg className="w-3 h-3 text-white/50 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {allUsers.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                <p className="text-xs uppercase tracking-widest">No members found</p>
                            </div>
                        ) : (
                            allUsers.map(u => (
                                <div key={u.UserName} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-800/40 border border-white/5 hover:bg-gray-800 transition-colors cursor-default">
                                    <UserAvatar avatarUrl={u.ProfilePictureURL} name={u.FullName} size="md" className="ring-2 ring-blue-500/20" />
                                    <div>
                                        <p className="text-sm font-black text-white">{u.FullName}</p>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">@{u.UserName}</p>
                                    </div>
                                    <div className={`ml-auto w-2 h-2 rounded-full ${u.IsSystemAdmin ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {activeTab === 'chat' && (
                <div className="p-3 bg-gray-900 border-t border-gray-800">
                    {isRecording ? (
                        <div className="flex items-center gap-3 bg-red-900/20 p-2 rounded-2xl border border-red-500/30 animate-pulse">
                            <div className="w-10 h-10 flex items-center justify-center bg-red-600 rounded-full shadow-lg shadow-red-600/40">
                                <div className="w-4 h-4 bg-white rounded-sm animate-pulse"></div>
                            </div>
                            <div className="flex-grow text-center">
                                <p className="text-red-400 font-black text-sm font-mono tracking-widest">{formatTime(recordingTime)}</p>
                                <p className="text-[8px] text-red-500 font-bold uppercase tracking-wider">Recording...</p>
                            </div>
                            <button onClick={handleCancelRecording} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <button onClick={handleStopAndSendAudio} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-500 transition-all active:scale-95">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-end gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-xl transition-all" title="Attach Image">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                            
                            <div className="flex-grow relative">
                                <textarea 
                                    value={newMessage} 
                                    onChange={e => setNewMessage(e.target.value)} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(newMessage, 'text');
                                        }
                                    }}
                                    placeholder="Type a message..." 
                                    className="w-full bg-gray-800 text-white rounded-2xl py-3 pl-4 pr-10 border-transparent focus:border-blue-500 focus:ring-0 resize-none text-sm max-h-24 custom-scrollbar"
                                    rows={1}
                                    style={{minHeight: '44px'}}
                                />
                            </div>

                            {newMessage.trim() ? (
                                <button onClick={() => handleSendMessage(newMessage, 'text')} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-500">
                                    <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                                </button>
                            ) : (
                                <button onClick={handleStartRecording} disabled={isSendingAudio} className="p-3 bg-gray-800 text-white rounded-xl border border-gray-700 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 transition-all active:scale-95 group">
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </button>
                            )}
                        </div>
                    )}
                    {(isUploading || isSendingAudio) && (
                        <div className="absolute inset-x-0 bottom-full bg-blue-600/90 text-white text-[10px] font-black uppercase tracking-widest text-center py-1">
                            Processing Transfer...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatWidget;

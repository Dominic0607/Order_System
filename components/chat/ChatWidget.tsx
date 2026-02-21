
import React, { useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { ChatMessage, User, BackendChatMessage } from '../../types';
import Spinner from '../common/Spinner';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { compressImage } from '../../utils/imageCompressor';
import { WEB_APP_URL, SOUND_URLS, NOTIFICATION_SOUNDS } from '../../constants';
import AudioPlayer from './AudioPlayer';
import { fileToBase64, convertGoogleDriveUrl } from '../../utils/fileUtils';
import UserAvatar from '../common/UserAvatar';
import ChatMembers from './ChatMembers';
import { requestNotificationPermission, sendSystemNotification } from '../../utils/notificationUtils';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
type ActiveTab = 'chat' | 'users';

const MemoizedAudioPlayer = React.memo(AudioPlayer);

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose }) => {
    const { currentUser, appData, previewImage, setUnreadCount, showNotification, advancedSettings } = useContext(AppContext);
    const CACHE_KEY = useMemo(() => currentUser ? `chatHistoryCache_${currentUser.UserName}` : null, [currentUser]);

    // Audio Recorder Hook
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef<any>(null);

    // Sound Refs - Lazy initialization to avoid creating Audio objects on every render
    const soundNotification = useRef<HTMLAudioElement | null>(null);
    const soundSent = useRef<HTMLAudioElement | null>(null);

    // Initialize audio objects once
    useEffect(() => {
        soundNotification.current = new Audio(SOUND_URLS.NOTIFICATION);
        soundSent.current = new Audio(SOUND_URLS.SENT);
    }, []);

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (!CACHE_KEY) return [];
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return (cached && cached !== "undefined") ? JSON.parse(cached) : [];
        } catch (e) { return []; }
    });

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSendingAudio, setIsSendingAudio] = useState(false);
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('chatMuted') === 'true');
    const [isHistoryLoading, setIsHistoryLoading] = useState(false); 
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    
    // Mention State
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentionList, setShowMentionList] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const isOpenRef = useRef(isOpen);
    
    const allUsersRef = useRef(allUsers);
    const currentUserRef = useRef(currentUser);
    const isMutedRef = useRef(isMuted);
    const lastNotifiedMessageIdRef = useRef<string | null>(null);

    useEffect(() => {
        const soundId = advancedSettings?.notificationSound || 'default';
        const soundObj = NOTIFICATION_SOUNDS.find(s => s.id === soundId) || NOTIFICATION_SOUNDS[0];
        const volume = advancedSettings?.notificationVolume ?? 1.0;

        if (soundNotification.current) {
            soundNotification.current.src = soundObj.url;
            soundNotification.current.volume = volume;
        }
        if (soundSent.current) {
            soundSent.current.volume = volume;
        }
    }, [advancedSettings?.notificationSound, advancedSettings?.notificationVolume]);

    useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // Initialize lastNotifiedMessageIdRef
    useEffect(() => {
        if (messages.length > 0 && !lastNotifiedMessageIdRef.current) {
            // Sort to ensure we get the latest
            const sorted = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            lastNotifiedMessageIdRef.current = sorted[sorted.length - 1].id;
        }
    }, []); // Run once on mount to set initial baseline

    // --- User Data Synchronization ---
    const syncUsers = useCallback(async () => {
        if (appData.users && appData.users.length > 0) {
            setAllUsers(appData.users);
            setIsUsersLoading(false);
            return;
        }
        setIsUsersLoading(true);
        try {
            const res = await fetch(`${WEB_APP_URL}/api/users`);
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                setAllUsers(json.data);
            }
        } catch (e) {
            console.warn("Fallback user fetch failed", e);
        } finally {
            setIsUsersLoading(false);
        }
    }, [appData.users]);

    useEffect(() => {
        syncUsers();
    }, [syncUsers]);

    // Reset Unread Count
    useEffect(() => {
        if (isOpen) setUnreadCount(0);
    }, [isOpen, setUnreadCount]);

    // Request Permission for System Notifications on Mount
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // --- Audio Workflow (FIXED: Extract ID from URL if needed) ---
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
            // 1. Get Blob from recorder
            const audioBlob = await stopRecording();
            if (!audioBlob) throw new Error("No audio captured");

            // 2. Convert to Base64 for Upload
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                const rawBase64 = base64data.split(',')[1];
                
                try {
                    // 3. Upload to /api/upload-image to get FileID
                    const uploadResponse = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileData: rawBase64,
                            fileName: `voice_${Date.now()}.webm`,
                            mimeType: 'audio/webm',
                            userName: currentUser?.UserName || 'unknown'
                        })
                    });

                    const uploadResult = await uploadResponse.json();
                    if (!uploadResponse.ok || uploadResult.status !== 'success') {
                        throw new Error(uploadResult.message || 'Audio upload failed');
                    }

                    // 4. Extract FileID
                    // Try getting direct ID first, otherwise extract from URL
                    let fileId = uploadResult.fileId || uploadResult.id; 
                    
                    if (!fileId && uploadResult.url) {
                        const match = uploadResult.url.match(/(?:d\/|id=)([^/?&]+)/);
                        if (match && match[1]) {
                            fileId = match[1];
                        }
                    }

                    if (!fileId) {
                        console.error("Could not determine FileID from upload result:", uploadResult);
                        throw new Error("Failed to get File ID");
                    }
                    
                    // 5. Send Message (Content = Duration, FileID = ID)
                    const durationContent = formatTime(recordingTime); 
                    
                    await handleSendMessage(durationContent, 'audio', fileId);

                } catch (err) {
                    console.error("Audio Upload Workflow Failed", err);
                    alert("ការបញ្ជូនសម្លេងបរាជ័យ (Failed to upload audio).");
                } finally {
                    setIsSendingAudio(false);
                    setRecordingTime(0);
                }
            };
        } catch (e) {
            console.error("Recording Error", e);
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
            if (CACHE_KEY) localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            return next;
        });
    }, [CACHE_KEY]);

    const transformBackendMessage = useCallback((msg: BackendChatMessage): ChatMessage => {
        const user = allUsersRef.current.find(u => u.UserName === msg.UserName);
        const normalizedType = (msg.MessageType || 'text').toLowerCase();
        
        let contentUrl = msg.Content;
        // Construct URL if it's audio and has FileID
        if (normalizedType === 'audio' && msg.FileID) {
             contentUrl = `${WEB_APP_URL}/api/chat/audio/${msg.FileID}`;
        } else if (normalizedType === 'image') {
             contentUrl = convertGoogleDriveUrl(msg.Content);
        }

        return {
            id: msg.Timestamp,
            user: msg.UserName,
            fullName: user?.FullName || msg.UserName,
            avatar: user?.ProfilePictureURL || '',
            content: contentUrl,
            timestamp: msg.Timestamp,
            type: normalizedType as 'text' | 'image' | 'audio',
            fileID: msg.FileID,
            isOptimistic: false
        };
    }, []); 

    const processNotifications = useCallback((sortedMessages: ChatMessage[]) => {
        if (sortedMessages.length === 0) return;

        // Determine new messages
        const lastId = lastNotifiedMessageIdRef.current;
        let newMessages: ChatMessage[] = [];

        if (!lastId) {
             // If first load, don't notify everything, just mark the last one
             lastNotifiedMessageIdRef.current = sortedMessages[sortedMessages.length - 1].id;
             return;
        }

        // Find messages strictly after lastId
        // Assuming sorted by timestamp asc
        const lastIndex = sortedMessages.findIndex(m => m.id === lastId);
        if (lastIndex !== -1) {
            newMessages = sortedMessages.slice(lastIndex + 1);
        } else {
             // If lastId not found (maybe cleared?), check timestamps? 
             // Or just check if there are messages with timestamp > lastId's timestamp (if we stored it)
             // Simpler: assume if ID mismatch, scan all for newer timestamp
             // Ideally ids are timestamps.
             newMessages = sortedMessages.filter(m => m.id > lastId);
        }

        newMessages.forEach(msg => {
            const isMe = msg.user === currentUserRef.current?.UserName;
            
            // Skip own messages
            if (isMe) return;

            // Global Notification Trigger
            const isNewOrder = msg.content && msg.content.includes('📢 NEW ORDER:');
            const isSystemAlert = msg.content && msg.content.includes('📢 SYSTEM_ALERT:');

            if (isNewOrder || isSystemAlert) {
                let alertMsg = msg.content;
                if (isNewOrder) alertMsg = msg.content.replace('📢 NEW ORDER:', '').trim();
                else if (isSystemAlert) alertMsg = msg.content.replace('📢 SYSTEM_ALERT:', '').trim();
                
                showNotification(alertMsg, 'success');
                
                if (!isMutedRef.current) {
                    soundNotification.current.currentTime = 0;
                    soundNotification.current.play().catch(e => console.warn("Audio play failed", e));
                }
                sendSystemNotification("ការកម្មង់ថ្មី 📦", alertMsg);
            } else {
                // Standard User Message
                const senderName = msg.fullName || msg.user;
                let contentPreview = msg.content;
                
                if (msg.type === 'image') contentPreview = '📷 Sent an image';
                else if (msg.type === 'audio') contentPreview = '🎤 Sent a voice message';
                
                showNotification(`${senderName}: ${contentPreview}`, 'info');
                
                if (document.hidden || !isOpenRef.current) {
                    sendSystemNotification(senderName, contentPreview);
                    if (!isOpenRef.current) setUnreadCount(p => p + 1);
                }

                if (!isMutedRef.current) {
                    soundNotification.current.currentTime = 0;
                    soundNotification.current.play().catch(() => {});
                }
            }
        });

        // Update Ref
        if (newMessages.length > 0) {
            lastNotifiedMessageIdRef.current = newMessages[newMessages.length - 1].id;
        }
    }, [showNotification, setUnreadCount]);

    const fetchHistory = useCallback(async () => {
        // if (!isOpenRef.current) return; // Allow fetching in background for notifications
        
        if (messages.length === 0 && isOpenRef.current) setIsHistoryLoading(true);
        
        try {
            const res = await fetch(`${WEB_APP_URL}/api/chat/messages`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const result = await res.json();
            if (result.status === 'success') {
                const history = result.data.map(transformBackendMessage);
                const sortedHistory = history.sort((a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                
                // Process Notifications
                processNotifications(sortedHistory);

                setAndCacheMessages(prev => {
                    // Optimization: Only update if length changed or last message different
                    if (prev.length === sortedHistory.length && prev.length > 0) {
                         const prevLast = prev[prev.length - 1];
                         const newLast = sortedHistory[sortedHistory.length - 1];
                         if (prevLast.id === newLast.id) return prev;
                    }
                    return sortedHistory;
                });
            }
        } catch (e) { 
            console.warn("Chat history service unavailable"); 
        } finally { 
            setIsHistoryLoading(false); 
        }
    }, [transformBackendMessage, setAndCacheMessages, messages.length, processNotifications]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    // WebSocket
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
                // Initial fetch on connect
                fetchHistory();
            };

            ws.onclose = () => {
                setConnectionStatus('disconnected');
                setTimeout(setupWs, 3000);
            };

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.action === 'new_message') {
                        const backendMsg = data.payload;
                        const msg = transformBackendMessage(backendMsg);
                        
                        // We use processNotifications here by constructing a list? 
                        // Or just let fetchHistory handle it via polling?
                        // Ideally we handle it immediately here.
                        
                        // Check if we already processed this ID (via polling)
                        if (lastNotifiedMessageIdRef.current && msg.id <= lastNotifiedMessageIdRef.current) {
                            // Already notified via polling
                        } else {
                            // Notify immediately
                            processNotifications([msg]);
                            // Note: processNotifications handles filtering 'isMe'
                        }

                        setAndCacheMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            
                            // Optimistic update handling
                            const optimisticIndex = prev.findIndex(m => 
                                m.isOptimistic && 
                                m.user === msg.user && 
                                m.type === msg.type
                            );
                            if (optimisticIndex !== -1) {
                                const newArr = [...prev];
                                newArr[optimisticIndex] = msg;
                                return newArr;
                            }
                            return [...prev, msg];
                        });
                        
                        if (isOpenRef.current) {
                             setTimeout(() => scrollToBottom('smooth'), 100);
                        }
                    }
                } catch (err) { console.error("WS Message Error", err); }
            };
        };
        setupWs();
        return () => { wsRef.current?.close(); };
    }, [processNotifications, transformBackendMessage, setAndCacheMessages]); // Added dependencies

    useEffect(() => {
        if (isOpen) fetchHistory();
    }, [isOpen, fetchHistory]);

    // Polling mechanism (Runs always now to ensure background notifications)
    useEffect(() => {
        const interval = setInterval(() => {
             fetchHistory();
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchHistory]);

    // Auto-Scroll Logic
    useEffect(() => {
        if (!isOpen || activeTab !== 'chat' || isHistoryLoading) return;
        const container = chatBodyRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // If we are near bottom, or history just finished loading (scrollTop is 0), or it's our message
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 250;
            const lastMessage = messages[messages.length - 1];
            const isMe = lastMessage?.user === currentUser?.UserName;
            
            // Scroll to bottom if:
            // 1. We just opened the chat (scrollTop is 0 and we have messages)
            // 2. We sent the message
            // 3. We are already at the bottom
            if (isMe || lastMessage?.isOptimistic || isAtBottom || scrollTop === 0) {
                // Use 'auto' for initial jump to bottom, 'smooth' for new messages
                const behavior = (scrollTop === 0 && !isMe) ? 'auto' : 'smooth';
                scrollToBottom(behavior);
            }
        } else {
            scrollToBottom('auto');
        }
    }, [messages, isOpen, activeTab, isHistoryLoading]);

    // Send Message Handler
    const handleSendMessage = async (content: string, type: 'text' | 'image' | 'audio', fileId?: string) => {
        if (!content && type === 'text') return;

        const sendingUser = currentUserRef.current;
        if (!sendingUser) {
            alert("Please login to send messages.");
            return;
        }

        const tempId = Date.now().toString();
        let displayContent = content;
        
        if (type === 'image' && !content.startsWith('http') && !content.startsWith('data:')) {
            displayContent = `data:image/jpeg;base64,${content}`;
        }
        
        const optimisticMsg: ChatMessage = {
            id: tempId,
            user: sendingUser.UserName || 'Unknown',
            fullName: sendingUser.FullName || 'Me',
            avatar: sendingUser.ProfilePictureURL || '',
            content: displayContent,
            timestamp: new Date().toISOString(),
            type: type,
            fileID: fileId,
            isOptimistic: true
        };

        setMessages(prev => [...prev, optimisticMsg]);
        if (type === 'text') setNewMessage('');

        const messageType = type.charAt(0).toUpperCase() + type.slice(1);

        try {
            const payload: any = { 
                userName: sendingUser.UserName, 
                UserName: sendingUser.UserName,
                type: messageType,
                MessageType: messageType,
                content: content.trim(),
                Content: content.trim()
            };

            if (fileId) {
                payload.FileID = fileId;
                payload.fileId = fileId;
            }

            const response = await fetch(`${WEB_APP_URL}/api/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            if (!isMuted) {
                soundSent.current.currentTime = 0;
                soundSent.current.play().catch(() => {});
            }
        } catch (e) {
            console.error("Send Error:", e);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            if (type === 'text') setNewMessage(content);
            alert("ការបញ្ជូនសារបរាជ័យ (Send Failed). Please try again.");
        }
    };

    const handleFileUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const compressed = await compressImage(file);
            const base64 = await fileToBase64(compressed);
            
            // Upload first
            const uploadResponse = await fetch(`${WEB_APP_URL}/api/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileData: base64,
                    fileName: `img_${Date.now()}.jpg`,
                    mimeType: 'image/jpeg',
                    userName: currentUser?.UserName || 'unknown'
                })
            });

            const uploadResult = await uploadResponse.json();
            if (!uploadResponse.ok || uploadResult.status !== 'success') {
                throw new Error(uploadResult.message || 'Image upload failed');
            }

            // Extract FileID
            let fileId = uploadResult.fileId || uploadResult.id;
            if (!fileId && uploadResult.url) {
                const match = uploadResult.url.match(/(?:d\/|id=)([^/?&]+)/);
                if (match && match[1]) fileId = match[1];
            }

            if (!fileId) throw new Error("Failed to get File ID");

            // Send Message with FileID
            await handleSendMessage(uploadResult.url, 'image', fileId); 

        } catch (e) {
            console.error("Image Upload Error:", e);
            alert("ការបញ្ជូនរូបភាពបរាជ័យ (Failed to upload image).");
        } finally { 
            setIsUploading(false); 
        }
    };

    // --- Mention Handling ---
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewMessage(val);

        // Detect if user is typing a mention (last word starts with @)
        const lastWord = val.split(/[\s\n]+/).pop();
        if (lastWord && lastWord.startsWith('@')) {
            setMentionQuery(lastWord.slice(1)); // Remove @
            setShowMentionList(true);
        } else {
            setShowMentionList(false);
        }
    };

    const insertMention = (username: string) => {
        const words = newMessage.split(/([\s\n]+)/);
        const lastWordIndex = words.length - 1;
        // Replace last word (the incomplete mention) with the full username
        words[lastWordIndex] = `@${username} `; 
        
        setNewMessage(words.join(''));
        setShowMentionList(false);
        setMentionQuery('');
        
        // Refocus input
        const textarea = document.querySelector('.chat-input-area textarea') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
    };

    const renderMessageContent = (content: string) => {
        // Split by spaces to find mentions but preserve newlines
        // A simple regex to find @words
        const parts = content.split(/(@[\w\u1780-\u17FF]+)/g); // Supports Khmer characters in names if needed
        
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const username = part.slice(1);
                // Check if it's a valid user (optional, but good for highlighting)
                const isValidUser = allUsers.some(u => u.UserName === username || u.FullName === username);
                
                if (isValidUser || part.length > 2) {
                    return (
                        <span key={i} className="text-blue-300 font-bold bg-blue-500/20 px-1 rounded-md mx-0.5">
                            {part}
                        </span>
                    );
                }
            }
            return <span key={i}>{part}</span>;
        });
    };

    const handleScroll = () => {
        if (chatBodyRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
            setShowScrollBottom(!isNearBottom);
        }
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
                        if (!newMuted) {
                            requestNotificationPermission().then(granted => {
                                if (granted) console.log("Notification permission granted via toggle");
                            });
                        }
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
                onScroll={handleScroll}
            >
                {activeTab === 'chat' ? (
                    <div className="chat-messages p-4 space-y-6 min-h-full pb-20">
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
                                const isSystemAlert = msg.content.includes('SYSTEM_ALERT') || msg.content.includes('NEW ORDER');
                                
                                return (
                                    <div key={msg.id + index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                                        {isSystemAlert ? (
                                            <div className="w-full flex justify-center my-2">
                                                <div className="bg-blue-900/40 border border-blue-500/30 rounded-xl px-4 py-2 text-[10px] font-bold text-blue-300 text-center shadow-lg">
                                                    {msg.content.replace('📢 SYSTEM_ALERT:', '').replace('📢 NEW ORDER:', '').trim()}
                                                </div>
                                            </div>
                                        ) : (
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
                                                    
                                                    {msg.type === 'text' && <p className="leading-relaxed text-sm whitespace-pre-wrap">{renderMessageContent(msg.content)}</p>}
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
                                        )}
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <ChatMembers users={allUsers} loading={isUsersLoading} onRefresh={syncUsers} />
                )}
            </div>

            {activeTab === 'chat' && showScrollBottom && (
                <button 
                    onClick={() => scrollToBottom('smooth')} 
                    className="absolute bottom-24 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition-all animate-bounce z-50 flex items-center justify-center w-10 h-10 border border-blue-400/30"
                    title="Scroll to bottom"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </button>
            )}

            {activeTab === 'chat' && (
                <div className="p-3 bg-gray-900 border-t border-gray-800 relative z-20">
                    {/* Mention Suggestions Popup */}
                    {showMentionList && (
                        <div className="absolute bottom-full left-4 mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-64 max-h-60 overflow-y-auto custom-scrollbar z-50 animate-fade-in-up flex flex-col">
                            <div className="p-2 sticky top-0 bg-gray-800/95 backdrop-blur border-b border-gray-700 z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suggested Members</p>
                            </div>
                            {allUsers
                                .filter(u => 
                                    (u.FullName?.toLowerCase().includes(mentionQuery.toLowerCase()) || 
                                    u.UserName?.toLowerCase().includes(mentionQuery.toLowerCase())) &&
                                    u.UserName !== currentUser?.UserName
                                )
                                .slice(0, 10)
                                .map(user => (
                                    <button
                                        key={user.UserID}
                                        onClick={() => insertMention(user.UserName)}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-white/5 transition-colors text-left group border-b border-gray-700/50 last:border-0"
                                    >
                                        <UserAvatar name={user.FullName} avatarUrl={user.ProfilePictureURL} size="sm" className="ring-1 ring-white/10" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-200 group-hover:text-blue-400 truncate">{user.FullName}</p>
                                            <p className="text-[10px] text-gray-500 truncate">@{user.UserName}</p>
                                        </div>
                                    </button>
                                ))
                            }
                            {allUsers.filter(u => u.FullName?.toLowerCase().includes(mentionQuery.toLowerCase()) || u.UserName?.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-[10px] uppercase tracking-wider">No matching members</div>
                            )}
                        </div>
                    )}

                    {isRecording ? (
                        <div className="flex items-center gap-3 bg-gray-800 p-2 rounded-2xl border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-fade-in relative overflow-hidden h-[60px]">
                             {/* Animated Waveform Background */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none gap-1 px-10">
                                {[...Array(20)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="w-1 bg-red-500 rounded-full animate-pulse" 
                                        style={{ 
                                            height: `${30 + Math.random() * 50}%`, 
                                            animationDuration: `${0.6 + Math.random() * 0.4}s`,
                                            animationDelay: `${Math.random() * 0.5}s`
                                        }} 
                                    />
                                ))}
                            </div>

                            {/* Blinking Dot */}
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-500/10 rounded-full relative z-10 ml-1">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                <div className="absolute w-2 h-2 bg-red-500 rounded-full"></div>
                            </div>
                            
                            {/* Timer */}
                            <div className="flex-grow flex flex-col justify-center relative z-10">
                                <p className="text-white font-black text-lg font-mono tracking-widest leading-none">{formatTime(recordingTime)}</p>
                                <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest mt-0.5">Recording...</p>
                            </div>
                            
                            {/* Controls */}
                            <div className="flex gap-2 relative z-10 mr-1">
                                <button 
                                    onClick={handleCancelRecording} 
                                    className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all active:scale-90"
                                    title="Cancel"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <button 
                                    onClick={handleStopAndSendAudio} 
                                    className="p-2.5 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-90 hover:scale-105"
                                    title="Send"
                                >
                                    <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-end gap-2 relative">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-xl transition-all flex-shrink-0 h-[44px] w-[44px] flex items-center justify-center" title="Attach Image">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                            
                            <div className="flex-grow relative">
                                <textarea 
                                    value={newMessage} 
                                    onChange={handleInputChange} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(newMessage, 'text');
                                        }
                                    }}
                                    placeholder="Type a message..." 
                                    className="w-full bg-gray-800 text-white rounded-2xl py-3 pl-4 pr-10 border-transparent focus:border-blue-500 focus:ring-0 resize-none text-sm custom-scrollbar"
                                    rows={1}
                                    style={{minHeight: '44px', maxHeight: '100px'}}
                                />
                            </div>

                            {newMessage.trim() ? (
                                <button onClick={() => handleSendMessage(newMessage, 'text')} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-500 flex-shrink-0 h-[44px] w-[44px] flex items-center justify-center">
                                    <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                                </button>
                            ) : (
                                <button onClick={handleStartRecording} disabled={isSendingAudio} className="p-3 bg-gray-800 text-white rounded-xl border border-gray-700 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all active:scale-95 group flex-shrink-0 h-[44px] w-[44px] flex items-center justify-center">
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

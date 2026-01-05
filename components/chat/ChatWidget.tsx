import React, { useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { ChatMessage, User, BackendChatMessage } from '../../types';
import Spinner from '../common/Spinner';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { compressImage } from '../../utils/imageCompressor';
import { WEB_APP_URL } from '../../constants';
import AudioPlayer from './AudioPlayer';
import { fileToBase64, convertGoogleDriveUrl } from '../../utils/fileUtils';
import UserAvatar from '../common/UserAvatar';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
type ActiveTab = 'chat' | 'users';

const notificationSound = new Audio('https://raw.githubusercontent.com/NateeDev/aistudio-template-order-management/main/public/assets/notification.mp3');
const MemoizedAudioPlayer = React.memo(AudioPlayer);

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose }) => {
    const { currentUser, appData, previewImage, setUnreadCount } = useContext(AppContext);
    const CACHE_KEY = useMemo(() => currentUser ? `chatHistoryCache_${currentUser.UserName}` : null, [currentUser]);

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (!CACHE_KEY) return [];
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return (cached && cached !== "undefined") ? JSON.parse(cached) : [];
        } catch (e) { return []; }
    });

    const [allUsers, setAllUsers] = useState<User[]>(appData.users || []);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('chatMuted') === 'true');
    const [isHistoryLoading, setIsHistoryLoading] = useState(messages.length === 0);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const isOpenRef = useRef(isOpen);
    isOpenRef.current = isOpen;

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${WEB_APP_URL}/api/users`);
            if (res.ok) {
                const result = await res.json();
                if (result.status === 'success') setAllUsers(result.data);
            }
        } catch (e) { console.error("User fetch failed", e); }
    };

    useEffect(() => { if (isOpen) fetchUsers(); }, [isOpen]);

    const setAndCacheMessages = useCallback((updater: React.SetStateAction<ChatMessage[]>) => {
        setMessages(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (CACHE_KEY) localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            return next;
        });
    }, [CACHE_KEY]);

    const transformBackendMessage = useCallback((msg: BackendChatMessage): ChatMessage => {
        const user = allUsers.find(u => u.UserName === msg.UserName);
        return {
            id: msg.Timestamp,
            user: msg.UserName,
            fullName: user?.FullName || msg.UserName,
            avatar: user?.ProfilePictureURL || '',
            content: msg.MessageType === 'image' ? convertGoogleDriveUrl(msg.Content) : 
                     msg.MessageType === 'audio' ? `${WEB_APP_URL}/api/chat/audio/${msg.FileID}` : msg.Content,
            timestamp: msg.Timestamp,
            type: msg.MessageType,
            fileID: msg.FileID
        };
    }, [allUsers]);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch(`${WEB_APP_URL}/api/chat/messages`);
            const result = await res.json();
            if (result.status === 'success') {
                const history = result.data.map(transformBackendMessage);
                setAndCacheMessages(history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
            }
        } catch (e) { console.error(e); } finally { setIsHistoryLoading(false); }
    }, [transformBackendMessage, setAndCacheMessages]);

    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState < 2) return;
        setConnectionStatus('connecting');
        const ws = new WebSocket(WEB_APP_URL.replace(/^http/, 'ws') + '/api/chat/ws');
        wsRef.current = ws;

        ws.onopen = () => { setConnectionStatus('connected'); setReconnectAttempts(0); fetchHistory(); };
        ws.onclose = () => { setConnectionStatus('disconnected'); if (isOpenRef.current) setReconnectAttempts(prev => prev + 1); };
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.action === 'new_message') {
                const msg = transformBackendMessage(data.payload);
                setAndCacheMessages(prev => [...prev, msg]);
                if (msg.user !== currentUser?.UserName && !isOpenRef.current) setUnreadCount(p => p + 1);
                if (msg.user !== currentUser?.UserName && !isMuted) notificationSound.play().catch(() => {});
            }
        };
    }, [transformBackendMessage, fetchHistory, currentUser, isMuted, setUnreadCount, setAndCacheMessages]);

    useEffect(() => { 
        if (isOpen) connectWebSocket(); 
        return () => wsRef.current?.close();
    }, [isOpen, connectWebSocket]);

    useEffect(() => {
        if (activeTab === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    const handleSendMessage = async (content: string, type: 'text' | 'image' | 'audio') => {
        if (!content.trim()) return;
        try {
            await fetch(`${WEB_APP_URL}/api/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: currentUser?.UserName, type, content: content.trim() })
            });
            if (type === 'text') setNewMessage('');
        } catch (e) { alert("បណ្តាញមានបញ្ហា"); }
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
                <div className="title-group">
                    <div className={`connection-status ${connectionStatus === 'connected' ? 'connected' : 'connecting'}`}></div>
                    <h3>ជជែកកំសាន្ត</h3>
                </div>
                <div className="controls">
                    <button onClick={() => setIsMuted(!isMuted)}>{isMuted ? '🔇' : '🔔'}</button>
                    <button onClick={onClose}>✕</button>
                </div>
            </div>
            <div className="chat-tabs">
                <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'active' : ''}>ជជែក</button>
                <button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'active' : ''}>អ្នកប្រើប្រាស់</button>
            </div>
            <div className="chat-body custom-scrollbar">
                {activeTab === 'chat' ? (
                    <div className="chat-messages p-4 space-y-4">
                        {isHistoryLoading ? <Spinner /> : messages.map(msg => {
                            const isMe = msg.user === currentUser?.UserName;
                            const user = allUsers.find(u => u.UserName === msg.user);
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[80%] gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <UserAvatar avatarUrl={user?.ProfilePictureURL || msg.avatar} name={user?.FullName || msg.fullName} size="sm" />
                                        <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                                            {!isMe && <p className="text-[10px] font-black text-blue-400 mb-1">{user?.FullName || msg.fullName}</p>}
                                            {msg.type === 'text' && <p className="leading-relaxed">{msg.content}</p>}
                                            {msg.type === 'image' && <img src={msg.content} className="rounded-lg max-w-full cursor-pointer" onClick={() => previewImage(msg.content)} />}
                                            {msg.type === 'audio' && <MemoizedAudioPlayer src={msg.content} />}
                                            <p className="text-[9px] mt-1 opacity-50 text-right">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {allUsers.map(u => (
                            <div key={u.UserName} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800 transition-colors">
                                <UserAvatar avatarUrl={u.ProfilePictureURL} name={u.FullName} size="md" />
                                <div><p className="text-sm font-bold text-white">{u.FullName}</p><p className="text-xs text-gray-500">@{u.UserName}</p></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {activeTab === 'chat' && (
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-400 transition-colors">📎</button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage(newMessage, 'text')} placeholder="វាយសារ..." className="form-input flex-grow !bg-gray-800" />
                    <button onClick={() => handleSendMessage(newMessage, 'text')} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
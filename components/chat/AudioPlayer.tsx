
import React, { useState, useRef, useEffect } from 'react';
import Spinner from '../common/Spinner';

interface AudioPlayerProps {
    src: string;
    isMe?: boolean; // To style based on sender
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isMe = false }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Simulated waveform bars
    const [bars] = useState(() => Array.from({ length: 20 }, () => Math.random() * 0.5 + 0.3));

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onReady = () => {
            if (audio.duration && isFinite(audio.duration)) {
                setDuration(audio.duration);
                setIsReady(true);
                setError(null);
            }
        };

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
        const onError = () => {
            console.error("Audio Error", audio.error);
            setError("Error playing audio");
            setIsReady(false);
        };

        audio.addEventListener('loadedmetadata', onReady);
        audio.addEventListener('canplay', onReady); // Fallback if metadata loads fast
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        // Reset state on src change
        setIsPlaying(false);
        setIsReady(false);
        setCurrentTime(0);
        audio.load();

        return () => {
            audio.removeEventListener('loadedmetadata', onReady);
            audio.removeEventListener('canplay', onReady);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
        };
    }, [src]);

    const togglePlayPause = () => {
        if (!isReady || !audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            // Pause all other audios
            document.querySelectorAll('audio').forEach(el => {
                if (el !== audioRef.current) {
                    el.pause();
                    // We can't easily update other components' state from here without a context, 
                    // but standard HTML audio behavior handles single source well.
                }
            });
            audioRef.current.play().catch(e => console.error("Play failed", e));
            setIsPlaying(true);
        }
    };

    const formatTime = (t: number) => {
        if (!isFinite(t) || t < 0) return '0:00';
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (error) return <div className="text-[10px] text-red-300 bg-red-900/20 px-2 py-1 rounded">Audio Unavailable</div>;

    return (
        <div className={`flex items-center gap-3 p-1 rounded-full min-w-[200px] transition-all ${isMe ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            <audio ref={audioRef} src={src} preload="metadata" />
            
            <button 
                onClick={togglePlayPause} 
                disabled={!isReady}
                className={`w-8 h-8 flex items-center justify-center rounded-full shadow-md transition-all active:scale-90 flex-shrink-0 ${isMe ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
            >
                {!isReady ? <Spinner size="sm" /> : isPlaying ? (
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                    <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>

            <div className="flex flex-col flex-grow min-w-0 gap-1">
                {/* Visual Waveform */}
                <div className="flex items-center gap-[2px] h-4 w-full">
                    {bars.map((height, i) => {
                        const active = (i / bars.length) < (currentTime / (duration || 1));
                        return (
                            <div 
                                key={i} 
                                className={`w-1 rounded-full transition-all duration-100 ${active ? (isMe ? 'bg-blue-200' : 'bg-blue-500') : (isMe ? 'bg-blue-800' : 'bg-gray-600')}`}
                                style={{ 
                                    height: isPlaying ? `${Math.max(20, height * 100 * (Math.random() * 0.5 + 0.8))}%` : `${height * 100}%`,
                                    opacity: active ? 1 : 0.5 
                                }}
                            />
                        );
                    })}
                </div>
                <div className={`text-[9px] font-mono font-bold text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                    {isPlaying ? formatTime(currentTime) : formatTime(duration)}
                </div>
            </div>
        </div>
    );
};

export default AudioPlayer;

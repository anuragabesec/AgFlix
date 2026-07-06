import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Send, Users, ArrowLeft, Loader2, Play, Pause, Maximize } from 'lucide-react';
import Hls from 'hls.js';
import api from '../utils/api';
import { useAppSelector } from '../store';

interface Movie {
  _id: string;
  title: string;
  videoUrl: string;
  description: string;
}

interface ChatMessage {
  text: string;
  username: string;
  userId: string;
  timestamp: string;
  isSystem?: boolean;
}

export const WatchParty: React.FC = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Socket state
  const socketRef = useRef<Socket | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [activeUsersCount, setActiveUsersCount] = useState(1);

  // Sync Guard flags to prevent recursive socket echo loops
  const isSyncingRef = useRef(false);

  const [reactions, setReactions] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const reactionIdRef = useRef(0);

  // Player controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const username = user?.name || 'Guest User';
  const userId = user?.id || 'anonymous';

  useEffect(() => {
    const fetchPartyContext = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/movies/watch-party/${code}`);
        if (res.data?.success) {
          setMovie(res.data.party.movieId);
          setHostName(res.data.party.hostId.name);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Watch Party room does not exist or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchPartyContext();
  }, [code]);

  useEffect(() => {
    if (!movie || !code) return;

    // Connect to WebSocket namespace
    const socketUrl = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
    });
    socketRef.current = socket;

    // 1. Emit Join Party
    socket.emit('join-party', {
      partyCode: code,
      username,
      userId,
    });

    // Append initial locally rendered notice
    setChatLog([{
      text: `Connected to watch party code ${code}`,
      username: 'SYSTEM',
      userId: 'system',
      timestamp: new Date().toISOString(),
      isSystem: true,
    }]);

    // 2. Setup Socket Listeners
    socket.on('participant-joined', ({ username: joinedUser }) => {
      setChatLog((prev) => [
        ...prev,
        {
          text: `${joinedUser} joined the watch party`,
          username: 'SYSTEM',
          userId: 'system',
          timestamp: new Date().toISOString(),
          isSystem: true,
        },
      ]);
      setActiveUsersCount((prev) => prev + 1);
    });

    socket.on('participant-left', ({ username: leftUser }) => {
      setChatLog((prev) => [
        ...prev,
        {
          text: `${leftUser} left the watch party`,
          username: 'SYSTEM',
          userId: 'system',
          timestamp: new Date().toISOString(),
          isSystem: true,
        },
      ]);
      setActiveUsersCount((prev) => Math.max(1, prev - 1));
    });

    socket.on('party-message', (payload: ChatMessage) => {
      setChatLog((prev) => [...prev, payload]);
    });

    socket.on('party-reaction', ({ emoji }) => {
      reactionIdRef.current += 1;
      const newReaction = {
        id: reactionIdRef.current,
        emoji,
        left: Math.random() * 80 + 10,
      };
      setReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 1500);
    });

    socket.on('party-play', ({ currentTime: syncTime }) => {
      const video = videoRef.current;
      if (!video) return;

      isSyncingRef.current = true;
      video.currentTime = syncTime;
      video.play().finally(() => {
        isSyncingRef.current = false;
      });
      setIsPlaying(true);
    });

    socket.on('party-pause', () => {
      const video = videoRef.current;
      if (!video) return;

      isSyncingRef.current = true;
      video.pause();
      isSyncingRef.current = false;
      setIsPlaying(false);
    });

    socket.on('party-seek', ({ currentTime: syncTime }) => {
      const video = videoRef.current;
      if (!video) return;

      isSyncingRef.current = true;
      video.currentTime = syncTime;
      isSyncingRef.current = false;
      setCurrentTime(syncTime);
    });

    return () => {
      socket.emit('leave-party', { partyCode: code, username, userId });
      socket.disconnect();
    };
  }, [movie, code, username, userId]);

  useEffect(() => {
    // Scroll chat to bottom
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Bind video element with source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movie) return;

    const currentHost = window.location.hostname;
    const streamUrl = movie.videoUrl.startsWith('http')
      ? movie.videoUrl
      : `http://${currentHost}:5000${movie.videoUrl}`;

    let hls: Hls | null = null;

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.load();
      }
    } else {
      video.src = streamUrl;
      video.load();
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [movie]);

  // Handle Video Player Events & Emit Sync Packets
  const handlePlay = () => {
    setIsPlaying(true);
    if (isSyncingRef.current) return;
    socketRef.current?.emit('party-play', {
      partyCode: code,
      currentTime: videoRef.current?.currentTime || 0,
    });
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (isSyncingRef.current) return;
    socketRef.current?.emit('party-pause', {
      partyCode: code,
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);

    if (isSyncingRef.current) return;
    socketRef.current?.emit('party-seek', {
      partyCode: code,
      currentTime: newTime,
    });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !socketRef.current) return;

    socketRef.current.emit('party-message', {
      partyCode: code,
      text: message.trim(),
      username,
      userId,
    });

    setMessage('');
  };

  const sendReaction = (emoji: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('party-reaction', {
      partyCode: code,
      emoji,
      username,
    });
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (timeSeconds: number) => {
    if (isNaN(timeSeconds)) return '0:00';
    const mins = Math.floor(timeSeconds / 60);
    const secs = Math.floor(timeSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <span className="text-white text-sm font-semibold">Configuring watch party stream room...</span>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center text-center px-4">
        <p className="text-brand-accent mb-4 text-lg font-bold">{error || 'Watch Party cannot be loaded'}</p>
        <button
          onClick={() => navigate('/home')}
          className="px-6 py-3 rounded-lg bg-brand-surface border border-white/10 text-white font-bold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-brand-dark flex flex-col md:flex-row overflow-hidden text-white">
      {/* LEFT PORTION: THE STREAM SCREEN */}
      <div className="flex-grow h-[60vh] md:h-full flex flex-col justify-between relative bg-black">
        {/* Top Floating back header */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-20">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-brand-textMuted hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" /> Leave Room
          </button>
          <span className="text-sm font-black truncate max-w-[50%]">{movie.title} &bull; Room {code}</span>
          <div className="flex items-center gap-1.5 text-xs text-brand-secondary font-black bg-brand-secondary/10 px-2.5 py-1 rounded-full border border-brand-secondary/20">
            <Users className="w-3.5 h-3.5" /> {activeUsersCount} Online
          </div>
        </div>

        {/* The video frame */}
        <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
          <video
            ref={videoRef}
            onClick={togglePlay}
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            crossOrigin="anonymous"
            controls
            className="w-full h-full object-contain"
          />

          {/* Floating Reactions overlay */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {reactions.map((r) => (
              <span
                key={r.id}
                className="absolute bottom-16 text-4xl floating-reaction"
                style={{ left: `${r.left}%` }}
              >
                {r.emoji}
              </span>
            ))}
          </div>

          {/* Simple overlay controller */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-10 flex flex-col gap-3 z-10">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-white/80">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-grow h-1 accent-brand-primary rounded cursor-pointer bg-white/20"
              />
              <span className="text-xs font-semibold text-white/80">{formatTime(duration)}</span>
            </div>

            <div className="flex justify-between items-center text-white/80">
              <button onClick={togglePlay} className="hover:text-white transition-colors">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <button onClick={toggleFullscreen} className="hover:text-white transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PORTION: WATCH PARTY CHAT DRAWER */}
      <div className="w-full md:w-80 h-[40vh] md:h-full border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-between bg-brand-surface">
        
        {/* Chat Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-4">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">Watch Party Chat</span>
          <span className="text-[10px] text-brand-textMuted font-bold">Host: {hostName}</span>
        </div>

        {/* Scrollable messages log */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3.5">
          {chatLog.map((chat, idx) => {
            if (chat.isSystem) {
              return (
                <div key={idx} className="text-center">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-[9px] font-bold text-brand-primary uppercase">
                    {chat.text}
                  </span>
                </div>
              );
            }

            const isMe = chat.userId === userId;

            return (
              <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-brand-textMuted font-bold mb-0.5">
                  {chat.username} {chat.username === hostName && '👑'}
                </span>
                <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${
                  isMe ? 'bg-brand-primary text-white' : 'bg-brand-surfaceMuted border border-white/5 text-white/90'
                }`}>
                  {chat.text}
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Reaction Emoji Toolbar */}
        <div className="px-3 py-2.5 border-t border-white/5 bg-brand-surfaceMuted/50 flex justify-around items-center gap-1.5 z-10">
          {['❤️', '😂', '👏', '😮', '🔥'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => sendReaction(emoji)}
              className="text-lg hover:scale-125 hover:rotate-12 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Message Input form */}
        <form onSubmit={handleSendMessage} className="h-16 border-t border-white/5 p-3 flex gap-2">
          <input
            type="text"
            placeholder="Type message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-grow rounded-lg bg-brand-surfaceMuted border border-white/5 px-3 text-xs outline-none text-white focus:border-brand-primary transition-colors"
          />
          <button
            type="submit"
            className="p-3 rounded-lg bg-brand-primary hover:bg-brand-primaryHover text-white transition-colors flex items-center justify-center shadow-neon"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 1; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-200px) scale(1.3); opacity: 0; }
        }
        .floating-reaction {
          animation: floatUp 1.5s forwards ease-out;
        }
      `}</style>
    </div>
  );
};

export default WatchParty;

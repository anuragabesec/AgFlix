import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft, RotateCcw, FastForward, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import api from '../utils/api';

interface Movie {
  _id: string;
  title: string;
  videoUrl: string;
}

export const Player: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom Controls States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/movies/${id}`);
        if (res.data?.success) {
          setMovie(res.data.movie);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load movie stream.');
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

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
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback for Safari/iOS
        video.src = streamUrl;
        video.load();
      }
    } else {
      // Direct MP4 fallback stream
      video.src = streamUrl;
      video.load(); // Force browser to initialize local stream resources
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [movie]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch((err) => {
        console.error("Playback error:", err);
      });
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

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Number(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = Number(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && video.volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  };

  const handleSpeedChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
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
    const hrs = Math.floor(timeSeconds / 3600);
    const mins = Math.floor((timeSeconds % 3600) / 60);
    const secs = Math.floor(timeSeconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <span className="text-white text-sm">Buffering movie stream...</span>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center text-center px-4">
        <p className="text-brand-accent mb-4 text-lg font-bold">{error || 'Stream cannot be loaded'}</p>
        <button
          onClick={() => navigate('/home')}
          className="px-6 py-3 rounded-lg bg-brand-surface border border-white/10 hover:border-white/20 text-white font-bold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none"
    >
      {/* HTML5 video element */}
      <video
        ref={videoRef}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        crossOrigin="anonymous"
        controls
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* CUSTOM OVERLAY CONTROLS */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 flex flex-col justify-between p-6 z-10 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors flex items-center justify-center"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-black text-white filter drop-shadow-md">{movie.title}</span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* MIDDLE ACTIONS: DOUBLE CLICK SEEK SIMULATOR BUTTONS */}
        <div className="flex items-center justify-center gap-12 text-white/70">
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime -= 10;
            }}
            className="p-4 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            title="Rewind 10s"
          >
            <RotateCcw className="w-8 h-8" />
          </button>

          <button
            onClick={togglePlay}
            className="p-6 rounded-full bg-brand-primary text-white hover:scale-105 transition-transform shadow-neon"
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
          </button>

          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime += 10;
            }}
            className="p-4 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            title="Forward 10s"
          >
            <FastForward className="w-8 h-8" />
          </button>
        </div>

        {/* BOTTOM PANEL CONTROLS */}
        <div className="space-y-4">
          
          {/* TIMELINE SLIDER */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-white/95">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="flex-grow h-1.5 accent-brand-primary rounded-lg cursor-pointer bg-white/20"
            />
            <span className="text-xs font-bold text-white/95">{formatTime(duration)}</span>
          </div>

          <div className="flex justify-between items-center">
            {/* Volume controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMute}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 md:w-24 h-1 accent-white rounded-lg cursor-pointer bg-white/20"
              />
            </div>

            {/* Playback speed & full screen */}
            <div className="flex items-center gap-5">
              <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs font-bold">
                {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      playbackRate === rate ? 'bg-brand-primary text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {rate === 1.0 ? 'Normal' : `${rate}x`}
                  </button>
                ))}
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Player;

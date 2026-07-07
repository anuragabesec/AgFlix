import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, ThumbsUp, Settings, Globe, MessageSquare, Bot, X, Send, Plus, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import SearchBar from '../components/SearchBar';

interface Movie {
  _id: string;
  title: string;
  description: string;
  releaseYear: number;
  genres: string[];
  ageRating: string;
  duration: number;
  thumbnail: string;
  poster: string;
  videoUrl: string;
  cast: string[];
  likes: number;
  isOriginal: boolean;
  isTrending: boolean;
  featured: boolean;
}

interface Profile {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
}

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const [featured, setFeatured] = useState<Movie | null>(null);
  const [originals, setOriginals] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Watch Party States
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [selectedMovieForParty, setSelectedMovieForParty] = useState<Movie | null>(null);
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [partyLoading, setPartyLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // AI Chatbot States
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiHistory, setAiHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiChatBottomRef = React.useRef<HTMLDivElement>(null);

  // Watchlist & Favorites & Playback Progress States
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<{ id: string; currentTime: number; duration: number; movie: Movie }[]>([]);

  // Auto-scroll AI chat
  useEffect(() => {
    if (showAiChat) {
      aiChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiHistory, showAiChat]);

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim() || aiLoading) return;

    const userText = aiMessage.trim();
    setAiMessage('');
    setAiHistory((prev) => [...prev, { role: 'user', text: userText }]);
    setAiLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: userText,
        history: aiHistory,
      });

      if (res.data?.success) {
        setAiHistory((prev) => [...prev, { role: 'model', text: res.data.reply }]);
      }
    } catch (err: any) {
      console.error('AI chat failed:', err);
      setAiHistory((prev) => [
        ...prev,
        { role: 'model', text: 'Sorry, I am having trouble connecting to my brain right now. Please try again later.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const activeProfileId = localStorage.getItem('agflix_active_profile_id');

  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
    if (avatar.startsWith('http')) return avatar;
    
    const mocks: Record<string, string> = {
      'avatar_purple': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      'avatar_cyan': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
      'avatar_pink': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      'avatar_lime': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    };
    return mocks[avatar] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
  };

  useEffect(() => {
    // 1. Force profile selection redirect if missing
    if (!activeProfileId) {
      navigate('/profiles');
      return;
    }

    const loadHomeData = async () => {
      setLoading(true);
      try {
        // Fetch current profile context
        const profileRes = await api.get('/profiles');
        if (profileRes.data?.success) {
          const current = profileRes.data.profiles.find((p: Profile) => p.id === activeProfileId);
          if (!current) {
            navigate('/profiles');
            return;
          }
          setProfile(current);
        }

        // Fetch movies database
        const moviesRes = await api.get('/movies');
        if (moviesRes.data?.success) {
          const moviesList: Movie[] = moviesRes.data.movies;
          setAllMovies(moviesList);

          // Categorize local records
          const featuredMovie = moviesList.find((m) => m.featured) || moviesList[0];
          setFeatured(featuredMovie || null);

          setOriginals(moviesList.filter((m) => m.isOriginal));
          setTrending(moviesList.filter((m) => m.isTrending));
        }

        // Fetch watchlist & favorites
        const myListRes = await api.get('/movies/my-list');
        if (myListRes.data?.success) {
          setWatchlist(myListRes.data.watchlist || []);
          setFavorites(myListRes.data.favorites || []);
        }

        // Fetch continue watching progress
        const continueRes = await api.get('/movies/continue-watching');
        if (continueRes.data?.success) {
          setContinueWatching(continueRes.data.progress || []);
        }
      } catch (err: any) {
        setError('Failed to fetch media catalog. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, [activeProfileId, navigate]);

  const handleToggleWatchlist = async (movieId: string) => {
    try {
      const res = await api.post(`/movies/${movieId}/watchlist`);
      if (res.data?.success) {
        const myListRes = await api.get('/movies/my-list');
        if (myListRes.data?.success) {
          setWatchlist(myListRes.data.watchlist || []);
        }
      }
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
    }
  };

  const handleToggleFavorite = async (movieId: string) => {
    try {
      const res = await api.post(`/movies/${movieId}/favorite`);
      if (res.data?.success) {
        const myListRes = await api.get('/movies/my-list');
        if (myListRes.data?.success) {
          setFavorites(myListRes.data.favorites || []);
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get(`/movies?search=${encodeURIComponent(query)}`);
      if (res.data?.success) {
        setSearchResults(res.data.movies);
      }
    } catch (err) {
      console.error('Failed to perform catalog search');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLikeMovie = async (movieId: string, isFeaturedCard = false) => {
    try {
      const res = await api.post(`/movies/${movieId}/like`);
      if (res.data?.success) {
        // Update local views state
        if (isFeaturedCard && featured) {
          setFeatured({ ...featured, likes: res.data.likes });
        }
        setAllMovies((prev) =>
          prev.map((m) => (m._id === movieId ? { ...m, likes: res.data.likes } : m))
        );
      }
    } catch (err) {}
  };

  const handleCreateWatchParty = async (movie: Movie) => {
    setPartyLoading(true);
    setPartyCode(null);
    try {
      const res = await api.post('/movies/watch-party', { movieId: movie._id });
      if (res.data?.success) {
        setPartyCode(res.data.partyCode);
        setSelectedMovieForParty(movie);
        setShowPartyModal(true);
      }
    } catch (err) {
      alert('Failed to generate watch party room.');
    } finally {
      setPartyLoading(false);
    }
  };

  const handleJoinWatchParty = () => {
    if (!joinCode.trim()) return;
    navigate(`/watch-party/${joinCode.trim().toUpperCase()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-brand-textMuted text-sm font-semibold">Opening Cinematic Catalog...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center text-center px-4">
        <p className="text-brand-accent mb-4 text-lg font-bold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-lg bg-brand-surface border border-white/10 text-white font-bold"
        >
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark pb-24 text-white relative">
      
      {/* Header bar */}
      <header className="fixed top-0 inset-x-0 h-20 bg-gradient-to-b from-brand-dark to-transparent flex items-center justify-between px-8 z-30 transition-all duration-300 hover:bg-brand-dark/95">
        <div className="flex items-center gap-10">
          <span 
            onClick={() => navigate('/')}
            className={`text-3xl font-black tracking-wider bg-clip-text text-transparent cursor-pointer bg-gradient-to-r ${
              profile?.isKids 
                ? 'from-amber-400 via-orange-500 to-yellow-300' 
                : 'from-brand-primary via-brand-secondary to-brand-accent'
            }`}
          >
            AgFlix {profile?.isKids && 'Kids 🎈'}
          </span>
          <nav className="hidden md:flex gap-6 text-sm font-bold text-brand-textMuted">
            <span className="text-white cursor-pointer" onClick={() => handleSearch('')}>Home</span>
            <span className="hover:text-white transition-colors cursor-pointer" onClick={() => navigate('/plans')}>Upgrade Plan</span>
          </nav>
        </div>

        {/* Profile and Settings actions */}
        <div className="flex items-center gap-5">
          {/* Debounced Search Input */}
          <SearchBar onSearch={handleSearch} />

          {/* Join Party input */}
          <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs">
            <input
              type="text"
              placeholder="Enter Party Code..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="bg-transparent outline-none pr-2 uppercase text-center w-28 text-white font-bold"
            />
            <button
              onClick={handleJoinWatchParty}
              className="bg-brand-primary px-3 py-1 rounded-full text-[10px] font-bold hover:bg-brand-primaryHover transition-colors"
            >
              JOIN
            </button>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-brand-textMuted hover:text-white transition-all"
            title="Account Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => navigate('/profiles')}
            className="flex items-center gap-2 hover:opacity-90"
          >
            <img
              src={getAvatarUrl(profile?.avatar)}
              alt="Profile"
              className="w-9 h-9 rounded-md object-cover border border-brand-primary/40 shadow-neon shadow-brand-primary/10"
            />
            <span className="hidden md:inline text-sm font-bold">{profile?.name}</span>
          </button>
        </div>
      </header>

      {/* RENDER DYNAMIC SEARCH VIEW IF QUERY POPULATED */}
      {searchQuery ? (
        <section className="px-8 md:px-16 pt-28 min-h-[70vh] z-10 relative">
          <div className="mb-8">
            <h2 className="text-xl md:text-3xl font-extrabold text-white">Search Results for "{searchQuery}"</h2>
            <p className="text-xs text-brand-textMuted mt-1">Showing relevance scored matches from catalog index.</p>
          </div>

          {searchLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {searchResults.map((movie) => (
                <div
                  key={movie._id}
                  className="rounded-xl overflow-hidden glass-card border border-white/5 group hover:border-brand-primary/40 transition-all duration-300 relative"
                >
                  <div className="relative h-36 w-full overflow-hidden">
                    <img
                      src={movie.thumbnail}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-brand-dark/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-300 z-10">
                      <button
                        onClick={() => navigate(`/watch/${movie._id}`)}
                        className="p-3 rounded-full bg-white text-brand-dark hover:scale-110 transition-transform"
                        title="Play"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={() => handleCreateWatchParty(movie)}
                        className="p-3 rounded-full bg-brand-primary text-white hover:scale-110 transition-transform shadow-neon"
                        title="Party"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleLikeMovie(movie._id)}
                        className="p-3 rounded-full bg-brand-surface border border-white/10 hover:scale-110 transition-transform text-white"
                        title="Like"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="font-bold text-sm truncate text-white">{movie.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-brand-textMuted mt-1 font-semibold">
                      <span className="text-brand-secondary">{movie.releaseYear}</span>
                      <span className="px-1 py-0.2 rounded border border-white/15 scale-90">{movie.ageRating}</span>
                      <span>{movie.duration}m</span>
                    </div>
                    <p className="text-[10px] text-brand-textMuted mt-1.5 truncate">
                      {movie.genres.join(' | ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-brand-surfaceMuted/20 border border-white/5 rounded-2xl">
              <p className="text-brand-textMuted text-sm">No titles match your query. Try searching for genres (e.g. Sci-Fi) or other key terms.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* FEATURED BANNER */}
          {featured && (
            <section className="relative w-full h-[85vh] flex items-center justify-start px-8 md:px-16 overflow-hidden">
              {/* Cover Poster */}
              <div className="absolute inset-0 z-0">
                <img
                  src={featured.poster}
                  alt={featured.title}
                  className="w-full h-full object-cover filter brightness-[0.45]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-brand-dark to-transparent" />
              </div>

              {/* Banner Meta details */}
              <div className="max-w-2xl z-10 relative pt-20">
                {featured.isOriginal && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-brand-primary/20 border border-brand-primary/30 text-[10px] font-black tracking-wider text-brand-primary uppercase mb-4">
                    <Globe className="w-3 h-3" /> AgFlix Original Series
                  </span>
                )}
                <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight filter drop-shadow-md">
                  {featured.title}
                </h1>
                <div className="flex items-center gap-4 text-xs md:text-sm text-brand-textMuted mb-6 font-bold">
                  <span className="text-brand-secondary">{featured.releaseYear}</span>
                  <span className="px-1.5 py-0.5 rounded border border-white/20 text-[10px] uppercase">{featured.ageRating}</span>
                  <span>{featured.duration} mins</span>
                  <span className="text-white/80">{featured.genres.join(' &bull; ')}</span>
                </div>
                <p className="text-sm md:text-base text-brand-textMuted leading-relaxed mb-8">
                  {featured.description}
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate(`/watch/${featured._id}`)}
                    className="px-8 py-3.5 rounded-lg bg-white hover:bg-white/90 text-brand-dark font-black text-sm transition-all flex items-center gap-2.5 shadow-lg"
                  >
                    <Play className="w-5 h-5 fill-current" /> Play
                  </button>
                  <button
                    onClick={() => handleCreateWatchParty(featured)}
                    disabled={partyLoading}
                    className="px-6 py-3.5 rounded-lg bg-brand-surfaceMuted border border-white/10 hover:border-brand-primary/30 text-white font-bold text-sm transition-all flex items-center gap-2.5"
                  >
                    <Users className="w-5 h-5" /> Host Watch Party
                  </button>
                  <button
                    onClick={() => handleLikeMovie(featured._id, true)}
                    className="p-3.5 rounded-lg bg-brand-surfaceMuted border border-white/10 hover:bg-white/15 text-white transition-colors"
                    title="Like film"
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* CATALOG ROWS */}
          <div className="px-8 md:px-16 mt-6 space-y-12">
            {/* ROW 0: CONTINUE WATCHING */}
            {continueWatching.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl md:text-2xl font-black tracking-wide text-brand-secondary">Continue Watching</h2>
                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide scroll-smooth">
                  {continueWatching.map((item) => (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-64 rounded-xl overflow-hidden glass-card border border-white/5 group hover:border-brand-primary/40 transition-all duration-300 relative"
                    >
                      <div className="relative h-36 w-full overflow-hidden">
                        <img
                          src={item.movie.thumbnail}
                          alt={item.movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-brand-dark/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-300 z-10">
                          <button
                            onClick={() => navigate(`/watch/${item.movie._id}`)}
                            className="p-3 rounded-full bg-white text-brand-dark hover:scale-110 transition-transform"
                            title="Resume Watching"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                          <div 
                            className="h-full bg-brand-secondary shadow-neon-cyan transition-all duration-300"
                            style={{ width: `${(item.currentTime / item.duration) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4">
                        <h4 className="font-bold text-sm truncate text-white">{item.movie.title}</h4>
                        <span className="text-[10px] text-brand-textMuted mt-1 block">
                          Resumes at {Math.floor(item.currentTime / 60)}m {item.currentTime % 60}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ROW 0.5: MY WATCHLIST */}
            {watchlist.length > 0 && (
              <MovieRow
                title="My Watchlist"
                movies={watchlist}
                watchlistIds={watchlist.map(m => m._id)}
                favoritesIds={favorites.map(m => m._id)}
                onPlay={(id) => navigate(`/watch/${id}`)}
                onHostParty={handleCreateWatchParty}
                onToggleWatchlist={handleToggleWatchlist}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* ROW 1: ORIGINALS */}
            {originals.length > 0 && (
              <MovieRow
                title="AgFlix Original Series"
                movies={originals}
                watchlistIds={watchlist.map(m => m._id)}
                favoritesIds={favorites.map(m => m._id)}
                onPlay={(id) => navigate(`/watch/${id}`)}
                onHostParty={handleCreateWatchParty}
                onToggleWatchlist={handleToggleWatchlist}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* ROW 2: TRENDING */}
            {trending.length > 0 && (
              <MovieRow
                title="Trending Now"
                movies={trending}
                watchlistIds={watchlist.map(m => m._id)}
                favoritesIds={favorites.map(m => m._id)}
                onPlay={(id) => navigate(`/watch/${id}`)}
                onHostParty={handleCreateWatchParty}
                onToggleWatchlist={handleToggleWatchlist}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* ROW 3: ALL MOVIES */}
            {allMovies.length > 0 && (
              <MovieRow
                title="Popular Releases"
                movies={allMovies}
                watchlistIds={watchlist.map(m => m._id)}
                favoritesIds={favorites.map(m => m._id)}
                onPlay={(id) => navigate(`/watch/${id}`)}
                onHostParty={handleCreateWatchParty}
                onToggleWatchlist={handleToggleWatchlist}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </div>
        </>
      )}

      {/* WATCH PARTY READY MODAL */}
      {showPartyModal && selectedMovieForParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 backdrop-blur-md p-4">
          <div className="max-w-md w-full rounded-2xl glass-card p-8 border border-brand-primary/20 text-center">
            <h3 className="text-2xl font-black text-white mb-2">Watch Party Created!</h3>
            <p className="text-xs text-brand-textMuted mb-6">
              Share the invitation code below with your friends so they can sync up with you.
            </p>
            
            <div className="bg-brand-surface border border-white/5 p-4 rounded-xl mb-6 text-center font-mono text-3xl font-black tracking-widest text-brand-secondary">
              {partyCode}
            </div>

            <p className="text-xs text-brand-textMuted mb-8 uppercase font-bold">
              Streaming: {selectedMovieForParty.title}
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(partyCode || '');
                  alert('Code copied to clipboard!');
                }}
                className="flex-grow py-3 rounded-lg bg-brand-surface border border-white/10 hover:border-white/20 font-bold transition-all text-sm"
              >
                Copy Code
              </button>
              <button
                onClick={() => navigate(`/watch-party/${partyCode}`)}
                className="flex-grow py-3 rounded-lg bg-brand-primary hover:bg-brand-primaryHover font-bold text-white shadow-neon transition-all text-sm"
              >
                Join Room
              </button>
            </div>
            
            <button
              onClick={() => {
                setShowPartyModal(false);
                setPartyCode(null);
              }}
              className="mt-6 text-xs text-brand-textMuted hover:text-white font-medium"
            >
            Close
            </button>
          </div>
        </div>
      )}

      {/* Floating AI Guide Launch Bubble */}
      <button
        onClick={() => setShowAiChat(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-brand-primary hover:bg-brand-primaryHover text-white shadow-neon hover:scale-110 active:scale-95 transition-all duration-300 z-40"
        title="AgFlix AI Guide"
      >
        <Bot className="w-6 h-6 animate-pulse" />
      </button>

      {/* AI Guide Chat Drawer */}
      <AnimatePresence>
        {showAiChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full sm:w-[400px] h-full bg-brand-surface border-l border-white/5 shadow-2xl flex flex-col justify-between z-50 text-white"
          >
            {/* Header */}
            <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-brand-dark/40">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">AgFlix AI Guide</h3>
                  <span className="text-[10px] text-brand-secondary font-black uppercase tracking-wider">Cinematic assistant</span>
                </div>
              </div>
              <button
                onClick={() => setShowAiChat(false)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-brand-textMuted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Log messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {aiHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-brand-primary/5 border border-brand-primary/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center text-brand-primary">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white mb-1">Ground Control, AI is online.</h4>
                  <p className="text-[11px] text-brand-textMuted max-w-[240px] mx-auto leading-relaxed">
                    Ask me to recommend movies from the catalog based on your mood, genre, or visual description!
                  </p>
                </div>
              )}

              {aiHistory.map((chat, idx) => {
                const isUser = chat.role === 'user';
                return (
                  <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center text-brand-primary text-xs flex-shrink-0">
                        AI
                      </div>
                    )}
                    <div className={`p-3.5 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
                      isUser 
                        ? 'bg-brand-primary text-white rounded-tr-none font-medium' 
                        : 'bg-brand-surfaceMuted border border-white/5 text-white/90 rounded-tl-none'
                    }`}>
                      <div 
                        className="prose prose-invert max-w-none break-words"
                        dangerouslySetInnerHTML={{ 
                          __html: chat.text
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\[Watch (.*?)\]\((.*?)\)/g, '<a href="$2" class="underline text-brand-secondary font-black">Watch $1</a>')
                            .replace(/\n/g, '<br/>')
                        }} 
                      />
                    </div>
                  </div>
                );
              })}

              {aiLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center text-brand-primary text-xs flex-shrink-0">
                    AI
                  </div>
                  <div className="p-3.5 rounded-2xl bg-brand-surfaceMuted border border-white/5 text-brand-textMuted text-xs rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={aiChatBottomRef} />
            </div>

            {/* Message Input form */}
            <form onSubmit={handleSendAiMessage} className="h-20 border-t border-white/5 p-4 flex gap-2.5 bg-brand-dark/20 z-10">
              <input
                type="text"
                placeholder="Ask AgFlix AI Guide..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                className="flex-grow rounded-xl bg-brand-surfaceMuted border border-white/5 px-4 text-xs outline-none text-white focus:border-brand-primary transition-colors"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="p-3.5 rounded-xl bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 text-white transition-colors flex items-center justify-center shadow-neon"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Internal reusable Row Component to scale layouts cleanly
interface MovieRowProps {
  title: string;
  movies: Movie[];
  watchlistIds?: string[];
  favoritesIds?: string[];
  onPlay: (id: string) => void;
  onHostParty: (movie: Movie) => void;
  onToggleWatchlist?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

const MovieRow: React.FC<MovieRowProps> = ({ title, movies, watchlistIds, favoritesIds, onPlay, onHostParty, onToggleWatchlist, onToggleFavorite }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-black tracking-wide">{title}</h2>
      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide scroll-smooth">
        {movies.map((movie) => (
          <div
            key={movie._id}
            className="flex-shrink-0 w-64 rounded-xl overflow-hidden glass-card border border-white/5 group hover:border-brand-primary/40 transition-all duration-300 relative"
          >
            <div className="relative h-36 w-full overflow-hidden">
              <img
                src={movie.thumbnail}
                alt={movie.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-brand-dark/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-opacity duration-300 z-10">
                <button
                  onClick={() => onPlay(movie._id)}
                  className="p-2.5 rounded-full bg-white text-brand-dark hover:scale-110 transition-transform"
                  title="Play"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={() => onHostParty(movie)}
                  className="p-2.5 rounded-full bg-brand-primary text-white hover:scale-110 transition-transform shadow-neon"
                  title="Party"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onToggleWatchlist?.(movie._id)}
                  className={`p-2.5 rounded-full bg-brand-surface border transition-transform hover:scale-110 ${
                    watchlistIds?.includes(movie._id) ? 'text-brand-secondary border-brand-secondary/30' : 'text-white border-white/10'
                  }`}
                  title={watchlistIds?.includes(movie._id) ? 'Remove from List' : 'Add to List'}
                >
                  <Plus className={`w-4 h-4 ${watchlistIds?.includes(movie._id) ? 'rotate-45 text-brand-secondary' : ''} transition-transform`} />
                </button>
                <button
                  onClick={() => onToggleFavorite?.(movie._id)}
                  className={`p-2.5 rounded-full bg-brand-surface border transition-transform hover:scale-110 ${
                    favoritesIds?.includes(movie._id) ? 'text-brand-accent border-brand-accent/30' : 'text-white border-white/10'
                  }`}
                  title={favoritesIds?.includes(movie._id) ? 'Remove Favorite' : 'Mark Favorite'}
                >
                  <Heart className={`w-4 h-4 ${favoritesIds?.includes(movie._id) ? 'fill-brand-accent text-brand-accent' : ''} transition-all`} />
                </button>
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-bold text-sm truncate text-white">{movie.title}</h4>
              <div className="flex items-center gap-2 text-[10px] text-brand-textMuted mt-1 font-semibold">
                <span className="text-brand-secondary">{movie.releaseYear}</span>
                <span className="px-1 py-0.2 rounded border border-white/15 scale-90">{movie.ageRating}</span>
                <span>{movie.duration}m</span>
              </div>
              <p className="text-[10px] text-brand-textMuted mt-1.5 truncate">
                {movie.genres.join(' | ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;

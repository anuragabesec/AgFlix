import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Shield, Tv, Users, Heart } from 'lucide-react';
import { store, useAppSelector } from './store';

// Import pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import OtpVerify from './pages/OtpVerify';
import ProfileSelect from './pages/ProfileSelect';
import PlanSelect from './pages/PlanSelect';
import CheckoutStatus from './pages/CheckoutStatus';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Player from './pages/Player';
import WatchParty from './pages/WatchParty';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Auth Route Guard Helper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const localToken = localStorage.getItem('agflix_access_token');
  
  if (!isAuthenticated && !localToken) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Landing Welcome Screen
const WelcomePage: React.FC = () => {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#8A3FFC_0%,transparent_50%)] opacity-30 pointer-events-none" />

      {/* Header/Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(138,63,252,0.4)]">
            AgFlix
          </span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex gap-4"
        >
          <NavigateButton />
        </motion.div>
      </header>

      {/* Main Hero */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-surfaceMuted/50 border border-brand-primary/30 text-xs font-semibold text-brand-secondary mb-6 shadow-neon">
            <Shield className="w-3.5 h-3.5" /> Next-Gen OTT Security & Encryption
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Cinematic Experience, <br/>
            <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
              Without Compromise.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-brand-textMuted max-w-2xl mx-auto mb-10 leading-relaxed">
            Welcome to AgFlix, the premium open-source streaming platform. Built with enterprise grade security, peerless multi-device syncing, and immersive real-time watch parties.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <NavigateStartedButton />
            <button 
              onClick={() => (window.location.href = '/plans')}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-brand-text bg-brand-surface border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              Browse Plans
            </button>
          </div>
        </motion.div>

        {/* Features list */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-20"
        >
          <div className="glass-card glass-card-hover p-6 rounded-2xl text-left">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-4 border border-brand-primary/20">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Ultra HD Streaming</h3>
            <p className="text-sm text-brand-textMuted">Adaptive video bitrates optimized for dynamic, buffer-free playback on smart TVs, mobiles and desktops.</p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl text-left">
            <div className="w-12 h-12 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary mb-4 border border-brand-secondary/20">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Synchronized Watch Parties</h3>
            <p className="text-sm text-brand-textMuted">Create instant watch parties with real-time video synchronization and messaging powered by Socket.IO.</p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl text-left">
            <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent mb-4 border border-brand-accent/20">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Active Stream Guard</h3>
            <p className="text-sm text-brand-textMuted">Strict session rotation, fingerprint checks, and geo-location tracking to protect accounts from credential sharing.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center border-t border-white/5 text-sm text-brand-textMuted z-10 gap-4">
        <div>&copy; 2026 AgFlix Inc. All rights reserved. Developed with clean architecture.</div>
        <div className="flex items-center gap-1.5">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-brand-accent fill-brand-accent" />
          <span>for premium viewing</span>
        </div>
      </footer>
    </div>
  );
};

// Mini internal buttons to avoid unused imports / navigation errors
const NavigateButton: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  if (isAuthenticated) {
    return (
      <div className="flex gap-3">
        <button
          onClick={() => (window.location.href = '/dashboard')}
          className="px-5 py-2 rounded-full text-sm font-semibold tracking-wide bg-brand-surface border border-white/10 hover:border-white/20 text-brand-text transition-all duration-300"
        >
          My Account
        </button>
        <button
          onClick={() => (window.location.href = '/profiles')}
          className="px-5 py-2 rounded-full text-sm font-semibold tracking-wide bg-brand-primary text-white shadow-neon hover:bg-brand-primaryHover transition-all duration-300"
        >
          Profiles
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => (window.location.href = '/login')}
      className="px-5 py-2 rounded-full text-sm font-semibold tracking-wide bg-brand-surface border border-white/10 hover:border-brand-primary/50 text-brand-text transition-all duration-300 shadow-glass"
    >
      Sign In
    </button>
  );
};

const NavigateStartedButton: React.FC = () => {
  return (
    <button
      onClick={() => (window.location.href = '/signup')}
      className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white bg-brand-primary hover:bg-brand-primaryHover shadow-neon transition-all duration-300 flex items-center justify-center gap-2 group"
    >
      <Play className="w-5 h-5 fill-current" />
      <span>Get Started Now</span>
    </button>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<OtpVerify />} />
            
            {/* Protected Routes */}
            <Route
              path="/profiles"
              element={
                <ProtectedRoute>
                  <ProfileSelect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans"
              element={
                <ProtectedRoute>
                  <PlanSelect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout-status"
              element={
                <ProtectedRoute>
                  <CheckoutStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/watch/:id"
              element={
                <ProtectedRoute>
                  <Player />
                </ProtectedRoute>
              }
            />
            <Route
              path="/watch-party/:code"
              element={
                <ProtectedRoute>
                  <WatchParty />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;

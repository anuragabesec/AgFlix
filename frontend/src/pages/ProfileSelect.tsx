import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock, ArrowLeft, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import { useAppDispatch } from '../store';
import { selectProfile } from '../store/slices/authSlice';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileData {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
  pinLocked: boolean;
}

// Map mock avatar strings to custom CSS gradients
const avatarStyles: Record<string, string> = {
  'avatar_purple': 'from-indigo-600 to-brand-primary',
  'avatar_cyan': 'from-cyan-500 to-brand-secondary',
  'avatar_pink': 'from-rose-500 to-brand-accent',
  'avatar_lime': 'from-green-400 to-emerald-600',
  'avatar_default_purple.png': 'from-indigo-600 to-brand-primary',
};

const getAvatarClass = (avatarName: string) => {
  return avatarStyles[avatarName] || 'from-brand-surfaceMuted to-brand-textMuted';
};

export const ProfileSelect: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Lock States
  const [lockedProfile, setLockedProfile] = useState<ProfileData | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>(Array(4).fill(''));
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinVerifying, setPinVerifying] = useState(false);

  // Create Profile States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: '',
    avatar: 'avatar_purple',
    isKids: false,
    pin: '',
  });

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/profiles');
      if (res.data?.success) {
        setProfiles(res.data.profiles);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleProfileSelect = (profile: ProfileData) => {
    if (profile.pinLocked) {
      setLockedProfile(profile);
      setPinDigits(Array(4).fill(''));
      setPinError(null);
    } else {
      enterProfile(profile);
    }
  };

  const enterProfile = (profile: ProfileData) => {
    localStorage.setItem('agflix_active_profile_id', profile.id);
    localStorage.setItem('agflix_profile_verified', 'true'); // mark unlocked profile verified locally
    dispatch(selectProfile(profile));
    navigate('/home');
  };

  const handlePinSubmit = async (digits: string[]) => {
    if (!lockedProfile) return;
    const pin = digits.join('');
    if (pin.length !== 4) return;

    setPinVerifying(true);
    setPinError(null);

    try {
      const res = await api.post('/profiles/verify-pin', {
        profileId: lockedProfile.id,
        pin,
      });

      if (res.data?.success) {
        enterProfile(lockedProfile);
      }
    } catch (err: any) {
      setPinError(err.response?.data?.message || 'Incorrect PIN');
      setPinDigits(Array(4).fill(''));
    } finally {
      setPinVerifying(false);
    }
  };

  const handlePinDigitChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;

    const newPin = [...pinDigits];
    newPin[index] = value.substring(value.length - 1);
    setPinDigits(newPin);

    if (value && index === 3) {
      handlePinSubmit(newPin);
    } else if (value) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfile.name.trim()) return;

    setError(null);
    try {
      const res = await api.post('/profiles', {
        name: newProfile.name.trim(),
        avatar: newProfile.avatar,
        isKids: newProfile.isKids,
        pin: newProfile.pin || undefined,
      });

      if (res.data?.success) {
        setShowCreateForm(false);
        setNewProfile({ name: '', avatar: 'avatar_purple', isKids: false, pin: '' });
        fetchProfiles();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create profile.');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-brand-dark overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#8A3FFC_0%,transparent_50%)] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl z-10"
      >
        <AnimatePresence mode="wait">
          {!showCreateForm ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8 tracking-wide">
                Who's watching?
              </h1>

              {error && (
                <div className="max-w-md mx-auto mb-8 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm flex items-center justify-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap justify-center items-start gap-8">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => handleProfileSelect(profile)}
                      className="group flex flex-col items-center cursor-pointer w-28 md:w-36"
                    >
                      <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-gradient-to-tr border-2 border-transparent group-hover:border-white group-hover:shadow-neon transition-all duration-300 transform group-hover:scale-105 mb-4">
                        {profile.avatar.startsWith('http') ? (
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-tr ${getAvatarClass(profile.avatar)} flex items-center justify-center text-4xl md:text-5xl font-black text-white select-none`}>
                            {profile.name[0].toUpperCase()}
                          </div>
                        )}
                        {profile.pinLocked && (
                          <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 border border-white/10 text-brand-secondary">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {profile.isKids && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-brand-accent text-[10px] font-bold text-white uppercase tracking-wider">
                            Kids
                          </div>
                        )}
                      </div>
                      <span className="text-brand-textMuted group-hover:text-white text-base md:text-lg font-semibold transition-colors duration-200 truncate max-w-full">
                        {profile.name}
                      </span>
                    </div>
                  ))}

                  {profiles.length < 4 && (
                    <div
                      onClick={() => setShowCreateForm(true)}
                      className="group flex flex-col items-center cursor-pointer w-28 md:w-36"
                    >
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-2 border-dashed border-white/20 group-hover:border-brand-primary group-hover:bg-brand-primary/5 flex items-center justify-center text-brand-textMuted group-hover:text-brand-primary transition-all duration-300 mb-4">
                        <Plus className="w-10 h-10" />
                      </div>
                      <span className="text-brand-textMuted group-hover:text-white text-base md:text-lg font-semibold transition-colors duration-200">
                        Add Profile
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-md mx-auto p-8 rounded-2xl glass-card text-left"
            >
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex items-center gap-2 text-brand-textMuted hover:text-white mb-6 transition-colors duration-200 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Profiles
              </button>

              <h2 className="text-2xl font-bold text-white mb-6">Create Profile</h2>

              <form onSubmit={handleCreateProfileSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase text-brand-textMuted mb-2 block">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newProfile.name}
                    onChange={(e) => setNewProfile((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-white outline-none focus:border-brand-primary focus:shadow-neon"
                    placeholder="Enter name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-brand-textMuted mb-2 block">
                      Profile Type
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-lg bg-brand-surface border border-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProfile.isKids}
                        onChange={(e) => setNewProfile((prev) => ({ ...prev, isKids: e.target.checked }))}
                        className="w-4 h-4 rounded border-white/10 bg-brand-surfaceMuted accent-brand-primary"
                      />
                      <span className="text-sm font-semibold">Kids Profile</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-brand-textMuted mb-2 block">
                      Avatar Theme
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {['avatar_purple', 'avatar_cyan', 'avatar_pink', 'avatar_lime'].map((avatarName) => (
                        <div
                          key={avatarName}
                          onClick={() => setNewProfile((prev) => ({ ...prev, avatar: avatarName }))}
                          className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarStyles[avatarName]} cursor-pointer border-2 transition-all duration-200 ${
                            newProfile.avatar === avatarName ? 'border-white scale-110' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-brand-textMuted mb-2 block">
                    Custom Profile Picture URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newProfile.avatar.startsWith('http') ? newProfile.avatar : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProfile((prev) => ({ ...prev, avatar: val || 'avatar_purple' }));
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-white outline-none focus:border-brand-primary focus:shadow-neon text-sm"
                    placeholder="https://example.com/your-avatar-image.png"
                  />
                  <p className="text-[10px] text-brand-textMuted mt-1">Or paste a direct URL link to any custom image online.</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-brand-textMuted mb-2 block">
                    4-Digit Profile PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newProfile.pin}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        setNewProfile((prev) => ({ ...prev, pin: e.target.value }));
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-white outline-none focus:border-brand-primary focus:shadow-neon tracking-widest text-center text-lg font-bold"
                    placeholder="xxxx"
                  />
                  <p className="text-[10px] text-brand-textMuted mt-1">Leave empty if you don't want a lock PIN.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-lg bg-brand-primary hover:bg-brand-primaryHover font-bold text-white shadow-neon transition-all duration-300"
                >
                  Create Profile
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN Entry Modal / Overlay */}
        <AnimatePresence>
          {lockedProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-dark/95 flex items-center justify-center z-50 px-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm p-8 rounded-2xl glass-card text-center"
              >
                <div className="flex justify-center mb-4 text-brand-primary">
                  <Lock className="w-10 h-10" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Profile Locked</h3>
                <p className="text-brand-textMuted text-sm mb-6">
                  Enter your 4-digit PIN lock to watch as <strong>{lockedProfile.name}</strong>
                </p>

                {pinError && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-brand-accent font-semibold mb-4 bg-brand-accent/10 border border-brand-accent/20 p-2.5 rounded-lg">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="flex justify-center gap-4 mb-8">
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`pin-${idx}`}
                      type="password"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinDigitChange(e.target.value, idx)}
                      onKeyDown={(e) => handlePinKeyDown(e, idx)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-white outline-none focus:border-brand-secondary focus:shadow-neon-cyan transition-all duration-200"
                    />
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setLockedProfile(null)}
                    className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={pinVerifying}
                    onClick={() => handlePinSubmit(pinDigits)}
                    className="flex-1 py-3 rounded-lg bg-brand-primary hover:bg-brand-primaryHover text-sm font-bold text-white transition-all duration-200"
                  >
                    Verify PIN
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ProfileSelect;

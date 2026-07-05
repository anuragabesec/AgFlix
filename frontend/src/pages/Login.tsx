import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Chrome, Github } from 'lucide-react';
import Input from '../components/Input';
import api from '../utils/api';
import { useAppDispatch } from '../store';
import { authSuccess } from '../store/slices/authSlice';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
    
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    setServerError(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError(null);

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
        deviceId: localStorage.getItem('agflix_device_id') || 'dev_fingerprint_fallback',
        browser: 'Web Browser',
        os: 'OS Platform',
      });

      if (response.data?.success) {
        // Save access token
        localStorage.setItem('agflix_access_token', response.data.accessToken);

        // Store user state
        dispatch(
          authSuccess({
            user: response.data.user,
            accessToken: response.data.accessToken,
          })
        );

        // Navigate to Profile Selection
        navigate('/profiles');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setServerError(msg);
      
      if (err.response?.status === 403 && msg.includes('not verified')) {
        // If account exists but email not verified, redirect to verify OTP
        navigate('/verify-otp', { state: { email: formData.email, purpose: 'signup' } });
      }
    } finally {
      setLoading(false);
    }
  };

  // Mock social auth flows
  const handleSocialMock = (provider: string) => {
    setServerError(`Social authentication via ${provider} is in local sandbox mode. Please sign up manually.`);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 bg-brand-dark">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#8A3FFC_0%,transparent_50%)] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl glass-card z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(138,63,252,0.4)]">
            AgFlix
          </Link>
          <h2 className="text-2xl font-bold text-white mt-4">Welcome Back</h2>
          <p className="text-brand-textMuted text-sm mt-1">Access secure high definition streaming</p>
        </div>

        {serverError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Email Address"
            id="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
          />

          <div className="flex items-center justify-between mb-6 text-sm">
            <label className="flex items-center text-brand-textMuted cursor-pointer select-none">
              <input
                type="checkbox"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 rounded border-white/10 bg-brand-surfaceMuted accent-brand-primary mr-2"
              />
              Remember Me
            </label>
            <Link
              to="/forgot-password"
              className="text-brand-primary hover:underline font-semibold"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg bg-brand-primary hover:bg-brand-primaryHover font-bold text-white shadow-neon transition-all duration-300 flex items-center justify-center mb-6"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-brand-textMuted text-xs font-semibold">OR CONTINUE WITH</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSocialMock('Google')}
            className="py-3 px-4 rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-brand-text hover:bg-brand-surfaceMuted transition-all duration-200 flex items-center justify-center gap-2.5 text-sm font-semibold"
          >
            <Chrome className="w-4 h-4 text-red-500" />
            Google
          </button>
          <button
            onClick={() => handleSocialMock('GitHub')}
            className="py-3 px-4 rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-brand-text hover:bg-brand-surfaceMuted transition-all duration-200 flex items-center justify-center gap-2.5 text-sm font-semibold"
          >
            <Github className="w-4 h-4" />
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-brand-textMuted mt-8">
          New to AgFlix?{' '}
          <Link to="/signup" className="text-brand-secondary hover:underline font-semibold">
            Create Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;

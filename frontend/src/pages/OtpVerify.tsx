import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import { useAppDispatch } from '../store';
import { authSuccess } from '../store/slices/authSlice';

export const OtpVerify: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Retrieve email and purpose from route navigation state
  const stateEmail = location.state?.email || '';
  const purpose = location.state?.purpose || 'signup';

  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [resendTimer, setResendTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Count down timer for resend OTP code
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Jump to next input on digit entry
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return; // only allow digits

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // take last character entered
    setOtp(newOtp);

    // Auto-focus next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Auto-focus previous box on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length !== 6 || isNaN(Number(pasteData))) return;

    const codeArray = pasteData.split('');
    setOtp(codeArray);
    inputRefs.current[5]?.focus();
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      await api.post('/auth/password-reset/request', { email });
      setResendTimer(60);
      setInfoMessage('A fresh security OTP was dispatched to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispatch a new OTP. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Email address context is required.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otpCode,
        purpose,
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

        // Navigate to Profile Selection page
        navigate('/profiles');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 bg-brand-dark">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#8A3FFC_0%,transparent_50%)] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl glass-card text-center z-10"
      >
        <div className="flex justify-center mb-4 text-brand-secondary">
          <ShieldCheck className="w-12 h-12 filter drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Verify OTP</h2>
        <p className="text-brand-textMuted text-sm mb-6 leading-relaxed">
          We sent a 6-digit security code to: <br/>
          <strong className="text-brand-text break-all">{email || 'your email'}</strong>
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm text-left mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 rounded-lg bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary text-sm text-left mb-6">
            <span>{infoMessage}</span>
          </div>
        )}

        {!stateEmail && (
          <div className="text-left mb-5">
            <label className="text-xs font-semibold text-brand-textMuted mb-2 block">
              Confirm Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-white outline-none focus:border-brand-primary"
              placeholder="e.g. user@domain.com"
            />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center gap-2.5 mb-8">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={digit}
                ref={(el) => (inputRefs.current[idx] = el as HTMLInputElement)}
                onChange={(e) => handleOtpChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-white outline-none focus:border-brand-secondary focus:shadow-neon-cyan transition-all duration-200"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg bg-brand-primary hover:bg-brand-primaryHover font-bold text-white shadow-neon transition-all duration-300 flex items-center justify-center mb-6"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify & Authenticate'
            )}
          </button>
        </form>

        <div className="text-sm">
          <span className="text-brand-textMuted">Didn't receive the email? </span>
          {resendTimer > 0 ? (
            <span className="text-brand-primary font-semibold">
              Resend in {resendTimer}s
            </span>
          ) : (
            <button
              onClick={handleResend}
              className="text-brand-secondary hover:underline font-bold"
            >
              Resend Code
            </button>
          )}
        </div>

        <div className="mt-8 text-sm">
          <Link to="/signup" className="text-brand-textMuted hover:text-white">
            &larr; Back to Signup
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default OtpVerify;

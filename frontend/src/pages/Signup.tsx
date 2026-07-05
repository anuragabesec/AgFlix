import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import Input from '../components/Input';
import api from '../utils/api';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password strength checklist states
  const passwordCriteria = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    digit: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const getStrengthPercent = () => {
    const passed = Object.values(passwordCriteria).filter(Boolean).length;
    return (passed / 5) * 100;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    setServerError(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const strength = getStrengthPercent();
      if (strength < 100) {
        newErrors.password = 'Password does not meet all criteria';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      // Redirect to OTP verification screen, pass email in location state
      navigate('/verify-otp', { state: { email: formData.email, purpose: 'signup' } });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setServerError(msg);
      
      if (err.response?.data?.errors) {
        const fieldErrors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          fieldErrors[e.field] = e.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = () => {
    const pct = getStrengthPercent();
    if (pct <= 40) return 'bg-brand-accent';
    if (pct <= 80) return 'bg-yellow-500';
    return 'bg-brand-secondary';
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 bg-brand-dark">
      {/* Background Graphic */}
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
          <h2 className="text-2xl font-bold text-white mt-4">Create Account</h2>
          <p className="text-brand-textMuted text-sm mt-1">Start streaming premium contents</p>
        </div>

        {serverError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
          />
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

          {/* Password strength visual meter */}
          {formData.password && (
            <div className="mb-5 p-3 rounded-lg bg-brand-surface border border-white/5">
              <div className="flex items-center justify-between mb-1.5 text-xs text-brand-textMuted font-semibold">
                <span>Password Strength</span>
                <span className="text-brand-text">{getStrengthPercent()}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full ${strengthColor()} transition-all duration-300`}
                  style={{ width: `${getStrengthPercent()}%` }}
                />
              </div>
              
              {/* Strength criteria checklist */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-brand-secondary' : 'text-brand-textMuted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordCriteria.length ? 'bg-brand-secondary/10' : 'bg-white/5'}`}>
                    {passwordCriteria.length && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.upper ? 'text-brand-secondary' : 'text-brand-textMuted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordCriteria.upper ? 'bg-brand-secondary/10' : 'bg-white/5'}`}>
                    {passwordCriteria.upper && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.lower ? 'text-brand-secondary' : 'text-brand-textMuted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordCriteria.lower ? 'bg-brand-secondary/10' : 'bg-white/5'}`}>
                    {passwordCriteria.lower && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.digit ? 'text-brand-secondary' : 'text-brand-textMuted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordCriteria.digit ? 'bg-brand-secondary/10' : 'bg-white/5'}`}>
                    {passwordCriteria.digit && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>1+ digit</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.special ? 'text-brand-secondary' : 'text-brand-textMuted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordCriteria.special ? 'bg-brand-secondary/10' : 'bg-white/5'}`}>
                    {passwordCriteria.special && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>Special character</span>
                </div>
              </div>
            </div>
          )}

          <Input
            label="Confirm Password"
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg bg-brand-primary hover:bg-brand-primaryHover font-bold text-white shadow-neon transition-all duration-300 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-brand-textMuted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-secondary hover:underline font-semibold">
            Log In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;

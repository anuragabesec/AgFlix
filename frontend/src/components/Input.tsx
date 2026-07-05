import React, { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  type = 'text',
  id,
  value,
  onFocus,
  onBlur,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  
  const hasValue = value !== undefined && value !== null && value.toString().length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="w-full mb-5">
      <div className="relative w-full">
        <input
          type={inputType}
          id={id}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`w-full px-5 pt-6 pb-2 rounded-lg bg-brand-surfaceMuted/50 border text-brand-text text-base outline-none transition-all duration-300 font-sans ${
            error
              ? 'border-brand-accent focus:shadow-[0_0_10px_rgba(255,0,122,0.3)]'
              : 'border-white/10 focus:border-brand-primary focus:shadow-neon'
          }`}
          {...props}
        />
        <label
          htmlFor={id}
          className={`absolute left-5 text-brand-textMuted select-none pointer-events-none transition-all duration-300 ${
            isFloating
              ? 'top-1.5 text-xs text-brand-primary font-semibold'
              : 'top-1/2 -translate-y-1/2 text-base'
          }`}
        >
          {label}
        </label>

        {isPassword && hasValue && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white transition-colors duration-200"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-brand-accent font-medium tracking-wide">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;

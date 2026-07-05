import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

export const CheckoutStatus: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const gateway = searchParams.get('gateway');
  const sessionId = searchParams.get('session_id') || searchParams.get('order_id') || '';
  const planName = searchParams.get('planName') as any;
  const couponCode = searchParams.get('couponCode');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const finalizeSubscription = async () => {
      if (status !== 'success') {
        setLoading(false);
        return;
      }

      try {
        // If planName parameter exists in URL, it indicates we are in development sandbox mode
        if (planName) {
          await api.post('/payments/sandbox/complete', {
            planName,
            gateway: gateway || 'stripe',
            transactionId: sessionId,
            couponCode: couponCode || undefined,
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to register subscription locally.');
      } finally {
        setLoading(false);
      }
    };

    finalizeSubscription();
  }, [status, gateway, sessionId, planName, couponCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center px-4">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white">Completing Your Transaction</h2>
        <p className="text-brand-textMuted text-sm mt-1">Please do not refresh the page...</p>
      </div>
    );
  }

  const isSuccess = status === 'success' && !error;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-brand-dark px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#8A3FFC_0%,transparent_50%)] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full p-8 rounded-2xl glass-card text-center z-10"
      >
        {isSuccess ? (
          <>
            <div className="flex justify-center mb-6 text-brand-secondary">
              <CheckCircle2 className="w-16 h-16 filter drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Subscription Active!</h1>
            <p className="text-brand-textMuted text-sm mb-6">
              Thank you for subscribing. Your account has been upgraded successfully.
            </p>
            {planName && (
              <div className="bg-brand-surface border border-white/5 p-4 rounded-xl mb-6 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-brand-textMuted">Active Plan:</span>
                  <span className="font-bold text-white uppercase">{planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-textMuted">Gateway:</span>
                  <span className="text-white capitalize">{gateway}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-textMuted">Transaction ID:</span>
                  <span className="text-white text-xs truncate max-w-[60%]">{sessionId}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/profiles')}
              className="w-full py-4 rounded-lg bg-brand-primary hover:bg-brand-primaryHover font-bold text-white shadow-neon transition-all"
            >
              Start Streaming
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6 text-brand-accent">
              <XCircle className="w-16 h-16 filter drop-shadow-[0_0_10px_rgba(255,0,122,0.4)]" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Payment Failed</h1>
            <p className="text-brand-textMuted text-sm mb-8">
              {error || 'The checkout transaction was cancelled or could not be completed.'}
            </p>
            <button
              onClick={() => navigate('/plans')}
              className="w-full py-4 rounded-lg bg-brand-surface border border-white/10 hover:border-white/20 font-bold text-white transition-all"
            >
              Back to Plans
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CheckoutStatus;

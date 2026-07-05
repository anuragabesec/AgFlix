import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, Tag, CreditCard, Award, ArrowRight } from 'lucide-react';
import api from '../utils/api';

interface PlanDetails {
  id: string;
  name: string;
  price: number;
  resolution: string;
  screens: number;
  devices: string;
}

const planItems: PlanDetails[] = [
  { id: 'mobile', name: 'Mobile', price: 149, resolution: '480p (SD)', screens: 1, devices: 'Phone, Tablet' },
  { id: 'basic', name: 'Basic', price: 199, resolution: '720p (HD)', screens: 1, devices: 'Phone, Tablet, Laptop' },
  { id: 'standard', name: 'Standard', price: 499, resolution: '1080p (Full HD)', screens: 2, devices: 'Phone, Tablet, Laptop, TV' },
  { id: 'premium', name: 'Premium', price: 649, resolution: '4K + HDR', screens: 4, devices: 'Phone, Tablet, Laptop, TV' },
];

export const PlanSelect: React.FC = () => {
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<string>('standard');
  const [gateway, setGateway] = useState<'stripe' | 'razorpay'>('stripe');
  
  // Coupon States
  const [coupon, setCoupon] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; pct: number; amt: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const getPlanPrice = (planId: string) => {
    const plan = planItems.find((p) => p.id === planId);
    if (!plan) return 0;
    if (appliedDiscount && selectedPlan === planId) {
      return Math.max(0, plan.price - appliedDiscount.amt);
    }
    return plan.price;
  };

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;

    setCouponError(null);
    setCouponSuccess(null);
    
    try {
      const res = await api.post('/payments/coupon/validate', {
        couponCode: coupon.trim().toUpperCase(),
        planName: selectedPlan,
      });

      if (res.data?.success) {
        setAppliedDiscount({
          code: res.data.coupon.code,
          pct: res.data.coupon.discountPercentage,
          amt: res.data.discountAmount,
        });
        setCouponSuccess(`Success! ${res.data.coupon.discountPercentage}% discount applied.`);
      }
    } catch (err: any) {
      setAppliedDiscount(null);
      setCouponError(err.response?.data?.message || 'Invalid promo code');
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setCheckoutError(null);

    try {
      const response = await api.post('/payments/checkout', {
        planName: selectedPlan,
        gateway,
        couponCode: appliedDiscount?.code || undefined,
      });

      if (response.data?.success) {
        if (response.data.url) {
          // Redirect browser to Stripe checkout url (or simulated sandbox URL)
          window.location.href = response.data.url;
        } else if (response.data.orderId) {
          // Razorpay gateway flow
          if (gateway === 'razorpay') {
            if (response.data.keyId === 'rzp_test_mock_key_id') {
              // Simulated Razorpay success for development sandbox
              await api.post('/payments/sandbox/complete', {
                planName: selectedPlan,
                gateway: 'razorpay',
                transactionId: response.data.orderId,
                couponCode: appliedDiscount?.code || undefined,
              });
              navigate('/checkout-status?status=success&gateway=razorpay&order_id=' + response.data.orderId);
            } else {
              // Render standard Razorpay payment popup
              const options = {
                key: response.data.keyId,
                amount: response.data.amount,
                currency: response.data.currency,
                name: 'AgFlix Streaming',
                description: `Subscribe to ${selectedPlan.toUpperCase()} plan`,
                order_id: response.data.orderId,
                handler: async (paymentResponse: any) => {
                  try {
                    await api.post('/payments/razorpay/verify', {
                      razorpay_order_id: paymentResponse.razorpay_order_id,
                      razorpay_payment_id: paymentResponse.razorpay_payment_id,
                      razorpay_signature: paymentResponse.razorpay_signature,
                      planName: selectedPlan,
                      couponCode: appliedDiscount?.code || undefined,
                      amount: response.data.amount,
                    });
                    navigate('/checkout-status?status=success&gateway=razorpay&order_id=' + paymentResponse.razorpay_order_id);
                  } catch (verifyErr: any) {
                    setCheckoutError('Signature verification failed. Please contact support.');
                  }
                },
                theme: { color: '#8A3FFC' },
              };
              const rzp = new (window as any).Razorpay(options);
              rzp.open();
            }
          }
        }
      }
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-brand-dark px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#8A3FFC_0%,transparent_50%)] opacity-25 pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10 mb-10">
        <span 
          onClick={() => navigate(localStorage.getItem('agflix_active_profile_id') ? '/home' : '/profiles')}
          className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(138,63,252,0.4)] cursor-pointer"
        >
          AgFlix
        </span>
        <button
          onClick={() => navigate(localStorage.getItem('agflix_active_profile_id') ? '/home' : '/profiles')}
          className="text-sm font-semibold text-brand-textMuted hover:text-white transition-colors"
        >
          {localStorage.getItem('agflix_active_profile_id') ? 'Back to Home' : 'Cancel'}
        </button>
      </header>

      {/* Body */}
      <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col justify-center z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-xs font-bold text-brand-primary mb-4 shadow-neon">
            <Award className="w-3.5 h-3.5" /> Premium OTT Access Passes
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Choose Your Stream Plan</h1>
          <p className="text-brand-textMuted max-w-lg mx-auto text-sm md:text-base">
            No advertisements. Unrestricted premium access. Cancel or change plans online anytime.
          </p>
        </div>

        {checkoutError && (
          <div className="max-w-md mx-auto w-full p-4 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm mb-6 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-brand-accent" />
            <span>{checkoutError}</span>
          </div>
        )}

        {/* Plans Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {planItems.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <motion.div
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan.id);
                  setAppliedDiscount(null); // Clear discount when switching plan to revalidate
                  setCouponSuccess(null);
                }}
                whileHover={{ scale: 1.02 }}
                className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 ${
                  isSelected
                    ? 'bg-brand-surface border-2 border-brand-primary shadow-neon shadow-brand-primary/20'
                    : 'glass-card hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {isSelected && (
                    <div className="p-1 rounded-full bg-brand-primary text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  {appliedDiscount && isSelected ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-brand-secondary">
                        ₹{getPlanPrice(plan.id)}
                      </span>
                      <span className="text-sm line-through text-brand-textMuted">
                        ₹{plan.price}
                      </span>
                      <span className="text-xs text-brand-textMuted">/mo</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
                      <span className="text-sm text-brand-textMuted">/mo</span>
                    </div>
                  )}
                </div>

                {/* Plan details list */}
                <ul className="space-y-3.5 text-sm text-brand-textMuted mb-6 border-t border-white/5 pt-6">
                  <li className="flex justify-between">
                    <span>Resolution:</span>
                    <strong className="text-brand-text">{plan.resolution}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Active Screens:</span>
                    <strong className="text-brand-text">{plan.screens} screen(s)</strong>
                  </li>
                  <li className="flex justify-between text-right">
                    <span>Devices:</span>
                    <strong className="text-brand-text max-w-[60%] truncate" title={plan.devices}>{plan.devices}</strong>
                  </li>
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Coupon & Checkout Area */}
        <div className="glass-card p-6 md:p-8 rounded-2xl max-w-xl mx-auto w-full">
          <h3 className="text-lg font-bold text-white mb-6">Payment Summary</h3>

          {/* Promo Code Input */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase text-brand-textMuted mb-2 block">
              Promotional Discount Code
            </label>
            <div className="flex gap-3">
              <div className="relative flex-grow">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                <input
                  type="text"
                  placeholder="e.g. AG50, FREE100"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-brand-surfaceMuted/50 border border-white/10 text-white outline-none focus:border-brand-primary transition-all uppercase"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-5 py-3 rounded-lg bg-brand-surfaceMuted hover:bg-white/10 text-sm font-semibold border border-white/10 transition-colors"
              >
                Apply
              </button>
            </div>
            {couponError && <p className="text-xs text-brand-accent font-medium mt-1.5">{couponError}</p>}
            {couponSuccess && <p className="text-xs text-brand-secondary font-medium mt-1.5">{couponSuccess}</p>}
          </div>

          {/* Gateway selector */}
          <div className="mb-8">
            <label className="text-xs font-bold uppercase text-brand-textMuted mb-3 block">
              Choose Payment Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer select-none transition-all duration-300 ${
                gateway === 'stripe' ? 'bg-brand-primary/10 border-brand-primary' : 'bg-brand-surfaceMuted/20 border-white/10'
              }`}>
                <input
                  type="radio"
                  name="gateway"
                  checked={gateway === 'stripe'}
                  onChange={() => setGateway('stripe')}
                  className="w-4 h-4 accent-brand-primary"
                />
                <CreditCard className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold">Stripe / Cards</span>
              </label>

              <label className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer select-none transition-all duration-300 ${
                gateway === 'razorpay' ? 'bg-brand-primary/10 border-brand-primary' : 'bg-brand-surfaceMuted/20 border-white/10'
              }`}>
                <input
                  type="radio"
                  name="gateway"
                  checked={gateway === 'razorpay'}
                  onChange={() => setGateway('razorpay')}
                  className="w-4 h-4 accent-brand-primary"
                />
                <ShieldCheck className="w-4 h-4 text-brand-secondary" />
                <span className="text-sm font-semibold">Razorpay / UPI</span>
              </label>
            </div>
          </div>

          {/* Final Submit Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-4 rounded-lg bg-brand-primary hover:bg-brand-primaryHover font-bold text-white shadow-neon transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Checkout (₹{getPlanPrice(selectedPlan)} / month)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-brand-textMuted mt-12 border-t border-white/5 pt-6">
        Secure checkout powered by Stripe and Razorpay. All transaction details are encrypted.
      </footer>
    </div>
  );
};

export default PlanSelect;

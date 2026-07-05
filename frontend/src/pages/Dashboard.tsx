import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CreditCard, Laptop, LogOut, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { useAppDispatch } from '../store';
import { logoutSuccess } from '../store/slices/authSlice';

interface DeviceSession {
  deviceId: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isStreaming: boolean;
  lastActiveAt: string;
}

interface InvoiceRecord {
  id: string;
  gateway: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

interface SubscriptionStatus {
  planName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Settings states
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Status logs
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const currentDeviceId = localStorage.getItem('agflix_device_id') || '';

  const fetchDashboardData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      // 1. Fetch Subscription Status
      const subRes = await api.get('/payments/status');
      if (subRes.data?.success) {
        setSub(subRes.data.subscription);
      }

      // 2. Fetch Payment History
      const payRes = await api.get('/payments/history');
      if (payRes.data?.success) {
        setInvoices(payRes.data.history);
      }

      // 3. Fetch Active Device Sessions
      const devRes = await api.get('/auth/devices');
      if (devRes.data?.success) {
        setDevices(devRes.data.devices);
      }
    } catch (err: any) {
      setActionError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCancelSub = async () => {
    if (!window.confirm('Are you sure you want to cancel your auto-renewal? You will keep access until the end of your billing cycle.')) return;
    
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.post('/payments/cancel');
      if (res.data?.success) {
        setActionSuccess('Auto-renewal has been cancelled.');
        fetchDashboardData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to cancel subscription.');
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.delete(`/auth/devices/${deviceId}`);
      if (res.data?.success) {
        setActionSuccess('Device session terminated successfully.');
        if (deviceId === currentDeviceId) {
          // If current device session is revoked, log out
          handleLogout();
        } else {
          fetchDashboardData();
        }
      }
    } catch (err: any) {
      setActionError('Failed to terminate device session.');
    }
  };

  const handleRevokeAllOtherDevices = async () => {
    if (!window.confirm('This will log out all other devices currently streaming on your account. Proceed?')) return;
    
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.delete('/auth/devices');
      if (res.data?.success) {
        setActionSuccess('All other device streams revoked successfully.');
        fetchDashboardData();
      }
    } catch (err: any) {
      setActionError('Failed to terminate other sessions.');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {}
    
    localStorage.removeItem('agflix_access_token');
    localStorage.removeItem('agflix_active_profile_id');
    dispatch(logoutSuccess());
    navigate('/login');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && devices.length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center px-4">
        <LoaderSpinner />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-dark px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#8A3FFC_0%,transparent_50%)] opacity-20 pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto z-10 relative">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 text-brand-textMuted hover:text-white transition-colors duration-200 text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => navigate('/profiles')}
              className="flex items-center gap-2 text-brand-textMuted hover:text-white transition-colors duration-200 text-sm font-semibold"
            >
              Profiles
            </button>
          </div>
          
          <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
            AgFlix Account
          </span>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:underline uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Action Feedbacks */}
        {actionError && (
          <div className="p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary text-sm mb-6 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* LEFT COLUMN: SUBSCRIPTION STATE */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-2.5 mb-6 text-brand-primary">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Subscription</h3>
              </div>

              {sub && sub.status === 'active' ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-brand-textMuted uppercase font-semibold">Active Plan</span>
                    <p className="text-2xl font-black text-brand-secondary uppercase mt-0.5">{sub.planName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-brand-textMuted uppercase font-semibold">Current Period</span>
                    <p className="text-sm text-brand-text font-medium mt-0.5">
                      Ends: {formatDate(sub.currentPeriodEnd)}
                    </p>
                  </div>
                  {sub.cancelAtPeriodEnd ? (
                    <div className="p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-medium">
                      Plan will terminate on {formatDate(sub.currentPeriodEnd)} (Renewal Off).
                    </div>
                  ) : (
                    <button
                      onClick={handleCancelSub}
                      className="w-full py-2.5 rounded-lg bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent border border-brand-accent/20 text-xs font-bold transition-colors uppercase tracking-wider"
                    >
                      Cancel Auto-Renew
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-center py-4">
                  <p className="text-sm text-brand-textMuted">You do not have an active subscription pass.</p>
                  <button
                    onClick={() => navigate('/plans')}
                    className="w-full py-3 rounded-lg bg-brand-primary hover:bg-brand-primaryHover text-xs font-bold text-white shadow-neon transition-all"
                  >
                    Browse Subscription Plans
                  </button>
                </div>
              )}
            </div>

            {/* QUICK HEALTH REFRESH */}
            <button
              onClick={fetchDashboardData}
              className="w-full py-3.5 rounded-xl glass-card flex items-center justify-center gap-2 hover:bg-white/5 text-sm font-semibold border border-white/5 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Dashboard
            </button>
          </div>

          {/* RIGHT COLUMN: ACTIVE SESSIONS & BILLINGS */}
          <div className="md:col-span-2 space-y-6">
            
            {/* SESSION MANAGER */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2.5 text-brand-secondary">
                  <Laptop className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">Active Stream Guard</h3>
                </div>
                {devices.length > 1 && (
                  <button
                    onClick={handleRevokeAllOtherDevices}
                    className="px-3.5 py-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent/80 text-white text-xs font-bold transition-colors uppercase tracking-wide"
                  >
                    End All Other Streams
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {devices.map((device) => {
                  const isCurrent = device.deviceId === currentDeviceId;
                  return (
                    <div
                      key={device.deviceId}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 ${
                        isCurrent
                          ? 'bg-brand-primary/5 border-brand-primary/30'
                          : 'bg-brand-surfaceMuted/20 border-white/5'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                          isCurrent ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 'bg-white/5 border-white/10 text-brand-textMuted'
                        }`}>
                          <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {device.os} &bull; {device.browser}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-primary/20 border border-brand-primary/30 text-[10px] font-black text-brand-primary uppercase tracking-wider">
                                This Device
                              </span>
                            )}
                            {device.isStreaming && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-secondary/20 border border-brand-secondary/30 text-[10px] font-black text-brand-secondary uppercase tracking-wider animate-pulse">
                                Live Stream
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-textMuted mt-0.5">
                            IP: {device.ipAddress} &bull; Location: {device.location}
                          </p>
                          <p className="text-[10px] text-brand-textMuted mt-0.5">
                            Last Active: {new Date(device.lastActiveAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeDevice(device.deviceId)}
                        className="text-xs font-bold text-brand-accent hover:underline uppercase tracking-wider self-end sm:self-center"
                      >
                        Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BILLING HISTORY */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-2.5 mb-6 text-brand-primary">
                <Shield className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Payment Invoices</h3>
              </div>

              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-brand-textMuted border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-white font-semibold text-xs uppercase tracking-wider">
                        <th className="pb-3 pr-4">Transaction ID</th>
                        <th className="pb-3 px-4">Gateway</th>
                        <th className="pb-3 px-4">Amount</th>
                        <th className="pb-3 pl-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="py-4 pr-4 text-xs font-mono text-white truncate max-w-[120px]">{inv.transactionId}</td>
                          <td className="py-4 px-4 text-xs capitalize">{inv.gateway}</td>
                          <td className="py-4 px-4 text-brand-secondary font-semibold">₹{inv.amount}</td>
                          <td className="py-4 pl-4 text-xs">{formatDate(inv.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-sm py-4 text-brand-textMuted">No billing statements available.</p>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

const LoaderSpinner: React.FC = () => (
  <div className="flex flex-col items-center">
    <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-brand-textMuted text-xs font-semibold">Loading secure portal...</span>
  </div>
);

export default Dashboard;

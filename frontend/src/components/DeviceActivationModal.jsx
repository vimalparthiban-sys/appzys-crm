import React, { useState, useEffect } from 'react';
import { Target, KeyRound, ShieldCheck, AlertCircle, Loader2, Clock, Lock } from 'lucide-react';
import { CRM_API } from '../services/api';

export default function DeviceActivationModal({ inviteCode, onActivationSuccess }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Active countdown timer for rate limit lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    if (!pin.trim() || pin.trim().length !== 6) {
      setErrorMessage('Please enter your 6-digit activation PIN.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await CRM_API.exchangeInvite({
        inviteCode: inviteCode.trim(),
        pin: pin.trim(),
      });

      if (res && res.authenticated) {
        if (onActivationSuccess) {
          onActivationSuccess(res);
        }
      } else {
        setErrorMessage(res?.message || 'Invalid or expired invitation link.');
      }
    } catch (err) {
      if (err.status === 429) {
        const retrySec = parseInt(err.retryAfter || '900', 10);
        setLockoutSeconds(retrySec);
        setErrorMessage(`Too many attempts (HTTP 429). Activation locked for ${retrySec} seconds.`);
      } else {
        setErrorMessage(err.message || 'Activation failed. Please verify your PIN or contact your administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0C20]/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-[#1E1B4B] via-[#2E1065] to-[#4C1D95] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 rounded-full bg-purple-500/10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-28 h-28 rounded-full bg-indigo-500/10 blur-xl"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-crm-primary to-purple-500 flex items-center justify-center shadow-lg shadow-purple-900/60 mb-3 border border-white/20">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">APPZYS CRM</h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Device Authorization Required</span>
            </div>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          <div className="text-center mb-2">
            <h3 className="font-bold text-sm text-gray-800">Verify Activation PIN</h3>
            <p className="text-xs text-gray-500 mt-1">
              Enter your one-time 6-digit activation PIN to authorize this browser session.
            </p>
          </div>

          {errorMessage && (
            <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs animate-shake ${
              lockoutSeconds > 0 
                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                : 'bg-red-50 border-red-200/80 text-red-700'
            }`}>
              {lockoutSeconds > 0 ? (
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium leading-relaxed">
                {errorMessage}
                {lockoutSeconds > 0 && (
                  <div className="mt-1 font-bold text-amber-900">
                    Retry available in: {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6-Digit PIN Input */}
          <div className="space-y-1.5 text-center">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              6-Digit Security PIN
            </label>
            <div className="relative max-w-[240px] mx-auto">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                required
                disabled={lockoutSeconds > 0}
                className="w-full pl-10 pr-4 py-3 text-center tracking-[0.5em] font-mono text-lg font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary text-crm-dark transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0 || pin.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-crm-primary hover:bg-crm-primary-hover active:bg-crm-primary-dark text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-900/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Device...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <span>Locked ({lockoutSeconds}s)</span>
              ) : (
                <span>Activate Device & Enter CRM</span>
              )}
            </button>
          </div>

          {/* Security Assurance Note */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-gray-400">
              One-Time Cryptographic Activation • Permanent Authorized Device Access
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccessRestrictedScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0C20]/95 backdrop-blur-md animate-fade-in text-white">
      <div className="w-full max-w-md bg-[#181534] rounded-3xl p-8 border border-white/10 shadow-2xl text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-purple-400">
          <Lock className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">APPZYS Client CRM</h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Private Team Workspace</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mb-6">
          Access to this CRM is strictly limited to authorized company members. No public login is permitted. Please open your personal activation link provided by your administrator.
        </p>
        <div className="pt-4 border-t border-white/10 w-full text-center">
          <span className="text-[11px] text-gray-400 font-mono">Status: Protected by Fail-Closed Authorization</span>
        </div>
      </div>
    </div>
  );
}

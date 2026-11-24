import React, { useState, useEffect } from 'react';
import { Target, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, Clock } from 'lucide-react';
import { CRM_API } from '../services/api';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
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

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await CRM_API.login({
        username: username.trim(),
        password,
        rememberDevice,
      });

      if (res && res.authenticated) {
        if (onLoginSuccess) {
          onLoginSuccess(res);
        }
      } else {
        setErrorMessage(res?.message || 'Invalid username or password.');
      }
    } catch (err) {
      if (err.status === 429) {
        const retrySec = parseInt(err.retryAfter || '900', 10);
        setLockoutSeconds(retrySec);
        setErrorMessage(`Rate limit exceeded (HTTP 429). Account temporarily locked for ${retrySec} seconds.`);
      } else {
        setErrorMessage(err.message || 'Login failed. Please check credentials or try again later.');
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
              <span>Production Single-User Security</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          <div className="text-center mb-2">
            <p className="text-xs text-gray-500">
              Enter authorized administrator credentials to manage leads and client acquisition.
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

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                required
                disabled={lockoutSeconds > 0}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary text-crm-dark transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={lockoutSeconds > 0}
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary text-crm-dark transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Device Checkbox */}
          <div className="pt-1 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-900">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded text-crm-primary focus:ring-crm-primary/30 border-gray-300"
              />
              <span className="font-medium">Remember this device</span>
            </label>
            <span className="text-[11px] text-gray-400 font-normal">
              {rememberDevice ? '14-day token' : '24-hour session'}
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="w-full py-3 px-4 rounded-xl bg-crm-primary hover:bg-crm-primary-hover active:bg-crm-primary-dark text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-900/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <span>Locked ({lockoutSeconds}s)</span>
              ) : (
                <span>Sign In to CRM</span>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-gray-400">
              Protected by Fail-Closed Server Authentication & IP Rate Limiting
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

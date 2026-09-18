'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { adminFetch } from '@/lib/adminApi';
import { HiOutlineLockClosed, HiOutlineMail, HiOutlineArrowRight, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function AdminLoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in → bounce to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/admin');
    }
  }, [authLoading, isAuthenticated, router]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setLoading(true);
  setError(null);

  try {
    const res = await adminFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    if (res.success && res.token && res.user) {
      login(res.token, res.user);
    } else {
      setError(res.message || 'Login failed');
    }
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Invalid credentials or connection error');
  } finally {
    setLoading(false);
  }
};

  if (authLoading) {
    return (
      <div className="w-full max-w-md p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-lg space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-black text-white shadow-md text-2xl mx-auto mb-3">
          L
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">CMS Admin Portal</h2>
        <p className="text-xs text-slate-500 font-medium">Sign in to manage Linkup Group multi-website content</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <HiOutlineMail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-cyan-600 rounded-xl pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xs"
              placeholder="Enter admin email"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <HiOutlineLockClosed className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-cyan-600 rounded-xl pl-10 pr-11 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xs"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer"
            >
              {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Admin Panel</span>
                <HiOutlineArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

  
    </div>
  );
}


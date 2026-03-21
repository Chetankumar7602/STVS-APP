"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function AdminLogin() {
  const { tr } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await readJsonResponse(res);
      if (res.ok && data.success) {
        window.location.href = '/admin'; // Force full reload to update middleware cookies
      } else {
        setError(data.message || tr('admin.login.invalidCredentials', 'Invalid credentials'));
      }
    } catch (err) {
      setError(tr('admin.common.networkError', 'Network error. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-slate-900 to-slate-900 z-0"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>

        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">{tr('admin.login.title', 'Admin Login')}</h2>
        <p className="text-center text-slate-500 mb-8 pb-8 border-b border-slate-100">{tr('admin.login.subtitle', 'STVS Charity Trust Portal')}</p>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 mb-6 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{tr('admin.login.username', 'Username')}</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{tr('admin.login.password', 'Password')}</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-4 bg-primary text-white rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center shadow-lg hover:shadow-primary/30"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : tr('admin.login.secureLogin', 'Secure Login')}
          </button>
        </form>
      </div>
    </div>
  );
}

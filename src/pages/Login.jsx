import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAppState } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!supabase) {
        setError('Authentication service not configured');
        setLoading(false);
        return;
      }

      // Attempt login with retry on network failure
      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!authError) {
          // Supabase stores the session automatically
          // Re-check auth state so AuthenticatedApp renders
          await checkAppState();
          const returnUrl = searchParams.get('returnUrl') || '/';
          navigate(returnUrl, { replace: true });
          return;
        }

        // If it's a network error (Failed to fetch), retry once
        if (authError.message?.includes('fetch') && attempt === 0) {
          lastError = authError;
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        setError(authError.message || 'Invalid credentials');
        setLoading(false);
        return;
      }

      // If we get here, retries exhausted
      setError(lastError?.message === 'Failed to fetch'
        ? 'Unable to reach authentication server. Please check your internet connection and try again.'
        : (lastError?.message || 'Could not connect to server'));
      setLoading(false);
    } catch (err) {
      setError(err.message?.includes('fetch')
        ? 'Unable to reach authentication server. Please check your internet connection and try again.'
        : 'Could not connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#151d2b] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[#1e2a3a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-8">
          <div className="flex justify-center mb-3">
            <img src="/favicon.svg" alt="ProjectIT" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-1">Project<span className="text-[#0069AF] dark:text-blue-400">IT</span></h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-sm">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white dark:bg-muted dark:text-foreground dark:border-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white dark:bg-muted dark:text-foreground dark:border-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0069AF] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#005a96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Contact your administrator to get an invite.
          </p>
        </div>
      </div>
    </div>
  );
}

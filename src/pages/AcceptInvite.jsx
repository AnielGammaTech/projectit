import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function AcceptInvite() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!supabase) {
      setError('Authentication service not configured');
      setInitializing(false);
      return;
    }

    const verifyToken = async () => {
      // Check for token in URL query params (our direct invite URL)
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const email = searchParams.get('email');

      if (token && email) {
        // Verify the OTP token directly — bypasses Supabase redirect entirely
        // Note: 'magiclink' type is deprecated in Supabase JS v2+, use 'email' instead
        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email',
          });

          if (verifyError) {
            console.error('Token verification failed:', verifyError);
            setError('This invite link is invalid or has expired. Please ask your admin to resend the invite.');
            setInitializing(false);
            return;
          }

          if (data?.session) {
            setSessionReady(true);
            setInitializing(false);
            return;
          }
        } catch (e) {
          console.error('Token verification error:', e);
          setError('Could not verify invite link. Please try again or ask your admin to resend.');
          setInitializing(false);
          return;
        }
      }

      // Fallback: Check for hash fragments (old Supabase redirect flow)
      // Supabase client auto-detects tokens from URL hash
      const handleAuthChange = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
        }
        setInitializing(false);
      };

      // Listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
          setSessionReady(true);
          setInitializing(false);
        }
      });

      // Also check immediately
      handleAuthChange();

      // Cleanup — wait a bit if no session found (give time for hash processing)
      setTimeout(() => {
        setInitializing((prev) => {
          // Only stop initializing if we haven't already
          return false;
        });
      }, 3000);

      return () => {
        subscription.unsubscribe();
      };
    };

    verifyToken();
  }, [searchParams]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
            <p className="text-slate-500 text-sm">Setting up your account...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="flex justify-center mb-3">
              <img src="/favicon.svg" alt="ProjectIT" className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Project<span className="text-[#0069AF]">IT</span>
            </h1>
            {error ? (
              <>
                <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200 mb-4">
                  {error}
                </div>
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Go to login
                </Link>
              </>
            ) : (
              <>
                <p className="text-slate-500 text-sm mb-4">This invite link is invalid or has expired.</p>
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Go to login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Update the user's password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to set password');
        setLoading(false);
        return;
      }

      // Password set successfully — re-check app state and navigate
      await checkAppState();
      navigate('/', { replace: true });
    } catch (err) {
      setError('Could not connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-center mb-3">
            <img src="/favicon.svg" alt="ProjectIT" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Project<span className="text-[#0069AF]">IT</span></h1>
          <p className="text-slate-500 text-center mb-6 text-sm">Set your password to activate your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Repeat your password"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Activating...' : 'Activate account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

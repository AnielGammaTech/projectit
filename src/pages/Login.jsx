import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
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
          // Check if MFA is required
          const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

          if (!aalError && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
            // User has MFA enrolled — need to verify
            setMfaRequired(true);
            setLoading(false);
            return;
          }

          // No MFA required — proceed normally
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

  const handleMfaVerify = async (code) => {
    const otpCode = code || mfaCode;
    if (otpCode.length !== 6) return;

    setError('');
    setMfaVerifying(true);

    try {
      // Get the enrolled TOTP factor
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError('Could not retrieve MFA factors. Please try again.');
        setMfaVerifying(false);
        return;
      }

      const totpFactor = factorsData.totp?.find(f => f.status === 'verified');
      if (!totpFactor) {
        setError('No verified authenticator found. Please contact your administrator.');
        setMfaVerifying(false);
        return;
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        setError('Could not create MFA challenge. Please try again.');
        setMfaVerifying(false);
        return;
      }

      // Verify the code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: otpCode,
      });

      if (verifyError) {
        setError('Invalid verification code. Please try again.');
        setMfaCode('');
        setMfaVerifying(false);
        return;
      }

      // MFA verified — proceed to app
      await checkAppState();
      const returnUrl = searchParams.get('returnUrl') || '/';
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setError('Verification failed. Please try again.');
      setMfaCode('');
      setMfaVerifying(false);
    }
  };

  const handleBackToLogin = async () => {
    // Sign out the partial session and reset
    await supabase.auth.signOut();
    setMfaRequired(false);
    setMfaCode('');
    setError('');
    setPassword('');
  };

  // MFA Verification Screen
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#151d2b] px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-[#1e2a3a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-8">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#0069AF] dark:text-blue-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center mb-1">Two-Factor Authentication</h1>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-sm">
              Enter the 6-digit code from your authenticator app
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 border border-red-200 dark:border-red-800/50 mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-center mb-6">
              <InputOTP
                maxLength={6}
                value={mfaCode}
                onChange={(value) => {
                  setMfaCode(value);
                  if (value.length === 6) {
                    handleMfaVerify(value);
                  }
                }}
                disabled={mfaVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-11 h-12 text-lg dark:bg-muted dark:border-border" />
                  <InputOTPSlot index={1} className="w-11 h-12 text-lg dark:bg-muted dark:border-border" />
                  <InputOTPSlot index={2} className="w-11 h-12 text-lg dark:bg-muted dark:border-border" />
                  <InputOTPSlot index={3} className="w-11 h-12 text-lg dark:bg-muted dark:border-border" />
                  <InputOTPSlot index={4} className="w-11 h-12 text-lg dark:bg-muted dark:border-border" />
                  <InputOTPSlot index={5} className="w-11 h-12 text-lg dark:bg-muted dark:border-border" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              onClick={() => handleMfaVerify()}
              disabled={mfaVerifying || mfaCode.length !== 6}
              className="w-full bg-[#0069AF] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#005a96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {mfaVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </button>

            <button
              onClick={handleBackToLogin}
              className="w-full mt-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard Login Screen
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

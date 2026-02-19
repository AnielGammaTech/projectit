import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// --- Shared session state ---
// onAuthStateChange keeps this in sync (including after token refresh).
// apiClient reads from here instead of calling getSession() which can
// return a stale/expired JWT from localStorage before auto-refresh runs.
let _currentSession = null;
let _sessionReady = false;
let _sessionReadyResolve = null;
const _sessionReadyPromise = new Promise((resolve) => {
  _sessionReadyResolve = resolve;
});

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    _currentSession = session;
    if (!_sessionReady) {
      _sessionReady = true;
      _sessionReadyResolve();
    }
  });
}

/**
 * Returns a valid access token, waiting for the initial session
 * to be resolved (which includes auto-refresh of expired tokens).
 */
export async function getAccessToken() {
  if (!supabase) return null;

  // Wait for the first onAuthStateChange event (INITIAL_SESSION)
  // which runs the token refresh if needed.
  if (!_sessionReady) {
    await _sessionReadyPromise;
  }

  return _currentSession?.access_token || null;
}

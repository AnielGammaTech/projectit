import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const initializedRef = useRef(false);

  // Fetch app-level user data from our API
  const fetchAppUser = useCallback(async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('User fetch failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      if (error.status === 403) {
        setAuthError({
          type: 'user_not_registered',
          message: 'Your account is not registered in the application',
        });
      } else {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required',
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    let mounted = true;

    // Initialize auth by getting the session, which triggers a token refresh
    // if the stored access token is expired.
    const initAuth = async () => {
      try {
        // getSession reads localStorage; if token is expired, the Supabase
        // client will auto-refresh it before resolving.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('getSession error:', error);
          setIsAuthenticated(false);
          setUser(null);
          setIsLoadingAuth(false);
          initializedRef.current = true;
          return;
        }

        if (session) {
          // Check if MFA verification is needed before authenticating.
          // Do NOT call refreshSession() here — it can downgrade aal2 → aal1
          // which causes an infinite login → MFA → signout loop.
          // The Supabase client handles token refresh automatically via
          // onAuthStateChange and the shared session state in supabase.js.
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (!mounted) return;

          if (aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
            // User has MFA enrolled but hasn't verified yet in this session.
            // Don't sign out — just leave unauthenticated so Login.jsx can
            // show the MFA screen with the existing session intact.
            console.log('MFA verification needed — routing to login');
            setIsAuthenticated(false);
            setUser(null);
          } else {
            await fetchAppUser();
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
        }
      }

      if (mounted) {
        setIsLoadingAuth(false);
        initializedRef.current = true;
      }
    };

    initAuth();

    // Listen for subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!initializedRef.current) return; // Skip during init

        if (event === 'SIGNED_IN' && session) {
          // Check if user has MFA enrolled but hasn't verified yet (aal1 → aal2)
          // If so, don't set authenticated — let Login.jsx handle the MFA screen
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
            return; // MFA verification still needed — don't authenticate yet
          }
          await fetchAppUser();
          setIsLoadingAuth(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        }
        // TOKEN_REFRESHED is handled automatically by the shared session state
      }
    );

    // Re-fetch user when tab becomes visible (catches role changes made by another admin)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initializedRef.current) {
        fetchAppUser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAppUser]);

  const checkAppState = useCallback(async () => {
    if (!supabase) return;
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      // Use getSession instead of refreshSession to preserve AAL level.
      // The Supabase client handles token refresh automatically.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchAppUser();
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
      });
    }
    setIsLoadingAuth(false);
  }, [fetchAppUser]);

  const logout = useCallback(async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (supabase) {
      await supabase.auth.signOut();
    }

    // Clean up any legacy token
    localStorage.removeItem('projectit_token');

    if (shouldRedirect) {
      window.location.replace('/login');
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

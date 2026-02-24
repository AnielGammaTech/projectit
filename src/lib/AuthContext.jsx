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
          // We have a session — refresh it to guarantee a valid access token
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (!mounted) return;

          if (refreshData?.session) {
            // Check if the user has MFA enrolled but hasn't completed verification
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
              // User has MFA enrolled but session is only aal1 — force re-login for MFA
              console.log('MFA required but session is aal1 — redirecting to login');
              await supabase.auth.signOut();
              setIsAuthenticated(false);
              setUser(null);
            } else {
              await fetchAppUser();
            }
          } else {
            // Refresh failed — session is invalid
            setIsAuthenticated(false);
            setUser(null);
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAppUser]);

  const checkAppState = useCallback(async () => {
    if (!supabase) return;
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      // Force a refresh to get a valid token
      const { data: { session } } = await supabase.auth.refreshSession();
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

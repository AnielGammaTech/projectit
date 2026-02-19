import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      if (!supabase) {
        // Supabase not configured — fall back to checking for token
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      // Check for existing Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      // We have a valid Supabase session — fetch app user data
      await fetchAppUser();
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
      });
      setIsLoadingAuth(false);
    }
  }, [fetchAppUser]);

  useEffect(() => {
    checkAppState();

    // Listen for Supabase auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            await fetchAppUser();
            setIsLoadingAuth(false);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoadingAuth(false);
          } else if (event === 'TOKEN_REFRESHED') {
            // Token was refreshed — no action needed, session is still valid
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [checkAppState, fetchAppUser]);

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

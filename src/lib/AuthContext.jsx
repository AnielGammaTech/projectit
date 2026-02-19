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
      // Supabase not configured
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    // Set up auth state listener FIRST (Supabase recommended pattern)
    // onAuthStateChange fires INITIAL_SESSION immediately upon registration
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          // This is the initial check — replaces getSession()
          if (session) {
            await fetchAppUser();
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
          setIsLoadingAuth(false);
          initializedRef.current = true;
        } else if (event === 'SIGNED_IN' && session) {
          // Only fetch if already initialized (skip duplicate from login)
          if (initializedRef.current) {
            await fetchAppUser();
          }
          setIsLoadingAuth(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token refreshed — session is still valid, no action needed
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppUser]);

  const checkAppState = useCallback(async () => {
    if (!supabase) return;
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
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

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
});

/**
 * Applies the correct class to <html> and manages system preference listeners.
 * Supported values: 'light' | 'dark' | 'system' | 'high_contrast'
 */
export function ThemeProvider({ children, defaultTheme = 'light' }) {
  const [theme, setThemeState] = useState(() => {
    // Read from localStorage on init (server user pref synced later)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('projectit_theme') || defaultTheme;
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState('light');

  const applyTheme = useCallback((themeValue) => {
    const root = document.documentElement;
    let resolved = themeValue;

    if (themeValue === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (themeValue === 'high_contrast') {
      resolved = 'dark'; // High contrast uses dark as base
    }

    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.setAttribute('data-theme', themeValue);

    // Set color-scheme for native elements (scrollbars, form controls)
    root.style.colorScheme = resolved;

    setResolvedTheme(resolved);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('projectit_theme', newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

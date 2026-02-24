import React from 'react';
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider, useTheme } from '@/lib/ThemeProvider';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import WhatsNewNotifier from '@/components/WhatsNewNotifier';
import MfaEnforcementGuard from '@/components/MfaEnforcementGuard';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import AcceptInvite from '@/pages/AcceptInvite';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Syncs the user's DB theme preference into ThemeProvider
const ThemeSyncer = () => {
  const { user } = useAuth();
  const { setTheme, theme } = useTheme();
  const syncedRef = React.useRef(false);

  React.useEffect(() => {
    if (user?.theme && !syncedRef.current) {
      syncedRef.current = true;
      if (user.theme !== theme) {
        setTheme(user.theme);
      }
    }
  }, [user, setTheme, theme]);

  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }
  }

  // Redirect to login if not authenticated (uses React Router, preserves history)
  if (!isAuthenticated) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Render the main app
  return (
    <>
    <ThemeSyncer />
    <WhatsNewNotifier />
    <MfaEnforcementGuard>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </MfaEnforcementGuard>
    </>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
          <SonnerToaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

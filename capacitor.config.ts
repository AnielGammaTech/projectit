import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gammatech.projectit',
  appName: 'ProjectIT',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow API requests to bypass CORS in native WebView
    allowNavigation: ['api-production-0eff.up.railway.app', '*.supabase.co'],
  },
  ios: {
    preferredContentMode: 'mobile',
    // Hide the keyboard accessory bar (up/down arrows + checkmark)
    scrollEnabled: true,
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      style: 'dark',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#0F2F44',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#0F2F44',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

import { supabase, getAccessToken } from '@/lib/supabase';

// App configuration parameters
export const appParams = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  // Token is now fetched async from Supabase session — use getToken() instead of appParams.token
  token: null,
  async getToken() {
    if (supabase) {
      return getAccessToken();
    }
    return null;
  },
};

import { supabase, getAccessToken } from '@/lib/supabase';
import { API_URL } from '@/api/apiClient';

// App configuration parameters
export const appParams = {
  apiUrl: API_URL,
  // Token is now fetched async from Supabase session — use getToken() instead of appParams.token
  token: null,
  async getToken() {
    if (supabase) {
      return getAccessToken();
    }
    return null;
  },
};

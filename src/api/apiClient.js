// ProjectIT REST API client
// Uses a JavaScript Proxy to dynamically handle any entity name
// so all pages work through a single unified interface.

import { supabase, getAccessToken } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function getToken() {
  // Get token from the shared session state (kept in sync by onAuthStateChange).
  // This waits for the initial session event so we never send an expired JWT.
  if (supabase) {
    return getAccessToken();
  }
  // Fallback to legacy localStorage token
  return localStorage.getItem('projectit_token');
}

async function authHeaders() {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path, options = {}) {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || `API error ${res.status}`);
    err.status = res.status;
    err.data = body;
    throw err;
  }

  return res.json();
}

// Entity proxy: api.entities.Project.list() etc.
function createEntityProxy(entityType) {
  return {
    async list(sort, limit) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return apiFetch(`/api/entities/${entityType}/list${qs ? `?${qs}` : ''}`);
    },

    async filter(filterObj, sort, limit) {
      return apiFetch(`/api/entities/${entityType}/filter`, {
        method: 'POST',
        body: JSON.stringify({ filter: filterObj, sort, limit }),
      });
    },

    async create(data) {
      return apiFetch(`/api/entities/${entityType}/create`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, data) {
      return apiFetch(`/api/entities/${entityType}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id) {
      return apiFetch(`/api/entities/${entityType}/${id}`, {
        method: 'DELETE',
      });
    },

    async bulkCreate(dataArray) {
      return apiFetch(`/api/entities/${entityType}/bulk-create`, {
        method: 'POST',
        body: JSON.stringify(dataArray),
      });
    },
  };
}

// Use JavaScript Proxy to dynamically handle any entity name
const entitiesProxy = new Proxy({}, {
  get(_, entityType) {
    return createEntityProxy(entityType);
  },
});

const auth = {
  async me() {
    return apiFetch('/api/auth/me');
  },

  async updateMe(data) {
    return apiFetch('/api/auth/update-me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('projectit_token');
    window.location.replace('/login');
  },

  redirectToLogin(returnUrl) {
    const url = returnUrl
      ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/login';
    window.location.replace(url);
  },
};

const integrations = {
  Core: {
    async InvokeLLM(params) {
      return apiFetch('/api/integrations/invoke-llm', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async UploadFile({ file }) {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/integrations/upload-file`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }
      return res.json();
    },

    async SendEmail(params) {
      return apiFetch('/api/integrations/send-email', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async SendSMS(params) {
      return apiFetch('/api/integrations/send-sms', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async ExtractDataFromUploadedFile(params) {
      return apiFetch('/api/integrations/extract-data', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async GenerateImage(params) {
      return apiFetch('/api/integrations/generate-image', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  },
};

const functions = {
  async invoke(functionName, body = {}) {
    return apiFetch(`/api/functions/${functionName}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

const users = {
  async inviteUser(email, role, fullName, avatarColor) {
    return apiFetch('/api/auth/invite', {
      method: 'POST',
      body: JSON.stringify({ email, full_name: fullName, role, avatar_color: avatarColor }),
    });
  },
  async deleteUser(email) {
    return apiFetch(`/api/auth/users/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
  },
  async resendInvite(email) {
    return apiFetch('/api/auth/resend-invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async sendOtp(email) {
    return apiFetch('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async verifyOtp(email, code) {
    return apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },
};

export const api = {
  entities: entitiesProxy,
  auth,
  integrations,
  functions,
  users,
};

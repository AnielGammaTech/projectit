// Self-hosted REST client — drop-in replacement for @base44/sdk
// Uses a JavaScript Proxy to dynamically handle any entity name
// so all 38+ pages continue to work with zero changes.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('projectit_token');
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
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

// Entity proxy: base44.entities.Project.list() etc.
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

  logout(redirectUrl) {
    localStorage.removeItem('projectit_token');
    if (redirectUrl) {
      window.location.href = '/login';
    } else {
      window.location.href = '/login';
    }
  },

  redirectToLogin(returnUrl) {
    const url = returnUrl
      ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/login';
    window.location.href = url;
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
      const token = getToken();
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

export const base44 = {
  entities: entitiesProxy,
  auth,
  integrations,
  functions,
};

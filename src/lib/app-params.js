// App configuration parameters
export const appParams = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  token: typeof window !== 'undefined' ? localStorage.getItem('projectit_token') : null,
};

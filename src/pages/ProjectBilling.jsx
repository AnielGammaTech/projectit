import { useEffect } from 'react';
import { createPageUrl } from '@/utils';

// Redirect old ProjectBilling to new ProjectTime page
export default function ProjectBilling() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    window.location.href = createPageUrl('ProjectTime') + (projectId ? `?id=${projectId}` : '');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Redirecting...</div>
    </div>
  );
}
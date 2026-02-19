import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Redirect old ProjectBilling to new ProjectTime page
export default function ProjectBilling() {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    navigate(createPageUrl('ProjectTime') + (projectId ? `?id=${projectId}` : ''), { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#151d2b] flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Redirecting...</div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Shield, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { differenceInDays, differenceInHours, format } from 'date-fns';

export default function MfaEnforcementGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mfaStatus, setMfaStatus] = useState({ checked: false, enabled: false, deadline: null });

  useEffect(() => {
    if (!user) return;

    // No deadline set — no enforcement
    if (!user.mfa_enforcement_deadline) {
      setMfaStatus({ checked: true, enabled: false, deadline: null });
      return;
    }

    const check = async () => {
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const enabled = factorsData?.totp?.some(f => f.status === 'verified') || false;

        setMfaStatus({
          checked: true,
          enabled,
          deadline: new Date(user.mfa_enforcement_deadline),
        });
      } catch {
        setMfaStatus({
          checked: true,
          enabled: false,
          deadline: new Date(user.mfa_enforcement_deadline),
        });
      }
    };
    check();
  }, [user]);

  // Still loading
  if (!mfaStatus.checked) return children;

  // No enforcement needed if MFA is enabled or no deadline set
  if (mfaStatus.enabled || !mfaStatus.deadline) return children;

  // Always allow access to SecuritySettings so users can set up MFA
  const currentPath = location.pathname.toLowerCase();
  if (currentPath === '/securitysettings') return children;

  const now = new Date();
  const deadlinePassed = now > mfaStatus.deadline;

  // HARD BLOCK: Deadline has passed, user MUST set up MFA
  if (deadlinePassed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#151d2b] px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#1e2a3a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Two-Factor Authentication Required
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your MFA setup deadline has passed. You must enable two-factor authentication to continue using ProjectIT.
          </p>
          <Link to={createPageUrl('SecuritySettings')}>
            <Button className="w-full bg-[#0069AF] hover:bg-[#133F5C]">
              <Shield className="w-4 h-4 mr-2" />
              Set Up 2FA Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // SOFT WARNING: Deadline approaching but not passed
  const daysLeft = differenceInDays(mfaStatus.deadline, now);
  const hoursLeft = differenceInHours(mfaStatus.deadline, now);

  return (
    <>
      <div className="fixed top-14 left-0 right-0 z-30 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              {daysLeft > 0
                ? `You must set up 2FA within ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (by ${format(mfaStatus.deadline, 'MMM d')})`
                : `You must set up 2FA within ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`
              }
            </span>
          </div>
          <Link to={createPageUrl('SecuritySettings')}>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              Set Up Now
            </Button>
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}

import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
  Shield, Smartphone, Key, Check, Copy,
  AlertTriangle, ChevronRight, Lock, Unlock, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Generate backup codes (stored in our DB, not Supabase)
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                 Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
  }
  return codes;
};

export default function SecuritySettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthSetup, setShowAuthSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Supabase MFA state
  const [enrolledFactorId, setEnrolledFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState([]);

  // MFA status from Supabase
  const [mfaFactors, setMfaFactors] = useState([]);
  const [loadingMfa, setLoadingMfa] = useState(true);

  // Security settings from our DB
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Load MFA factors from Supabase + settings from our DB
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadMfaStatus = async () => {
      setLoadingMfa(true);
      try {
        // Get enrolled factors from Supabase
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (!factorsError && factorsData) {
          setMfaFactors(factorsData.totp || []);
        }

        // Get our app-level security settings
        const secSettings = await api.entities.UserSecuritySettings.filter({ user_email: currentUser.email });
        if (secSettings.length > 0) {
          setSettings(secSettings[0]);
        }
      } catch (err) {
        console.error('Failed to load MFA status:', err);
      }
      setLoadingMfa(false);
    };

    loadMfaStatus();
  }, [currentUser?.email]);

  const is2FAEnabled = mfaFactors.some(f => f.status === 'verified');
  const activeFactor = mfaFactors.find(f => f.status === 'verified') || mfaFactors[0];

  const startAuthenticatorSetup = async () => {
    setError('');
    setSetupStep(1);
    setVerificationCode('');
    setQrCode('');
    setTotpSecret('');
    setShowAuthSetup(true);

    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'ProjectIT',
      });

      if (enrollError) {
        setError(enrollError.message);
        return;
      }

      setEnrolledFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
    } catch (err) {
      setError(err.message || 'Failed to start MFA setup');
    }
  };

  const handleAuthenticatorVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError('');
    setSaving(true);

    try {
      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrolledFactorId,
      });

      if (challengeError) {
        setError(challengeError.message);
        setSaving(false);
        return;
      }

      // Verify the TOTP code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrolledFactorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) {
        setError(verifyError.message);
        setSaving(false);
        return;
      }

      // Success — generate backup codes and save to our DB
      const backupCodes = generateBackupCodes();
      setGeneratedBackupCodes(backupCodes);

      const secData = {
        user_email: currentUser.email,
        two_factor_enabled: true,
        two_factor_method: 'authenticator',
        factor_id: enrolledFactorId,
        backup_codes: backupCodes,
        last_2fa_setup: new Date().toISOString(),
      };

      if (settings.id) {
        await api.entities.UserSecuritySettings.update(settings.id, secData);
      } else {
        await api.entities.UserSecuritySettings.create(secData);
      }

      // Refresh factors list
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      if (factorsData) {
        setMfaFactors(factorsData.totp || []);
      }

      // Reload settings
      const secSettings = await api.entities.UserSecuritySettings.filter({ user_email: currentUser.email });
      if (secSettings.length > 0) setSettings(secSettings[0]);

      setSaving(false);
      setSetupStep(3); // Show backup codes
    } catch (err) {
      setError(err.message || 'Verification failed');
      setSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    setSaving(true);
    setError('');

    try {
      // Unenroll from Supabase
      if (activeFactor?.id) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: activeFactor.id,
        });
        if (unenrollError) {
          toast.error(unenrollError.message);
          setSaving(false);
          return;
        }
      }

      // Update our DB
      if (settings.id) {
        await api.entities.UserSecuritySettings.update(settings.id, {
          two_factor_enabled: false,
          two_factor_method: 'none',
          factor_id: '',
          backup_codes: [],
        });
      }

      setMfaFactors([]);
      const secSettings = await api.entities.UserSecuritySettings.filter({ user_email: currentUser.email });
      if (secSettings.length > 0) setSettings(secSettings[0]);

      setSaving(false);
      setShowDisableConfirm(false);
      toast.success('Two-factor authentication disabled');
    } catch (err) {
      toast.error(err.message || 'Failed to disable 2FA');
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loadingMfa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#133F5C] dark:text-slate-100 tracking-tight">Security Settings</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Manage your account security and two-factor authentication</p>
        </motion.div>

        {/* 2FA Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1e2a3a] rounded-2xl border dark:border-slate-700/50 shadow-sm overflow-hidden mb-6"
        >
          <div className="p-6 border-b dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", is2FAEnabled ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30")}>
                  {is2FAEnabled ? <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <Unlock className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Two-Factor Authentication</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {is2FAEnabled ? 'Enabled via Authenticator App' : 'Add an extra layer of security to your account'}
                  </p>
                </div>
              </div>
              <Badge className={is2FAEnabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}>
                {is2FAEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>

          {is2FAEnabled ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Authenticator App</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Codes generated by your authenticator app</p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowBackupCodes(true)} className="flex-1">
                  <Key className="w-4 h-4 mr-2" />
                  View Backup Codes
                </Button>
                <Button variant="outline" onClick={() => setShowDisableConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Protect your account with a TOTP authenticator app:</p>
              <button onClick={startAuthenticatorSetup} className="w-full p-4 border dark:border-slate-700/50 rounded-xl hover:border-[#0069AF] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                      <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">Authenticator App</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Use Google Authenticator, Authy, or similar apps</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0069AF]" />
                </div>
              </button>
            </div>
          )}
        </motion.div>

        {/* Security Tips */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800/50 p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">Security Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" /><span>Enable two-factor authentication to protect your account</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" /><span>Store your backup codes in a safe place</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" /><span>Use a strong, unique password for your account</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" /><span>Never share your verification codes with anyone</span></li>
          </ul>
        </motion.div>

        {/* Authenticator Setup Modal */}
        <Dialog open={showAuthSetup} onOpenChange={(open) => { if (!open) setShowAuthSetup(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Up Authenticator App</DialogTitle>
              <DialogDescription>
                {setupStep === 1 && 'Scan the QR code or enter the secret key in your authenticator app'}
                {setupStep === 2 && 'Enter the 6-digit code from your authenticator app'}
                {setupStep === 3 && 'Save your backup codes in a safe place'}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3 border border-red-200 dark:border-red-800/50">
                {error}
              </div>
            )}

            {setupStep === 1 && (
              <div className="space-y-4 mt-4">
                <div className="flex justify-center p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl">
                  {qrCode ? (
                    <img src={qrCode} alt="Scan this QR code" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Or enter this secret key manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-700 break-all">{totpSecret || '...'}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(totpSecret)} disabled={!totpSecret}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
                <Button onClick={() => { setSetupStep(2); setError(''); }} disabled={!qrCode} className="w-full bg-[#0069AF] hover:bg-[#133F5C]">Continue</Button>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Verification Code</Label>
                  <Input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="mt-1 text-center text-2xl font-mono tracking-widest" maxLength={6} autoFocus />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setSetupStep(1); setError(''); }} className="flex-1">Back</Button>
                  <Button onClick={handleAuthenticatorVerify} disabled={verificationCode.length !== 6 || saving} className="flex-1 bg-[#0069AF] hover:bg-[#133F5C]">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify & Enable'}
                  </Button>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Save your backup codes</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">These codes can be used to access your account if you lose your device.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  {generatedBackupCodes.map((code, idx) => (
                    <code key={idx} className="text-sm font-mono bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-700 text-center">{code}</code>
                  ))}
                </div>
                <Button variant="outline" onClick={() => copyToClipboard(generatedBackupCodes.join('\n'))} className="w-full"><Copy className="w-4 h-4 mr-2" />Copy All Codes</Button>
                <Button onClick={() => { setShowAuthSetup(false); toast.success('Two-factor authentication enabled!'); }} className="w-full bg-[#0069AF] hover:bg-[#133F5C]">Done</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Backup Codes Modal */}
        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Backup Codes</DialogTitle>
              <DialogDescription>Use these codes to access your account if you lose your device</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                {(settings.backup_codes || []).map((code, idx) => (
                  <code key={idx} className="text-sm font-mono bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-700 text-center">{code}</code>
                ))}
              </div>
              <Button variant="outline" onClick={() => copyToClipboard((settings.backup_codes || []).join('\n'))} className="w-full"><Copy className="w-4 h-4 mr-2" />Copy All Codes</Button>
              <Button onClick={() => setShowBackupCodes(false)} className="w-full bg-[#0069AF] hover:bg-[#133F5C]">Done</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Disable 2FA Confirmation */}
        <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
              <AlertDialogDescription>This will make your account less secure. You can re-enable it at any time.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisable2FA} className="bg-red-600 hover:bg-red-700">{saving ? 'Disabling...' : 'Disable 2FA'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

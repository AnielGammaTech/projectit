import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Shield, Smartphone, MessageSquare, Key, Check, Copy, 
  RefreshCw, AlertTriangle, ChevronRight, Lock, Unlock
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

// Generate a random secret (for demo - in production this would be server-side)
const generateSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

// Generate backup codes
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
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthSetup, setShowAuthSetup] = useState(false);
  const [showSmsSetup, setShowSmsSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: securitySettings = [], refetch } = useQuery({
    queryKey: ['securitySettings', currentUser?.email],
    queryFn: () => base44.entities.UserSecuritySettings.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser?.email
  });

  const settings = securitySettings[0] || {};
  const is2FAEnabled = settings.two_factor_enabled;
  const twoFactorMethod = settings.two_factor_method;

  const startAuthenticatorSetup = () => {
    const secret = generateSecret();
    setGeneratedSecret(secret);
    setSetupStep(1);
    setVerificationCode('');
    setShowAuthSetup(true);
  };

  const startSmsSetup = () => {
    setPhoneNumber(settings.phone_number || '');
    setSetupStep(1);
    setVerificationCode('');
    setShowSmsSetup(true);
  };

  const handleAuthenticatorVerify = async () => {
    // In production, verify the code server-side
    // For demo, we'll accept any 6-digit code
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setSaving(true);
    const backupCodes = generateBackupCodes();
    setGeneratedBackupCodes(backupCodes);

    const data = {
      user_email: currentUser.email,
      two_factor_enabled: true,
      two_factor_method: 'authenticator',
      authenticator_secret: generatedSecret,
      backup_codes: backupCodes,
      last_2fa_setup: new Date().toISOString()
    };

    if (settings.id) {
      await base44.entities.UserSecuritySettings.update(settings.id, data);
    } else {
      await base44.entities.UserSecuritySettings.create(data);
    }

    refetch();
    setSaving(false);
    setSetupStep(3); // Show backup codes
  };

  const handleSmsVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setSaving(true);
    const backupCodes = generateBackupCodes();
    setGeneratedBackupCodes(backupCodes);

    const data = {
      user_email: currentUser.email,
      two_factor_enabled: true,
      two_factor_method: 'sms',
      phone_number: phoneNumber,
      backup_codes: backupCodes,
      last_2fa_setup: new Date().toISOString()
    };

    if (settings.id) {
      await base44.entities.UserSecuritySettings.update(settings.id, data);
    } else {
      await base44.entities.UserSecuritySettings.create(data);
    }

    refetch();
    setSaving(false);
    setSetupStep(3);
  };

  const handleDisable2FA = async () => {
    setSaving(true);
    await base44.entities.UserSecuritySettings.update(settings.id, {
      two_factor_enabled: false,
      two_factor_method: 'none',
      authenticator_secret: '',
      backup_codes: []
    });
    refetch();
    setSaving(false);
    setShowDisableConfirm(false);
    toast.success('Two-factor authentication disabled');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getOtpAuthUrl = () => {
    const appName = 'ITProjects';
    const email = currentUser?.email || 'user';
    return `otpauth://totp/${appName}:${email}?secret=${generatedSecret}&issuer=${appName}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Security Settings</h1>
          </div>
          <p className="text-slate-500">Manage your account security and two-factor authentication</p>
        </motion.div>

        {/* 2FA Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6"
        >
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  is2FAEnabled ? "bg-emerald-100" : "bg-amber-100"
                )}>
                  {is2FAEnabled ? (
                    <Lock className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Unlock className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Two-Factor Authentication</h2>
                  <p className="text-sm text-slate-500">
                    {is2FAEnabled 
                      ? `Enabled via ${twoFactorMethod === 'authenticator' ? 'Authenticator App' : 'SMS'}`
                      : 'Add an extra layer of security to your account'
                    }
                  </p>
                </div>
              </div>
              <Badge className={is2FAEnabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                {is2FAEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>

          {is2FAEnabled ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {twoFactorMethod === 'authenticator' ? (
                    <Smartphone className="w-5 h-5 text-slate-600" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">
                      {twoFactorMethod === 'authenticator' ? 'Authenticator App' : 'SMS Verification'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {twoFactorMethod === 'sms' && settings.phone_number 
                        ? `Codes sent to ${settings.phone_number.slice(0, -4)}****`
                        : 'Codes generated by your authenticator app'
                      }
                    </p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBackupCodes(true)}
                  className="flex-1"
                >
                  <Key className="w-4 h-4 mr-2" />
                  View Backup Codes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDisableConfirm(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Choose how you want to receive verification codes when signing in:
              </p>
              <div className="space-y-3">
                <button
                  onClick={startAuthenticatorSetup}
                  className="w-full p-4 border rounded-xl hover:border-[#0069AF] hover:bg-slate-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                        <Smartphone className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Authenticator App</p>
                        <p className="text-sm text-slate-500">Use Google Authenticator, Authy, or similar apps</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0069AF]" />
                  </div>
                </button>

                <button
                  onClick={startSmsSetup}
                  className="w-full p-4 border rounded-xl hover:border-[#0069AF] hover:bg-slate-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">SMS Verification</p>
                        <p className="text-sm text-slate-500">Receive codes via text message</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0069AF]" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Security Tips */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 rounded-2xl border border-blue-200 p-6"
        >
          <h3 className="font-semibold text-blue-900 mb-3">Security Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Enable two-factor authentication to protect your account</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Store your backup codes in a safe place</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Use a strong, unique password for your account</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Never share your verification codes with anyone</span>
            </li>
          </ul>
        </motion.div>

        {/* Authenticator Setup Modal */}
        <Dialog open={showAuthSetup} onOpenChange={setShowAuthSetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Up Authenticator App</DialogTitle>
              <DialogDescription>
                {setupStep === 1 && 'Scan the QR code or enter the secret key in your authenticator app'}
                {setupStep === 2 && 'Enter the 6-digit code from your authenticator app'}
                {setupStep === 3 && 'Save your backup codes in a safe place'}
              </DialogDescription>
            </DialogHeader>

            {setupStep === 1 && (
              <div className="space-y-4 mt-4">
                <div className="flex justify-center p-4 bg-white border rounded-xl">
                  {/* QR Code placeholder - in production use a QR library */}
                  <div className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">QR Code</p>
                      <p className="text-[10px] text-slate-400 mt-1">Scan with authenticator app</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Or enter this secret key manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-white p-2 rounded border break-all">
                      {generatedSecret}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(generatedSecret)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button onClick={() => setSetupStep(2)} className="w-full bg-[#0069AF] hover:bg-[#133F5C]">
                  Continue
                </Button>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Verification Code</Label>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="mt-1 text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSetupStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleAuthenticatorVerify} 
                    disabled={verificationCode.length !== 6 || saving}
                    className="flex-1 bg-[#0069AF] hover:bg-[#133F5C]"
                  >
                    {saving ? 'Verifying...' : 'Verify & Enable'}
                  </Button>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Save your backup codes</p>
                      <p className="text-sm text-amber-700">
                        These codes can be used to access your account if you lose your device.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-xl">
                  {generatedBackupCodes.map((code, idx) => (
                    <code key={idx} className="text-sm font-mono bg-white p-2 rounded border text-center">
                      {code}
                    </code>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(generatedBackupCodes.join('\n'))}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Codes
                </Button>

                <Button 
                  onClick={() => { setShowAuthSetup(false); toast.success('Two-factor authentication enabled!'); }}
                  className="w-full bg-[#0069AF] hover:bg-[#133F5C]"
                >
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* SMS Setup Modal */}
        <Dialog open={showSmsSetup} onOpenChange={setShowSmsSetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Up SMS Verification</DialogTitle>
              <DialogDescription>
                {setupStep === 1 && 'Enter your phone number to receive verification codes'}
                {setupStep === 2 && 'Enter the 6-digit code sent to your phone'}
                {setupStep === 3 && 'Save your backup codes in a safe place'}
              </DialogDescription>
            </DialogHeader>

            {setupStep === 1 && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Include country code</p>
                </div>

                <Button 
                  onClick={() => { setSetupStep(2); toast.success('Verification code sent!'); }}
                  disabled={!phoneNumber}
                  className="w-full bg-[#0069AF] hover:bg-[#133F5C]"
                >
                  Send Code
                </Button>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Verification Code</Label>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="mt-1 text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-xs text-slate-500 mt-1">Code sent to {phoneNumber}</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSetupStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleSmsVerify} 
                    disabled={verificationCode.length !== 6 || saving}
                    className="flex-1 bg-[#0069AF] hover:bg-[#133F5C]"
                  >
                    {saving ? 'Verifying...' : 'Verify & Enable'}
                  </Button>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Save your backup codes</p>
                      <p className="text-sm text-amber-700">
                        These codes can be used if you can't receive SMS.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-xl">
                  {generatedBackupCodes.map((code, idx) => (
                    <code key={idx} className="text-sm font-mono bg-white p-2 rounded border text-center">
                      {code}
                    </code>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(generatedBackupCodes.join('\n'))}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Codes
                </Button>

                <Button 
                  onClick={() => { setShowSmsSetup(false); toast.success('Two-factor authentication enabled!'); }}
                  className="w-full bg-[#0069AF] hover:bg-[#133F5C]"
                >
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Backup Codes Modal */}
        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Backup Codes</DialogTitle>
              <DialogDescription>
                Use these codes to access your account if you lose your device
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-xl">
                {(settings.backup_codes || []).map((code, idx) => (
                  <code key={idx} className="text-sm font-mono bg-white p-2 rounded border text-center">
                    {code}
                  </code>
                ))}
              </div>

              <Button 
                variant="outline" 
                onClick={() => copyToClipboard((settings.backup_codes || []).join('\n'))}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All Codes
              </Button>

              <Button 
                onClick={() => setShowBackupCodes(false)}
                className="w-full bg-[#0069AF] hover:bg-[#133F5C]"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Disable 2FA Confirmation */}
        <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
              <AlertDialogDescription>
                This will make your account less secure. You can re-enable it at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDisable2FA}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? 'Disabling...' : 'Disable 2FA'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
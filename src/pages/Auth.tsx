import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useRateLimit } from '@/hooks/useRateLimit';
import { useTrustedDevice } from '@/hooks/useTrustedDevice';
import { usePortalBranding } from '@/hooks/usePortalBranding';
import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted } from '@/lib/selfHostedConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, Lock, Mail, User, Fingerprint, Smartphone, AlertTriangle, KeyRound, Monitor, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<{ email: string; fullName: string } | null>(null);

  // Prevent redirecting away from /auth while we're enforcing MFA on login
  const [authGate, setAuthGate] = useState<'idle' | 'checking' | 'mfa'>('idle');

  // MFA state
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [trustThisDevice, setTrustThisDevice] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'choose' | 'totp' | 'email'>('choose');
  const [hasEmailOtp, setHasEmailOtp] = useState(false);
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [pendingMfaUserId, setPendingMfaUserId] = useState<string | null>(null);
  const { portalName, portalLogoUrl } = usePortalBranding();

  const { signIn, signUp, user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/';
  const {
    isLocked,
    remainingAttempts,
    formatRemainingTime,
    recordAttempt,
    reset: resetRateLimit,
  } = useRateLimit('auth', { maxAttempts: 5, windowMs: 60000, lockoutMs: 300000 });
  const { checkTrustedDevice, trustDevice } = useTrustedDevice();
  const {
    capabilities,
    isLoading: biometricLoading,
    hasBiometricSetup,
    biometricEmail,
    registerBiometric,
    authenticateWithBiometric,
  } = useBiometricAuth();

  useEffect(() => {
    if (user && authGate === 'idle') {
      navigate(returnTo);
    }
  }, [user, authGate, navigate, returnTo]);

  // Handle biometric login
  const handleBiometricLogin = async () => {
    const result = await authenticateWithBiometric();
    if (result) {
      // Show password field pre-filled with email for quick login
      setEmail(result.email);
      toast({
        title: 'Identity verified',
        description: 'Please enter your password to complete sign in.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        // Check rate limit before attempting login
        if (isLocked) {
          toast({
            title: 'Too many attempts',
            description: `Please wait ${formatRemainingTime()} before trying again.`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        // Record the attempt before making the request
        recordAttempt();
        setAuthGate('checking');

        const { error } = await signIn(email, password);
        if (error) {
          setAuthGate('idle');
          toast({
            title: 'Authentication Failed',
            description: remainingAttempts > 1 
              ? `${error.message}. ${remainingAttempts - 1} attempts remaining.`
              : error.message,
            variant: 'destructive',
          });
        } else {
          // In self-hosted mode, skip all Supabase MFA/trusted device checks
          if (isSelfHosted()) {
            setAuthGate('idle');
            resetRateLimit();
            toast({ title: 'Welcome back!', description: 'Successfully signed in.' });
            navigate(returnTo);
            return;
          }

          // Get the current user for trusted device check
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          // Check if MFA is enabled for this user
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');
          
          if (verifiedFactor && currentUser) {
            const isDeviceTrusted = await checkTrustedDevice(currentUser.id);
            if (isDeviceTrusted) {
              setAuthGate('idle');
              resetRateLimit();
              toast({ title: 'Welcome back!', description: 'Signed in from trusted device.' });
              navigate(returnTo);
              return;
            }
            
            // Check if email OTP is also enabled
            const { data: mfaSettings } = await supabase
              .from('user_mfa_settings')
              .select('email_otp_enabled')
              .eq('user_id', currentUser.id)
              .single();
            
            const emailOtpOn = mfaSettings?.email_otp_enabled || false;
            setHasEmailOtp(emailOtpOn);
            
            setAuthGate('mfa');
            setMfaFactorId(verifiedFactor.id);
            setPendingMfaUserId(currentUser.id);
            setMfaMethod(emailOtpOn ? 'choose' : 'totp');
            setShowMfaVerification(true);
            setLoading(false);
            return;
          }

          // Check email OTP only (no TOTP)
          if (currentUser) {
            const { data: mfaSettings } = await supabase
              .from('user_mfa_settings')
              .select('email_otp_enabled')
              .eq('user_id', currentUser.id)
              .single();
            
            if (mfaSettings?.email_otp_enabled) {
              const isDeviceTrusted = await checkTrustedDevice(currentUser.id);
              if (isDeviceTrusted) {
                setAuthGate('idle');
                resetRateLimit();
                toast({ title: 'Welcome back!', description: 'Signed in from trusted device.' });
                navigate(returnTo);
                return;
              }
              
              setHasEmailOtp(true);
              setAuthGate('mfa');
              setPendingMfaUserId(currentUser.id);
              setMfaMethod('email');
              setShowMfaVerification(true);
              setLoading(false);
              return;
            }
          }
          
          // Reset rate limit on successful login
          setAuthGate('idle');
          resetRateLimit();

          // Check if we should offer biometric setup
          if (capabilities?.canUseBiometrics && !hasBiometricSetup) {
            toast({
              title: 'Welcome back!',
              description: 'Successfully signed in.',
            });
          } else {
            toast({
              title: 'Welcome back!',
              description: 'Successfully signed in.',
            });
          }
          navigate(returnTo);
        }
      } else {
        const result = signupSchema.safeParse({ email, password, confirmPassword, fullName });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Registration Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to your Life OS.',
          });
          navigate(returnTo);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Offer biometric setup after login (shown once per session)
  useEffect(() => {
    if (session?.user && capabilities?.canUseBiometrics && !hasBiometricSetup) {
      const hasPrompted = sessionStorage.getItem('biometric_prompted');
      if (!hasPrompted) {
        setShowBiometricPrompt(true);
        setPendingUserId(session.user.id);
        setPendingUserData({ 
          email: session.user.email || '', 
          fullName: session.user.user_metadata?.full_name || '' 
        });
        sessionStorage.setItem('biometric_prompted', 'true');
      }
    }
  }, [session, capabilities, hasBiometricSetup]);

  const handleSetupBiometric = async () => {
    if (pendingUserId && pendingUserData) {
      const success = await registerBiometric(
        pendingUserId,
        pendingUserData.email,
        pendingUserData.fullName
      );
      if (success) {
        setShowBiometricPrompt(false);
      }
    }
  };

  const handleSkipBiometric = () => {
    setShowBiometricPrompt(false);
  };

  // Send email OTP
  const sendEmailOtp = async () => {
    setEmailOtpSending(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('send-email-otp', {
        body: { action: 'send' },
      });
      if (response.error) {
        toast({ title: 'Error', description: 'Failed to send verification code.', variant: 'destructive' });
      } else {
        setEmailOtpSent(true);
        toast({ title: 'Code Sent', description: 'A 6-digit code has been sent to your email.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send verification code.', variant: 'destructive' });
    }
    setEmailOtpSending(false);
  };

  // Handle TOTP MFA verification
  const handleMfaVerification = async () => {
    if (mfaMethod === 'totp') {
      if (!mfaFactorId || mfaCode.length !== 6 || mfaLoading) return;

      setMfaLoading(true);
      try {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: mfaFactorId,
        });

        if (challengeError) {
          toast({ title: 'Verification Failed', description: challengeError.message, variant: 'destructive' });
          return;
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeData.id,
          code: mfaCode,
        });

        if (verifyError) {
          toast({ title: 'Invalid Code', description: 'The verification code is incorrect.', variant: 'destructive' });
          setMfaCode('');
          return;
        }

        await completeMfaSuccess();
      } finally {
        setMfaLoading(false);
      }
    } else if (mfaMethod === 'email') {
      if (mfaCode.length !== 6 || mfaLoading) return;

      setMfaLoading(true);
      try {
        const response = await supabase.functions.invoke('send-email-otp', {
          body: { action: 'verify', code: mfaCode },
        });

        if (response.error || !response.data?.verified) {
          toast({ title: 'Invalid Code', description: 'The verification code is incorrect or expired.', variant: 'destructive' });
          setMfaCode('');
          return;
        }

        await completeMfaSuccess();
      } finally {
        setMfaLoading(false);
      }
    }
  };

  const completeMfaSuccess = async () => {
    if (trustThisDevice && pendingMfaUserId) {
      await trustDevice(pendingMfaUserId);
    }

    resetRateLimit();
    toast({
      title: 'Welcome back!',
      description: trustThisDevice
        ? 'Signed in with 2FA. This device is now trusted for 90 days.'
        : 'Successfully signed in with 2FA.',
    });
    setShowMfaVerification(false);
    setTrustThisDevice(false);
    setPendingMfaUserId(null);
    setMfaCode('');
    setMfaMethod('choose');
    setEmailOtpSent(false);
    setAuthGate('idle');
    navigate(returnTo);
  };

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (mfaCode.length === 6 && showMfaVerification && (mfaMethod === 'totp' || mfaMethod === 'email') && !mfaLoading) {
      handleMfaVerification();
    }
  }, [mfaCode, showMfaVerification, mfaMethod, mfaLoading]);

  const handleCancelMfa = async () => {
    await supabase.auth.signOut();
    setShowMfaVerification(false);
    setMfaFactorId(null);
    setMfaCode('');
    setTrustThisDevice(false);
    setPendingMfaUserId(null);
    setMfaMethod('choose');
    setEmailOtpSent(false);
    setAuthGate('idle');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
          >
            {portalLogoUrl ? (
              <img
                src={portalLogoUrl}
                alt={`${portalName} logo`}
                className="w-10 h-10 rounded-md object-contain"
              />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <span className="text-primary">{portalName}</span>
          </h1>
          <p className="text-muted-foreground">
            Your personal life management system
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-2xl p-8">
          {/* Biometric Login Option (Android only) */}
          <AnimatePresence mode="wait">
            {isLogin && hasBiometricSetup && capabilities?.canUseBiometrics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-primary/30 hover:bg-primary/10 hover:border-primary"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading}
                >
                  {biometricLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Fingerprint className="mr-2 h-5 w-5 text-primary" />
                  )}
                  <span className="flex flex-col items-start">
                    <span className="font-medium">Sign in with Fingerprint</span>
                    <span className="text-xs text-muted-foreground">{biometricEmail}</span>
                  </span>
                </Button>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Platform Notice for iOS */}
          {isLogin && capabilities?.isIOS && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 p-3 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Save your password to Safari for quick Face ID login on future visits.
                </p>
              </div>
            </motion.div>
          )}

          {/* Rate Limit Warning */}
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Too many failed attempts</p>
                  <p className="text-xs text-destructive/80">
                    Please wait {formatRemainingTime()} before trying again.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab Switcher */}
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Arif Mahmud Pranto"
                    className="pl-10 bg-muted/50 border-border focus:border-primary"
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  disabled={loading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-muted/50 border-border focus:border-primary"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          {/* Biometric Setup Option after login for Android users */}
          {capabilities?.canUseBiometrics && !hasBiometricSetup && isLogin && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              <Fingerprint className="inline-block w-3 h-3 mr-1" />
              Fingerprint login available after signing in
            </p>
          )}
        </div>

        {/* Security Note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          🔒 Your data is encrypted and secured with enterprise-grade protection
        </p>
      </motion.div>

      {/* Biometric Setup Modal */}
      <AnimatePresence>
        {showBiometricPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Enable Fingerprint Login?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in faster with your fingerprint on this device.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSetupBiometric}
                  className="w-full"
                  disabled={biometricLoading}
                >
                  {biometricLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="mr-2 h-4 w-4" />
                      Enable Fingerprint
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkipBiometric}
                  className="w-full text-muted-foreground"
                  disabled={biometricLoading}
                >
                  Maybe Later
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MFA Verification Modal */}
      <AnimatePresence>
        {showMfaVerification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full"
            >
              {/* Method chooser */}
              {mfaMethod === 'choose' && (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Two-Factor Authentication
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Choose your verification method
                    </p>
                  </div>
                  <div className="space-y-3">
                    {mfaFactorId && (
                      <Button
                        variant="outline"
                        className="w-full h-14 justify-start gap-3"
                        onClick={() => { setMfaMethod('totp'); setMfaCode(''); }}
                      >
                        <Smartphone className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Authenticator App</p>
                          <p className="text-xs text-muted-foreground">6-digit code from your app</p>
                        </div>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start gap-3"
                      onClick={() => { setMfaMethod('email'); setMfaCode(''); sendEmailOtp(); }}
                    >
                      <Mail className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Email Code</p>
                        <p className="text-xs text-muted-foreground">6-digit code sent to your email</p>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCancelMfa}
                      className="w-full text-muted-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {/* TOTP verification */}
              {mfaMethod === 'totp' && (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <KeyRound className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Authenticator Code
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} disabled={mfaLoading}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Checkbox id="trustDevice" checked={trustThisDevice} onCheckedChange={(checked) => setTrustThisDevice(checked === true)} disabled={mfaLoading} />
                      <div className="flex-1">
                        <Label htmlFor="trustDevice" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          Trust this device
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Skip 2FA for 90 days on this browser</p>
                      </div>
                    </div>

                    <Button onClick={handleMfaVerification} className="w-full" disabled={mfaCode.length !== 6 || mfaLoading}>
                      {mfaLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>) : (<><Shield className="mr-2 h-4 w-4" />Verify & Sign In</>)}
                    </Button>
                    {hasEmailOtp && (
                      <Button variant="ghost" onClick={() => { setMfaMethod('choose'); setMfaCode(''); }} className="w-full text-muted-foreground" disabled={mfaLoading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Other methods
                      </Button>
                    )}
                    <Button variant="ghost" onClick={handleCancelMfa} className="w-full text-muted-foreground" disabled={mfaLoading}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {/* Email OTP verification */}
              {mfaMethod === 'email' && (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Email Verification
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {emailOtpSent
                        ? 'Enter the 6-digit code sent to your email'
                        : 'Sending verification code to your email...'}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {emailOtpSending && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    {emailOtpSent && !emailOtpSending && (
                      <>
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} disabled={mfaLoading}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-border">
                          <Checkbox id="trustDeviceEmail" checked={trustThisDevice} onCheckedChange={(checked) => setTrustThisDevice(checked === true)} disabled={mfaLoading} />
                          <div className="flex-1">
                            <Label htmlFor="trustDeviceEmail" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-muted-foreground" />
                              Trust this device
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Skip 2FA for 90 days on this browser</p>
                          </div>
                        </div>

                        <Button onClick={handleMfaVerification} className="w-full" disabled={mfaCode.length !== 6 || mfaLoading}>
                          {mfaLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>) : (<><Shield className="mr-2 h-4 w-4" />Verify & Sign In</>)}
                        </Button>

                        <Button variant="link" onClick={sendEmailOtp} className="w-full text-sm" disabled={emailOtpSending}>
                          Resend code
                        </Button>
                      </>
                    )}
                    {mfaFactorId && (
                      <Button variant="ghost" onClick={() => { setMfaMethod('choose'); setMfaCode(''); }} className="w-full text-muted-foreground" disabled={mfaLoading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Other methods
                      </Button>
                    )}
                    <Button variant="ghost" onClick={handleCancelMfa} className="w-full text-muted-foreground" disabled={mfaLoading}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

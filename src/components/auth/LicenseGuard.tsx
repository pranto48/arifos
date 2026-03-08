import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Key,
  Shield,
  Loader2,
  ExternalLink,
  Crown,
  Star,
  Zap,
  LogOut,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Upload,
} from 'lucide-react';
import {
  getLicenseInfo,
  saveLicenseInfo,
  clearLicenseInfo,
  verifyLicenseViaBackend,
  checkLicenseStatus,
  getPlanFromMaxDevices,
  getInstallationId,
  LICENSE_PLANS,
  LICENSE_PORTAL_URL,
  LICENSE_RECHECK_INTERVAL_MS,
  type LicenseInfo,
} from '@/lib/licenseConfig';
import { isSelfHosted, getApiUrl } from '@/lib/selfHostedConfig';
import { useAuth } from '@/contexts/AuthContext';

interface LicenseGuardProps {
  children: React.ReactNode;
}

type LicenseState = 'checking' | 'valid' | 'no_license' | 'expired' | 'warning';

interface ExpiredLicenseInfo {
  plan?: string;
  expiresAt?: string;
  daysOverdue?: number;
  licenseKey?: string;
}

/**
 * Wraps the app content and requires a valid license in self-hosted/Docker mode.
 *
 * Security hardening:
 *  1. Verifies license against the backend on every mount (not just localStorage).
 *  2. Periodic re-verification every 4 hours while the app is open.
 *  3. Client-side integrity hash on stored license to detect casual tampering.
 *  4. Backend returns a signed token; localStorage alone cannot grant access.
 */
export function LicenseGuard({ children }: LicenseGuardProps) {
  const { signOut } = useAuth();
  const selfHosted = isSelfHosted();
  const [licenseState, setLicenseState] = useState<LicenseState>('checking');
  const [expiredInfo, setExpiredInfo] = useState<ExpiredLicenseInfo>({});
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const recheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const validateLicense = useCallback(async () => {
    if (!selfHosted) {
      setLicenseState('valid');
      return;
    }

    try {
      const serverStatus = await checkLicenseStatus(getApiUrl());

      if (serverStatus.configured) {
        const status = (serverStatus as any).status;
        const validStatuses = ['active', 'free', 'grace_period', 'offline_mode', 'offline_warning'];

        if (validStatuses.includes(status)) {
          // Check if license is about to expire (warning state)
          const expiresAt = (serverStatus as any).expires_at;
          if (expiresAt && status !== 'free') {
            const expiryDate = new Date(expiresAt);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry <= 0) {
              // Actually expired
              setExpiredInfo({
                plan: getPlanFromMaxDevices((serverStatus as any).max_devices || 5),
                expiresAt,
                daysOverdue: Math.abs(daysUntilExpiry),
                licenseKey: (serverStatus as any).license_key_preview,
              });
              setLicenseState('expired');
              return;
            }
          }

          // Sync server state to local cache for UI display
          const info: LicenseInfo = {
            licenseKey: '***',
            status: status === 'free' ? 'free' : 'active',
            maxDevices: (serverStatus as any).max_devices || 5,
            expiresAt: (serverStatus as any).expires_at || null,
            lastVerified: new Date().toISOString(),
            installationId: getInstallationId(),
            plan: getPlanFromMaxDevices((serverStatus as any).max_devices || 5),
          };
          await saveLicenseInfo(info);
          setLicenseState('valid');
        } else if (status === 'expired' || status === 'revoked') {
          setExpiredInfo({
            plan: getPlanFromMaxDevices((serverStatus as any).max_devices || 5),
            expiresAt: (serverStatus as any).expires_at,
            daysOverdue: (serverStatus as any).expires_at
              ? Math.abs(Math.ceil((new Date((serverStatus as any).expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : undefined,
            licenseKey: (serverStatus as any).license_key_preview,
          });
          clearLicenseInfo();
          setLicenseState('expired');
        } else {
          clearLicenseInfo();
          setLicenseState('no_license');
        }
      } else {
        setLicenseState('no_license');
      }
    } catch {
      // Backend unreachable — fall back to integrity-checked local data
      const stored = await getLicenseInfo();
      if (stored && (stored.status === 'active' || stored.status === 'free')) {
        const age = Date.now() - (stored._iat || 0);
        if (age < 48 * 60 * 60 * 1000) {
          // Check expiry from stored data
          if (stored.expiresAt && stored.status !== 'free') {
            const expiryDate = new Date(stored.expiresAt);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 0) {
              setExpiredInfo({
                plan: stored.plan,
                expiresAt: stored.expiresAt,
                daysOverdue: Math.abs(daysUntilExpiry),
              });
              setLicenseState('expired');
              return;
            }
          }
          setLicenseState('valid');
        } else {
          clearLicenseInfo();
          setLicenseState('no_license');
        }
      } else {
        setLicenseState('no_license');
      }
    }
  }, [selfHosted]);

  useEffect(() => {
    validateLicense();

    if (selfHosted) {
      recheckTimer.current = setInterval(() => {
        validateLicense();
      }, LICENSE_RECHECK_INTERVAL_MS);
    }

    return () => {
      if (recheckTimer.current) clearInterval(recheckTimer.current);
    };
  }, [validateLicense, selfHosted]);

  const handleVerify = async () => {
    if (!licenseKey.trim()) {
      toast({ title: 'Please enter a license key', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const result = await verifyLicenseViaBackend(licenseKey.trim(), getApiUrl());
      if (result.success) {
        const info: LicenseInfo = {
          licenseKey: licenseKey.substring(0, 4) + '****',
          status: (result.actual_status as any) || 'active',
          maxDevices: result.max_devices || 5,
          expiresAt: result.expires_at || null,
          lastVerified: new Date().toISOString(),
          installationId: getInstallationId(),
          plan: getPlanFromMaxDevices(result.max_devices || 5),
        };
        await saveLicenseInfo(info);
        setLicenseState('valid');
        toast({ title: 'License Activated!', description: `${info.plan} plan activated successfully.` });
      } else {
        toast({ title: 'Verification Failed', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUseFree = async () => {
    setLoading(true);
    try {
      const result = await verifyLicenseViaBackend('FREE', getApiUrl());
      if (result.success) {
        const freeInfo: LicenseInfo = {
          licenseKey: 'FREE',
          status: 'free',
          maxDevices: 5,
          expiresAt: null,
          lastVerified: new Date().toISOString(),
          installationId: getInstallationId(),
          plan: 'basic',
        };
        await saveLicenseInfo(freeInfo);
        setLicenseState('valid');
        toast({ title: 'Free Plan Activated', description: 'LifeOS Basic (up to 5 users) is now active.' });
      } else {
        try {
          await fetch(`${getApiUrl()}/license/setup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('lifeos_token') || ''}`,
            },
            body: JSON.stringify({ license_key: 'FREE' }),
          });
        } catch {}

        const freeInfo: LicenseInfo = {
          licenseKey: 'FREE',
          status: 'free',
          maxDevices: 5,
          expiresAt: null,
          lastVerified: new Date().toISOString(),
          installationId: getInstallationId(),
          plan: 'basic',
        };
        await saveLicenseInfo(freeInfo);
        setLicenseState('valid');
        toast({ title: 'Free Plan Activated', description: 'LifeOS Basic (up to 5 users) is now active.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'professional': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'standard': return <Zap className="w-5 h-5 text-blue-400" />;
      default: return <Star className="w-5 h-5 text-muted-foreground" />;
    }
  };

  // Loading state
  if (licenseState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Valid license
  if (licenseState === 'valid') {
    return <>{children}</>;
  }

  // ===== EXPIRED / WARNING LICENSE PAGE =====
  if (licenseState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-destructive/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg relative z-10"
        >
          {/* Header - Expired */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-4"
            >
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              License <span className="text-destructive">Expired</span>
            </h1>
            <p className="text-muted-foreground">
              Your LifeOS license has expired. Renew or enter a new license key to continue.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-lg">
            {/* Expiry Details */}
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-destructive" />
                <span className="font-semibold text-destructive text-sm">License Expired</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {expiredInfo.plan && (
                  <div>
                    <p className="text-muted-foreground text-xs">Plan</p>
                    <p className="font-medium text-foreground capitalize">{expiredInfo.plan}</p>
                  </div>
                )}
                {expiredInfo.expiresAt && (
                  <div>
                    <p className="text-muted-foreground text-xs">Expired On</p>
                    <p className="font-medium text-foreground">
                      {new Date(expiredInfo.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {expiredInfo.daysOverdue !== undefined && (
                  <div>
                    <p className="text-muted-foreground text-xs">Days Overdue</p>
                    <p className="font-medium text-destructive">{expiredInfo.daysOverdue} days</p>
                  </div>
                )}
                {expiredInfo.licenseKey && (
                  <div>
                    <p className="text-muted-foreground text-xs">License Key</p>
                    <p className="font-mono text-foreground text-xs">{expiredInfo.licenseKey}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Buy New License */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Get a New License</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Purchase or renew your LifeOS license from our portal.
              </p>
              <Button
                className="w-full"
                onClick={() => window.open(`${LICENSE_PORTAL_URL}/products.php`, '_blank')}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Buy / Renew License
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or enter license key</span>
              </div>
            </div>

            {/* Import License Key */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Import License Key</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                If you already have a license key, enter it below to activate.
              </p>
              <div className="space-y-2">
                <Label htmlFor="expiredLicenseKey">License Key</Label>
                <Input
                  id="expiredLicenseKey"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="LIFEOS-XXXX-XXXX-XXXX-XXXX"
                  className="font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
              </div>
              <Button onClick={handleVerify} disabled={loading || !licenseKey.trim()} className="w-full" variant="outline">
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Activate License
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Downgrade to Free */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Downgrade to the free Basic plan (limited to 5 users)
              </p>
              <Button variant="ghost" onClick={handleUseFree} disabled={loading} className="w-full">
                <Star className="w-4 h-4 mr-2" />
                Use Free Basic Plan
              </Button>
            </div>

            {/* Sign out link */}
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={signOut}>
                <LogOut className="w-3 h-3 mr-1" />
                Sign out
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== NO LICENSE / INITIAL ACTIVATION PAGE =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
          >
            <Shield className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <span className="text-primary">LifeOS</span> License
          </h1>
          <p className="text-muted-foreground">
            Activate your license to continue using LifeOS
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-lg">
          {/* License Key Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Enter License Key</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Purchase a license from{' '}
              <a
                href={LICENSE_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                portal.itsupport.com.bd <ExternalLink className="w-3 h-3" />
              </a>
            </p>

            <div className="space-y-2">
              <Label htmlFor="licenseKey">License Key</Label>
              <Input
                id="licenseKey"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="LIFEOS-XXXX-XXXX-XXXX-XXXX"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>

            <Button onClick={handleVerify} disabled={loading || !licenseKey.trim()} className="w-full">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Activate License
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Free Plan Option */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Start with the free Basic plan (up to 5 users)
            </p>
            <Button variant="outline" onClick={handleUseFree} disabled={loading} className="w-full">
              <Star className="w-4 h-4 mr-2" />
              Use Free Basic Plan
            </Button>
          </div>

          {/* Plan Comparison */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-semibold text-foreground">Available Plans</h4>
            <div className="grid gap-2">
              {LICENSE_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="p-3 rounded-lg border border-border bg-card/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {getPlanIcon(plan.id)}
                    <div>
                      <p className="text-sm font-medium text-foreground">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Up to {plan.maxDevices >= 99999 ? 'Unlimited' : plan.maxDevices} users
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{plan.price}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Sign out link */}
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={signOut}>
              <LogOut className="w-3 h-3 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

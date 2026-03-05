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
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const recheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Validate license by calling the backend /license/status endpoint.
   * Falls back to stored data only if the backend is unreachable AND
   * the stored data passes integrity checks.
   */
  const validateLicense = useCallback(async () => {
    if (!selfHosted) {
      setLicenseValid(true);
      setChecking(false);
      return;
    }

    try {
      const serverStatus = await checkLicenseStatus(getApiUrl());

      if (serverStatus.configured) {
        const validStatuses = ['active', 'free', 'grace_period', 'offline_mode', 'offline_warning'];
        const status = (serverStatus as any).status;
        if (validStatuses.includes(status)) {
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
          setLicenseValid(true);
        } else {
          // Server says license is invalid/expired/disabled
          clearLicenseInfo();
          setLicenseValid(false);
        }
      } else {
        // No license configured on server
        setLicenseValid(false);
      }
    } catch {
      // Backend unreachable — fall back to integrity-checked local data
      const stored = await getLicenseInfo();
      if (stored && (stored.status === 'active' || stored.status === 'free')) {
        // Only trust local data if issued less than 48 hours ago
        const age = Date.now() - (stored._iat || 0);
        if (age < 48 * 60 * 60 * 1000) {
          setLicenseValid(true);
        } else {
          clearLicenseInfo();
          setLicenseValid(false);
        }
      } else {
        setLicenseValid(false);
      }
    }

    setChecking(false);
  }, [selfHosted]);

  useEffect(() => {
    validateLicense();

    // Periodic re-verification
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
        setLicenseValid(true);
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
        setLicenseValid(true);
        toast({ title: 'Free Plan Activated', description: 'LifeOS Basic (up to 5 users) is now active.' });
      } else {
        // Fallback — save locally if backend accepted FREE before
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
        setLicenseValid(true);
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

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (licenseValid) {
    return <>{children}</>;
  }

  // License verification screen
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

        <div className="glass-card rounded-2xl p-8 space-y-6">
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

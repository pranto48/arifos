import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Key,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Crown,
  Star,
  Zap,
} from 'lucide-react';
import {
  getLicenseInfo,
  saveLicenseInfo,
  clearLicenseInfo,
  verifyLicenseViaBackend,
  getPlanFromMaxDevices,
  getInstallationId,
  LICENSE_PLANS,
  LICENSE_PORTAL_URL,
  type LicenseInfo,
} from '@/lib/licenseConfig';
import { getApiUrl } from '@/lib/selfHostedConfig';

export function LicenseSettings() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getLicenseInfo();
      if (stored) {
        setLicense(stored);
        setLicenseKey(stored.licenseKey);
      }
    })();
  }, []);

  const handleVerify = async () => {
    if (!licenseKey.trim()) {
      toast({ title: 'Please enter a license key', variant: 'destructive' });
      return;
    }

    setVerifying(true);
    try {
      const result = await verifyLicenseViaBackend(licenseKey, getApiUrl());

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
        setLicense(info);
        toast({ title: 'License Verified!', description: result.message });
      } else {
        toast({ title: 'License Verification Failed', description: result.message, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const handleRefresh = async () => {
    if (!license?.licenseKey) return;
    setLicenseKey(license.licenseKey);
    await handleVerify();
  };

  const handleDeactivate = () => {
    clearLicenseInfo();
    setLicense(null);
    setLicenseKey('');
    toast({ title: 'License Deactivated', description: 'Your license has been removed from this installation.' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'free':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Star className="w-3 h-3 mr-1" /> Free</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Revoked</Badge>;
      case 'in_use':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> In Use</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'professional': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'standard': return <Zap className="w-5 h-5 text-blue-400" />;
      default: return <Star className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current License Info */}
      {license && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPlanIcon(license.plan)}
              <div>
                <h3 className="font-semibold text-foreground capitalize">{license.plan} Plan</h3>
                <p className="text-xs text-muted-foreground">
                  Max {license.maxDevices >= 99999 ? 'Unlimited' : license.maxDevices} users
                </p>
              </div>
            </div>
            {getStatusBadge(license.status)}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">License Key</p>
              <p className="font-mono text-foreground text-xs">
                {license.licenseKey.slice(0, 8)}...{license.licenseKey.slice(-4)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expires</p>
              <p className="text-foreground">
                {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Installation ID</p>
              <p className="font-mono text-foreground text-xs truncate">{license.installationId.slice(0, 20)}...</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Verified</p>
              <p className="text-foreground">{new Date(license.lastVerified).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={verifying}>
              {verifying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Re-verify
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDeactivate}>
              Deactivate
            </Button>
          </div>
        </div>
      )}

      {/* Activate License */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{license ? 'Change License Key' : 'Activate License'}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter your LifeOS license key purchased from{' '}
          <a href={LICENSE_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
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
          />
        </div>

        <Button onClick={handleVerify} disabled={verifying || !licenseKey.trim()}>
          {verifying ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          {license ? 'Update License' : 'Activate License'}
        </Button>
      </div>

      {/* Plan Comparison */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Available Plans</h3>
        <div className="grid gap-3">
          {LICENSE_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`p-4 rounded-lg border transition-all ${
                license?.plan === plan.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card/50 hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPlanIcon(plan.id)}
                  <span className="font-semibold text-foreground">{plan.name}</span>
                </div>
                <span className="text-sm font-bold text-primary">{plan.price}</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {license?.plan !== plan.id && plan.id !== 'basic' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => window.open(`${LICENSE_PORTAL_URL}/products.php`, '_blank')}
                >
                  Purchase <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
              {license?.plan === plan.id && (
                <Badge className="mt-3 bg-primary/20 text-primary border-primary/30">Current Plan</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

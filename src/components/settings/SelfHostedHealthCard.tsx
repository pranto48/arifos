import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, AlertTriangle, Database, HardDriveDownload, RefreshCw, Server } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HealthIndicator {
  status: 'healthy' | 'warning' | 'offline';
  message: string;
}

interface SystemHealthResponse {
  timestamp: string;
  api: HealthIndicator & { responseTimeMs?: number | null };
  database: HealthIndicator;
  backup: HealthIndicator & { lastBackupAt: string | null };
  app: {
    version: string;
    buildHash: string;
    status: 'healthy' | 'warning';
    message: string;
  };
}

const statusBadgeClassNames: Record<HealthIndicator['status'], string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  offline: 'border-destructive/30 bg-destructive/15 text-destructive',
};

const statusLabel: Record<HealthIndicator['status'], string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  offline: 'Offline',
};

const appStatusLabel: Record<SystemHealthResponse['app']['status'], string> = {
  healthy: 'Healthy',
  warning: 'Warning',
};

const appStatusClassNames: Record<SystemHealthResponse['app']['status'], string> = {
  healthy: statusBadgeClassNames.healthy,
  warning: statusBadgeClassNames.warning,
};

function SystemHealthRow({
  icon: Icon,
  label,
  status,
  message,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  status: HealthIndicator['status'];
  message: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          <Badge variant="outline" className={cn('capitalize', statusBadgeClassNames[status])}>
            {statusLabel[status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        {detail ? <p className="text-xs text-muted-foreground/80">{detail}</p> : null}
      </div>
    </div>
  );
}

export function SelfHostedHealthCard() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('lifeos_token');
      const response = await fetch('/api/system/health', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Health request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as SystemHealthResponse;
      setHealth(payload);
    } catch (err) {
      setHealth(null);
      setError(err instanceof Error ? err.message : 'Unable to load system health.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const backupDetail = useMemo(() => {
    if (!health?.backup.lastBackupAt) {
      return 'No successful backup has been recorded yet.';
    }

    const backupDate = new Date(health.backup.lastBackupAt);
    return `Last backup ${formatDistanceToNow(backupDate, { addSuffix: true })} (${backupDate.toLocaleString()}).`;
  }, [health?.backup.lastBackupAt]);

  return (
    <Card className="mb-6 border-primary/20 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5" />
            Self-hosted system health
          </CardTitle>
          <CardDescription>
            Quick checks for your local API, database, backup freshness, and deployed app build.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={loadHealth} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">System health unavailable</p>
              <p>{error}. Verify the backend is reachable and try again.</p>
            </div>
          </div>
        ) : null}

        {!error && loading && !health ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Loading system health…
          </div>
        ) : null}

        {health ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <SystemHealthRow
                icon={Activity}
                label="API reachable"
                status={health.api.status}
                message={health.api.message}
                detail={health.api.responseTimeMs != null ? `Response time: ${health.api.responseTimeMs}ms.` : undefined}
              />
              <SystemHealthRow
                icon={Database}
                label="DB reachable"
                status={health.database.status}
                message={health.database.message}
              />
              <SystemHealthRow
                icon={HardDriveDownload}
                label="Last backup"
                status={health.backup.status}
                message={health.backup.message}
                detail={backupDetail}
              />
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                  <Server className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">App version / build</p>
                    <Badge variant="outline" className={cn(appStatusClassNames[health.app.status])}>
                      {appStatusLabel[health.app.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{health.app.message}</p>
                  <p className="text-xs text-muted-foreground/80">
                    Version {health.app.version} · Build {health.app.buildHash}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Last checked {new Date(health.timestamp).toLocaleString()}.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

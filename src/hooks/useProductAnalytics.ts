import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildAnalyticsSeries,
  getProductAnalyticsRows,
  isInternalAnalyticsEnabled,
  ProductAnalyticsRow,
  summarizeAnalytics,
} from '@/lib/productAnalytics';

export function useProductAnalytics(daysBack = 14) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState<ProductAnalyticsRow[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const analyticsEnabled = await isInternalAnalyticsEnabled();
      setEnabled(analyticsEnabled);
      if (!analyticsEnabled) {
        setRows([]);
        return;
      }

      const data = await getProductAnalyticsRows(user.id, daysBack);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [daysBack, user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [load, user]);

  const totals = useMemo(() => summarizeAnalytics(rows), [rows]);
  const series = useMemo(() => buildAnalyticsSeries(rows, daysBack), [daysBack, rows]);

  return { loading, enabled, rows, totals, series, reload: load };
}

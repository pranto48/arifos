import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted } from '@/lib/selfHostedConfig';

export const PRODUCT_ANALYTICS_EVENTS = {
  quickActionOpen: 'quick_action_open',
  aiActionRun: 'ai_action_run',
  plannerRefresh: 'planner_refresh',
  noteToTaskConversion: 'note_to_task_conversion',
  importCompleted: 'import_completed',
  importFailed: 'import_failed',
} as const;

export type ProductAnalyticsEventKey = typeof PRODUCT_ANALYTICS_EVENTS[keyof typeof PRODUCT_ANALYTICS_EVENTS];

export interface ProductAnalyticsRow {
  id: string;
  user_id: string;
  metric_date: string;
  event_key: ProductAnalyticsEventKey;
  event_count: number;
  source: string;
  created_at: string;
  updated_at: string;
}

let analyticsEnabledCache: boolean | null = null;
let analyticsEnabledPromise: Promise<boolean> | null = null;

export async function isInternalAnalyticsEnabled(): Promise<boolean> {
  if (!isSelfHosted()) return true;
  if (analyticsEnabledCache !== null) return analyticsEnabledCache;
  if (analyticsEnabledPromise) return analyticsEnabledPromise;

  analyticsEnabledPromise = supabase
    .from('app_settings')
    .select('internal_analytics_enabled')
    .eq('id', 'default')
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.warn('Failed to read internal analytics setting', error);
        analyticsEnabledCache = true;
        return true;
      }
      analyticsEnabledCache = data?.internal_analytics_enabled ?? true;
      return analyticsEnabledCache;
    })
    .finally(() => {
      analyticsEnabledPromise = null;
    });

  return analyticsEnabledPromise;
}

export function resetInternalAnalyticsSettingCache(enabled?: boolean) {
  analyticsEnabledCache = typeof enabled === 'boolean' ? enabled : null;
  analyticsEnabledPromise = null;
}

export async function trackProductAnalyticsEvent(eventKey: ProductAnalyticsEventKey, increment = 1) {
  if (!(await isInternalAnalyticsEnabled())) return null;

  const { data, error } = await supabase.rpc('increment_product_analytics_counter', {
    p_event_key: eventKey,
    p_increment: increment,
    p_metric_date: format(new Date(), 'yyyy-MM-dd'),
    p_source: isSelfHosted() ? 'selfhosted' : 'cloud',
  });

  if (error) {
    console.warn(`Failed to track analytics event ${eventKey}`, error);
    return null;
  }

  return data as ProductAnalyticsRow | null;
}

export async function getProductAnalyticsRows(userId: string, daysBack = 14) {
  const start = format(subDays(new Date(), daysBack - 1), 'yyyy-MM-dd');
  const end = format(new Date(), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('product_analytics_daily')
    .select('*')
    .eq('user_id', userId)
    .gte('metric_date', start)
    .lte('metric_date', end)
    .order('metric_date', { ascending: true });

  if (error) throw error;
  return (data || []) as ProductAnalyticsRow[];
}

export function buildAnalyticsSeries(rows: ProductAnalyticsRow[], daysBack = 14) {
  const days = Array.from({ length: daysBack }, (_, index) => {
    const date = subDays(new Date(), daysBack - index - 1);
    const key = format(date, 'yyyy-MM-dd');

    const base: Record<ProductAnalyticsEventKey | 'date' | 'label', number | string> = {
      date: key,
      label: format(date, 'MMM d'),
      quick_action_open: 0,
      ai_action_run: 0,
      planner_refresh: 0,
      note_to_task_conversion: 0,
      import_completed: 0,
      import_failed: 0,
    };

    for (const row of rows) {
      if (row.metric_date === key) {
        base[row.event_key] = row.event_count;
      }
    }

    return base;
  });

  return days;
}

export function summarizeAnalytics(rows: ProductAnalyticsRow[]) {
  return rows.reduce<Record<ProductAnalyticsEventKey, number>>((acc, row) => {
    acc[row.event_key] = (acc[row.event_key] || 0) + row.event_count;
    return acc;
  }, {
    quick_action_open: 0,
    ai_action_run: 0,
    planner_refresh: 0,
    note_to_task_conversion: 0,
    import_completed: 0,
    import_failed: 0,
  });
}

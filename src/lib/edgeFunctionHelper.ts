import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted } from '@/lib/selfHostedConfig';

/**
 * Invoke a Supabase Edge Function with graceful Docker/self-hosted fallback.
 * In self-hosted mode, the backend returns stub responses — this wrapper
 * detects that and returns a standardized { localMode: true } result so
 * callers can show an appropriate "not available" message instead of errors.
 */
export interface EdgeFunctionResult<T = any> {
  data: T | null;
  error: Error | null;
  localMode: boolean;
}

const LOCAL_MODE_FUNCTIONS = new Set([
  'google-calendar-sync',
  'microsoft-calendar-sync',
  'save-calendar-credentials',
  'send-push-notification',
  'send-email-notification',
  'send-email-otp',
  'send-smtp-email',
  'send-task-assignment-notification',
  'send-habit-reminders',
  'send-task-reminders',
  'send-family-event-reminders',
  'send-loan-reminders',
  'manage-resend-key',
  'ai-assist',
  'webhook-receiver',
  'workflow-trigger',
]);

export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
): Promise<EdgeFunctionResult<T>> {
  // In self-hosted mode, skip the call entirely for known cloud-only functions
  // and return a local-mode indicator so callers can handle gracefully.
  if (isSelfHosted() && LOCAL_MODE_FUNCTIONS.has(functionName)) {
    return {
      data: null,
      error: null,
      localMode: true,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });

    if (error) {
      return { data: null, error, localMode: false };
    }

    return { data: data as T, error: null, localMode: false };
  } catch (err: any) {
    return { data: null, error: err, localMode: false };
  }
}

/** Check if a feature is unavailable because we're in Docker/self-hosted mode */
export function isLocalModeFeature(functionName: string): boolean {
  return isSelfHosted() && LOCAL_MODE_FUNCTIONS.has(functionName);
}

import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';

export type AiActionType =
  | 'quick_action_plan_day'
  | 'quick_action_overdue_summary'
  | 'quick_action_weekly_review'
  | 'task_breakdown'
  | 'note_to_task'
  | 'planner_refresh';

export interface LogAiUsageParams {
  userId: string;
  actionType: AiActionType;
  inputSummary: string;
  resultSummary: string;
  source?: 'web' | 'docker';
}

export async function logAiUsage({ userId, actionType, inputSummary, resultSummary, source }: LogAiUsageParams) {
  const payload = {
    user_id: userId,
    action_type: actionType,
    input_summary: inputSummary,
    result_summary: resultSummary,
    source: source || (isSelfHosted() ? 'docker' : 'web'),
  };

  const { error } = await supabase.from('ai_usage_log').insert(payload);

  if (error && isSelfHosted()) {
    try {
      await selfHostedApi.insertBatch('ai_usage_log', [payload]);
      return;
    } catch {
      // Fall back to silent failure for non-critical telemetry.
    }
  }
}

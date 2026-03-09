import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { invokeEdgeFunction, isLocalModeFeature } from '@/lib/edgeFunctionHelper';

export interface AiConfig {
  provider: 'free' | 'openai' | 'openrouter' | 'custom';
  api_key_encrypted: string | null;
  model_preference: string;
  daily_usage_count: number;
  last_usage_date: string | null;
}

const FREE_DAILY_LIMIT = 10;

export function useAiAssist() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AiConfig | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('ai_config')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig(data as unknown as AiConfig);
        }
      });
  }, [user]);

  const getRemainingCalls = useCallback(() => {
    if (!config || config.provider !== 'free') return null;
    const today = new Date().toISOString().split('T')[0];
    if (config.last_usage_date !== today) return FREE_DAILY_LIMIT;
    return Math.max(0, FREE_DAILY_LIMIT - (config.daily_usage_count || 0));
  }, [config]);

  const callAi = useCallback(async (type: string, context: Record<string, any>) => {
    if (!user) return null;
    setLoading(true);
    try {
      // Graceful fallback for self-hosted/Docker mode
      if (isLocalModeFeature('ai-assist')) {
        toast.info('AI features are not available in self-hosted mode');
        return null;
      }

      const { data, error, localMode } = await invokeEdgeFunction('ai-assist', { type, context });

      if (localMode) {
        toast.info('AI features require cloud mode');
        return null;
      }

      if (error) {
        const msg = (error as any)?.message || 'AI request failed';
        toast.error(msg);
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      // Update local config
      if (data?.remaining !== null && data?.remaining !== undefined) {
        setConfig(prev => prev ? {
          ...prev,
          daily_usage_count: FREE_DAILY_LIMIT - data.remaining,
          last_usage_date: new Date().toISOString().split('T')[0],
        } : prev);
      }

      return data;
    } catch (err: any) {
      toast.error(err.message || 'AI service unavailable');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveConfig = useCallback(async (updates: Partial<AiConfig>) => {
    if (!user) return;
    const { error } = await supabase
      .from('ai_config')
      .upsert({
        user_id: user.id,
        ...updates,
      } as any, { onConflict: 'user_id' });

    if (error) {
      toast.error('Failed to save AI settings');
    } else {
      setConfig(prev => ({ ...prev, ...updates } as AiConfig));
      toast.success('AI settings saved');
    }
  }, [user]);

  const isAvailable = !isLocalModeFeature('ai-assist');

  return {
    loading,
    config,
    callAi,
    saveConfig,
    getRemainingCalls,
    isConfigured: !!config && config.provider !== 'free',
    isAvailable,
  };
}

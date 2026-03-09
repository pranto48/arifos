import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface TaskTemplate {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  category_id: string | null;
  task_type: string;
  schedule_type: string;
  schedule_config: any;
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  name: string;
  webhook_key: string;
  target_type: string;
  field_mapping: any;
  is_active: boolean;
  last_called_at: string | null;
  call_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowLog {
  id: string;
  rule_id: string;
  user_id: string;
  trigger_data: any;
  action_result: any;
  status: string;
  error_message: string | null;
  created_at: string;
}

export function useWorkflowAutomation() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [templatesRes, rulesRes, webhooksRes, logsRes] = await Promise.all([
        supabase.from('task_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('workflow_rules').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('webhooks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('workflow_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);
      if (templatesRes.data) setTemplates(templatesRes.data as any);
      if (rulesRes.data) setRules(rulesRes.data as any);
      if (webhooksRes.data) setWebhooks(webhooksRes.data as any);
      if (logsRes.data) setLogs(logsRes.data as any);
    } catch (err) {
      console.error('Failed to fetch workflow data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Task Templates
  const createTemplate = async (data: Partial<TaskTemplate>) => {
    if (!user) return;
    const { error } = await supabase.from('task_templates').insert({ ...data, user_id: user.id } as any);
    if (error) throw error;
    await fetchAll();
  };

  const updateTemplate = async (id: string, data: Partial<TaskTemplate>) => {
    const { error } = await supabase.from('task_templates').update(data as any).eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('task_templates').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  const generateTaskFromTemplate = async (template: TaskTemplate) => {
    if (!user) return;
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: template.title,
      description: template.description,
      priority: template.priority,
      category_id: template.category_id,
      task_type: template.task_type,
      status: 'todo',
    });
    if (error) throw error;
    await supabase.from('task_templates').update({ last_generated_at: new Date().toISOString() } as any).eq('id', template.id);
    toast({ title: 'Task created from template', description: `"${template.title}" has been added to your tasks.` });
    window.dispatchEvent(new CustomEvent('tasks-updated'));
    await fetchAll();
  };

  // Workflow Rules
  const createRule = async (data: Partial<WorkflowRule>) => {
    if (!user) return;
    const { error } = await supabase.from('workflow_rules').insert({ ...data, user_id: user.id } as any);
    if (error) throw error;
    await fetchAll();
  };

  const updateRule = async (id: string, data: Partial<WorkflowRule>) => {
    const { error } = await supabase.from('workflow_rules').update(data as any).eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('workflow_rules').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    await updateRule(id, { is_active: isActive } as any);
  };

  // Webhooks
  const createWebhook = async (data: Partial<Webhook>) => {
    if (!user) return;
    const { error } = await supabase.from('webhooks').insert({ ...data, user_id: user.id } as any);
    if (error) throw error;
    await fetchAll();
  };

  const deleteWebhook = async (id: string) => {
    const { error } = await supabase.from('webhooks').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('webhooks').update({ is_active: isActive } as any).eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  return {
    templates, rules, webhooks, logs, loading,
    createTemplate, updateTemplate, deleteTemplate, generateTaskFromTemplate,
    createRule, updateRule, deleteRule, toggleRule,
    createWebhook, deleteWebhook, toggleWebhook,
    refetch: fetchAll,
  };
}

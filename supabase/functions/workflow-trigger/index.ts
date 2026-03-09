import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, trigger_type, trigger_data } = await req.json();

    if (!user_id || !trigger_type) {
      return new Response(JSON.stringify({ error: 'Missing user_id or trigger_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find matching active rules
    const { data: rules, error: rulesError } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('user_id', user_id)
      .eq('trigger_type', trigger_type)
      .eq('is_active', true);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: 'No matching rules', executed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let executed = 0;

    for (const rule of rules) {
      try {
        // Check trigger config filters
        const config = rule.trigger_config || {};
        if (config.task_type && config.task_type !== 'any' && trigger_data?.task_type !== config.task_type) {
          continue;
        }

        let actionResult: any = null;

        // Execute action
        if (rule.action_type === 'create_task') {
          const actionConfig = rule.action_config || {};
          const { data, error } = await supabase.from('tasks').insert({
            user_id,
            title: actionConfig.title || `Follow-up: ${trigger_data?.title || 'Task'}`,
            description: actionConfig.description || null,
            priority: actionConfig.priority || 'medium',
            status: 'todo',
            task_type: trigger_data?.task_type || 'office',
          }).select().single();
          if (error) throw error;
          actionResult = data;
        } else if (rule.action_type === 'create_notification') {
          const actionConfig = rule.action_config || {};
          const { data, error } = await supabase.from('app_notifications').insert({
            user_id,
            type: 'workflow',
            title: actionConfig.title || 'Workflow Triggered',
            message: actionConfig.message || `Triggered by: ${trigger_type}`,
          }).select().single();
          if (error) throw error;
          actionResult = data;
        }

        // Log execution
        await supabase.from('workflow_logs').insert({
          rule_id: rule.id,
          user_id,
          trigger_data,
          action_result: actionResult,
          status: 'success',
        });

        // Update rule stats
        await supabase.from('workflow_rules').update({
          execution_count: (rule.execution_count || 0) + 1,
          last_executed_at: new Date().toISOString(),
        }).eq('id', rule.id);

        executed++;
      } catch (ruleErr: any) {
        await supabase.from('workflow_logs').insert({
          rule_id: rule.id,
          user_id,
          trigger_data,
          status: 'error',
          error_message: ruleErr.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, executed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Workflow trigger error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

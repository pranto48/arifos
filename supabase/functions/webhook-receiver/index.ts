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
    const url = new URL(req.url);
    const webhookKey = url.searchParams.get('key');

    if (!webhookKey) {
      return new Response(JSON.stringify({ error: 'Missing webhook key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up webhook
    const { data: webhook, error: whError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('webhook_key', webhookKey)
      .eq('is_active', true)
      .single();

    if (whError || !webhook) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive webhook' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));

    // Process based on target type
    let result: any = null;
    if (webhook.target_type === 'task') {
      const { data, error } = await supabase.from('tasks').insert({
        user_id: webhook.user_id,
        title: body.title || 'Webhook Task',
        description: body.description || null,
        priority: body.priority || 'medium',
        status: 'todo',
        task_type: body.task_type || 'office',
        due_date: body.due_date || null,
      }).select().single();
      if (error) throw error;
      result = data;
    } else if (webhook.target_type === 'note') {
      const { data, error } = await supabase.from('notes').insert({
        user_id: webhook.user_id,
        title: body.title || 'Webhook Note',
        content: body.content || '',
        note_type: body.note_type || 'office',
      }).select().single();
      if (error) throw error;
      result = data;
    } else if (webhook.target_type === 'notification') {
      const { data, error } = await supabase.from('app_notifications').insert({
        user_id: webhook.user_id,
        type: 'webhook',
        title: body.title || 'Webhook Notification',
        message: body.message || '',
      }).select().single();
      if (error) throw error;
      result = data;
    }

    // Update webhook stats
    await supabase.from('webhooks').update({
      call_count: (webhook.call_count || 0) + 1,
      last_called_at: new Date().toISOString(),
    }).eq('id', webhook.id);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

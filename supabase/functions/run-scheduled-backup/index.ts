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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date().toISOString();

    // Find schedules that are due
    const { data: schedules, error: fetchErr } = await supabase
      .from('backup_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_backup_at', now);

    if (fetchErr) throw fetchErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;

    for (const schedule of schedules) {
      const userId = schedule.user_id;

      // Export user data from key tables
      const tables = ['tasks', 'notes', 'transactions', 'goals', 'projects', 'habits', 'family_members', 'family_events', 'investments', 'loans'];
      const backupData: Record<string, any[]> = {};

      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', userId);
        backupData[table] = data || [];
      }

      const backupJson = JSON.stringify({
        version: '3.0',
        format: 'universal',
        created_at: now,
        user_id: userId,
        tables: backupData,
      });

      // Upload to storage
      const fileName = `${userId}/backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await supabase.storage
        .from('attachments')
        .upload(fileName, new Blob([backupJson], { type: 'application/json' }), {
          contentType: 'application/json',
          upsert: false,
        });

      // Calculate next backup time
      let nextBackup = new Date();
      switch (schedule.frequency) {
        case 'daily':
          nextBackup.setDate(nextBackup.getDate() + 1);
          break;
        case 'weekly':
          nextBackup.setDate(nextBackup.getDate() + 7);
          break;
        case 'monthly':
          nextBackup.setMonth(nextBackup.getMonth() + 1);
          break;
      }

      await supabase
        .from('backup_schedules')
        .update({
          last_backup_at: now,
          next_backup_at: nextBackup.toISOString(),
        })
        .eq('id', schedule.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all recurring transactions
    const { data: recurring, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .not('recurring_pattern', 'is', null);

    if (fetchErr) throw fetchErr;
    if (!recurring || recurring.length === 0) {
      return new Response(JSON.stringify({ generated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let generated = 0;

    for (const tx of recurring) {
      const lastDate = new Date(tx.date);
      let nextDate: Date | null = null;

      switch (tx.recurring_pattern) {
        case 'daily':
          nextDate = new Date(lastDate);
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate = new Date(lastDate);
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate = new Date(lastDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDate = new Date(lastDate);
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      if (!nextDate) continue;
      const nextDateStr = nextDate.toISOString().split('T')[0];

      // Only generate if next date is today or in the past
      if (nextDateStr > todayStr) continue;

      // Check if already generated for this date
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', tx.user_id)
        .eq('date', nextDateStr)
        .eq('merchant', tx.merchant)
        .eq('amount', tx.amount)
        .eq('type', tx.type)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Create new transaction
      const { error: insertErr } = await supabase.from('transactions').insert({
        user_id: tx.user_id,
        amount: tx.amount,
        type: tx.type,
        merchant: tx.merchant,
        category_id: tx.category_id,
        date: nextDateStr,
        notes: `Auto-generated from recurring: ${tx.notes || tx.merchant || ''}`,
        account: tx.account,
        is_recurring: true,
        recurring_pattern: tx.recurring_pattern,
      });

      if (!insertErr) {
        generated++;
        // Update original transaction date to the new date
        await supabase.from('transactions').update({ date: nextDateStr }).eq('id', tx.id);
      }
    }

    return new Response(JSON.stringify({ generated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

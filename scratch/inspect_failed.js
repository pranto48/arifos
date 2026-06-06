import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const email = 'mail@arifmahmud.com';
const password = 'a329093+';

async function inspectSpecific() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  await supabase.auth.signInWithPassword({ email, password });
  
  const { data: cat } = await supabase.from('budget_categories').select('*').eq('id', 'f4a8d7c8-0ddd-4f33-8e79-0fd2acd55a54').maybeSingle();
  console.log('Category contents:', JSON.stringify(cat, null, 2));
}

inspectSpecific();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const email = 'mail@arifmahmud.com';
const password = 'a329093+';

const failedIds = [
  '504003e6-b4e0-49c0-bf0f-29e85342939d',
  'a4d9732a-f803-4070-a7b7-2945735ceb2c'
];

async function inspectFailed() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const { data: supaAuth } = await supabase.auth.signInWithPassword({ email, password });
  
  const { data: categories } = await supabase.from('budget_categories').select('*');
  
  for (const cat of categories || []) {
    if (failedIds.includes(cat.id)) {
      console.log('Failed Category:', JSON.stringify(cat, null, 2));
    }
  }
}

inspectFailed();

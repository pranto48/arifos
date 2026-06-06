import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const email = 'mail@arifmahmud.com';
const password = 'a329093+';

async function inspectProfiles() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const { data: supaAuth } = await supabase.auth.signInWithPassword({ email, password });
  const supaUid = supaAuth.user.id;
  console.log('User UID in Supabase:', supaUid);

  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('\n--- profiles ---');
  for (const prof of profiles || []) {
    console.log(JSON.stringify(prof, null, 2));
  }
}

inspectProfiles();

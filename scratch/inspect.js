import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const email = 'mail@arifmahmud.com';
const password = 'a329093+';

async function inspect() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const { data: supaAuth } = await supabase.auth.signInWithPassword({ email, password });
  const supaUid = supaAuth.user.id;
  console.log('User UID in Supabase:', supaUid);

  // Inspect budget_categories
  const { data: categories } = await supabase.from('budget_categories').select('*');
  console.log('\n--- budget_categories ---');
  for (const cat of categories || []) {
    if (cat.user_id !== supaUid) {
      console.log(`Mismatch in budget_categories (ID: ${cat.id}): user_id=${cat.user_id}, expected=${supaUid}`);
    }
  }

  // Inspect tasks
  const { data: tasks } = await supabase.from('tasks').select('*');
  console.log('\n--- tasks ---');
  let mismatchCount = 0;
  for (const task of tasks || []) {
    if (task.user_id !== supaUid) {
      mismatchCount++;
      console.log(`Mismatch in tasks (ID: ${task.id}): user_id=${task.user_id}, expected=${supaUid}`);
    }
  }
  console.log(`Total mismatching tasks: ${mismatchCount} out of ${tasks?.length || 0}`);
}

inspect();

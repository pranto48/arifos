import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import crypto from 'crypto';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const email = 'mail@arifmahmud.com';
const password = 'Aa329093+-';

const tables = [
  'profiles',
  'budget_categories',
  'tasks',
  'task_checklists',
  'notes',
  'transactions',
  'budgets',
  'salary_entries',
  'investments',
  'goals',
  'goal_milestones',
  'projects',
  'attachments',
  'audit_logs',
  'backup_schedules',
  'custom_form_fields',
  'device_categories',
  'device_disposals',
  'device_inventory',
  'device_service_history',
  'device_suppliers',
  'email_otp_codes',
  'family_documents',
  'family_events',
  'family_member_connections',
  'family_members',
  'habit_completions',
  'habits',
  'loan_payments',
  'loans',
  'notification_preferences',
  'pomodoro_settings',
  'product_analytics_daily',
  'project_milestones',
  'push_subscriptions',
  'support_departments',
  'support_units',
  'support_user_devices',
  'support_users',
  'synced_calendar_events',
  'task_assignments',
  'task_categories',
  'task_follow_up_notes',
  'task_templates',
  'ticket_activity_log',
  'ticket_categories',
  'ticket_comments',
  'ticket_form_fields',
  'ticket_requesters',
  'time_entries',
  'trusted_devices',
  'user_mfa_settings',
  'user_roles',
  'user_sessions',
  'user_webauthn_credentials',
  'user_workspace_permissions',
  'webhooks',
  'workflow_logs',
  'workflow_rules',
  'app_settings',
  'app_secrets',
  'smtp_settings',
  'form_field_config',
  'support_tickets'
];

async function runMigration() {
  console.log('Starting migration script...');
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL or Key is missing from .env');
    return;
  }

  // Initialize Supabase Client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Authenticate in Supabase
  console.log(`Authenticating to Supabase as ${email}...`);
  const { data: supaAuth, error: supaAuthErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (supaAuthErr || !supaAuth.user) {
    console.error('Failed to authenticate with Supabase:', supaAuthErr);
    return;
  }

  const supaUid = supaAuth.user.id;
  console.log(`Authenticated with Supabase. User UID: ${supaUid}`);

  // Initialize Firebase Client
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Authenticate in Firebase
  console.log(`Authenticating to Firebase as ${email}...`);
  let fbUser;
  try {
    const fbAuth = await signInWithEmailAndPassword(auth, email, password);
    fbUser = fbAuth.user;
  } catch (fbAuthErr) {
    console.error('Failed to authenticate with Firebase:', fbAuthErr);
    return;
  }

  const fbUid = fbUser.uid;
  console.log(`Authenticated with Firebase. User UID: ${fbUid}`);

  // Migrate each table
  for (const table of tables) {
    console.log(`Migrating table: ${table}...`);
    
    // Fetch data from Supabase
    // Using select('*') will fetch rows filtered by RLS or all rows for system tables
    const { data: rows, error: readErr } = await supabase.from(table).select('*');
    
    if (readErr) {
      console.warn(`Warning: Failed to read from table ${table}. It may not exist or permission is denied:`, readErr.message);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`Table ${table} has 0 rows. Skipping.`);
      continue;
    }

    console.log(`Fetched ${rows.length} rows from table ${table}. Uploading to Firestore...`);

    let count = 0;
    for (const row of rows) {
      // Map user_id references
      const mappedRow = { ...row };
      
      if (mappedRow.user_id === supaUid) {
        mappedRow.user_id = fbUid;
      }
      
      // Handle task assignments mapping (assigned_by / assigned_to)
      if (mappedRow.assigned_by === supaUid) {
        mappedRow.assigned_by = fbUid;
      }
      if (mappedRow.assigned_to === supaUid) {
        mappedRow.assigned_to = fbUid;
      }

      // Determine Firestore Doc ID
      // If table is 'profiles', use user_id directly as the document ID (matches our shim structure)
      // Otherwise, use row.id or a generated UUID
      const docId = table === 'profiles' ? fbUid : (mappedRow.id || crypto.randomUUID());
      if (table !== 'profiles' && !mappedRow.id) {
        mappedRow.id = docId;
      }

      try {
        await setDoc(doc(db, table, docId), mappedRow);
        count++;
      } catch (writeErr: any) {
        console.error(`Failed to write row to Firestore collection ${table} (ID: ${docId}):`, writeErr.message);
      }
    }

    console.log(`Successfully migrated ${count}/${rows.length} rows for ${table}`);
  }

  console.log('Migration completed successfully!');
}

runMigration().catch(err => {
  console.error('Unhandled migration error:', err);
});

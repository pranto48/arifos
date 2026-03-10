-- LifeOS Data Tables for Self-Hosted installations
-- These tables store the main application data (tasks, notes, goals, etc.)

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMPTZ,
    category_id UUID,
    project_id UUID,
    goal_id UUID,
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern TEXT,
    tags TEXT[],
    task_type TEXT DEFAULT 'office',
    sort_order INTEGER DEFAULT 0,
    estimated_time INTEGER,
    support_user_id UUID,
    custom_fields JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    encrypted_content TEXT,
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    is_vault BOOLEAN DEFAULT false,
    note_type TEXT DEFAULT 'note',
    project_id UUID,
    custom_fields JSONB,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category_id UUID,
    merchant TEXT,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    account TEXT DEFAULT 'cash',
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern TEXT,
    attachment_url TEXT,
    family_member_id UUID,
    linked_entity_id UUID,
    linked_entity_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    goal_type TEXT DEFAULT 'office',
    category TEXT DEFAULT 'personal',
    status TEXT DEFAULT 'active',
    target_amount NUMERIC,
    current_amount NUMERIC DEFAULT 0,
    target_date DATE,
    is_next_year_plan BOOLEAN DEFAULT false,
    custom_fields JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investments
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    principal NUMERIC NOT NULL,
    current_value NUMERIC,
    purchase_date DATE,
    maturity_date DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurring_amount NUMERIC,
    recurring_pattern TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'idea',
    priority TEXT DEFAULT 'medium',
    project_type TEXT DEFAULT 'office',
    tags TEXT[] DEFAULT '{}',
    target_date DATE,
    custom_fields JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Entries
CREATE TABLE IF NOT EXISTS public.salary_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    gross_amount NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    allowances NUMERIC,
    deductions NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'CheckCircle',
    color TEXT DEFAULT '#22c55e',
    frequency TEXT DEFAULT 'daily',
    target_per_day INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT false,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_time TIME DEFAULT '08:00:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Members
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    date_of_birth DATE,
    avatar_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Events
CREATE TABLE IF NOT EXISTS public.family_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    event_type TEXT DEFAULT 'birthday',
    event_date DATE NOT NULL,
    family_member_id UUID,
    reminder_days INTEGER DEFAULT 7,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Categories
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_income BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    category_id UUID,
    amount NUMERIC DEFAULT 0,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Categories
CREATE TABLE IF NOT EXISTS public.task_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT,
    category_type TEXT DEFAULT 'office',
    is_admin_category BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit Completions
CREATE TABLE IF NOT EXISTS public.habit_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL,
    user_id UUID NOT NULL,
    completed_at DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Milestones
CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Checklists
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Follow-up Notes
CREATE TABLE IF NOT EXISTS public.task_follow_up_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignments
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    assigned_by UUID NOT NULL,
    assigned_to UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    message TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Member Connections
CREATE TABLE IF NOT EXISTS public.family_member_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    member_id_1 UUID NOT NULL,
    member_id_2 UUID NOT NULL,
    connection_type TEXT DEFAULT 'spouse',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Documents
CREATE TABLE IF NOT EXISTS public.family_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    family_member_id UUID,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lender_name TEXT NOT NULL,
    loan_type TEXT DEFAULT 'personal',
    principal_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    interest_rate NUMERIC,
    monthly_payment NUMERIC,
    payment_frequency TEXT DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    next_payment_date DATE,
    status TEXT DEFAULT 'active',
    reminder_days INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan Payments
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    loan_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMPTZ,
    transaction_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup Schedules
CREATE TABLE IF NOT EXISTS public.backup_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    frequency TEXT NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    last_backup_at TIMESTAMPTZ,
    next_backup_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Disposals
CREATE TABLE IF NOT EXISTS public.device_disposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    device_id UUID NOT NULL,
    disposal_method TEXT NOT NULL DEFAULT 'recycled',
    disposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    disposal_reason TEXT,
    disposal_value NUMERIC,
    buyer_info TEXT,
    certificate_number TEXT,
    approved_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support User Devices
CREATE TABLE IF NOT EXISTS public.support_user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    support_user_id UUID NOT NULL,
    device_name TEXT NOT NULL,
    device_handover_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Categories
CREATE TABLE IF NOT EXISTS public.ticket_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Requesters
CREATE TABLE IF NOT EXISTS public.ticket_requesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    category_id UUID,
    requester_id UUID,
    assigned_to UUID,
    device_id UUID,
    custom_fields JSONB,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Comments
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Activity Log
CREATE TABLE IF NOT EXISTS public.ticket_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Form Fields
CREATE TABLE IF NOT EXISTS public.ticket_form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    category_id UUID,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text',
    field_label TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    field_options JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    is_vault BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMTP Settings
CREATE TABLE IF NOT EXISTS public.smtp_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER DEFAULT 587,
    smtp_username TEXT NOT NULL,
    smtp_password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT DEFAULT 'LifeOS',
    use_tls BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    updated_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Secrets
CREATE TABLE IF NOT EXISTS public.app_secrets (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Calendar Sync
CREATE TABLE IF NOT EXISTS public.google_calendar_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    calendar_id TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    sync_token TEXT,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced Calendar Events
CREATE TABLE IF NOT EXISTS public.synced_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    google_event_id TEXT NOT NULL,
    local_event_id UUID NOT NULL,
    local_event_type TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email OTP Codes
CREATE TABLE IF NOT EXISTS public.email_otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Code Settings
CREATE TABLE IF NOT EXISTS public.qr_code_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    fields JSONB DEFAULT '[]',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Additional Tables (previously missing in Docker init)
-- ========================

-- AI Configuration
CREATE TABLE IF NOT EXISTS public.ai_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    provider TEXT DEFAULT 'free',
    api_key_encrypted TEXT,
    model_preference TEXT,
    daily_usage_count INTEGER DEFAULT 0,
    last_usage_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Notifications
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    entity_id TEXT,
    entity_type TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    task_reminders BOOLEAN DEFAULT true,
    habit_reminders BOOLEAN DEFAULT true,
    family_event_reminders BOOLEAN DEFAULT true,
    loan_reminders BOOLEAN DEFAULT true,
    follow_up_reminders BOOLEAN DEFAULT true,
    task_assignment_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pomodoro Settings
CREATE TABLE IF NOT EXISTS public.pomodoro_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    work_duration INTEGER DEFAULT 25,
    short_break INTEGER DEFAULT 5,
    long_break INTEGER DEFAULT 15,
    sessions_before_long_break INTEGER DEFAULT 4,
    auto_start_breaks BOOLEAN DEFAULT false,
    auto_start_work BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entries
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    task_id UUID,
    project_id UUID,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration INTEGER,
    is_running BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Form Fields
CREATE TABLE IF NOT EXISTS public.custom_form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT DEFAULT 'text',
    field_options JSONB,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    default_value TEXT,
    placeholder TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form Field Config (global, no user_id)
CREATE TABLE IF NOT EXISTS public.form_field_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    is_custom BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

-- Module Config (global, no user_id)
CREATE TABLE IF NOT EXISTS public.module_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

-- Workflow Rules
CREATE TABLE IF NOT EXISTS public.workflow_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}',
    action_type TEXT NOT NULL,
    action_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Logs
CREATE TABLE IF NOT EXISTS public.workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    rule_id UUID,
    rule_name TEXT,
    trigger_type TEXT,
    action_type TEXT,
    status TEXT DEFAULT 'success',
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Configs
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Templates
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User MFA Settings
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT false,
    email_otp_enabled BOOLEAN DEFAULT false,
    backup_codes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Workspace Permissions
CREATE TABLE IF NOT EXISTS public.user_workspace_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    permission TEXT NOT NULL,
    granted_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, permission)
);

-- Device Transfer History (already in init-db.sql but ensure it exists here too)
-- Note: device_transfer_history does NOT have a user_id column

-- ========================
-- Add missing columns to existing tables
-- ========================

DO $$ BEGIN
    ALTER TABLE public.device_inventory ADD COLUMN IF NOT EXISTS supplier_id UUID;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.device_inventory ADD COLUMN IF NOT EXISTS processor_info VARCHAR(255);
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix support_users ip_address type (INET -> TEXT for compatibility)
DO $$ BEGIN
    ALTER TABLE public.support_users ALTER COLUMN ip_address TYPE TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Indexes for data tables
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_events_user_id ON public.family_events(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON public.task_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON public.habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_user_id ON public.backup_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON public.app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_user_id ON public.workflow_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_config_user_id ON public.ai_config(user_id);

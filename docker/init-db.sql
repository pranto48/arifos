-- LifeOS Self-Hosted Database Initialization Script
-- This script creates the base schema for self-hosted installations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create app_role enum
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'user', 'inventory_manager', 'support_manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (for self-hosted auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    is_revoked BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    currency VARCHAR(10) DEFAULT 'BDT',
    timezone VARCHAR(50) DEFAULT 'Asia/Dhaka',
    date_format VARCHAR(20) DEFAULT 'dd/MM/yyyy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Support Units
CREATE TABLE IF NOT EXISTS public.support_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Departments
CREATE TABLE IF NOT EXISTS public.support_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    unit_id UUID NOT NULL REFERENCES public.support_units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Users
CREATE TABLE IF NOT EXISTS public.support_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    department_id UUID NOT NULL REFERENCES public.support_departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    designation VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    extension_number VARCHAR(50),
    extension_password VARCHAR(255),
    ip_address TEXT,
    device_info TEXT,
    device_assign_date DATE,
    device_handover_date DATE,
    new_device_assign TEXT,
    mail_password VARCHAR(255),
    nas_username VARCHAR(255),
    nas_password VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Categories
CREATE TABLE IF NOT EXISTS public.device_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Inventory
CREATE TABLE IF NOT EXISTS public.device_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    category_id UUID REFERENCES public.device_categories(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES public.support_units(id) ON DELETE SET NULL,
    support_user_id UUID REFERENCES public.support_users(id) ON DELETE SET NULL,
    supplier_id UUID,
    device_name VARCHAR(255) NOT NULL,
    device_number VARCHAR(100),
    serial_number VARCHAR(255),
    purchase_date DATE,
    delivery_date DATE,
    supplier_name VARCHAR(255),
    requisition_number VARCHAR(100),
    bod_number VARCHAR(100),
    warranty_date DATE,
    price DECIMAL(12, 2),
    bill_details TEXT,
    status VARCHAR(50) DEFAULT 'available',
    notes TEXT,
    -- Hardware specifications
    processor_info VARCHAR(255),
    ram_info VARCHAR(255),
    storage_info VARCHAR(255),
    has_ups BOOLEAN DEFAULT false,
    ups_info VARCHAR(255),
    monitor_info VARCHAR(255),
    webcam_info VARCHAR(255),
    headset_info VARCHAR(255),
    custom_specs JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK for supplier_id after device_suppliers table is created
-- (deferred via ALTER TABLE below)

-- Device Transfer History
CREATE TABLE IF NOT EXISTS public.device_transfer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES public.device_inventory(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES public.support_users(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES public.support_users(id) ON DELETE SET NULL,
    transferred_by UUID,
    transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Service History
CREATE TABLE IF NOT EXISTS public.device_service_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    device_id UUID NOT NULL REFERENCES public.device_inventory(id) ON DELETE CASCADE,
    task_id UUID,
    service_date DATE NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    cost DECIMAL(12, 2),
    technician_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Suppliers (for quick selection)
CREATE TABLE IF NOT EXISTS public.device_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_device_inventory_user_id ON public.device_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_device_inventory_category_id ON public.device_inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_device_inventory_unit_id ON public.device_inventory(unit_id);
CREATE INDEX IF NOT EXISTS idx_device_inventory_support_user_id ON public.device_inventory(support_user_id);
CREATE INDEX IF NOT EXISTS idx_device_inventory_status ON public.device_inventory(status);
CREATE INDEX IF NOT EXISTS idx_device_inventory_supplier ON public.device_inventory(supplier_name);
CREATE INDEX IF NOT EXISTS idx_device_inventory_supplier_id ON public.device_inventory(supplier_id);

-- Add FK constraint for supplier_id now that device_suppliers exists
DO $$
BEGIN
    ALTER TABLE public.device_inventory
        ADD CONSTRAINT device_inventory_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES public.device_suppliers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure ip_address on support_users is TEXT (not INET) for compatibility
DO $$
BEGIN
    ALTER TABLE public.support_users ALTER COLUMN ip_address TYPE TEXT USING ip_address::TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_support_users_department_id ON public.support_users(department_id);
CREATE INDEX IF NOT EXISTS idx_support_departments_unit_id ON public.support_departments(unit_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    onboarding_enabled BOOLEAN DEFAULT true,
    internal_analytics_enabled BOOLEAN DEFAULT true,
    setup_complete BOOLEAN DEFAULT false,
    db_type VARCHAR(20) DEFAULT 'postgresql',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default app settings (setup_complete=false so setup wizard or seedDefaultAdmin handles first run)
INSERT INTO public.app_settings (id, setup_complete, db_type)
VALUES ('default', false, 'postgresql')
ON CONFLICT (id) DO NOTHING;

-- License Settings table (for license verification system)
CREATE TABLE IF NOT EXISTS public.license_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_settings_key ON public.license_settings(setting_key);

-- Admin user seeding is handled by the backend server on startup.
-- See docker/backend/server.js seedDefaultAdmin() function.


CREATE TABLE IF NOT EXISTS public.product_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_key TEXT NOT NULL CHECK (event_key IN (
    'quick_action_open',
    'ai_action_run',
    'planner_refresh',
    'note_to_task_conversion',
    'import_completed',
    'import_failed'
  )),
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  source TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, metric_date, event_key)
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_daily_user_date
  ON public.product_analytics_daily(user_id, metric_date DESC);

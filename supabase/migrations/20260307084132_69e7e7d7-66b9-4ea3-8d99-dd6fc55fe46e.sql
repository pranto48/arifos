
-- =============================================
-- 1. app_notifications table
-- =============================================
CREATE TABLE public.app_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  entity_id uuid,
  entity_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.app_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.app_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.app_notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.app_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_app_notifications_user_id ON public.app_notifications(user_id);
CREATE INDEX idx_app_notifications_is_read ON public.app_notifications(user_id, is_read);

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;

-- =============================================
-- 2. custom_form_fields table
-- =============================================
CREATE TABLE public.custom_form_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  field_options jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  placeholder text,
  default_value text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view active custom fields" ON public.custom_form_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert custom fields" ON public.custom_form_fields
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update custom fields" ON public.custom_form_fields
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete custom fields" ON public.custom_form_fields
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_custom_form_fields_entity ON public.custom_form_fields(entity_type, is_active);

-- =============================================
-- 3. form_field_config table
-- =============================================
CREATE TABLE public.form_field_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  field_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(entity_type, field_name)
);

ALTER TABLE public.form_field_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view field config" ON public.form_field_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert field config" ON public.form_field_config
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update field config" ON public.form_field_config
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete field config" ON public.form_field_config
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. Add custom_fields JSONB columns to entity tables
-- =============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_fields jsonb;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS custom_fields jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS custom_fields jsonb;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS custom_fields jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_fields jsonb;
ALTER TABLE public.support_users ADD COLUMN IF NOT EXISTS custom_fields jsonb;

-- =============================================
-- 5. Notification trigger functions
-- =============================================

-- Helper: notify users with a specific role
CREATE OR REPLACE FUNCTION public.notify_role_users(
  _role app_role,
  _type text,
  _title text,
  _message text,
  _entity_id uuid DEFAULT NULL,
  _entity_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_notifications (user_id, type, title, message, entity_id, entity_type)
  SELECT ur.user_id, _type, _title, _message, _entity_id, _entity_type
  FROM public.user_roles ur
  WHERE ur.role = _role;
END;
$$;

-- Trigger: new device added
CREATE OR REPLACE FUNCTION public.notify_new_device()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_role_users('admin'::app_role, 'new_device', 'New Device Added', 'Device "' || NEW.device_name || '" has been added to inventory.', NEW.id, 'device_inventory');
  PERFORM notify_role_users('inventory_manager'::app_role, 'new_device', 'New Device Added', 'Device "' || NEW.device_name || '" has been added to inventory.', NEW.id, 'device_inventory');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_device
  AFTER INSERT ON public.device_inventory
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_device();

-- Trigger: new support user added
CREATE OR REPLACE FUNCTION public.notify_new_support_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_role_users('admin'::app_role, 'new_user', 'New User Added', 'User "' || NEW.name || '" has been added.', NEW.id, 'support_user');
  PERFORM notify_role_users('support_manager'::app_role, 'new_user', 'New User Added', 'User "' || NEW.name || '" has been added.', NEW.id, 'support_user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_support_user
  AFTER INSERT ON public.support_users
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_support_user();

-- Trigger: IP address changed
CREATE OR REPLACE FUNCTION public.notify_ip_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.ip_address IS DISTINCT FROM NEW.ip_address AND NEW.ip_address IS NOT NULL THEN
    PERFORM notify_role_users('admin'::app_role, 'ip_change', 'IP Address Changed', 'User "' || NEW.name || '" IP changed from "' || COALESCE(OLD.ip_address, 'none') || '" to "' || NEW.ip_address || '".', NEW.id, 'support_user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ip_change
  AFTER UPDATE ON public.support_users
  FOR EACH ROW EXECUTE FUNCTION public.notify_ip_change();

-- Trigger: new ticket created
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_role_users('admin'::app_role, 'new_ticket', 'New Ticket Created', 'Ticket "' || NEW.title || '" (' || NEW.ticket_number || ') has been submitted.', NEW.id, 'support_ticket');
  PERFORM notify_role_users('support_manager'::app_role, 'new_ticket', 'New Ticket Created', 'Ticket "' || NEW.title || '" (' || NEW.ticket_number || ') has been submitted.', NEW.id, 'support_ticket');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_ticket();

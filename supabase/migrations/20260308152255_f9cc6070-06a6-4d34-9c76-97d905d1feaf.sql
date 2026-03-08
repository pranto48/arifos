
-- Add unique constraint to form_field_config to prevent duplicates
ALTER TABLE public.form_field_config ADD CONSTRAINT form_field_config_entity_field_unique UNIQUE (entity_type, field_name);

-- Create module_config table for enabling/disabling entire modules
CREATE TABLE public.module_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.module_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view module config"
  ON public.module_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert module config"
  ON public.module_config FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update module config"
  ON public.module_config FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete module config"
  ON public.module_config FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default modules (all enabled)
INSERT INTO public.module_config (module_name, is_enabled) VALUES
  ('calendar', true),
  ('tasks', true),
  ('notes', true),
  ('support_users', true),
  ('device_inventory', true),
  ('support_tickets', true),
  ('goals', true),
  ('projects', true),
  ('habits', true),
  ('family', true),
  ('budget', true),
  ('salary', true),
  ('investments', true),
  ('loans', true);

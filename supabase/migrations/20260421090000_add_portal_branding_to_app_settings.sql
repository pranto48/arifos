ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS portal_name TEXT DEFAULT 'LifeOS',
  ADD COLUMN IF NOT EXISTS portal_logo_url TEXT;

UPDATE public.app_settings
SET portal_name = COALESCE(NULLIF(portal_name, ''), 'LifeOS')
WHERE id = 'default';

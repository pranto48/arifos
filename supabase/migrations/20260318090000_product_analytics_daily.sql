-- Add internal analytics toggle to app settings
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS internal_analytics_enabled BOOLEAN NOT NULL DEFAULT true;

-- Store anonymized daily product analytics counters per user
CREATE TABLE IF NOT EXISTS public.product_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_date, event_key)
);

ALTER TABLE public.product_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own product analytics"
ON public.product_analytics_daily
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product analytics"
ON public.product_analytics_daily
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product analytics"
ON public.product_analytics_daily
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_product_analytics_daily_user_date
ON public.product_analytics_daily (user_id, metric_date DESC);

CREATE TRIGGER update_product_analytics_daily_updated_at
BEFORE UPDATE ON public.product_analytics_daily
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_product_analytics_counter(
  p_event_key TEXT,
  p_metric_date DATE DEFAULT CURRENT_DATE,
  p_increment INTEGER DEFAULT 1,
  p_source TEXT DEFAULT 'web'
)
RETURNS public.product_analytics_daily
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.product_analytics_daily;
BEGIN
  IF p_increment < 1 THEN
    RAISE EXCEPTION 'p_increment must be at least 1';
  END IF;

  INSERT INTO public.product_analytics_daily (user_id, metric_date, event_key, event_count, source)
  VALUES (auth.uid(), p_metric_date, p_event_key, p_increment, p_source)
  ON CONFLICT (user_id, metric_date, event_key)
  DO UPDATE SET
    event_count = public.product_analytics_daily.event_count + EXCLUDED.event_count,
    source = EXCLUDED.source,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_analytics_counter(TEXT, DATE, INTEGER, TEXT) TO authenticated;

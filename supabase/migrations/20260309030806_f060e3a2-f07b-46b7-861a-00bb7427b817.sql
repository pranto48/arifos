
CREATE TABLE public.ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'free',
  api_key_encrypted text,
  model_preference text DEFAULT 'auto',
  daily_usage_count integer DEFAULT 0,
  last_usage_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own AI config"
  ON public.ai_config FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_config_updated_at
  BEFORE UPDATE ON public.ai_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

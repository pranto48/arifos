
-- Task Templates for recurring/complex scheduling
CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  category_id uuid,
  task_type text NOT NULL DEFAULT 'office',
  schedule_type text NOT NULL DEFAULT 'manual',
  schedule_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own task_templates" ON public.task_templates FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workflow Rules (if-then automation)
CREATE TABLE public.workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workflow_rules" ON public.workflow_rules FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workflow Execution Log
CREATE TABLE public.workflow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.workflow_rules(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  trigger_data jsonb,
  action_result jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow_logs" ON public.workflow_logs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workflow_logs" ON public.workflow_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Webhooks for external integration
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  webhook_key text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  target_type text NOT NULL DEFAULT 'task',
  field_mapping jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_called_at timestamptz,
  call_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own webhooks" ON public.webhooks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

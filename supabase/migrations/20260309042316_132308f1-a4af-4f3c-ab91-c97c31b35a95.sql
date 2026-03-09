
-- Time entries table for tracking work sessions
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  entry_type text NOT NULL DEFAULT 'timer',
  notes text,
  is_running boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Pomodoro settings per user
CREATE TABLE public.pomodoro_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  work_duration integer NOT NULL DEFAULT 25,
  short_break integer NOT NULL DEFAULT 5,
  long_break integer NOT NULL DEFAULT 15,
  sessions_before_long_break integer NOT NULL DEFAULT 4,
  auto_start_breaks boolean NOT NULL DEFAULT false,
  auto_start_work boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_entries
CREATE POLICY "Users can CRUD own time_entries" ON public.time_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS policies for pomodoro_settings
CREATE POLICY "Users can CRUD own pomodoro_settings" ON public.pomodoro_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at triggers
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pomodoro_settings_updated_at
  BEFORE UPDATE ON public.pomodoro_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

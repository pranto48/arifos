create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  input_summary text,
  result_summary text,
  created_at timestamptz not null default now(),
  source text not null check (source in ('web', 'docker'))
);

alter table public.ai_usage_log enable row level security;

create policy "Users can view own ai usage logs"
on public.ai_usage_log
for select
using (auth.uid() = user_id);

create policy "Users can insert own ai usage logs"
on public.ai_usage_log
for insert
with check (auth.uid() = user_id);

create index if not exists ai_usage_log_user_created_idx
on public.ai_usage_log (user_id, created_at desc);

create index if not exists ai_usage_log_action_type_idx
on public.ai_usage_log (action_type);

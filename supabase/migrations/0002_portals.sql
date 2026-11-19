-- ============================================================================
-- Obragoito — portais, relatórios diários, modo manutenção e monitorização.
-- Aplicar depois de 0001_init.sql (Supabase SQL Editor ou migrador local).
-- ============================================================================

-- Conta de desenvolvimento: administrador com acesso a todos os painéis,
-- mas que não é cliente nem trabalhador.
alter table public.profiles add column if not exists is_developer boolean not null default false;

-- Estado da obra: em execução ou concluída (obras antigas).
alter table public.projects
  add column if not exists status text not null default 'active'
    check (status in ('active', 'completed'));
alter table public.projects add column if not exists completed_at timestamptz;

create index if not exists projects_status_idx on public.projects (status, sort_order desc);

-- ---------------------------------------------------------------------------
-- Relatório diário da equipa (áudio transcrito por obra e por dia)
-- ============================================================================
create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  transcript text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_date, project_id, worker_id)
);

create index if not exists daily_reports_date_idx on public.daily_reports (report_date desc, project_id);

drop trigger if exists daily_reports_touch on public.daily_reports;
create trigger daily_reports_touch before update on public.daily_reports
  for each row execute function public.touch_updated_at();

-- Relatório PDF consolidado por obra e por dia (guardado para reenvio).
create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  summary text not null,
  pdf bytea not null,
  recipients text[] not null default '{}',
  emails_sent integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (report_date, project_id)
);

create index if not exists daily_summaries_date_idx on public.daily_summaries (report_date desc);

-- Registo de erros do servidor para o portal de desenvolvimento.
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'error' check (level in ('warning', 'error', 'fatal')),
  source text not null default 'api',
  message text not null,
  stack text,
  path text,
  method text,
  status integer,
  user_email text,
  created_at timestamptz not null default now()
);

create index if not exists error_log_created_idx on public.error_log (created_at desc);

-- Conta de desenvolvimento (simaodev): administrador com acesso ao portal dev.
alter table public.profiles add column if not exists is_developer boolean not null default false;

-- Estado da obra: ativa (em curso) ou concluída (obras antigas).
alter table public.projects add column if not exists status text not null default 'active';
alter table public.projects add column if not exists completed_at timestamptz;

do $do$ begin
  alter table public.projects
    add constraint projects_status_check check (status in ('active', 'completed'));
exception when duplicate_object then null; end $do$;

create index if not exists projects_status_idx on public.projects (status, sort_order);

-- ---------------------------------------------------------------------------
-- RLS das novas tabelas
-- ---------------------------------------------------------------------------
alter table public.daily_reports enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.error_log enable row level security;

drop policy if exists daily_reports_read on public.daily_reports;
create policy "daily_reports_read" on public.daily_reports
  for select using (public.is_admin() or worker_id = auth.uid());

drop policy if exists daily_reports_worker_insert on public.daily_reports;
create policy "daily_reports_worker_insert" on public.daily_reports
  for insert with check (worker_id = auth.uid() and public.is_project_worker(project_id));

drop policy if exists daily_reports_admin_all on public.daily_reports;
create policy "daily_reports_admin_all" on public.daily_reports
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists daily_summaries_read on public.daily_summaries;
create policy "daily_summaries_read" on public.daily_summaries
  for select using (public.is_admin() or public.is_project_client(project_id));

drop policy if exists daily_summaries_admin_all on public.daily_summaries;
create policy "daily_summaries_admin_all" on public.daily_summaries
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists error_log_admin on public.error_log;
create policy "error_log_admin" on public.error_log
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Perfis: um developer nunca aparece como cliente nem como trabalhador.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $fn$
    select coalesce(public.current_role_name() = 'admin', false);
  $fn$;

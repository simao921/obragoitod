-- ============================================================================
-- Obragoito — esquema inicial, funções de autorização e políticas RLS.
-- Aplicável a um projeto Supabase e, com os shims iniciais, a Postgres local.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shim local: no Supabase estes objetos já existem e os blocos são ignorados.
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    create schema auth;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_tables where schemaname = 'auth' and tablename = 'users'
  ) then
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      created_at timestamptz not null default now()
    );
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    create function auth.uid() returns uuid
      language sql stable
      as $fn$
        select nullif((nullif(current_setting('request.jwt.claims', true), ''))::json ->> 'sub', '')::uuid
      $fn$;
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $do$ begin
  create type public.user_role as enum ('admin', 'client', 'worker');
exception when duplicate_object then null; end $do$;

do $do$ begin
  create type public.account_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $do$;

do $do$ begin
  create type public.project_category as enum
    ('obras-publicas', 'infraestruturas', 'urbanismo', 'reabilitacao', 'empreendimentos');
exception when duplicate_object then null; end $do$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  phone text,
  role public.user_role not null default 'client',
  status public.account_status not null default 'active',
  password_hash text,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_key on public.profiles (lower(email));

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  user_agent text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_idx on public.sessions (user_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category public.project_category not null,
  summary text,
  description text,
  location text,
  year integer,
  client_name text,
  cover_image text,
  cover_image_alt text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_published_idx on public.projects (is_published, sort_order);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  caption text,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_on_project text,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_assignments_user_idx on public.project_assignments (user_id);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  body text not null,
  progress integer check (progress between 0 and 100),
  visible_to_client boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_updates_project_idx on public.project_updates (project_id, created_at desc);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  title text not null,
  file_name text not null,
  size_bytes bigint,
  mime_type text,
  visible_to_client boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  project_id uuid references public.projects (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thread_participants (
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

create table if not exists public.worker_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  progress integer check (progress between 0 and 100),
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists worker_reports_project_idx on public.worker_reports (project_id, created_at desc);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  service text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  consent_at timestamptz not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
  language plpgsql
  as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists threads_touch on public.threads;
create trigger threads_touch before update on public.threads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Funções de autorização (security definer para evitar recursão nas políticas)
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name() returns text
  language sql stable security definer set search_path = public
  as $fn$
    select p.role::text
      from public.profiles p
     where p.id = auth.uid() and p.status = 'active';
  $fn$;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $fn$
    select coalesce(public.current_role_name() = 'admin', false);
  $fn$;

create or replace function public.is_project_client(p_project_id uuid) returns boolean
  language sql stable security definer set search_path = public
  as $fn$
    select exists (
      select 1
        from public.project_assignments a
        join public.profiles p on p.id = a.user_id
       where a.project_id = p_project_id
         and a.user_id = auth.uid()
         and p.role = 'client'
         and p.status = 'active'
    );
  $fn$;

create or replace function public.is_project_worker(p_project_id uuid) returns boolean
  language sql stable security definer set search_path = public
  as $fn$
    select exists (
      select 1
        from public.project_assignments a
        join public.profiles p on p.id = a.user_id
       where a.project_id = p_project_id
         and a.user_id = auth.uid()
         and p.role = 'worker'
         and p.status = 'active'
    );
  $fn$;

create or replace function public.is_thread_participant(p_thread_id uuid) returns boolean
  language sql stable security definer set search_path = public
  as $fn$
    select exists (
      select 1 from public.thread_participants tp
       where tp.thread_id = p_thread_id and tp.user_id = auth.uid()
    );
  $fn$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.project_assignments enable row level security;
alter table public.project_updates enable row level security;
alter table public.project_documents enable row level security;
alter table public.threads enable row level security;
alter table public.thread_participants enable row level security;
alter table public.messages enable row level security;
alter table public.worker_reports enable row level security;
alter table public.quote_requests enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_settings enable row level security;

-- profiles
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- projects
drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select using (is_published = true);

drop policy if exists projects_assigned_read on public.projects;
create policy projects_assigned_read on public.projects
  for select using (public.is_project_client(id) or public.is_project_worker(id));

drop policy if exists projects_admin_all on public.projects;
create policy projects_admin_all on public.projects
  for all using (public.is_admin()) with check (public.is_admin());

-- project_images
drop policy if exists project_images_read on public.project_images;
create policy project_images_read on public.project_images
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.is_published = true)
    or public.is_project_client(project_id)
    or public.is_project_worker(project_id)
  );

drop policy if exists project_images_admin_all on public.project_images;
create policy project_images_admin_all on public.project_images
  for all using (public.is_admin()) with check (public.is_admin());

-- project_assignments
drop policy if exists project_assignments_read on public.project_assignments;
create policy project_assignments_read on public.project_assignments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists project_assignments_admin_all on public.project_assignments;
create policy project_assignments_admin_all on public.project_assignments
  for all using (public.is_admin()) with check (public.is_admin());

-- project_updates
drop policy if exists project_updates_read on public.project_updates;
create policy project_updates_read on public.project_updates
  for select using (
    public.is_admin()
    or public.is_project_worker(project_id)
    or (visible_to_client = true and public.is_project_client(project_id))
  );

drop policy if exists project_updates_admin_all on public.project_updates;
create policy project_updates_admin_all on public.project_updates
  for all using (public.is_admin()) with check (public.is_admin());

-- project_documents
drop policy if exists project_documents_read on public.project_documents;
create policy project_documents_read on public.project_documents
  for select using (
    public.is_admin()
    or public.is_project_worker(project_id)
    or (visible_to_client = true and public.is_project_client(project_id))
  );

drop policy if exists project_documents_admin_all on public.project_documents;
create policy project_documents_admin_all on public.project_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- threads
drop policy if exists threads_read on public.threads;
create policy threads_read on public.threads
  for select using (public.is_admin() or public.is_thread_participant(id));

drop policy if exists threads_insert on public.threads;
create policy threads_insert on public.threads
  for insert with check (public.is_admin() or created_by = auth.uid());

-- thread_participants
drop policy if exists thread_participants_read on public.thread_participants;
create policy thread_participants_read on public.thread_participants
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists thread_participants_admin_all on public.thread_participants;
create policy thread_participants_admin_all on public.thread_participants
  for all using (public.is_admin()) with check (public.is_admin());

-- messages
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select using (public.is_admin() or public.is_thread_participant(thread_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (public.is_admin() or public.is_thread_participant(thread_id))
  );

-- worker_reports
drop policy if exists worker_reports_read on public.worker_reports;
create policy worker_reports_read on public.worker_reports
  for select using (public.is_admin() or worker_id = auth.uid());

drop policy if exists worker_reports_insert on public.worker_reports;
create policy worker_reports_insert on public.worker_reports
  for insert with check (worker_id = auth.uid() and public.is_project_worker(project_id));

drop policy if exists worker_reports_admin_update on public.worker_reports;
create policy worker_reports_admin_update on public.worker_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- quote_requests: apenas administração. Escrita feita pela API.
drop policy if exists quote_requests_admin on public.quote_requests;
create policy quote_requests_admin on public.quote_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- audit_log
drop policy if exists audit_log_admin on public.audit_log;
create policy audit_log_admin on public.audit_log
  for select using (public.is_admin());

-- app_settings
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- sessions: sem políticas — apenas a API (service role) pode aceder.

-- ---------------------------------------------------------------------------
-- Definições iniciais
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value)
values ('voice_enabled', '{"enabled": true}'::jsonb)
on conflict (key) do nothing;

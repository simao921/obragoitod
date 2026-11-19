-- ============================================================================
-- Obragoito — códigos de acesso por email (OTP) na gestão e no portal dev.
-- Aplicar depois de 0002_portals.sql.
-- ============================================================================

create table if not exists public.login_otp_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  portal text not null check (portal in ('admin', 'dev')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists login_otp_codes_profile_idx
  on public.login_otp_codes (profile_id, created_at desc);

-- Sem políticas: só o servidor (dono da base de dados) lê estes códigos.
alter table public.login_otp_codes enable row level security;

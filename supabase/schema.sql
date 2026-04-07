create extension if not exists "pgcrypto";

create table if not exists public.app_roles (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_categories (
  category_key text primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_tasks (
  task_id text primary key,
  category_key text not null references public.app_categories(category_key) on delete cascade,
  group_name text,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role_code text not null references public.app_roles(code),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_user_category_permissions (
  user_id uuid not null references public.app_user_profiles(user_id) on delete cascade,
  category_key text not null references public.app_categories(category_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_key)
);

create table if not exists public.app_user_task_permissions (
  user_id uuid not null references public.app_user_profiles(user_id) on delete cascade,
  task_id text not null references public.app_tasks(task_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create table if not exists public.crm_activity_logs (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  method text,
  payload_data jsonb,
  user_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action_type text not null,
  target_user_id uuid,
  target_email text,
  payload_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_user_profiles_updated_at on public.app_user_profiles;
create trigger trg_app_user_profiles_updated_at
before update on public.app_user_profiles
for each row
execute function public.set_updated_at();

insert into public.app_roles (code, name, description)
values
  ('admin', 'Administrator', 'Toan quyen cau hinh, user va nghiep vu'),
  ('operator', 'Operator', 'Van hanh nghiep vu theo quyen duoc cap'),
  ('viewer', 'Viewer', 'Chi duoc xem cac muc duoc cap')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

alter table public.app_roles enable row level security;
alter table public.app_categories enable row level security;
alter table public.app_tasks enable row level security;
alter table public.app_user_profiles enable row level security;
alter table public.app_user_category_permissions enable row level security;
alter table public.app_user_task_permissions enable row level security;
alter table public.crm_activity_logs enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "service role full access roles" on public.app_roles;
create policy "service role full access roles" on public.app_roles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access categories" on public.app_categories;
create policy "service role full access categories" on public.app_categories
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access tasks" on public.app_tasks;
create policy "service role full access tasks" on public.app_tasks
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access profiles" on public.app_user_profiles;
create policy "service role full access profiles" on public.app_user_profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access category permissions" on public.app_user_category_permissions;
create policy "service role full access category permissions" on public.app_user_category_permissions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access task permissions" on public.app_user_task_permissions;
create policy "service role full access task permissions" on public.app_user_task_permissions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access activity logs" on public.crm_activity_logs;
create policy "service role full access activity logs" on public.crm_activity_logs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role full access admin audit logs" on public.admin_audit_logs;
create policy "service role full access admin audit logs" on public.admin_audit_logs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

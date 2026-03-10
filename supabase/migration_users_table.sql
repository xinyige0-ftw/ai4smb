-- Migration: create users table linked to auth.users
-- Run in Supabase Dashboard → SQL Editor

-- 1. Create users table
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  business_name text,
  business_type text,
  preferred_channels text[],
  preferred_tone text,
  locale text default 'en',
  plan text default 'free',
  usage_count int default 0,
  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable RLS
alter table users enable row level security;

-- 3. Users can read and update their own row
create policy "Users can read own data"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on users for update
  using (auth.uid() = id);

-- 4. Auto-create user row on first sign-in
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    last_active_at = now(),
    updated_at = now();
  return new;
end;
$$;

-- 5. Trigger on auth sign-in
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 6. Backfill existing auth users into users table
insert into public.users (id, email, full_name, avatar_url)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '')
from auth.users
on conflict (id) do nothing;

-- 7. Index for quick lookups
create index if not exists users_email_idx on users(email);
create index if not exists users_plan_idx on users(plan);

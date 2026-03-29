-- Migration: unified activity tracking
-- Adds chats table, activity_log view, and counters for all action types
-- Run in Supabase Dashboard → SQL Editor

-- 1. Add missing counter columns to sessions
alter table sessions add column if not exists format_posts_count int default 0;
alter table sessions add column if not exists imagine_count int default 0;

-- 2. Create chats table to persist chat conversations
create table if not exists chats (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references sessions(id) on delete set null,
  user_message text not null,
  assistant_message text,
  locale text default 'en',
  created_at timestamptz default now()
);

create index if not exists chats_session_id_idx on chats(session_id);
create index if not exists chats_created_at_idx on chats(created_at desc);

alter table chats enable row level security;

-- 3. Unified activity log view — every action in one place, including anonymous vs. authed
create or replace view activity_log as
select
  a.type,
  a.id,
  a.session_id,
  a.business_name,
  a.business_type,
  a.created_at,
  s.anon_id,
  s.user_id,
  u.email,
  u.full_name,
  case when s.user_id is not null then 'registered' else 'anonymous' end as user_type,
  s.ip_hash,
  s.locale
from (
  select 'campaign' as type, id, session_id, business_name, business_type, created_at from campaigns
  union all
  select 'segment', id, session_id, meta_label, null, created_at from segments
  union all
  select 'chat', id, session_id, null, null, created_at from chats
) a
left join sessions s on s.id = a.session_id
left join users u on u.id = s.user_id
order by a.created_at desc;

-- 4. Update increment_counter to handle new action types
create or replace function increment_counter(p_id uuid, p_col text)
returns void
language plpgsql
security definer
as $$
begin
  execute format(
    'update sessions set actions_count = actions_count + 1, %I = %I + 1 where id = $1',
    p_col, p_col
  ) using p_id;
end;
$$;

-- 5. Summary stats view for quick dashboard queries
create or replace view usage_stats as
select
  (select count(*) from users)
    + (select count(distinct anon_id) from sessions where user_id is null)
    as total_users_incl_anonymous,
  (select count(*) from users) as registered_users,
  (select count(distinct anon_id) from sessions where user_id is null) as anonymous_users,
  (select count(*) from sessions) as total_sessions,
  (select count(*) from campaigns) as total_campaigns,
  (select count(*) from segments) as total_segments,
  (select count(*) from chats) as total_chats,
  (select coalesce(sum(format_posts_count), 0) from sessions) as total_format_posts,
  (select coalesce(sum(imagine_count), 0) from sessions) as total_image_generations,
  (select count(*) from campaigns)
    + (select count(*) from segments)
    + (select count(*) from chats) as total_actions,
  (select max(last_seen - first_seen) from (
    select anon_id, min(created_at) as first_seen, max(last_seen_at) as last_seen
    from sessions group by anon_id
  ) s) as longest_user_lifespan;

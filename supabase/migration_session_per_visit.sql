-- Migration: change sessions from permanent identity to time-bounded visits (30 min timeout)
-- SAFE: no data is deleted — existing sessions are preserved and split into visits
-- Run in Supabase Dashboard → SQL Editor

begin;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: Schema changes (non-destructive)
-- ═══════════════════════════════════════════════════════════════════

-- Drop unique constraint on anon_id (allows multiple sessions per visitor)
alter table sessions drop constraint if exists sessions_anon_id_key;

-- Add indexes for the new query pattern
create index if not exists sessions_anon_id_idx on sessions(anon_id);
create index if not exists sessions_anon_last_seen_idx on sessions(anon_id, last_seen_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: Backfill — split existing sessions into visit-based sessions
--
-- For each old session, looks at all campaign/segment timestamps.
-- Groups actions within 30 min of each other into one visit.
-- Creates new session rows for additional visits and re-points the FKs.
-- The original session row becomes the FIRST visit (no data lost).
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  timeout_interval interval := interval '30 minutes';
  rec record;
  cur_session_id uuid;
  prev_ts timestamptz;
  new_session_id uuid;
  orig record;
begin
  -- Loop through each existing session that has activity
  for orig in
    select s.id, s.anon_id, s.user_id, s.created_at as sess_created,
           s.locale, s.user_agent, s.ip_hash, s.referrer
    from sessions s
    where exists (select 1 from campaigns c where c.session_id = s.id)
       or exists (select 1 from segments g where g.session_id = s.id)
  loop
    cur_session_id := orig.id;
    prev_ts := null;
    new_session_id := null;

    -- Walk all actions for this session ordered by time
    for rec in
      select id, created_at, 'campaign' as kind
      from campaigns where session_id = orig.id
      union all
      select id, created_at, 'segment' as kind
      from segments where session_id = orig.id
      order by created_at asc
    loop
      if prev_ts is not null and rec.created_at - prev_ts > timeout_interval then
        -- Gap > 30 min → new visit session
        insert into sessions (anon_id, user_id, created_at, last_seen_at,
                              locale, user_agent, ip_hash, referrer)
        values (orig.anon_id, orig.user_id, rec.created_at, rec.created_at,
                orig.locale, orig.user_agent, orig.ip_hash, orig.referrer)
        returning id into new_session_id;

        cur_session_id := new_session_id;
      end if;

      -- Re-point this action to the current visit session
      if cur_session_id != orig.id then
        if rec.kind = 'campaign' then
          update campaigns set session_id = cur_session_id where id = rec.id;
        else
          update segments set session_id = cur_session_id where id = rec.id;
        end if;
      end if;

      prev_ts := rec.created_at;
    end loop;

    -- Update the original session's last_seen_at to match its last action
    update sessions set last_seen_at = coalesce(prev_ts, orig.sess_created)
    where id = orig.id;

    -- Update new visit sessions' last_seen_at to match their last action
    if new_session_id is not null then
      update sessions s set last_seen_at = coalesce(
        greatest(
          (select max(created_at) from campaigns where session_id = s.id),
          (select max(created_at) from segments where session_id = s.id)
        ), s.created_at)
      where s.anon_id = orig.anon_id
        and s.id != orig.id
        and s.created_at >= orig.sess_created;
    end if;
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Recalculate action counters on all sessions
-- ═══════════════════════════════════════════════════════════════════

update sessions s set
  campaigns_count = (select count(*) from campaigns where session_id = s.id),
  segments_count  = (select count(*) from segments where session_id = s.id),
  actions_count   = (select count(*) from campaigns where session_id = s.id)
                   + (select count(*) from segments where session_id = s.id);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: Update merge function for multiple sessions per user
-- ═══════════════════════════════════════════════════════════════════

create or replace function merge_guest_to_user(
  p_anon_id text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  -- Stamp all unlinked guest sessions for this anon_id with the user_id
  -- Keeps visit history intact — no merging or deleting
  update sessions
  set user_id = p_user_id
  where anon_id = p_anon_id and user_id is null;
end;
$$;

commit;

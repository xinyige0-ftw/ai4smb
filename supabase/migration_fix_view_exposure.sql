-- Migration: close the public read hole on the admin views, and fix the
-- RLS init-plan warning on public.users.
--
-- Why: every view in the `public` schema is exposed through PostgREST, and
-- Supabase's default privileges grant SELECT on new views to `anon` and
-- `authenticated`. A view is not covered by the RLS of its base tables unless
-- it is created with security_invoker, so these five views were handing out
-- data that the tables themselves correctly refuse.
--
-- Verified on 2026-09-13 against production with nothing but the public anon
-- key (which ships inside the site's JavaScript):
--   admin_dashboard      186 rows   103 distinct user email addresses
--   activity_log         365 rows
--   anonymous_activity   186 rows   ip_hash, business name, location
--   reviews_detail       177 rows   including reviews with approved = false
--   usage_stats            1 row    whole-product totals
-- The underlying tables all returned [] for the same key, so RLS was working;
-- only the views leaked.
--
-- No application code reads these views. /api/admin/users, /api/dashboard and
-- /api/reviews all go through SUPABASE_SERVICE_KEY, which bypasses both RLS
-- and these grants, so revoking API access changes nothing for the app and
-- nothing for the SQL editor.
--
-- Run in Supabase Dashboard -> SQL Editor.

begin;

-- 1. Take the views off the public API entirely. This is the fix that
--    actually stops the leak; step 2 is belt-and-braces.
revoke all on public.admin_dashboard     from anon, authenticated;
revoke all on public.activity_log        from anon, authenticated;
revoke all on public.anonymous_activity  from anon, authenticated;
revoke all on public.usage_stats         from anon, authenticated;
revoke all on public.reviews_detail      from anon, authenticated;

-- 2. Make each view run as the caller, so it inherits the base tables' RLS
--    instead of the view owner's privileges. This is what clears Supabase
--    Advisor's "Security Definer View" finding. Requires Postgres 15+.
alter view public.admin_dashboard     set (security_invoker = on);
alter view public.activity_log        set (security_invoker = on);
alter view public.anonymous_activity  set (security_invoker = on);
alter view public.usage_stats         set (security_invoker = on);
alter view public.reviews_detail      set (security_invoker = on);

-- 3. Optional hardening: stop future tables and views in `public` from being
--    granted to the API roles automatically. Leave this commented out unless
--    you are ready to grant each new table explicitly -- turning it on and then
--    forgetting about it is how a table ends up silently unreadable.
-- alter default privileges in schema public revoke all on tables from anon, authenticated;

-- 4. RLS init-plan warning on public.users.
--    auth.uid() written bare is re-evaluated once per row; wrapped in a
--    scalar subquery the planner evaluates it once for the whole statement.
--    Same semantics, and the difference shows up as soon as the table grows.
drop policy if exists "Users can read own data"   on public.users;
drop policy if exists "Users can update own data" on public.users;

create policy "Users can read own data"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own data"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 5. reviews: the insert policy was `with check (true)`, meaning anyone holding
--    the public anon key could write arbitrary rows into the testimonials table
--    and set user_id / session_id to whatever they liked. The app never inserts
--    through the anon key -- /api/reviews goes through SUPABASE_SERVICE_KEY,
--    which bypasses RLS -- so the anon insert path is pure attack surface.
drop policy if exists "Users can insert their own reviews" on public.reviews;

create policy "Signed-in users can insert their own review"
  on public.reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

commit;

-- ── Verify ────────────────────────────────────────────────────────────────
-- Expect zero rows: no view left readable by the API roles.
-- select table_name, grantee, privilege_type
--   from information_schema.role_table_grants
--  where table_schema = 'public'
--    and grantee in ('anon','authenticated')
--    and table_name in ('admin_dashboard','activity_log','anonymous_activity',
--                       'usage_stats','reviews_detail');

-- ── 预检：跑之前先确认这 5 个视图确实存在、名字没写错 ─────────────────────
-- select table_name from information_schema.views
--  where table_schema = 'public'
--    and table_name in ('admin_dashboard','activity_log','anonymous_activity',
--                       'usage_stats','reviews_detail');
-- 预期 5 行。少了哪一行，就把上面对应的 revoke / alter view 注释掉再跑。

-- ── 回滚：如果哪里不对，把下面这段跑一遍就回到原样 ────────────────────────
-- begin;
-- grant select on public.admin_dashboard, public.activity_log,
--                 public.anonymous_activity, public.usage_stats,
--                 public.reviews_detail
--   to anon, authenticated;
-- alter view public.admin_dashboard    set (security_invoker = off);
-- alter view public.activity_log       set (security_invoker = off);
-- alter view public.anonymous_activity set (security_invoker = off);
-- alter view public.usage_stats        set (security_invoker = off);
-- alter view public.reviews_detail     set (security_invoker = off);
-- drop policy if exists "Signed-in users can insert their own review" on public.reviews;
-- create policy "Users can insert their own reviews"
--   on public.reviews for insert with check (true);
-- commit;

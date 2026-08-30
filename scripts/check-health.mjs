#!/usr/bin/env node
/**
 * scripts/check-health.mjs
 *
 * Plain-Node health check for AI4SMB Insights, no dependencies.
 *
 * Why this exists: the Supabase project runs on a free tier that
 * auto-pauses after a period of inactivity. When it pauses, everything that
 * touches the database — sign-in, saving campaigns/segments, history, the
 * dashboard, review submission, the /impact page — starts failing
 * *silently*. AI generation itself doesn't touch Supabase, so the site
 * keeps looking healthy to a casual visitor while a real chunk of the
 * product is broken. Nobody noticed the last time this happened.
 *
 * This script hits the two endpoints that most directly expose that state
 * (/api/health, which talks to Supabase directly, and /api/impact, whose
 * aggregate queries fail the same way the pause failure mode does) and
 * prints a short, human-readable report plus a process exit code so it can
 * be wired into a scheduler (cron, GitHub Actions, Claude scheduled tasks,
 * an uptime monitor, etc.) and alert a human the moment the database goes
 * away, instead of relying on someone noticing broken sign-in by hand.
 *
 * Usage:
 *   node scripts/check-health.mjs [baseUrl]
 *   node scripts/check-health.mjs https://staging.ai4smbhub.com
 *
 * Defaults to https://www.ai4smbhub.com when no argument is given.
 *
 * Exit codes:
 *   0 - healthy: /api/health reachable and reports ok:true
 *   1 - unhealthy: /api/health unreachable, timed out, or reports ok:false
 *
 * Notes:
 *   - Every request is capped at a 20 second timeout so a hung backend
 *     can't hang the check (and whatever schedules it) indefinitely.
 *   - This script never prints environment variables, secrets, tokens, or
 *     request/response headers — only the small JSON fields described
 *     below, which are already public/aggregate by design (see
 *     app/api/health/route.ts and app/api/impact/route.ts).
 */

const DEFAULT_BASE_URL = "https://www.ai4smbhub.com";
const TIMEOUT_MS = 20_000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    let body = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON or empty body; leave body as null.
    }
    return { reachable: true, status: res.status, body };
  } catch (err) {
    const timedOut = err && err.name === "AbortError";
    return { reachable: false, error: timedOut ? "timed out" : String(err && err.message ? err.message : err) };
  } finally {
    clearTimeout(timer);
  }
}

/** True when the impact payload has any real aggregate beyond updatedAt. */
export function impactHasData(body) {
  if (!body || typeof body !== "object") return false;
  return Object.keys(body).some((key) => key !== "updatedAt");
}

export async function checkHealth(baseUrl) {
  const healthUrl = new URL("/api/health", baseUrl).toString();
  const impactUrl = new URL("/api/impact", baseUrl).toString();

  const [health, impact] = await Promise.all([fetchJson(healthUrl), fetchJson(impactUrl)]);

  const healthOk = health.reachable && health.status === 200 && health.body?.ok === true;

  return { baseUrl, health, impact, healthOk };
}

function printReport({ baseUrl, health, impact, healthOk }) {
  console.log(`AI4SMB health check — ${baseUrl}`);
  console.log("");

  console.log("/api/health");
  if (!health.reachable) {
    console.log(`  reachable: no (${health.error})`);
  } else {
    console.log(`  reachable: yes (HTTP ${health.status})`);
    console.log(`  ok: ${health.body?.ok === true}`);
    console.log(`  sessionsCount: ${health.body?.sessionsCount ?? "n/a"}`);
    if (health.body?.ok !== true && health.body?.error) {
      console.log(`  error: ${health.body.error}`);
    }
  }

  console.log("");
  console.log("/api/impact");
  if (!impact.reachable) {
    console.log(`  reachable: no (${impact.error})`);
  } else {
    console.log(`  reachable: yes (HTTP ${impact.status})`);
    console.log(`  hasDataBeyondUpdatedAt: ${impactHasData(impact.body)}`);
  }

  console.log("");
  console.log(healthOk ? "Overall: HEALTHY" : "Overall: UNHEALTHY");
}

async function main() {
  const baseUrl = process.argv[2] || DEFAULT_BASE_URL;
  const result = await checkHealth(baseUrl);
  printReport(result);
  process.exit(result.healthOk ? 0 : 1);
}

// Only run when executed directly (node scripts/check-health.mjs), not when
// imported by a test script.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

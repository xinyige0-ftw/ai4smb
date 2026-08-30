// Pure helpers for persisting "This Week's Action Plan" checkbox state to
// localStorage. No component in this module touches the DOM/localStorage
// directly — callers are responsible for reading/writing storage and must
// treat any storage access as something that can throw (private browsing,
// disabled storage, quota errors, etc).

export interface ActionProgress {
  [stepKey: string]: boolean;
}

const STORAGE_PREFIX = "ai4smb:action-progress:";
const DRAFT_ID = "draft";

/**
 * Returns the localStorage key used to persist progress for a campaign.
 * Falls back to a shared "draft" key when there is no campaign id yet
 * (e.g. a freshly generated campaign that hasn't been saved).
 */
export function progressStorageKey(campaignId: string | null | undefined): string {
  const id = typeof campaignId === "string" && campaignId.trim().length > 0 ? campaignId.trim() : DRAFT_ID;
  return `${STORAGE_PREFIX}${id}`;
}

// Small, dependency-free string hash (FNV-1a, 32-bit) so stepKey doesn't
// need to import a crypto module for something this low-stakes.
function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Derives a stable, content-aware key for a single action-plan step.
 * Combines the step's position with a short hash of its normalized
 * day + action text, so:
 *  - the same step re-rendered with the same data always yields the same key
 *  - two different steps (even sharing a day or wording) don't collide
 *  - if a campaign is regenerated and the content at a given position
 *    changes, the key changes too, so stale checkmarks don't silently
 *    reattach to unrelated new content.
 */
export function stepKey(index: number, day: string, action: string): string {
  const normalized = `${normalize(day)}|${normalize(action)}`;
  return `${index}-${hashString(normalized)}`;
}

/**
 * Tolerant JSON parse for stored progress. Never throws — any null/empty/
 * malformed/non-object input resolves to an empty progress map. Only
 * boolean-valued entries are kept.
 */
export function readProgress(raw: string | null): ActionProgress {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const result: ActionProgress = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "boolean") result[key] = value;
  }
  return result;
}

export function writeProgress(progress: ActionProgress): string {
  return JSON.stringify(progress);
}

/** Pure toggle — returns a new object, never mutates the input. */
export function toggleStep(progress: ActionProgress, key: string): ActionProgress {
  return { ...progress, [key]: !progress[key] };
}

/** Counts how many of the given keys are marked done in progress. */
export function completionCount(progress: ActionProgress, keys: string[]): number {
  return keys.reduce((count, key) => count + (progress[key] ? 1 : 0), 0);
}

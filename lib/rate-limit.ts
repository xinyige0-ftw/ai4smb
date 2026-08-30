type BucketKey = "segment" | "generate" | "api-benchmark";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 30;

// Public API endpoints get a stricter budget than the in-app UI paths.
const BUCKET_LIMITS: Record<BucketKey, number> = {
  segment: MAX_PER_HOUR,
  generate: MAX_PER_HOUR,
  "api-benchmark": 10,
};

function getKey(anonId: string, bucket: BucketKey): string {
  return `${bucket}:${anonId}`;
}

export function checkRateLimit(anonId: string, bucket: BucketKey = "segment"): boolean {
  const key = getKey(anonId, bucket);
  const limit = BUCKET_LIMITS[bucket] ?? MAX_PER_HOUR;
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(key);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(key, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function getRateLimitStatus(anonId: string, bucket: BucketKey = "segment"): {
  used: number;
  limit: number;
  resetsAt: number | null;
} {
  const key = getKey(anonId, bucket);
  const limit = BUCKET_LIMITS[bucket] ?? MAX_PER_HOUR;
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(key);
  if (!entry || now > entry.resetAt) {
    return { used: 0, limit, resetsAt: null };
  }
  return { used: entry.count, limit, resetsAt: entry.resetAt };
}

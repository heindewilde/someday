// Tiny in-memory sliding-window rate limiter. Good enough for auth on a
// single-process self-hosted app — not meant for horizontally scaled setups.

const hits = new Map<string, number[]>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const cutoff = now - windowMs;
	const stamps = (hits.get(key) ?? []).filter((t) => t > cutoff);

	if (stamps.length >= limit) {
		hits.set(key, stamps);
		const retryAfter = Math.ceil((stamps[0] + windowMs - now) / 1000);
		return { ok: false, retryAfter: Math.max(retryAfter, 1) };
	}

	stamps.push(now);
	hits.set(key, stamps);

	// Opportunistic cleanup: only evict keys whose timestamps are all older than
	// the longest window in use (1 hour). Pruning with the current caller's window
	// would incorrectly evict entries from longer-window keys.
	if (hits.size > 5000) {
		const maxCutoff = now - 60 * 60 * 1000;
		for (const [k, v] of hits) {
			if (v.every((t) => t <= maxCutoff)) hits.delete(k);
		}
	}

	return { ok: true };
}

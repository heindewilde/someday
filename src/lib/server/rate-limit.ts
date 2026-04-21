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

	// Opportunistic cleanup so the map doesn't grow forever.
	if (hits.size > 5000) {
		for (const [k, v] of hits) {
			const kept = v.filter((t) => t > cutoff);
			if (kept.length === 0) hits.delete(k);
			else hits.set(k, kept);
		}
	}

	return { ok: true };
}

import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles, users } from '$lib/server/schema';
import { sanitizeEmailHtml, estimateReadingTime } from '$lib/server/parser';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { timingSafeEqual } from 'crypto';
import type { RequestHandler } from './$types';

interface PostmarkPayload {
	From: string;
	FromFull: { Email: string; Name: string };
	Subject: string;
	HtmlBody?: string;
	TextBody?: string;
	MessageID: string;
}

function verifySecret(incoming: string | null, expected: string): boolean {
	if (!incoming) return false;
	try {
		const a = Buffer.from(incoming);
		const b = Buffer.from(expected);
		// timingSafeEqual requires equal-length buffers
		if (a.length !== b.length) return false;
		return timingSafeEqual(a, b);
	} catch {
		return false;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	// Always return 200 — non-2xx triggers Postmark to retry 25× over 24 hours.
	// Secret is passed via X-Webhook-Secret header (not query string) to keep
	// it out of server access logs.
	const expected = env.INBOUND_EMAIL_SECRET;
	if (!expected) return json({ ok: false, reason: 'unauthorized' });

	const incoming = request.headers.get('X-Webhook-Secret');
	if (!verifySecret(incoming, expected)) {
		return json({ ok: false, reason: 'unauthorized' });
	}

	let payload: PostmarkPayload;
	try {
		payload = await request.json();
	} catch {
		return json({ ok: false, reason: 'invalid_json' });
	}

	const fromEmail = (payload.FromFull?.Email ?? payload.From ?? '').toLowerCase().trim();
	const fromName = payload.FromFull?.Name || null;
	if (!fromEmail) return json({ ok: false, reason: 'no_from' });

	const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, fromEmail));
	if (!user) return json({ ok: false, reason: 'unknown_sender' });

	const subject = (payload.Subject ?? '').trim() || '(no subject)';
	const fromDomain = fromEmail.includes('@') ? fromEmail.split('@')[1] : undefined;

	let content: string | null = null;
	let readingTimeMinutes = 1;
	let wordCount = 0;

	if (payload.HtmlBody?.trim()) {
		content = sanitizeEmailHtml(payload.HtmlBody);
		const text = payload.TextBody?.trim() || content.replace(/<[^>]+>/g, ' ');
		readingTimeMinutes = estimateReadingTime(text);
		wordCount = text.trim().split(/\s+/).filter(Boolean).length;
	} else if (payload.TextBody?.trim()) {
		const esc = payload.TextBody
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		content = `<pre style="white-space:pre-wrap;word-break:break-word;">${esc}</pre>`;
		readingTimeMinutes = estimateReadingTime(payload.TextBody);
		wordCount = payload.TextBody.trim().split(/\s+/).filter(Boolean).length;
	}

	await db.insert(articles).values({
		userId: user.id,
		url: null,
		title: subject,
		content,
		author: fromName,
		siteName: fromName ?? fromDomain ?? fromEmail,
		source: 'email',
		readingTimeMinutes,
		wordCount,
		domain: fromDomain ?? null,
	});

	return json({ ok: true });
};

import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles, tags, articleTags } from '$lib/server/schema';
import { cleanUrl, parseArticle } from '$lib/server/parser';
import { slugify } from '$lib/server/utils';
import { rateLimit } from '$lib/server/rate-limit';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const CONCURRENCY = 5;
const JOB_TTL_MS = 5 * 60 * 1000;
// Minimum gap between consecutive fetches to the same hostname. Prevents a
// CSV heavy on one domain (e.g. 500 Medium articles) from burning the shared
// Fly.io IP and triggering a ban that affects all users.
const DOMAIN_DELAY_MS = 1000;

interface ImportJob {
	total: number;
	progress: number;
	imported: number;
	skipped: number;
	done: boolean;
	error: string | null;
	completedAt: number | null;
}

const importJobs = new Map<string, ImportJob>();

function parseCSV(text: string): string[][] {
	const rows: string[][] = [];
	let i = 0;
	while (i < text.length) {
		const row: string[] = [];
		while (i < text.length) {
			if (text[i] === '"') {
				i++;
				let field = '';
				while (i < text.length) {
					if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
					else if (text[i] === '"') { i++; break; }
					else { field += text[i++]; }
				}
				row.push(field);
			} else {
				let field = '';
				while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
					field += text[i++];
				}
				row.push(field);
			}
			if (i < text.length && text[i] === ',') i++;
			else break;
		}
		if (i < text.length && text[i] === '\r') i++;
		if (i < text.length && text[i] === '\n') i++;
		if (row.length > 0) rows.push(row);
	}
	return rows;
}

function parseReadwiseTags(raw: string): string[] {
	const trimmed = raw.trim();
	if (!trimmed || trimmed === '[]') return [];
	const inner = trimmed.replace(/^\[|\]$/g, '').trim();
	return inner.split(/',\s*'/).map(t => t.replace(/^'|'$/g, '').trim()).filter(Boolean);
}

async function runImport(
	job: ImportJob,
	dataRows: string[][],
	idx: Record<string, number>,
	userId: string
) {
	const tagCache = new Map<string, string>();
	const tagInFlight = new Map<string, Promise<string>>();

	// Per-domain last-fetch timestamp. Workers check this before calling
	// parseArticle so we never hammer a single domain faster than DOMAIN_DELAY_MS.
	const domainLastFetch = new Map<string, number>();
	async function acquireDomainSlot(hostname: string) {
		const last = domainLastFetch.get(hostname) ?? 0;
		const wait = DOMAIN_DELAY_MS - (Date.now() - last);
		if (wait > 0) await new Promise<void>(r => setTimeout(r, wait));
		domainLastFetch.set(hostname, Date.now());
	}

	async function upsertTag(name: string, slug: string): Promise<string> {
		const cached = tagCache.get(slug);
		if (cached) return cached;
		const inFlight = tagInFlight.get(slug);
		if (inFlight) return inFlight;
		const p = (async () => {
			let [tag] = await db.select({ id: tags.id }).from(tags)
				.where(and(eq(tags.userId, userId), eq(tags.slug, slug)));
			if (!tag) {
				[tag] = await db.insert(tags).values({ name, slug, userId }).returning({ id: tags.id });
			}
			tagCache.set(slug, tag.id);
			return tag.id;
		})();
		tagInFlight.set(slug, p);
		return p;
	}

	async function processRow(row: string[]) {
		const rawUrl = (row[idx.url] ?? '').trim();
		let normalizedUrl: string;
		try {
			const parsed = new URL(rawUrl);
			if (!['http:', 'https:'].includes(parsed.protocol)) { job.skipped++; return; }
			normalizedUrl = cleanUrl(parsed.toString());
		} catch {
			job.skipped++;
			return;
		}

		const [existing] = await db
			.select({ id: articles.id }).from(articles)
			.where(and(eq(articles.userId, userId), eq(articles.url, normalizedUrl)));

		if (existing) { job.skipped++; return; }

		const titleFromCSV = idx.title >= 0 ? (row[idx.title] ?? '').trim() : '';
		const savedDateRaw = idx.savedDate >= 0 ? (row[idx.savedDate] ?? '').trim() : '';
		const progressRaw = idx.progress >= 0 ? (row[idx.progress] ?? '').trim() : '0';
		const location = idx.location >= 0 ? (row[idx.location] ?? '').trim() : '';
		const tagsRaw = idx.tags >= 0 ? (row[idx.tags] ?? '') : '';

		const savedAt = savedDateRaw ? new Date(savedDateRaw) : new Date();
		const isRead = progressRaw === '1';
		const isArchived = location === 'archive';
		const hostname = new URL(normalizedUrl).hostname.replace(/^www\./, '');

		let articleValues: typeof articles.$inferInsert;
		try {
			await acquireDomainSlot(hostname);
			const parsed = await parseArticle(normalizedUrl);
			articleValues = {
				...parsed,
				url: normalizedUrl,
				userId,
				title: parsed.title || titleFromCSV || hostname,
				isRead,
				isArchived,
				source: parsed.source ?? 'readwise',
				savedAt,
				domain: hostname,
			};
		} catch {
			articleValues = {
				url: normalizedUrl,
				userId,
				title: titleFromCSV || hostname,
				description: null,
				content: null,
				author: null,
				siteName: hostname,
				favicon: `${new URL(normalizedUrl).origin}/favicon.ico`,
				coverImage: null,
				readingTimeMinutes: 1,
				wordCount: 0,
				isPaywalled: false,
				isRead,
				isArchived,
				source: 'readwise',
				savedAt,
				domain: hostname,
			};
		}

		const [article] = await db.insert(articles).values(articleValues).returning({ id: articles.id });

		const tagNames = parseReadwiseTags(tagsRaw);
		await Promise.all(tagNames.map(async (name) => {
			const slug = slugify(name);
			const tagId = await upsertTag(name, slug);
			await db.insert(articleTags).values({ articleId: article.id, tagId }).onConflictDoNothing();
		}));

		job.imported++;
	}

	let rowIndex = 0;
	async function worker() {
		while (rowIndex < dataRows.length) {
			const row = dataRows[rowIndex++];
			await processRow(row);
			job.progress++;
		}
	}

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, dataRows.length) }, worker));

	job.done = true;
	job.completedAt = Date.now();
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const job = importJobs.get(locals.user.id);
	if (!job) return json({ active: false });

	// Expire completed jobs after TTL
	if (job.completedAt && Date.now() - job.completedAt > JOB_TTL_MS) {
		importJobs.delete(locals.user.id);
		return json({ active: false });
	}

	return json({
		active: !job.done,
		total: job.total,
		progress: job.progress,
		imported: job.imported,
		skipped: job.skipped,
		done: job.done,
		error: job.error,
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const rl = rateLimit(`import:${locals.user.id}`, 5, 60 * 60 * 1000);
	if (!rl.ok) error(429, `Too many requests. Retry after ${rl.retryAfter}s`);

	const existing = importJobs.get(locals.user.id);
	if (existing && !existing.done) error(409, 'An import is already running');

	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) error(400, 'No file uploaded');

	const text = await file.text();
	const rows = parseCSV(text);

	if (rows.length < 2) return json({ total: 0 });

	const header = rows[0].map(h => h.trim());
	const idx = {
		title: header.indexOf('Title'),
		url: header.indexOf('URL'),
		tags: header.indexOf('Document tags'),
		savedDate: header.indexOf('Saved date'),
		progress: header.indexOf('Reading progress'),
		location: header.indexOf('Location'),
	};

	const dataRows = rows.slice(1).filter(r => (r[idx.url] ?? '').trim().length > 0);
	const total = dataRows.length;

	const job: ImportJob = {
		total,
		progress: 0,
		imported: 0,
		skipped: 0,
		done: false,
		error: null,
		completedAt: null,
	};
	importJobs.set(locals.user.id, job);

	// Fire and forget — runs after response is sent
	runImport(job, dataRows, idx, locals.user.id).catch(e => {
		console.error('Readwise import failed:', e);
		job.error = e.message;
		job.done = true;
		job.completedAt = Date.now();
	});

	return json({ total });
};

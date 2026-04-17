import { json, error } from '@sveltejs/kit';
import { db, sqlite } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const STOP_WORDS = new Set([
	'the','be','to','of','and','a','in','that','have','it','for','not','on','with',
	'as','you','do','at','this','but','by','from','they','we','or','an','will','my',
	'one','all','would','there','their','what','so','up','out','if','about','who',
	'which','when','make','can','like','time','no','just','know','take','into','your',
	'some','could','them','see','other','than','then','now','only','its','over','also',
	'after','use','how','our','work','well','way','even','new','want','because','any',
	'these','most','are','was','were','been','has','had','is','am','being','did',
	'does','doing','should','may','might','must','shall','here','more','very','said',
	'each','those','such','both','before','under','again','same','own','few','than',
]);

function tokenize(text: string | null | undefined): string[] {
	if (!text) return [];
	return text
		.replace(/<[^>]+>/g, ' ')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(w => w.length >= 4 && !STOP_WORDS.has(w));
}

function buildFTSQuery(title: string, content: string | null): string | null {
	// Title words count 3x to bias toward topical similarity
	const words = [
		...tokenize(title), ...tokenize(title), ...tokenize(title),
		...tokenize(content),
	];
	if (words.length === 0) return null;

	// Rank by frequency, take top 50 unique terms
	const freq: Record<string, number> = {};
	for (const w of words) freq[w] = (freq[w] ?? 0) + 1;

	const terms = Object.entries(freq)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 50)
		.map(([w]) => `"${w.replace(/"/g, '')}"`)
		.join(' OR ');

	return terms || null;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const [target] = await db
		.select({ id: articles.id, title: articles.title, content: articles.content })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));

	if (!target) error(404, 'Article not found');

	const query = buildFTSQuery(target.title, target.content);
	if (!query) return json([]);

	const rows = sqlite.prepare(`
		SELECT article_id
		FROM articles_fts
		WHERE articles_fts MATCH ?
		  AND user_id = ?
		  AND article_id != ?
		ORDER BY rank
		LIMIT 5
	`).all(query, locals.user.id, params.id) as { article_id: string }[];

	if (rows.length === 0) return json([]);

	const ids = rows.map(r => r.article_id);
	const results = await db
		.select({
			id: articles.id,
			title: articles.title,
			url: articles.url,
			siteName: articles.siteName,
			favicon: articles.favicon,
			readingTimeMinutes: articles.readingTimeMinutes,
			isRead: articles.isRead,
		})
		.from(articles)
		.where(inArray(articles.id, ids));

	// Preserve FTS rank order
	const byId = Object.fromEntries(results.map(a => [a.id, a]));
	return json(ids.map(id => byId[id]).filter(Boolean));
};

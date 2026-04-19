import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { eq, inArray } from 'drizzle-orm';
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
	'each','those','such','both','before','under','again','same','own','few',
]);

function tokenize(text: string | null | undefined): string[] {
	if (!text) return [];
	return text
		.replace(/<[^>]+>/g, ' ')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

function docTokens(title: string, description: string | null, content: string | null): string[] {
	// Title repeated for higher weight; content truncated to keep memory reasonable
	const contentText = content ? content.replace(/<[^>]+>/g, ' ').slice(0, 3000) : '';
	return [
		...tokenize(title), ...tokenize(title),
		...tokenize(description),
		...tokenize(contentText),
	];
}

function buildVector(tokens: string[], df: Record<string, number>, N: number): Record<string, number> {
	const tf: Record<string, number> = {};
	for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
	const len = tokens.length || 1;
	const vec: Record<string, number> = {};
	for (const [t, count] of Object.entries(tf)) {
		// Smoothed IDF: log((N+1)/(df+1)) + 1
		const idf = Math.log((N + 1) / ((df[t] ?? 0) + 1)) + 1;
		vec[t] = (count / len) * idf;
	}
	return vec;
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
	let dot = 0, magA = 0, magB = 0;
	for (const [t, v] of Object.entries(a)) {
		dot += v * (b[t] ?? 0);
		magA += v * v;
	}
	for (const v of Object.values(b)) magB += v * v;
	return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const allArticles = await db
		.select({ id: articles.id, title: articles.title, description: articles.description, content: articles.content })
		.from(articles)
		.where(eq(articles.userId, locals.user.id));

	if (allArticles.length < 2) return json([]);
	if (!allArticles.find(a => a.id === params.id)) error(404, 'Article not found');

	const tokenized = allArticles.map(a => ({
		id: a.id,
		tokens: docTokens(a.title ?? '', a.description, a.content),
	}));

	const N = tokenized.length;

	// Document frequency across corpus
	const df: Record<string, number> = {};
	for (const { tokens } of tokenized) {
		for (const t of new Set(tokens)) df[t] = (df[t] ?? 0) + 1;
	}

	const targetTokens = tokenized.find(d => d.id === params.id)!.tokens;
	const targetVec = buildVector(targetTokens, df, N);

	const scored = tokenized
		.filter(d => d.id !== params.id)
		.map(d => ({ id: d.id, score: cosineSimilarity(targetVec, buildVector(d.tokens, df, N)) }))
		.filter(d => d.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);

	if (scored.length === 0) return json([]);

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
		.where(inArray(articles.id, scored.map(s => s.id)));

	const byId = Object.fromEntries(results.map(a => [a.id, a]));
	return json(scored.map(s => byId[s.id]).filter(Boolean));
};

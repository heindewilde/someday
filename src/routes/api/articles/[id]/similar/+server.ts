import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { eq, and, ne } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const STOP_WORDS = new Set([
	'the','be','to','of','and','a','in','that','have','it','for','not','on','with',
	'as','you','do','at','this','but','by','from','they','we','or','an','will','my',
	'one','all','would','there','their','what','so','up','out','if','about','who',
	'which','when','make','can','like','time','no','just','know','take','into','your',
	'some','could','them','see','other','than','then','now','only','its','over','also',
	'after','use','how','our','work','well','way','even','new','want','because','any',
	'these','most','are','was','were','been','has','had','is','am','being','did',
	'does','doing','should','may','might','must','shall','here','more','very','just',
	'been','than','then','when','where','while','though','through','each','from',
	'those','such','both','between','during','before','under','again','further',
	'once','same','own','too','very','few','more','most','other','some','such',
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

function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 || b.size === 0) return 0;
	let intersection = 0;
	for (const w of a) if (b.has(w)) intersection++;
	return intersection / (a.size + b.size - intersection);
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const [target] = await db
		.select({ id: articles.id, title: articles.title, description: articles.description, content: articles.content })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));

	if (!target) error(404, 'Article not found');

	// Build target word set — title weighted 3x, description 1x, first 500 chars of content 1x
	const titleWords = tokenize(target.title);
	const contentSnippet = target.content?.slice(0, 2000) ?? '';
	const targetWords = new Set([
		...titleWords, ...titleWords, ...titleWords,
		...tokenize(target.description),
		...tokenize(contentSnippet),
	]);

	const candidates = await db
		.select({
			id: articles.id,
			title: articles.title,
			description: articles.description,
			url: articles.url,
			siteName: articles.siteName,
			favicon: articles.favicon,
			readingTimeMinutes: articles.readingTimeMinutes,
			isRead: articles.isRead,
		})
		.from(articles)
		.where(and(eq(articles.userId, locals.user.id), ne(articles.id, params.id)));

	const scored = candidates
		.map(a => {
			const words = new Set([
				...tokenize(a.title), ...tokenize(a.title), ...tokenize(a.title),
				...tokenize(a.description),
			]);
			return { ...a, score: jaccard(targetWords, words) };
		})
		.filter(a => a.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);

	return json(scored.map(({ score: _, ...a }) => a));
};

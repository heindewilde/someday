import { json, error } from '@sveltejs/kit';
import { db, client } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// FTS5 reserved tokens we need to strip so user-title terms don't crash the MATCH.
const FTS_STRIP = /["()*:^\-]/g;

function buildMatchQuery(title: string): string {
	return title
		.replace(FTS_STRIP, ' ')
		.split(/\s+/)
		.filter(w => w.length >= 4)
		.slice(0, 8)
		.map(w => `"${w}"`)
		.join(' OR ');
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const [target] = await db
		.select({ id: articles.id, title: articles.title })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));
	if (!target) error(404, 'Article not found');

	const match = buildMatchQuery(target.title ?? '');
	if (!match) return json([]);

	const result = await client.execute({
		sql: `SELECT a.id, a.title, a.url, a.site_name, a.favicon,
		             a.reading_time_minutes, a.is_read
		      FROM articles_fts f
		      INNER JOIN articles a ON a.id = f.article_id
		      WHERE f.user_id = ?
		        AND f.articles_fts MATCH ?
		        AND a.id != ?
		      ORDER BY bm25(articles_fts) ASC
		      LIMIT 5`,
		args: [locals.user.id, match, params.id]
	});

	return json(
		result.rows.map(r => ({
			id: r.id,
			title: r.title,
			url: r.url,
			siteName: r.site_name,
			favicon: r.favicon,
			readingTimeMinutes: r.reading_time_minutes,
			isRead: !!r.is_read
		}))
	);
};

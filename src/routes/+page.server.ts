import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles, tags, articleTags, collections, articleCollections, reminders } from '$lib/server/schema';
import { eq, and, desc, sql, lte, gt, lt } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 30;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/auth');

	const userId = locals.user.id;
	const filter = url.searchParams.get('filter') ?? 'unread';
	const tagSlug = url.searchParams.get('tag') ?? null;
	const collectionId = url.searchParams.get('collection') ?? null;
	const q = url.searchParams.get('q')?.trim() || null;
	const readingTime = url.searchParams.get('time') ?? null;
	const domain = url.searchParams.get('domain') ?? null;
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

	const conditions = [eq(articles.userId, userId)];

	// In collection view, skip read/archive filters — collections show all articles
	if (!collectionId) {
		if (filter === 'unread') conditions.push(eq(articles.isArchived, false), eq(articles.isRead, false));
		else if (filter === 'read') conditions.push(eq(articles.isRead, true), eq(articles.isArchived, false));
		else if (filter === 'favorites') conditions.push(eq(articles.isFavorite, true), eq(articles.isArchived, false));
		else if (filter === 'archive') conditions.push(eq(articles.isArchived, true));
		else if (filter === 'reading') conditions.push(
			eq(articles.isArchived, false),
			eq(articles.isRead, false),
			gt(articles.readProgress, 0),
			lt(articles.readProgress, 100)
		);
		else conditions.push(eq(articles.isArchived, false));
	}

	if (collectionId) {
		conditions.push(
			sql`${articles.id} IN (SELECT article_id FROM article_collections WHERE collection_id = ${collectionId})`
		);
	}

	if (tagSlug) {
		conditions.push(
			sql`${articles.id} IN (
				SELECT at.article_id FROM article_tags at
				INNER JOIN tags t ON t.id = at.tag_id
				WHERE t.user_id = ${userId} AND t.slug = ${tagSlug}
			)`
		);
	}

	if (readingTime === 'under5') conditions.push(lte(articles.readingTimeMinutes, 5));
	else if (readingTime === 'under10') conditions.push(lte(articles.readingTimeMinutes, 10));
	else if (readingTime === 'under15') conditions.push(lte(articles.readingTimeMinutes, 15));
	else if (readingTime === 'under20') conditions.push(lte(articles.readingTimeMinutes, 20));
	else if (readingTime === 'over20') conditions.push(gt(articles.readingTimeMinutes, 20));

	if (domain) {
		conditions.push(eq(articles.domain, domain));
	}

	if (q) {
		// Strip all FTS5 operator chars/keywords before building the query.
		const clean = q
			.replace(/["()*:\-\^]/g, ' ')
			.replace(/\b(NOT|AND|OR)\b/gi, ' ')
			.trim();
		if (clean) {
			const ftsQuery = clean.split(/\s+/).filter(Boolean).map(w => `"${w}"*`).join(' ');
			conditions.push(
				sql`${articles.id} IN (
					SELECT article_id FROM articles_fts
					WHERE articles_fts MATCH ${ftsQuery} AND user_id = ${userId}
				)`
			);
		}
	}

	const selectFields = {
		id: articles.id,
		url: articles.url,
		title: articles.title,
		description: articles.description,
		author: articles.author,
		siteName: articles.siteName,
		favicon: articles.favicon,
		coverImage: articles.coverImage,
		readingTimeMinutes: articles.readingTimeMinutes,
		wordCount: articles.wordCount,
		isRead: articles.isRead,
		isArchived: articles.isArchived,
		isFavorite: articles.isFavorite,
		isPaywalled: articles.isPaywalled,
		source: articles.source,
		readProgress: articles.readProgress,
		savedAt: articles.savedAt
	};

	const whereClause = and(...conditions);
	let total = 0;

	const [countRow] = await db
		.select({ total: sql<number>`count(*)` })
		.from(articles)
		.where(whereClause);
	total = countRow.total;

	const rawArticles = await db
		.select(selectFields)
		.from(articles)
		.where(whereClause)
		.orderBy(desc(articles.savedAt))
		.limit(PAGE_SIZE)
		.offset(offset);

	const articleIds = rawArticles.map(a => a.id as string);

	const tagMap: Record<string, { id: string; name: string; slug: string }[]> = {};
	if (articleIds.length > 0) {
		const tagRows = await db
			.select({ articleId: articleTags.articleId, tagId: tags.id, tagName: tags.name, tagSlug: tags.slug })
			.from(articleTags)
			.innerJoin(tags, eq(articleTags.tagId, tags.id))
			.where(sql`${articleTags.articleId} IN (${sql.join(articleIds.map(id => sql`${id}`), sql`, `)})`);

		for (const row of tagRows) {
			if (!tagMap[row.articleId as string]) tagMap[row.articleId as string] = [];
			tagMap[row.articleId as string].push({ id: row.tagId as string, name: row.tagName as string, slug: row.tagSlug as string });
		}
	}

	const [colMap, allTags, allCollections, counts, allReminders, allDomains] = await Promise.all([
		fetchArticleCollections(articleIds),
		getTags(userId),
		getCollections(userId),
		getCounts(userId),
		getReminders(userId),
		getDomains(userId)
	]);

	return {
		articles: rawArticles.map(a => ({ ...a, tags: tagMap[a.id as string] ?? [], collections: colMap[a.id as string] ?? [] })),
		tags: allTags,
		collections: allCollections,
		filter,
		activeTag: tagSlug,
		activeCollection: collectionId,
		readingTime,
		domain,
		domains: allDomains,
		q,
		counts,
		total,
		offset,
		pageSize: PAGE_SIZE,
		reminders: allReminders
	};
};

async function fetchArticleCollections(articleIds: string[]) {
	const map: Record<string, { id: string; name: string }[]> = {};
	if (articleIds.length === 0) return map;
	const rows = await db
		.select({ articleId: articleCollections.articleId, id: collections.id, name: collections.name })
		.from(articleCollections)
		.innerJoin(collections, eq(articleCollections.collectionId, collections.id))
		.where(sql`${articleCollections.articleId} IN (${sql.join(articleIds.map(id => sql`${id}`), sql`, `)})`);
	for (const row of rows) {
		if (!map[row.articleId as string]) map[row.articleId as string] = [];
		map[row.articleId as string].push({ id: row.id as string, name: row.name as string });
	}
	return map;
}

async function getCounts(userId: string) {
	const [rows, [inProgressRow]] = await Promise.all([
		db
			.select({
				isRead: articles.isRead,
				isArchived: articles.isArchived,
				count: sql<number>`count(*)`,
				minutes: sql<number>`coalesce(sum(reading_time_minutes), 0)`,
				words: sql<number>`coalesce(sum(word_count), 0)`
			})
			.from(articles)
			.where(eq(articles.userId, userId))
			.groupBy(articles.isRead, articles.isArchived),
		db
			.select({ count: sql<number>`count(*)` })
			.from(articles)
			.where(and(
				eq(articles.userId, userId),
				eq(articles.isArchived, false),
				eq(articles.isRead, false),
				gt(articles.readProgress, 0),
				lt(articles.readProgress, 100)
			))
	]);

	const readRows = rows.filter(r => r.isRead);

	return {
		unread: rows.filter(r => !r.isRead && !r.isArchived).reduce((s, r) => s + r.count, 0),
		read: rows.filter(r => r.isRead && !r.isArchived).reduce((s, r) => s + r.count, 0),
		archive: rows.filter(r => r.isArchived).reduce((s, r) => s + r.count, 0),
		reading: inProgressRow?.count ?? 0,
		readingStats: {
			articles: readRows.reduce((s, r) => s + r.count, 0),
			minutes: readRows.reduce((s, r) => s + r.minutes, 0),
			words: readRows.reduce((s, r) => s + r.words, 0)
		}
	};
}

async function getReminders(userId: string) {
	return db
		.select({
			id: reminders.id,
			articleId: reminders.articleId,
			remindAt: reminders.remindAt,
			articleTitle: articles.title
		})
		.from(reminders)
		.innerJoin(articles, eq(reminders.articleId, articles.id))
		.where(eq(reminders.userId, userId))
		.orderBy(reminders.remindAt);
}

async function getTags(userId: string) {
	const [tagList, countRows] = await Promise.all([
		db.select().from(tags).where(eq(tags.userId, userId)).orderBy(tags.name),
		db.select({ tagId: articleTags.tagId, count: sql<number>`count(*)` })
			.from(articleTags)
			.innerJoin(articles, eq(articleTags.articleId, articles.id))
			.where(eq(articles.userId, userId))
			.groupBy(articleTags.tagId)
	]);
	const countMap = Object.fromEntries(countRows.map(r => [r.tagId, r.count]));
	return tagList.map(t => ({ ...t, articleCount: countMap[t.id] ?? 0 }));
}

async function getDomains(userId: string) {
	const rows = await db
		.select({
			hostname: articles.domain,
			count: sql<number>`count(*)`
		})
		.from(articles)
		.where(and(eq(articles.userId, userId), sql`${articles.domain} IS NOT NULL`))
		.groupBy(articles.domain)
		.orderBy(desc(sql`count(*)`), articles.domain);

	return rows.map(r => ({ hostname: r.hostname!, count: r.count }));
}

async function getCollections(userId: string) {
	const [cols, countRows] = await Promise.all([
		db.select().from(collections).where(eq(collections.userId, userId)).orderBy(collections.name),
		db.select({ collectionId: articleCollections.collectionId, count: sql<number>`count(*)` })
			.from(articleCollections)
			.innerJoin(articles, eq(articleCollections.articleId, articles.id))
			.where(eq(articles.userId, userId))
			.groupBy(articleCollections.collectionId)
	]);
	const countMap = Object.fromEntries(countRows.map(r => [r.collectionId as string, r.count]));
	return cols.map(c => ({ ...c, articleCount: countMap[c.id] ?? 0 }));
}

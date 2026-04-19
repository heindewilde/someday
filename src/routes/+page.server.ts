import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles, tags, articleTags, collections, articleCollections, reminders } from '$lib/server/schema';
import { eq, and, desc, sql, like, or, lte, gte } from 'drizzle-orm';
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
	const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

	const conditions = [eq(articles.userId, userId)];

	// In collection view, skip read/archive filters — collections show all articles
	if (!collectionId) {
		if (filter === 'unread') conditions.push(eq(articles.isArchived, false), eq(articles.isRead, false));
		else if (filter === 'read') conditions.push(eq(articles.isRead, true), eq(articles.isArchived, false));
		else if (filter === 'favorites') conditions.push(eq(articles.isFavorite, true), eq(articles.isArchived, false));
		else if (filter === 'archive') conditions.push(eq(articles.isArchived, true));
		else conditions.push(eq(articles.isArchived, false));
	}

	if (collectionId) {
		conditions.push(
			sql`${articles.id} IN (SELECT article_id FROM article_collections WHERE collection_id = ${collectionId})`
		);
	}

	if (readingTime === 'under5') conditions.push(lte(articles.readingTimeMinutes, 5));
	else if (readingTime === 'over20') conditions.push(gte(articles.readingTimeMinutes, 20));

	if (q) {
		const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
		const pattern = `%${escaped}%`;
		conditions.push(
			or(like(articles.title, pattern), like(articles.description, pattern))!
		);
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
		isRead: articles.isRead,
		isArchived: articles.isArchived,
		isFavorite: articles.isFavorite,
		isPaywalled: articles.isPaywalled,
		source: articles.source,
		savedAt: articles.savedAt
	};

	const whereClause = and(...conditions);

	let articleList: typeof selectFields extends Record<string, infer V> ? { [K in keyof typeof selectFields]: unknown }[] : never[] = [];
	let total = 0;

	if (tagSlug) {
		const allArticles = await db
			.select(selectFields)
			.from(articles)
			.where(whereClause)
			.orderBy(desc(articles.savedAt));

		const allIds = allArticles.map((a) => a.id as string);

		const tagRows = allIds.length > 0
			? await db
				.select({ articleId: articleTags.articleId, tagId: tags.id, tagName: tags.name, tagSlug: tags.slug })
				.from(articleTags)
				.innerJoin(tags, eq(articleTags.tagId, tags.id))
				.where(sql`${articleTags.articleId} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)})`)
			: [];

		const tagMap: Record<string, { id: string; name: string; slug: string }[]> = {};
		for (const row of tagRows) {
			if (!tagMap[row.articleId as string]) tagMap[row.articleId as string] = [];
			tagMap[row.articleId as string].push({ id: row.tagId as string, name: row.tagName as string, slug: row.tagSlug as string });
		}

		const filtered = allArticles.filter(a => tagMap[a.id as string]?.some(t => t.slug === tagSlug));
		total = filtered.length;
		const page = filtered.slice(offset, offset + PAGE_SIZE);
		const pageIds = page.map(a => a.id as string);

		const [colMap, allTags, allCollections, counts, allReminders] = await Promise.all([
			fetchArticleCollections(pageIds),
			getTags(userId),
			getCollections(userId),
			getCounts(userId),
			getReminders(userId)
		]);

		return {
			articles: page.map(a => ({ ...a, tags: tagMap[a.id as string] ?? [], collections: colMap[a.id as string] ?? [] })),
			tags: allTags,
			collections: allCollections,
			filter,
			activeTag: tagSlug,
			activeCollection: collectionId,
			readingTime,
			q,
			counts,
			total,
			offset,
			pageSize: PAGE_SIZE,
			reminders: allReminders
		};
	}

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

	const [colMap, allTags, allCollections, counts, allReminders] = await Promise.all([
		fetchArticleCollections(articleIds),
		getTags(userId),
		getCollections(userId),
		getCounts(userId),
		getReminders(userId)
	]);

	return {
		articles: rawArticles.map(a => ({ ...a, tags: tagMap[a.id as string] ?? [], collections: colMap[a.id as string] ?? [] })),
		tags: allTags,
		collections: allCollections,
		filter,
		activeTag: tagSlug,
		activeCollection: collectionId,
		readingTime,
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
	const rows = await db
		.select({
			isRead: articles.isRead,
			isArchived: articles.isArchived,
			count: sql<number>`count(*)`,
			minutes: sql<number>`coalesce(sum(reading_time_minutes), 0)`
		})
		.from(articles)
		.where(eq(articles.userId, userId))
		.groupBy(articles.isRead, articles.isArchived);

	const readRows = rows.filter(r => r.isRead);

	const readContent = await db
		.select({ content: articles.content })
		.from(articles)
		.where(and(eq(articles.userId, userId), eq(articles.isRead, true)));

	const totalWords = readContent.reduce((sum, a) => {
		if (!a.content) return sum;
		const text = a.content.replace(/<[^>]+>/g, ' ');
		return sum + text.trim().split(/\s+/).filter(Boolean).length;
	}, 0);

	return {
		unread: rows.filter(r => !r.isRead && !r.isArchived).reduce((s, r) => s + r.count, 0),
		read: rows.filter(r => r.isRead && !r.isArchived).reduce((s, r) => s + r.count, 0),
		archive: rows.filter(r => r.isArchived).reduce((s, r) => s + r.count, 0),
		readingStats: {
			articles: readRows.reduce((s, r) => s + r.count, 0),
			minutes: readRows.reduce((s, r) => s + r.minutes, 0),
			words: totalWords
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

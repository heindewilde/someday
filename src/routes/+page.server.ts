import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles, tags, articleTags, collections } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/auth');

	const userId = locals.user.id;
	const filter = url.searchParams.get('filter') ?? 'unread';
	const tagSlug = url.searchParams.get('tag') ?? null;
	const collectionId = url.searchParams.get('collection') ?? null;

	const conditions = [eq(articles.userId, userId)];

	if (filter === 'unread') conditions.push(eq(articles.isArchived, false), eq(articles.isRead, false));
	else if (filter === 'read') conditions.push(eq(articles.isRead, true), eq(articles.isArchived, false));
	else if (filter === 'favorites') conditions.push(eq(articles.isFavorite, true), eq(articles.isArchived, false));
	else if (filter === 'archive') conditions.push(eq(articles.isArchived, true));
	else conditions.push(eq(articles.isArchived, false));

	if (collectionId) conditions.push(eq(articles.collectionId, collectionId));

	let query = db
		.select({
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
			savedAt: articles.savedAt,
			collectionId: articles.collectionId
		})
		.from(articles)
		.where(and(...conditions))
		.orderBy(desc(articles.savedAt));

	const articleList = await query;

	const articleIds = articleList.map((a) => a.id);

	const tagMap: Record<string, { id: string; name: string; slug: string }[]> = {};
	if (articleIds.length > 0) {
		const articleTagRows = await db
			.select({
				articleId: articleTags.articleId,
				tagId: tags.id,
				tagName: tags.name,
				tagSlug: tags.slug
			})
			.from(articleTags)
			.innerJoin(tags, eq(articleTags.tagId, tags.id))
			.where(
				sql`${articleTags.articleId} IN (${sql.join(articleIds.map((id) => sql`${id}`), sql`, `)})`
			);

		for (const row of articleTagRows) {
			if (!tagMap[row.articleId]) tagMap[row.articleId] = [];
			tagMap[row.articleId].push({ id: row.tagId, name: row.tagName, slug: row.tagSlug });
		}
	}

	// If filtering by tag, only include articles that have that tag
	let filteredArticles = articleList;
	if (tagSlug) {
		const taggedIds = new Set(
			Object.entries(tagMap)
				.filter(([_, t]) => t.some((tag) => tag.slug === tagSlug))
				.map(([id]) => id)
		);
		filteredArticles = articleList.filter((a) => taggedIds.has(a.id));
	}

	const allTags = await db
		.select()
		.from(tags)
		.where(eq(tags.userId, userId))
		.orderBy(tags.name);

	const allCollections = await db
		.select()
		.from(collections)
		.where(eq(collections.userId, userId))
		.orderBy(collections.name);

	const counts = await db
		.select({
			isRead: articles.isRead,
			isArchived: articles.isArchived,
			isFavorite: articles.isFavorite,
			count: sql<number>`count(*)`
		})
		.from(articles)
		.where(eq(articles.userId, userId))
		.groupBy(articles.isRead, articles.isArchived, articles.isFavorite);

	const unreadCount = counts.filter((c) => !c.isRead && !c.isArchived).reduce((s, c) => s + c.count, 0);
	const readCount = counts.filter((c) => c.isRead && !c.isArchived).reduce((s, c) => s + c.count, 0);
	const favCount = counts.filter((c) => c.isFavorite && !c.isArchived).reduce((s, c) => s + c.count, 0);
	const archiveCount = counts.filter((c) => c.isArchived).reduce((s, c) => s + c.count, 0);

	return {
		articles: filteredArticles.map((a) => ({ ...a, tags: tagMap[a.id] ?? [] })),
		tags: allTags,
		collections: allCollections,
		filter,
		activeTag: tagSlug,
		activeCollection: collectionId,
		counts: { unread: unreadCount, read: readCount, favorites: favCount, archive: archiveCount }
	};
};

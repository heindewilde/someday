import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const users = sqliteTable('users', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const collections = sqliteTable('collections', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const articles = sqliteTable('articles', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	url: text('url'),
	title: text('title').notNull(),
	description: text('description'),
	content: text('content'),
	author: text('author'),
	siteName: text('site_name'),
	favicon: text('favicon'),
	coverImage: text('cover_image'),
	readingTimeMinutes: integer('reading_time_minutes').default(0),
	isRead: integer('is_read', { mode: 'boolean' }).default(false),
	isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
	isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
	isPaywalled: integer('is_paywalled', { mode: 'boolean' }).default(false),
	source: text('source'),
	savedAt: integer('saved_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	readAt: integer('read_at', { mode: 'timestamp' })
});

export const articleCollections = sqliteTable('article_collections', {
	articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
	collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' })
}, (t) => [primaryKey({ columns: [t.articleId, t.collectionId] })]);

export const tags = sqliteTable('tags', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	slug: text('slug').notNull()
});

export const articleTags = sqliteTable('article_tags', {
	articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
	tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
}, (t) => [primaryKey({ columns: [t.articleId, t.tagId] })]);

export const reminders = sqliteTable('reminders', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
	remindAt: integer('remind_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

<script lang="ts">
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/toasts.svelte';

	let { data } = $props();
	let article = $state({ ...data.article });

	async function patch(body: Record<string, unknown>) {
		const res = await fetch(`/api/articles/${article.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) addToast('Something went wrong', 'error');
		return res.ok;
	}

	async function toggleRead() {
		const next = !article.isRead;
		article.isRead = next;
		await patch({ isRead: next });
	}

	async function toggleFavorite() {
		const next = !article.isFavorite;
		article.isFavorite = next;
		await patch({ isFavorite: next });
	}

	async function deleteArticle() {
		if (!confirm('Delete this article?')) return;
		await fetch(`/api/articles/${article.id}`, { method: 'DELETE' });
		goto('/');
	}

	const savedDate = article.savedAt
		? new Date(article.savedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		: null;
</script>

<svelte:head>
	<title>{article.title} — Someday</title>
</svelte:head>

<div class="page">
	<header class="topbar">
		<a href="/" class="back">
			<svg width="14" height="14" viewBox="0 0 15 15" fill="none">
				<path d="M8.5 3L4.5 7.5L8.5 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Back
		</a>

		<div class="topbar-actions">
			<button class="act" class:act-on={article.isRead} onclick={toggleRead}>
				{#if article.isRead}
					<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5L5.5 10.5L12.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
					Mark unread
				{:else}
					<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.4"/></svg>
					Mark read
				{/if}
			</button>
			<button class="act" class:act-on={article.isFavorite} onclick={toggleFavorite}>
				<svg width="12" height="12" viewBox="0 0 15 15" fill={article.isFavorite ? 'currentColor' : 'none'}>
					<path d="M7.5 2L9.18 5.41L13 6.01L10.25 8.7L10.91 12.5L7.5 10.73L4.09 12.5L4.75 8.7L2 6.01L5.82 5.41L7.5 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
				</svg>
				{article.isFavorite ? 'Favorited' : 'Favorite'}
			</button>
			<a class="act" href={article.url} target="_blank" rel="noopener">
				<svg width="12" height="12" viewBox="0 0 15 15" fill="none">
					<path d="M9 2H13V6M13 2L6.5 8.5M5.5 3.5H3a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				Original
			</a>
			<button class="act act-del" onclick={deleteArticle}>
				<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M5 5l5 5M10 5l-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
				Delete
			</button>
		</div>
	</header>

	<div class="reader">
		<div class="article-meta">
			{#if article.favicon}
				<img src={article.favicon} alt="" class="favicon" width="14" height="14"
					onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
			{/if}
			<span class="site">{article.siteName ?? new URL(article.url).hostname}</span>
			{#if article.author}<span class="sep">·</span><span class="author">{article.author}</span>{/if}
			{#if article.readingTimeMinutes}<span class="sep">·</span><span class="rtime">{article.readingTimeMinutes} min read</span>{/if}
			{#if savedDate}<span class="sep">·</span><span class="rtime">Saved {savedDate}</span>{/if}
		</div>

		<h1 class="article-title">{article.title}</h1>

		{#if article.coverImage}
			<img src={article.coverImage} alt="" class="cover"
				onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
		{/if}

		{#if article.content}
			<div class="prose prose-neutral dark:prose-invert max-w-none">
				{@html article.content}
			</div>
		{:else}
			<div class="no-content">
				<p>No saved content for this article.</p>
				<a href={article.url} target="_blank" rel="noopener">Open original →</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--color-bg);
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1.5rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		gap: 1rem;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.875rem;
		color: var(--color-muted);
		text-decoration: none;
		padding: 0.3em 0.5em;
		border-radius: 5px;
		transition: color 0.1s, background 0.1s;
		flex-shrink: 0;
	}

	.back:hover {
		color: var(--color-text);
		background: var(--color-bg);
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.act {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		font-size: 0.75rem;
		padding: 0.2em 0.6em;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		cursor: pointer;
		font-family: inherit;
		color: var(--color-muted);
		text-decoration: none;
		transition: all 0.1s;
	}

	.act:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.act-on {
		background: var(--color-text);
		border-color: var(--color-text);
		color: #fff;
	}

	.act-del:hover {
		background: #fef2f2;
		border-color: #fca5a5;
		color: #dc2626;
	}

	.reader {
		max-width: 680px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 5rem;
	}

	.article-meta {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.875rem;
		flex-wrap: wrap;
	}

	.favicon { border-radius: 2px; object-fit: contain; }
	.site, .author { font-size: 0.8125rem; color: var(--color-muted); }
	.rtime { font-size: 0.8125rem; color: var(--color-subtle); }
	.sep { font-size: 0.8125rem; color: var(--color-subtle); }

	.article-title {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.25;
		margin: 0 0 1.75rem;
		color: var(--color-text);
	}

	.cover {
		width: 100%;
		max-height: 400px;
		object-fit: cover;
		border-radius: var(--radius-lg);
		margin-bottom: 2rem;
		border: 1px solid var(--color-border);
	}

	/* Tune prose to use our CSS variables */
	:global(.prose) {
		--tw-prose-body: var(--color-text);
		--tw-prose-headings: var(--color-text);
		--tw-prose-links: var(--color-text);
		--tw-prose-bold: var(--color-text);
		--tw-prose-counters: var(--color-muted);
		--tw-prose-bullets: var(--color-border-strong);
		--tw-prose-hr: var(--color-border);
		--tw-prose-quotes: var(--color-text);
		--tw-prose-quote-borders: var(--color-border-strong);
		--tw-prose-captions: var(--color-muted);
		--tw-prose-code: var(--color-text);
		--tw-prose-pre-code: var(--color-text);
		--tw-prose-pre-bg: var(--color-surface);
		--tw-prose-th-borders: var(--color-border);
		--tw-prose-td-borders: var(--color-border);
		font-size: 1.0625rem;
		line-height: 1.75;
	}

	.no-content {
		padding: 3rem 0;
		text-align: center;
		color: var(--color-muted);
		font-size: 0.9375rem;
	}

	.no-content a {
		color: var(--color-text);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>

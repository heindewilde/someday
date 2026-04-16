<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let urlInput = $state('');
	let saving = $state(false);
	let saveError = $state('');
	let showTagInput = $state<string | null>(null);
	let tagInputValue = $state('');
	let showNewCollection = $state(false);
	let newCollectionName = $state('');
	let newCollectionIcon = $state('📁');

	async function createCollection() {
		const name = newCollectionName.trim();
		if (!name) return;
		await fetch('/api/collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, icon: newCollectionIcon })
		});
		newCollectionName = '';
		newCollectionIcon = '📁';
		showNewCollection = false;
		await invalidateAll();
	}

	function onKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isEditing = ['INPUT', 'TEXTAREA'].includes(target.tagName);
		if (!isEditing && (e.metaKey || e.ctrlKey) && e.key === 'v') {
			e.preventDefault();
			navigator.clipboard.readText().then((text) => {
				const trimmed = text.trim();
				if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
					saveUrl(trimmed);
				}
			});
		}
	}

	async function saveUrl(url: string) {
		if (!url.trim()) return;
		saving = true;
		saveError = '';
		try {
			const res = await fetch('/api/articles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});
			if (!res.ok) {
				const err = await res.json();
				saveError = err.message ?? 'Failed to save';
			} else {
				urlInput = '';
				await invalidateAll();
			}
		} catch {
			saveError = 'Failed to save article';
		} finally {
			saving = false;
		}
	}

	async function toggleRead(id: string, isRead: boolean) {
		await fetch(`/api/articles/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isRead: !isRead })
		});
		await invalidateAll();
	}

	async function toggleFavorite(id: string, isFavorite: boolean) {
		await fetch(`/api/articles/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isFavorite: !isFavorite })
		});
		await invalidateAll();
	}

	async function archiveArticle(id: string) {
		await fetch(`/api/articles/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isArchived: true })
		});
		await invalidateAll();
	}

	async function deleteArticle(id: string) {
		if (!confirm('Delete this article?')) return;
		await fetch(`/api/articles/${id}`, { method: 'DELETE' });
		await invalidateAll();
	}

	async function addTag(articleId: string) {
		const name = tagInputValue.trim();
		if (!name) return;
		await fetch(`/api/articles/${articleId}/tags`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		tagInputValue = '';
		showTagInput = null;
		await invalidateAll();
	}

	async function moveToCollection(articleId: string, collectionId: string | null) {
		await fetch(`/api/articles/${articleId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ collectionId })
		});
		await invalidateAll();
	}

	async function removeTag(articleId: string, tagId: string) {
		await fetch(`/api/articles/${articleId}/tags/${tagId}`, { method: 'DELETE' });
		await invalidateAll();
	}

	function navTo(params: Record<string, string | null>) {
		const u = new URL(page.url);
		for (const [k, v] of Object.entries(params)) {
			if (v === null) u.searchParams.delete(k);
			else u.searchParams.set(k, v);
		}
		goto(u.toString());
	}

	const filterLabels: Record<string, string> = {
		unread: 'Unread',
		read: 'Read',
		favorites: 'Favorites',
		archive: 'Archive',
		all: 'All'
	};
</script>

<svelte:window onkeydown={onKeydown} />
<svelte:head><title>Someday</title></svelte:head>

<div class="app">
	<aside class="sidebar">
		<div class="sidebar-header">
			<div class="logo">
				<span class="logo-mark">S</span>
				<span class="logo-text">Someday</span>
			</div>
		</div>

		<nav class="sidebar-nav">
			<button
				class="nav-item"
				class:active={data.filter === 'unread' && !data.activeTag && !data.activeCollection}
				onclick={() => navTo({ filter: 'unread', tag: null, collection: null })}
			>
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 3h11M2 7.5h11M2 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
				Unread
				{#if data.counts.unread > 0}<span class="badge">{data.counts.unread}</span>{/if}
			</button>
			<button
				class="nav-item"
				class:active={data.filter === 'read' && !data.activeTag && !data.activeCollection}
				onclick={() => navTo({ filter: 'read', tag: null, collection: null })}
			>
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5L5.5 10.5L12.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
				Read
			</button>
			<button
				class="nav-item"
				class:active={data.filter === 'favorites' && !data.activeTag && !data.activeCollection}
				onclick={() => navTo({ filter: 'favorites', tag: null, collection: null })}
			>
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L9.18 5.41L13 6.01L10.25 8.7L10.91 12.5L7.5 10.73L4.09 12.5L4.75 8.7L2 6.01L5.82 5.41L7.5 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
				Favorites
			</button>
			<button
				class="nav-item"
				class:active={data.filter === 'archive'}
				onclick={() => navTo({ filter: 'archive', tag: null, collection: null })}
			>
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3.5" width="12" height="2" rx="0.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 5.5v6a1 1 0 001 1h8a1 1 0 001-1v-6" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 8.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
				Archive
			</button>
		</nav>

		<div class="sidebar-section">
			<div class="section-header">
				<p class="section-label">Collections</p>
				<button class="section-add" onclick={() => { showNewCollection = !showNewCollection; newCollectionName = ''; }} title="New collection">+</button>
			</div>
			{#if showNewCollection}
				<div class="new-collection-form">
					<input
						class="col-icon-input"
						type="text"
						bind:value={newCollectionIcon}
						maxlength="2"
					/>
					<input
						class="col-name-input"
						type="text"
						placeholder="Collection name"
						bind:value={newCollectionName}
						onkeydown={(e) => { if (e.key === 'Enter') createCollection(); if (e.key === 'Escape') showNewCollection = false; }}
						autofocus
					/>
					<button class="col-save-btn" onclick={createCollection} disabled={!newCollectionName.trim()}>Add</button>
				</div>
			{/if}
			{#each data.collections as col}
				<button
					class="nav-item"
					class:active={data.activeCollection === col.id}
					onclick={() => navTo({ collection: col.id, tag: null, filter: 'all' })}
				>
					<span>{col.icon}</span>
					{col.name}
				</button>
			{/each}
		</div>

		{#if data.tags.length > 0}
			<div class="sidebar-section">
				<p class="section-label">Tags</p>
				<div class="tag-cloud">
					{#each data.tags as tag}
						<button
							class="tag-pill"
							class:active={data.activeTag === tag.slug}
							onclick={() => navTo({ tag: tag.slug, collection: null, filter: 'all' })}
						>{tag.name}</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="sidebar-footer">
			<a href="/auth/logout" class="nav-item">
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M9 2H12.5C12.7761 2 13 2.22386 13 2.5V12.5C13 12.7761 12.7761 13 12.5 13H9M6 10.5L9 7.5M9 7.5L6 4.5M9 7.5H2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
				Sign out
			</a>
		</div>
	</aside>

	<main class="main">
		<div class="save-bar">
			<div class="save-wrap" class:busy={saving}>
				<svg width="14" height="14" viewBox="0 0 15 15" fill="none" class="save-icon"><path d="M1 1l13 13M10 6.5A3.5 3.5 0 116.5 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
				<input
					type="url"
					placeholder="Paste a URL to save…  or press Cmd+V anywhere"
					bind:value={urlInput}
					onkeydown={(e) => e.key === 'Enter' && saveUrl(urlInput)}
					disabled={saving}
					class="save-input"
				/>
				<button class="save-btn" onclick={() => saveUrl(urlInput)} disabled={saving || !urlInput.trim()}>
					{saving ? '…' : 'Save'}
				</button>
			</div>
			{#if saveError}<p class="save-error">{saveError}</p>{/if}
		</div>

		<div class="list-header">
			<h2>{filterLabels[data.filter] ?? 'Articles'}{data.activeTag ? ` · #${data.activeTag}` : ''}{data.activeCollection ? ` · ${data.collections.find(c => c.id === data.activeCollection)?.name}` : ''}</h2>
			<span class="count">{data.articles.length}</span>
		</div>

		<div class="article-list">
			{#if data.articles.length === 0}
				<div class="empty">
					<p class="empty-title">Nothing here yet</p>
					<p class="empty-sub">Paste a URL above or press Cmd+V anywhere on this page</p>
				</div>
			{:else}
				{#each data.articles as article (article.id)}
					<article class="card" class:read={article.isRead}>
						<div class="card-meta">
							{#if article.favicon}
								<img src={article.favicon} alt="" class="favicon" width="13" height="13" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
							{/if}
							<span class="site">{article.siteName ?? new URL(article.url).hostname}</span>
							{#if article.author}<span class="sep">·</span><span class="author">{article.author}</span>{/if}
							{#if article.readingTimeMinutes}<span class="sep">·</span><span class="rtime">{article.readingTimeMinutes} min</span>{/if}
						</div>

						<div class="card-body">
							<div class="card-text">
								<a href={article.url} target="_blank" rel="noopener" class="card-title">{article.title}</a>
								{#if article.description}
									<p class="card-desc">{article.description}</p>
								{/if}
								<div class="card-tags">
									{#each article.tags as tag}
										<span class="tag">
											{tag.name}
											<button class="tag-x" onclick={() => removeTag(article.id, tag.id)}>×</button>
										</span>
									{/each}
									{#if showTagInput === article.id}
										<input
											class="tag-inp"
											type="text"
											placeholder="tag…"
											bind:value={tagInputValue}
											onkeydown={(e) => { if (e.key === 'Enter') addTag(article.id); if (e.key === 'Escape') { showTagInput = null; tagInputValue = ''; } }}
											onblur={() => { if (!tagInputValue.trim()) showTagInput = null; }}
										/>
									{:else}
										<button class="tag-add" onclick={() => { showTagInput = article.id; tagInputValue = ''; }}>+ tag</button>
									{/if}
								</div>
							</div>
							{#if article.coverImage}
								<img src={article.coverImage} alt="" class="thumb" />
							{/if}
						</div>

						<div class="card-actions">
							<button class="act" class:act-on={article.isRead} onclick={() => toggleRead(article.id, article.isRead ?? false)}>
								{article.isRead ? 'Mark unread' : 'Mark read'}
							</button>
							<button class="act" class:act-on={article.isFavorite} onclick={() => toggleFavorite(article.id, article.isFavorite ?? false)}>
								{article.isFavorite ? '★ Saved' : '☆ Favorite'}
							</button>
							{#if !article.isArchived}
								<button class="act" onclick={() => archiveArticle(article.id)}>Archive</button>
							{/if}
							{#if data.collections.length > 0}
								<select
									class="act col-select"
									value={article.collectionId ?? ''}
									onchange={(e) => moveToCollection(article.id, (e.currentTarget as HTMLSelectElement).value || null)}
								>
									<option value="">Move to…</option>
									{#each data.collections as col}
										<option value={col.id}>{col.icon} {col.name}</option>
									{/each}
								</select>
							{/if}
							<button class="act act-del" onclick={() => deleteArticle(article.id)}>Delete</button>
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</main>
</div>

<style>
	.app {
		display: flex;
		min-height: 100vh;
	}

	/* ── Sidebar ── */
	.sidebar {
		width: 210px;
		flex-shrink: 0;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}

	.sidebar-header {
		padding: 1.25rem 1rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo-mark {
		width: 1.625rem;
		height: 1.625rem;
		background: var(--color-text);
		color: #fff;
		border-radius: 5px;
		display: grid;
		place-items: center;
		font-weight: 600;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.logo-text {
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.sidebar-nav {
		padding: 0.5rem;
		flex: 1;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: inherit;
		font-weight: 400;
		color: var(--color-muted);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		text-decoration: none;
		transition: background 0.1s, color 0.1s;
	}

	.nav-item:hover, .nav-item.active {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.nav-item.active {
		font-weight: 500;
	}

	.badge {
		margin-left: auto;
		font-size: 0.6875rem;
		font-weight: 500;
		background: var(--color-border);
		color: var(--color-muted);
		padding: 0.1em 0.45em;
		border-radius: 99px;
	}

	.sidebar-section {
		border-top: 1px solid var(--color-border);
		padding: 0.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-right: 0.375rem;
	}

	.section-add {
		background: none;
		border: none;
		color: var(--color-subtle);
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.25rem;
		border-radius: 4px;
		transition: color 0.1s;
	}

	.section-add:hover { color: var(--color-text); }

	.new-collection-form {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.375rem 0.375rem;
	}

	.col-icon-input {
		width: 2rem;
		text-align: center;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 0.25rem;
		font-size: 0.875rem;
		font-family: inherit;
		background: var(--color-bg);
		flex-shrink: 0;
	}

	.col-icon-input:focus { outline: none; border-color: var(--color-text); }

	.col-name-input {
		flex: 1;
		min-width: 0;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 0.25rem 0.5rem;
		font-size: 0.8125rem;
		font-family: inherit;
		background: var(--color-bg);
	}

	.col-name-input:focus { outline: none; border-color: var(--color-text); }
	.col-name-input::placeholder { color: var(--color-subtle); }

	.col-save-btn {
		background: var(--color-text);
		color: #fff;
		border: none;
		border-radius: 5px;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		flex-shrink: 0;
	}

	.col-save-btn:disabled { opacity: 0.35; cursor: not-allowed; }

	.section-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-subtle);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.25rem 0.6rem;
		margin: 0 0 0.125rem;
	}

	.tag-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.125rem 0.375rem 0.375rem;
	}

	.tag-pill {
		font-size: 0.75rem;
		padding: 0.2em 0.55em;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 99px;
		cursor: pointer;
		font-family: inherit;
		color: var(--color-muted);
		transition: all 0.1s;
	}

	.tag-pill:hover, .tag-pill.active {
		background: var(--color-text);
		border-color: var(--color-text);
		color: #fff;
	}

	.sidebar-footer {
		margin-top: auto;
		border-top: 1px solid var(--color-border);
		padding: 0.5rem;
	}

	/* ── Main ── */
	.main {
		flex: 1;
		min-width: 0;
		padding: 2rem 2.5rem;
		max-width: 760px;
	}

	/* Save bar */
	.save-bar { margin-bottom: 1.75rem; }

	.save-wrap {
		display: flex;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		transition: border-color 0.15s, box-shadow 0.15s;
		overflow: hidden;
		padding-left: 0.75rem;
		gap: 0.25rem;
	}

	.save-wrap:focus-within {
		border-color: var(--color-text);
		box-shadow: var(--shadow-md);
	}

	.save-icon {
		color: var(--color-subtle);
		flex-shrink: 0;
	}

	.save-input {
		flex: 1;
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.9375rem;
		color: var(--color-text);
		padding: 0.6875rem 0.5rem;
		min-width: 0;
	}

	.save-input:focus { outline: none; }
	.save-input::placeholder { color: var(--color-subtle); }
	.save-input:disabled { opacity: 0.5; }

	.save-btn {
		background: var(--color-text);
		color: #fff;
		border: none;
		padding: 0.6875rem 1.125rem;
		font-size: 0.875rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		flex-shrink: 0;
		transition: opacity 0.15s;
	}

	.save-btn:hover:not(:disabled) { opacity: 0.8; }
	.save-btn:disabled { opacity: 0.35; cursor: not-allowed; }

	.save-error {
		font-size: 0.8125rem;
		color: #dc2626;
		margin: 0.375rem 0 0 0.75rem;
	}

	/* List header */
	.list-header {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.875rem;
	}

	.list-header h2 {
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin: 0;
	}

	.count {
		font-size: 0.75rem;
		color: var(--color-subtle);
		font-weight: 400;
	}

	/* Article cards */
	.article-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.empty {
		padding: 4rem 0;
		text-align: center;
	}

	.empty-title {
		font-size: 1rem;
		font-weight: 500;
		margin: 0 0 0.375rem;
	}

	.empty-sub {
		font-size: 0.875rem;
		color: var(--color-muted);
		margin: 0;
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.875rem 1rem;
		transition: border-color 0.15s;
	}

	.card:hover {
		border-color: var(--color-border-strong);
	}

	.card.read {
		opacity: 0.55;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.3rem;
	}

	.favicon {
		border-radius: 2px;
		object-fit: contain;
	}

	.site, .author { font-size: 0.75rem; color: var(--color-muted); }
	.rtime { font-size: 0.75rem; color: var(--color-subtle); }
	.sep { font-size: 0.75rem; color: var(--color-subtle); }

	.card-body {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.card-text { flex: 1; min-width: 0; }

	.card-title {
		display: block;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-text);
		text-decoration: none;
		letter-spacing: -0.01em;
		line-height: 1.45;
		margin-bottom: 0.2rem;
	}

	.card-title:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.card-desc {
		font-size: 0.8125rem;
		color: var(--color-muted);
		margin: 0 0 0.4rem;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.thumb {
		width: 68px;
		height: 68px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.card-tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.6875rem;
		padding: 0.15em 0.5em;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 99px;
		color: var(--color-muted);
	}

	.tag-x {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-subtle);
		font-size: 0.8125rem;
		line-height: 1;
	}

	.tag-x:hover { color: var(--color-text); }

	.tag-inp {
		font-size: 0.6875rem;
		border: 1px solid var(--color-text);
		border-radius: 99px;
		padding: 0.15em 0.6em;
		font-family: inherit;
		width: 72px;
	}

	.tag-inp:focus { outline: none; }

	.tag-add {
		font-size: 0.6875rem;
		color: var(--color-subtle);
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: 99px;
		padding: 0.15em 0.5em;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.1s;
	}

	.tag-add:hover {
		color: var(--color-text);
		border-color: var(--color-text);
		border-style: solid;
	}

	.card-actions {
		display: flex;
		gap: 0.3rem;
		margin-top: 0.625rem;
		padding-top: 0.625rem;
		border-top: 1px solid var(--color-border);
	}

	.act {
		font-size: 0.75rem;
		padding: 0.2em 0.6em;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		cursor: pointer;
		font-family: inherit;
		color: var(--color-muted);
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

	.col-select {
		cursor: pointer;
		appearance: none;
		padding-right: 0.6em;
	}

	.act-del:hover {
		background: #fef2f2;
		border-color: #fca5a5;
		color: #dc2626;
	}
</style>

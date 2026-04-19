<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { addToast } from '$lib/toasts.svelte';
	import ShortcutHelp from '$lib/components/ShortcutHelp.svelte';
	import { Menu, BookOpen, Check, Star, Archive, ArchiveRestore, Info, Plus, Sun, Moon, Settings, LogOut, Search, Circle, Folder, X, ExternalLink, Trash2, Bell, BarChart3, Tag, Clock, ChevronDown } from 'lucide-svelte';

	let { data } = $props();

	// --- Optimistic article state ---
	type Article = typeof data.articles[0];
	// svelte-ignore state_referenced_locally
	let articles = $state<Article[]>([...data.articles]);
	$effect(() => { articles = [...data.articles]; });

	// --- UI state ---
	let showTagInput = $state<string | null>(null);
	let tagInputValue = $state('');
	let showNewCollection = $state(false);
	let newCollectionName = $state('');
	let hoveredArticleId = $state<string | null>(null);
	let keyboardArticleId = $state<string | null>(null);
	const activeArticleId = $derived(hoveredArticleId ?? keyboardArticleId);
	let showShortcutHelp = $state(false);
	let isDark = $state(false);
	// svelte-ignore state_referenced_locally
	let searchValue = $state(data.q ?? '');
	let searchTimer: ReturnType<typeof setTimeout>;
	let showStats = $state(false);
	let showReminders = $state(false);
	let showTagFilter = $state(false);
	let showTimeFilter = $state(false);
	// svelte-ignore state_referenced_locally
	let reminderList = $state([...data.reminders]);
	$effect(() => { reminderList = [...data.reminders]; });

	const reminderDotVisible = $derived(
		reminderList.some(r => new Date(r.remindAt).getTime() - Date.now() < 24 * 60 * 60 * 1000)
	);

	function fmtReminderDate(d: Date): string {
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
			+ ' · '
			+ d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	async function removeReminder(id: string) {
		const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
		if (res.ok) reminderList = reminderList.filter(r => r.id !== id);
	}
	let showCollectionPicker = $state<string | null>(null);
	let sidebarOpen = $state(false);
	let saving = $state(false);
	let hoveredCollectionId = $state<string | null>(null);
	let showCollectionMenu = $state<string | null>(null);
	let renamingCollectionId = $state<string | null>(null);
	let renameColName = $state('');

	const tagSuggestions = $derived.by(() => {
		if (!showTagInput || !tagInputValue.trim()) return [];
		const article = articles.find(a => a.id === showTagInput);
		const alreadyHas = new Set(article?.tags.map(t => t.id) ?? []);
		const v = tagInputValue.toLowerCase().trim();
		return data.tags
			.filter(t => !alreadyHas.has(t.id) && t.name.toLowerCase().includes(v))
			.slice(0, 6);
	});

	$effect(() => { isDark = document.documentElement.dataset.theme === 'dark'; });
	$effect(() => { searchValue = data.q ?? ''; });
	$effect(() => {
		function close(e: MouseEvent) {
			if (!(e.target as HTMLElement).closest('.col-picker-wrap')) showCollectionPicker = null;
			if (!(e.target as HTMLElement).closest('.col-menu-wrap')) showCollectionMenu = null;
			if (!(e.target as HTMLElement).closest('.reminders-anchor')) showReminders = false;
			if (!(e.target as HTMLElement).closest('.stats-anchor')) showStats = false;
			if (!(e.target as HTMLElement).closest('.tag-filter-wrap')) showTagFilter = false;
			if (!(e.target as HTMLElement).closest('.time-filter-wrap')) showTimeFilter = false;
		}
		window.addEventListener('mousedown', close);
		return () => window.removeEventListener('mousedown', close);
	});

	const stats = $derived(data.counts.readingStats);

	function fmtTime(minutes: number) {
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	// --- Theme ---
	function toggleDark() {
		isDark = !isDark;
		document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	// --- Navigation ---
	function navTo(params: Record<string, string | null>) {
		sidebarOpen = false;
		const u = new URL(page.url);
		for (const [k, v] of Object.entries(params)) {
			if (v === null) u.searchParams.delete(k);
			else u.searchParams.set(k, v);
		}
		goto(u.toString());
	}

	function onSearchInput(value: string) {
		searchValue = value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => navTo({ q: value || null, offset: null }), 300);
	}

	// --- Keyboard shortcuts ---
	async function scrollToArticle(id: string) {
		await tick();
		document.querySelector(`[data-article-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function onKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;

		// Cmd/Ctrl+V: paste URL to save
		if (!isEditing && (e.metaKey || e.ctrlKey) && e.key === 'v') {
			e.preventDefault();
			navigator.clipboard.readText().then((text) => {
				const trimmed = text.trim();
				if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) saveUrl(trimmed);
			});
			return;
		}

		// Escape: universal dismiss
		if (e.key === 'Escape') {
			if (showShortcutHelp) { showShortcutHelp = false; return; }
			if (showStats) { showStats = false; return; }
			if (showCollectionPicker) { showCollectionPicker = null; return; }
			if (keyboardArticleId) { keyboardArticleId = null; return; }
			if (searchValue) { searchValue = ''; navTo({ q: null, offset: null }); return; }
			if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
			return;
		}

		if (isEditing) return;

		// ? — show shortcut help
		if (e.key === '?') { e.preventDefault(); showShortcutHelp = true; return; }

		// / — focus search
		if (e.key === '/') { e.preventDefault(); document.querySelector<HTMLInputElement>('.search-input')?.focus(); return; }

		// 1–4 — switch filter
		if (e.key === '1') { e.preventDefault(); navTo({ filter: 'unread', tag: null, collection: null, offset: null }); return; }
		if (e.key === '2') { e.preventDefault(); navTo({ filter: 'read', tag: null, collection: null, offset: null }); return; }
		if (e.key === '3') { e.preventDefault(); navTo({ filter: 'favorites', tag: null, collection: null, offset: null }); return; }
		if (e.key === '4') { e.preventDefault(); navTo({ filter: 'archive', tag: null, collection: null, offset: null }); return; }

		// j / ↓ — next article
		if (e.key === 'j' || e.key === 'ArrowDown') {
			e.preventDefault();
			const idx = articles.findIndex(a => a.id === activeArticleId);
			const next = idx < 0 ? articles[0] : (articles[idx + 1] ?? articles[idx]);
			if (next) { keyboardArticleId = next.id; scrollToArticle(next.id); }
			return;
		}

		// k / ↑ — previous article
		if (e.key === 'k' || e.key === 'ArrowUp') {
			e.preventDefault();
			const idx = articles.findIndex(a => a.id === activeArticleId);
			const prev = idx <= 0 ? articles[0] : articles[idx - 1];
			if (prev) { keyboardArticleId = prev.id; scrollToArticle(prev.id); }
			return;
		}

		// Article shortcuts — require an active article
		if (activeArticleId) {
			const a = articles.find(x => x.id === activeArticleId);
			if (!a) return;
			if (e.key === 'Enter' || e.key === 'o') { e.preventDefault(); goto(`/articles/${a.id}`); return; }
			if (e.key === 'r') { e.preventDefault(); toggleRead(a.id, a.isRead ?? false); return; }
			if (e.key === 'f') { e.preventDefault(); toggleFavorite(a.id, a.isFavorite ?? false); return; }
			if (e.key === 'e') { e.preventDefault(); archiveArticle(a.id); return; }
			if (e.key === 'd') { e.preventDefault(); deleteArticle(a.id); return; }
		}
	}

	// --- Save URL ---
	async function saveUrl(url: string) {
		if (!url.trim()) return;
		try {
			const res = await fetch('/api/articles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				addToast(err.message ?? 'Failed to save', 'error');
			} else {
				invalidateAll();
			}
		} catch {
			addToast('Failed to save article', 'error');
		} finally {
			saving = false;
		}
	}

	// --- Mutations ---
	async function patch(id: string, body: Record<string, unknown>) {
		const res = await fetch(`/api/articles/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new Error('Request failed');
	}

	async function toggleRead(id: string, isRead: boolean) {
		const a = articles.find(x => x.id === id);
		if (!a) return;
		a.isRead = !isRead;
		try { await patch(id, { isRead: !isRead }); invalidateAll(); }
		catch { a.isRead = isRead; addToast('Failed to update', 'error'); }
	}

	async function toggleFavorite(id: string, isFavorite: boolean) {
		const a = articles.find(x => x.id === id);
		if (!a) return;
		a.isFavorite = !isFavorite;
		try { await patch(id, { isFavorite: !isFavorite }); invalidateAll(); }
		catch { a.isFavorite = isFavorite; addToast('Failed to update', 'error'); }
	}

	async function archiveArticle(id: string) {
		const idx = articles.findIndex(x => x.id === id);
		if (idx === -1) return;
		const removed = articles[idx];
		articles.splice(idx, 1);
		try { await patch(id, { isArchived: true }); invalidateAll(); }
		catch { articles.splice(idx, 0, removed); addToast('Failed to archive', 'error'); }
	}

	async function unarchiveArticle(id: string) {
		const idx = articles.findIndex(x => x.id === id);
		if (idx === -1) return;
		const removed = articles[idx];
		articles.splice(idx, 1);
		try { await patch(id, { isArchived: false }); invalidateAll(); }
		catch { articles.splice(idx, 0, removed); addToast('Failed to unarchive', 'error'); }
	}

	async function deleteArticle(id: string) {
		const idx = articles.findIndex(x => x.id === id);
		if (idx === -1) return;
		const removed = articles[idx];
		articles.splice(idx, 1);
		let undone = false;
		addToast('Article deleted', 'info', {
			duration: 5500,
			undoFn: () => {
				undone = true;
				articles.splice(idx, 0, removed);
			}
		});
		await new Promise(r => setTimeout(r, 5600));
		if (undone) return;
		const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
		if (!res.ok) { articles.splice(idx, 0, removed); addToast('Failed to delete', 'error'); return; }
		invalidateAll();
	}

	async function addTag(articleId: string) {
		const name = tagInputValue.trim();
		if (!name) return;
		const res = await fetch(`/api/articles/${articleId}/tags`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		tagInputValue = '';
		showTagInput = null;
		if (!res.ok) { addToast('Failed to add tag', 'error'); return; }
		invalidateAll();
	}

	async function removeTag(articleId: string, tagId: string) {
		const a = articles.find(x => x.id === articleId);
		if (!a) return;
		const oldTags = [...a.tags];
		a.tags = a.tags.filter(t => t.id !== tagId);
		const res = await fetch(`/api/articles/${articleId}/tags/${tagId}`, { method: 'DELETE' });
		if (!res.ok) { a.tags = oldTags; addToast('Failed to remove tag', 'error'); return; }
		invalidateAll();
	}

	async function toggleCollection(articleId: string, collectionId: string) {
		const a = articles.find(x => x.id === articleId);
		if (!a) return;
		const has = a.collections.some((c: { id: string }) => c.id === collectionId);
		const col = data.collections.find(c => c.id === collectionId);
		const oldCollections = [...a.collections];
		a.collections = has
			? a.collections.filter((c: { id: string }) => c.id !== collectionId)
			: [...a.collections, { id: collectionId, name: col?.name ?? '' }];
		const res = await fetch(`/api/articles/${articleId}/collections`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ collectionIds: a.collections.map((c: { id: string }) => c.id) })
		});
		if (!res.ok) { a.collections = oldCollections; addToast('Failed to update collection', 'error'); }
		else invalidateAll();
	}

	async function createCollection() {
		const name = newCollectionName.trim();
		if (!name) return;
		const res = await fetch('/api/collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (!res.ok) { addToast('Failed to create collection', 'error'); return; }
		newCollectionName = '';
		showNewCollection = false;
		invalidateAll();
	}

	async function renameCollection(id: string) {
		const name = renameColName.trim();
		if (!name) return;
		const res = await fetch(`/api/collections/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (!res.ok) { addToast('Failed to rename collection', 'error'); return; }
		renamingCollectionId = null;
		invalidateAll();
	}

	async function deleteCollection(id: string, articleCount: number) {
		const label = articleCount > 0
			? `Collection deleted — ${articleCount} article${articleCount === 1 ? '' : 's'} kept`
			: 'Collection deleted';
		let undone = false;
		addToast(label, 'info', { undoFn: () => { undone = true; } });
		await new Promise(r => setTimeout(r, 5600));
		if (undone) return;
		const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
		if (!res.ok) { addToast('Failed to delete collection', 'error'); return; }
		if (data.activeCollection === id) navTo({ collection: null });
		invalidateAll();
	}

	async function selectTagSuggestion(articleId: string, name: string) {
		tagInputValue = name;
		await addTag(articleId);
	}

	const filterLabels: Record<string, string> = {
		unread: 'Unread', read: 'Read', favorites: 'Favorites', archive: 'Archive', all: 'All'
	};
</script>

<svelte:window onkeydown={onKeydown} />
<svelte:head><title>Someday</title></svelte:head>

<div class="app">
	<header class="mobile-header">
		<button class="hamburger" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Toggle menu">
			<Menu size={18} strokeWidth={1.8} />
		</button>
		<span class="logo-text">someday</span>
	</header>

	{#if sidebarOpen}
		<div class="sidebar-overlay" onclick={() => sidebarOpen = false} role="presentation"></div>
	{/if}

	<aside class="sidebar" class:open={sidebarOpen}>
		<div class="sidebar-header">
			<div class="logo">
				<span class="logo-text">someday</span>
			</div>
		</div>

		<nav class="sidebar-nav">
			<button
				class="nav-item"
				class:active={data.filter === 'unread' && !data.activeTag && !data.activeCollection}
				onclick={() => navTo({ filter: 'unread', tag: null, collection: null })}
			>
				<BookOpen size={15} strokeWidth={1.4} />
				Unread
				{#if data.counts.unread > 0}<span class="badge">{data.counts.unread}</span>{/if}
			</button>
			<button
				class="nav-item"
				class:active={data.filter === 'read' && !data.activeTag && !data.activeCollection}
				onclick={() => navTo({ filter: 'read', tag: null, collection: null })}
			>
				<Check size={15} strokeWidth={1.4} />
				Read
			</button>
			<button
				class="nav-item"
				class:active={data.filter === 'favorites' && !data.activeTag && !data.activeCollection}
				onclick={() => navTo({ filter: 'favorites', tag: null, collection: null })}
			>
				<Star size={15} strokeWidth={1.4} />
				Favorites
			</button>
			<button
				class="nav-item"
				class:active={data.filter === 'archive'}
				onclick={() => navTo({ filter: 'archive', tag: null, collection: null })}
			>
				<Archive size={15} strokeWidth={1.4} />
				Archive
			</button>
		</nav>

		<div class="sidebar-section">
			<div class="section-label-row">
				<p class="section-label">Collections</p>
				<div class="info-tip">
					<Info size={11} strokeWidth={1.4} />
					<span class="tip-text">Collections are a long-term library. Articles can live in multiple collections at once. Read/unread status doesn't apply here.</span>
				</div>
			</div>
			{#each data.collections as col}
				<div
					class="col-item-wrap"
					role="listitem"
					onmouseenter={() => hoveredCollectionId = col.id}
					onmouseleave={() => { if (showCollectionMenu !== col.id) hoveredCollectionId = null; }}
				>
					{#if renamingCollectionId === col.id}
						<div class="new-collection-form">
							<input
								class="col-name-input"
								type="text"
								bind:value={renameColName}
								onkeydown={(e) => { if (e.key === 'Enter') renameCollection(col.id); if (e.key === 'Escape') renamingCollectionId = null; }}
							/>
							<button class="col-save-btn" onclick={() => renameCollection(col.id)} disabled={!renameColName.trim()}>Save</button>
						</div>
					{:else}
						<button
							class="nav-item"
							class:active={data.activeCollection === col.id}
							onclick={() => navTo({ collection: col.id, tag: null })}
						>
							{col.name}
							{#if col.articleCount > 0}
								<span class="badge">{col.articleCount}</span>
							{/if}
						</button>
						{#if hoveredCollectionId === col.id || showCollectionMenu === col.id}
							<div class="col-menu-wrap">
								<button
									class="col-menu-btn"
									onclick={(e) => { e.stopPropagation(); showCollectionMenu = showCollectionMenu === col.id ? null : col.id; }}
									aria-label="Collection options"
								>···</button>
								{#if showCollectionMenu === col.id}
									<div class="col-menu-dropdown">
										<button onclick={() => { renamingCollectionId = col.id; renameColName = col.name; showCollectionMenu = null; hoveredCollectionId = null; }}>Rename</button>
										<button class="danger" onclick={() => { showCollectionMenu = null; deleteCollection(col.id, col.articleCount); }}>Delete</button>
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			{/each}

			{#if showNewCollection}
				<div class="new-collection-form">
					<input
						class="col-name-input"
						type="text"
						placeholder="Name…"
						bind:value={newCollectionName}
						onkeydown={(e) => { if (e.key === 'Enter') createCollection(); if (e.key === 'Escape') showNewCollection = false; }}
					/>
					<button class="col-save-btn" onclick={createCollection} disabled={!newCollectionName.trim()}>Add</button>
				</div>
			{:else}
				<button
					class="nav-item new-col-btn"
					onclick={() => { showNewCollection = true; newCollectionName = ''; }}
				>
					<Plus size={11} strokeWidth={1.8} />
					New collection
				</button>
			{/if}
		</div>

		<div class="sidebar-footer">
			<button class="nav-item" onclick={toggleDark} title={isDark ? 'Switch to light' : 'Switch to dark'}>
				{#if isDark}
					<Sun size={14} strokeWidth={1.4} />
					Light mode
				{:else}
					<Moon size={14} strokeWidth={1.4} />
					Dark mode
				{/if}
			</button>
			<a href="/settings" class="nav-item">
				<Settings size={14} strokeWidth={1.4} />
				Settings
			</a>
			<a href="/auth/logout" class="nav-item">
				<LogOut size={14} strokeWidth={1.4} />
				Sign out
			</a>
		</div>
	</aside>

	<main class="main">
		<div class="search-wrap">
			<Search size={13} strokeWidth={1.4} />
			<input
				class="search-input"
				type="search"
				placeholder="Search articles…"
				value={searchValue}
				oninput={(e) => onSearchInput((e.currentTarget as HTMLInputElement).value)}
			/>
			{#if searchValue}
				<button class="search-clear" onclick={() => { searchValue = ''; navTo({ q: null, offset: null }); }}>×</button>
			{/if}
		</div>

		<div class="filter-bar">
			{#if data.tags.length > 0}
				<div class="filter-dd-wrap tag-filter-wrap">
					<button class="filter-pill" class:active={!!data.activeTag} onclick={() => { showTagFilter = !showTagFilter; showTimeFilter = false; }}>
						<Tag size={11} strokeWidth={1.4} />
						{data.activeTag ? (data.tags.find(t => t.slug === data.activeTag)?.name ?? data.activeTag) : 'Tags'}
						<ChevronDown size={10} strokeWidth={1.6} />
					</button>
					{#if showTagFilter}
						<div class="filter-dropdown">
							{#each data.tags as tag}
								<button
									class="filter-dd-opt"
									class:active={data.activeTag === tag.slug}
									onclick={() => { navTo({ tag: data.activeTag === tag.slug ? null : tag.slug, collection: null, offset: null }); showTagFilter = false; }}
								>
									<span>{tag.name}{#if tag.articleCount > 0}<span class="filter-dd-count">{tag.articleCount}</span>{/if}</span>
									{#if data.activeTag === tag.slug}<Check size={10} strokeWidth={1.8} />{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			<div class="filter-dd-wrap time-filter-wrap">
				<button class="filter-pill" class:active={!!data.readingTime} onclick={() => { showTimeFilter = !showTimeFilter; showTagFilter = false; }}>
					<Clock size={11} strokeWidth={1.4} />
					{data.readingTime === 'under5' ? '< 5 min' : data.readingTime === 'under10' ? '< 10 min' : data.readingTime === 'under15' ? '< 15 min' : data.readingTime === 'under20' ? '< 20 min' : data.readingTime === 'over20' ? '> 20 min' : 'Reading time'}
					<ChevronDown size={10} strokeWidth={1.6} />
				</button>
				{#if showTimeFilter}
					<div class="filter-dropdown">
						{#each [['under5', '< 5 min'], ['under10', '< 10 min'], ['under15', '< 15 min'], ['under20', '< 20 min'], ['over20', '> 20 min']] as [val, label]}
							<button
								class="filter-dd-opt"
								class:active={data.readingTime === val}
								onclick={() => { navTo({ time: data.readingTime === val ? null : val, offset: null }); showTimeFilter = false; }}
							>
								<span>{label}</span>
								{#if data.readingTime === val}<Check size={10} strokeWidth={1.8} />{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
			{#if data.activeTag || data.readingTime}
				<button class="clear-filters" onclick={() => navTo({ tag: null, time: null, offset: null })}>Clear filters</button>
			{/if}
		</div>

		<div class="list-header">
			<h2>{data.activeCollection ? (data.collections.find(c => c.id === data.activeCollection)?.name ?? 'Collection') : (filterLabels[data.filter] ?? 'Articles')}{data.activeTag ? ` · #${data.activeTag}` : ''}{data.q ? ` · "${data.q}"` : ''}</h2>
			<span class="count">{data.total}</span>
		</div>

		<div class="article-list">
			{#if data.articles.length === 0}
				<div class="empty">
					{#if data.q}
						<p class="empty-title">No results for "{data.q}"</p>
						<p class="empty-sub">Try a different search term or clear the search.</p>
					{:else if data.activeTag}
						<p class="empty-title">No articles tagged #{data.activeTag}</p>
						<p class="empty-sub">Save articles and tag them to see them here.</p>
					{:else if data.activeCollection}
						<p class="empty-title">This collection is empty</p>
						<p class="empty-sub">Open an article and add it to this collection.</p>
					{:else if data.readingTime}
						<p class="empty-title">No articles match this filter</p>
						<p class="empty-sub">Try a different reading time filter.</p>
					{:else}
						<p class="empty-title">Nothing here yet</p>
						<p class="empty-sub">Paste a URL to save an article — press Cmd+V anywhere on the page.</p>
					{/if}
				</div>
			{:else}
			{#each articles as article (article.id)}
					<article
						class="card"
						class:read={article.isRead && !data.activeCollection}
						class:selected={activeArticleId === article.id}
						data-article-id={article.id}
						onmouseenter={() => { hoveredArticleId = article.id; keyboardArticleId = null; }}
						onmouseleave={() => { if (hoveredArticleId === article.id) hoveredArticleId = null; }}
					>
						<div class="card-meta">
							{#if article.favicon}
								<img src={article.favicon} alt="" class="favicon" width="13" height="13" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
							{/if}
							<span class="site">{article.siteName ?? (article.url ? new URL(article.url).hostname : '')}</span>
							{#if article.author}<span class="sep">·</span><span class="author">{article.author}</span>{/if}
							{#if article.readingTimeMinutes}<span class="sep">·</span><span class="rtime">{article.readingTimeMinutes} min</span>{/if}
							{#if article.isPaywalled}<span class="paywall-badge">Paywall</span>{/if}
							{#if article.source === 'email'}<span class="source-badge source-email">Email</span>{/if}
							{#if article.source === 'product'}<span class="source-badge source-product">Product</span>{/if}
							{#if article.source === 'pdf'}<span class="source-badge source-pdf">PDF</span>{/if}
						</div>

						<div class="card-body">
							<div class="card-text">
								<a href="/articles/{article.id}" class="card-title">{article.title}</a>
								{#if article.description}
									<p class="card-desc">{article.description}</p>
								{/if}
								<div class="card-tags">
									{#each article.tags as tag}
										<span class="tag">
											<button class="tag-name" onclick={() => navTo({ tag: tag.slug, collection: null })}>{tag.name}</button>
											<button class="tag-x" onclick={() => removeTag(article.id, tag.id)}>×</button>
										</span>
									{/each}
									{#if showTagInput === article.id}
										<div class="tag-inp-wrap">
											<input
												class="tag-inp"
												type="text"
												placeholder="tag…"
												bind:value={tagInputValue}
												onkeydown={(e) => { if (e.key === 'Enter') addTag(article.id); if (e.key === 'Escape') { showTagInput = null; tagInputValue = ''; } }}
												onblur={() => { setTimeout(() => { if (!tagInputValue.trim()) showTagInput = null; }, 150); }}
											/>
											{#if tagSuggestions.length > 0}
												<div class="tag-autocomplete">
													{#each tagSuggestions as t}
														<button
															class="tag-ac-opt"
															onmousedown={(e) => { e.preventDefault(); selectTagSuggestion(article.id, t.name); }}
														>{t.name}</button>
													{/each}
												</div>
											{/if}
										</div>
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
							{#if !data.activeCollection}
								<button class="act" class:act-on={article.isRead} onclick={() => toggleRead(article.id, article.isRead ?? false)}>
									{#if article.isRead}
										<Check size={12} strokeWidth={1.6} />
										Unread
									{:else}
										<Circle size={12} strokeWidth={1.4} />
										Read
									{/if}
								</button>
							{/if}
							<button class="act" class:act-on={article.isFavorite} onclick={() => toggleFavorite(article.id, article.isFavorite ?? false)}>
								<Star size={12} strokeWidth={1.4} fill={article.isFavorite ? 'currentColor' : 'none'} />
								{article.isFavorite ? 'Favorited' : 'Favorite'}
							</button>
							{#if !data.activeCollection}
								{#if data.filter === 'archive'}
									<button class="act" onclick={() => unarchiveArticle(article.id)}>
										<ArchiveRestore size={12} strokeWidth={1.4} />
										Unarchive
									</button>
								{:else}
									<button class="act" onclick={() => archiveArticle(article.id)}>
										<Archive size={12} strokeWidth={1.4} />
										Archive
									</button>
								{/if}
							{/if}
							{#if data.collections.length > 0}
								<div class="col-picker-wrap">
									<button
										class="act"
										class:act-on={article.collections.length > 0}
										onclick={() => showCollectionPicker = showCollectionPicker === article.id ? null : article.id}
									>
										<Folder size={12} strokeWidth={1.4} fill={article.collections.length > 0 ? 'currentColor' : 'none'} />
										{article.collections.length > 0 ? 'Saved' : 'Collection'}
									</button>
									{#if showCollectionPicker === article.id}
										<div class="col-picker-dropdown">
											{#each data.collections as col}
												<button
													class="col-picker-opt"
													class:active={article.collections.some((c: { id: string }) => c.id === col.id)}
													onclick={() => toggleCollection(article.id, col.id)}
												>
													<span>{col.name}</span>
													{#if article.collections.some((c: { id: string }) => c.id === col.id)}
														<Check size={10} strokeWidth={1.8} />
													{/if}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							{#if data.activeCollection}
								<button class="act act-remove" onclick={() => { toggleCollection(article.id, data.activeCollection!); }}>
									<X size={12} strokeWidth={1.6} />
									Remove
								</button>
							{/if}
							{#if article.url}
							<a class="act" href={article.url} target="_blank" rel="noopener">
								<ExternalLink size={12} strokeWidth={1.4} />
								Original
							</a>
							{/if}
							<button class="act act-del" onclick={() => deleteArticle(article.id)}>
								<Trash2 size={12} strokeWidth={1.4} />
								Delete
							</button>
						</div>
					</article>
			{/each}
		{/if}
	</div>

	{#if data.total > articles.length + data.offset || data.offset > 0}
		<div class="pagination">
			{#if data.offset > 0}
				<button class="page-btn" onclick={() => navTo({ offset: String(Math.max(0, data.offset - data.pageSize)) })}>
					← Previous
				</button>
			{/if}
			<span class="page-info">
				{data.offset + 1}–{data.offset + articles.length} of {data.total}
			</span>
			{#if data.total > data.offset + articles.length}
				<button class="page-btn" onclick={() => navTo({ offset: String(data.offset + data.pageSize) })}>
					Next →
				</button>
			{/if}
		</div>
	{/if}
</main>
</div>

{#if showStats}
	<button class="stats-backdrop" onclick={() => showStats = false} aria-label="Close"></button>
{/if}

<div class="corner-btns">
	<div class="reminders-anchor">
		{#if showReminders}
			<div class="reminders-popover">
				<p class="stats-label">Reminders</p>
				{#if reminderList.length === 0}
					<p class="reminders-empty">No reminders set.</p>
				{:else}
					{#each reminderList as r}
						<div class="reminder-row">
							<div class="reminder-info">
								<a href="/articles/{r.articleId}" class="reminder-title">{r.articleTitle}</a>
								<span class="reminder-time">{fmtReminderDate(new Date(r.remindAt))}</span>
							</div>
							<button class="reminder-del" onclick={() => removeReminder(r.id)} title="Remove reminder">
								<X size={10} strokeWidth={1.6} />
							</button>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
		<button
			class="corner-btn"
			class:corner-btn-dot={reminderDotVisible}
			onclick={() => { showReminders = !showReminders; showStats = false; }}
			title="Reminders"
			aria-label="Reminders"
		>
			<Bell size={13} strokeWidth={1.4} />
		</button>
	</div>
	<div class="stats-anchor">
		{#if showStats}
			<div class="stats-popover">
				<p class="stats-label">Reading stats</p>
				<div class="stats-item">
					<span class="stats-desc">Articles read</span>
					<span class="stats-num">{stats.articles.toLocaleString()}</span>
				</div>
				<div class="stats-item">
					<span class="stats-desc">Words</span>
					<span class="stats-num">{stats.words.toLocaleString()}</span>
				</div>
				<div class="stats-item">
					<span class="stats-desc">Reading time</span>
					<span class="stats-num">{fmtTime(stats.minutes)}</span>
				</div>
			</div>
		{/if}
		<button
			class="corner-btn"
			onclick={() => showStats = !showStats}
			title="Reading stats"
			aria-label="Reading stats"
		>
			<BarChart3 size={13} strokeWidth={1.4} />
		</button>
	</div>
	<button
		class="corner-btn"
		onclick={() => showShortcutHelp = true}
		title="Keyboard shortcuts"
		aria-label="Keyboard shortcuts"
	>?</button>
</div>

{#if showShortcutHelp}
	<ShortcutHelp onclose={() => showShortcutHelp = false} />
{/if}

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
	}

	.logo-text {
		font-size: 1.0625rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		color: var(--color-text);
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

	.new-col-btn {
		color: var(--color-subtle);
		font-size: 0.8125rem;
	}

	.new-col-btn:hover { color: var(--color-text); }

	.new-collection-form {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.375rem 0.375rem;
	}

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

	/* Search */
	.search-wrap {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0 0.625rem;
		margin-bottom: 0.625rem;
		transition: border-color 0.15s;
	}
	.search-wrap:focus-within { border-color: var(--color-text); }
	.search-wrap :global(svg) { color: var(--color-subtle); flex-shrink: 0; }
	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.875rem;
		color: var(--color-text);
		padding: 0.5rem 0;
	}
	.search-input:focus { outline: none; }
	.search-input::placeholder { color: var(--color-subtle); }
	.search-clear {
		background: none;
		border: none;
		color: var(--color-subtle);
		font-size: 1rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}
	.search-clear:hover { color: var(--color-text); }

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1.25rem 0 0.5rem;
	}
	.page-btn {
		font-size: 0.8125rem;
		font-family: inherit;
		padding: 0.35em 0.75em;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--color-text);
		transition: border-color 0.1s;
	}
	.page-btn:hover { border-color: var(--color-border-strong); }
	.page-info { font-size: 0.8125rem; color: var(--color-muted); }

	/* Filter bar */
	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-bottom: 0.875rem;
	}

	.filter-dd-wrap {
		position: relative;
	}

	.filter-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		font-size: 0.75rem;
		font-family: inherit;
		padding: 0.2em 0.65em;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-muted);
		cursor: pointer;
		transition: all 0.1s;
	}

	.filter-pill:hover {
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}

	.filter-pill.active {
		border-color: var(--color-text);
		color: var(--color-text);
	}

	.clear-filters {
		font-size: 0.75rem;
		font-family: inherit;
		background: none;
		border: none;
		color: var(--color-subtle);
		cursor: pointer;
		padding: 0.2em 0.25em;
		align-self: center;
		transition: color 0.1s;
	}

	.clear-filters:hover { color: var(--color-muted); }

	.filter-dropdown {
		position: absolute;
		top: calc(100% + 5px);
		left: 0;
		min-width: 140px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 30;
		padding: 0.25rem;
	}

	.filter-dd-opt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.3rem 0.6rem;
		background: none;
		border: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-family: inherit;
		color: var(--color-text);
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
	}

	.filter-dd-opt:hover { background: var(--color-bg); }
	.filter-dd-opt.active { font-weight: 500; }

	.filter-dd-count {
		font-size: 0.6875rem;
		color: var(--color-subtle);
		margin-left: 0.25rem;
	}

	/* Collections section header with tooltip */
	.section-label-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.6rem;
	}

	.section-label-row .section-label { padding: 0; }

	.info-tip {
		position: relative;
		display: flex;
		align-items: center;
		color: var(--color-subtle);
		cursor: default;
	}

	.tip-text {
		display: none;
		position: absolute;
		left: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		padding: 0.5rem 0.625rem;
		font-size: 0.75rem;
		color: var(--color-muted);
		width: 200px;
		line-height: 1.5;
		z-index: 30;
		white-space: normal;
	}

	.info-tip:hover .tip-text { display: block; }

	/* Remove from collection button */
	.act-remove:hover {
		background: var(--color-danger-bg);
		border-color: var(--color-danger-border);
		color: var(--color-danger);
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
		background: var(--color-bg);
	}

	.card.selected {
		border-color: var(--color-text);
		background: var(--color-bg);
		outline: 2px solid var(--color-text);
		outline-offset: -1px;
	}

	.card.read {
		opacity: 0.6;
	}

	.card.read:hover, .card.read.selected {
		opacity: 1;
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

	.paywall-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-warning);
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning-border);
		border-radius: 3px;
		padding: 0.1em 0.4em;
		margin-left: 0.25rem;
	}
	.source-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		border-radius: 3px;
		padding: 0.1em 0.4em;
		margin-left: 0.25rem;
		border: 1px solid;
	}
	.source-email {
		color: var(--color-info);
		background: var(--color-info-bg);
		border-color: var(--color-info-border);
	}
	.source-product {
		color: var(--color-product);
		background: var(--color-product-bg);
		border-color: var(--color-product-border);
	}
	.source-pdf {
		color: var(--color-muted);
		background: var(--color-border);
		border-color: var(--color-border-strong);
	}
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
		gap: 0;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.tag-name {
		background: none;
		border: none;
		padding: 0.15em 0.5em;
		font-size: 0.6875rem;
		font-family: inherit;
		color: var(--color-muted);
		cursor: pointer;
		line-height: 1.5;
	}

	.tag-name:hover { color: var(--color-text); }

	.tag-x {
		background: none;
		border: none;
		border-left: 1px solid var(--color-border);
		padding: 0.15em 0.35em;
		cursor: pointer;
		color: var(--color-subtle);
		font-size: 0.6875rem;
		line-height: 1.5;
		opacity: 0;
		transition: opacity 0.15s, color 0.1s;
	}

	.card:hover .tag-x,
	.card.selected .tag-x,
	.card:focus-within .tag-x { opacity: 1; }

	.tag-x:hover { color: var(--color-text); }

	.tag-inp-wrap { position: relative; }

	.tag-inp {
		font-size: 0.6875rem;
		border: none;
		border-bottom: 1px solid var(--color-text);
		padding: 0.1em 0.25em;
		font-family: inherit;
		width: 72px;
		background: transparent;
		color: var(--color-text);
	}

	.tag-inp:focus { outline: none; }

	.tag-autocomplete {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		min-width: 120px;
		z-index: 20;
		padding: 0.25rem;
	}

	.tag-ac-opt {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.3em 0.5em;
		border: none;
		background: none;
		border-radius: 4px;
		font-size: 0.75rem;
		font-family: inherit;
		color: var(--color-text);
		cursor: pointer;
	}

	.tag-ac-opt:hover { background: var(--color-bg); }

	.tag-add {
		font-size: 0.6875rem;
		color: var(--color-subtle);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		opacity: 0;
		transition: opacity 0.15s, color 0.1s;
	}

	.card:hover .tag-add,
	.card.selected .tag-add,
	.card:focus-within .tag-add { opacity: 1; }

	.tag-add:hover { color: var(--color-text); }

	.card-actions {
		display: flex;
		gap: 0.3rem;
		margin-top: 0.625rem;
		padding-top: 0.625rem;
		border-top: 1px solid var(--color-border);
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
		transition: all 0.1s;
	}

	.act:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.act-on {
		background: var(--color-border);
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}

	/* Collection sidebar item */
	.col-item-wrap {
		position: relative;
	}

	.col-menu-wrap {
		position: absolute;
		right: 0.375rem;
		top: 50%;
		transform: translateY(-50%);
	}

	.col-menu-btn {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		background: var(--color-bg);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9375rem;
		color: var(--color-muted);
		line-height: 1;
		letter-spacing: 0.1em;
	}

	.col-menu-btn:hover { color: var(--color-text); }

	.col-menu-dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		min-width: 110px;
		z-index: 30;
		padding: 0.25rem;
	}

	.col-menu-dropdown button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.35em 0.6em;
		border: none;
		background: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-family: inherit;
		color: var(--color-text);
		cursor: pointer;
	}

	.col-menu-dropdown button:hover { background: var(--color-bg); }
	.col-menu-dropdown button.danger { color: #dc2626; }
	.col-menu-dropdown button.danger:hover { background: #fef2f2; }

	/* Collection picker in card actions */
	.col-picker-wrap { position: relative; }

	.col-picker-dropdown {
		position: absolute;
		bottom: calc(100% + 4px);
		left: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		min-width: 160px;
		z-index: 20;
		padding: 0.25rem;
	}

	.col-picker-opt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		padding: 0.35em 0.6em;
		border: none;
		background: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-family: inherit;
		color: var(--color-text);
		cursor: pointer;
	}

	.col-picker-opt:hover { background: var(--color-bg); }
	.col-picker-opt.active { font-weight: 500; }

	.act-del:hover {
		background: var(--color-danger-bg);
		border-color: var(--color-danger-border);
		color: var(--color-danger);
	}

	/* ── Stats ── */
	.stats-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: transparent;
		border: none;
		cursor: default;
	}

	.corner-btns {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.stats-anchor {
		position: relative;
		display: flex;
		align-items: center;
	}

	.reminders-anchor {
		position: relative;
		display: flex;
		align-items: center;
	}

	.corner-btn-dot {
		position: relative;
	}

	.corner-btn-dot::after {
		content: '';
		position: absolute;
		top: 1px;
		right: 1px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #ef4444;
		border: 2px solid var(--color-surface);
	}

	.reminders-popover {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		right: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: 0.875rem 1rem;
		min-width: 240px;
		max-width: 300px;
		max-height: 320px;
		overflow-y: auto;
	}

	.reminders-empty {
		font-size: 0.8125rem;
		color: var(--color-muted);
		margin: 0;
	}

	.reminder-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.reminder-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.reminder-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.reminder-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reminder-title:hover { text-decoration: underline; text-underline-offset: 2px; }

	.reminder-time {
		font-size: 0.6875rem;
		color: var(--color-subtle);
	}

	.reminder-del {
		display: grid;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--color-subtle);
		cursor: pointer;
		border-radius: 3px;
		padding: 0;
		margin-top: 1px;
		transition: color 0.1s, background 0.1s;
	}

	.reminder-del:hover {
		color: var(--color-danger);
		background: var(--color-danger-bg);
	}

	.corner-btn {
		display: grid;
		place-items: center;
		width: 1.875rem;
		height: 1.875rem;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-subtle);
		cursor: pointer;
		font-size: 0.8125rem;
		font-family: inherit;
		font-weight: 500;
		opacity: 0.7;
		transition: opacity 0.15s, border-color 0.15s, color 0.15s;
	}

	.corner-btn:hover {
		opacity: 1;
		border-color: var(--color-border-strong);
		color: var(--color-muted);
	}

	.stats-popover {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		right: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: 0.875rem 1rem;
		min-width: 160px;
	}

	.stats-label {
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-subtle);
		margin: 0 0 0.5rem;
	}

	.stats-item {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1.25rem;
		padding: 0.25rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.stats-item:last-child { border-bottom: none; padding-bottom: 0; }

	.stats-desc {
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.stats-num {
		font-size: 0.8125rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		color: var(--color-text);
	}

	/* ── Mobile header ── */
	.mobile-header {
		display: none;
	}

	.hamburger {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border: none;
		background: none;
		color: var(--color-muted);
		cursor: pointer;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.hamburger:hover { color: var(--color-text); }

	.sidebar-overlay {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.4);
		z-index: 99;
	}

	/* ── Touch devices: always show hover-hidden elements ── */
	@media (hover: none) {
		.tag-x { opacity: 1; }
		.tag-add { opacity: 1; }
	}

	/* ── Mobile layout ── */
	@media (max-width: 768px) {
		.mobile-header {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			height: 52px;
			z-index: 90;
			background: var(--color-surface);
			border-bottom: 1px solid var(--color-border);
			padding: 0 1rem;
		}

		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			height: 100vh;
			z-index: 100;
			transform: translateX(-100%);
			transition: transform 0.22s ease;
		}

		.sidebar.open {
			transform: translateX(0);
			box-shadow: 4px 0 24px rgb(0 0 0 / 0.12);
		}

		.main {
			padding: 1rem 1rem 4rem;
			padding-top: calc(52px + 1rem);
			max-width: 100%;
		}

		/* Search: taller touch target, no iOS zoom */
		.search-input {
			padding: 0.75rem 0;
			font-size: 1rem;
		}

		/* Filter bar: horizontal scroll, no wrap */
		.filter-bar {
			flex-wrap: nowrap;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
			padding-bottom: 0.125rem;
		}

		.filter-bar::-webkit-scrollbar { display: none; }

		/* Hide thumbnail on narrow screens */
		.thumb { display: none; }

		/* Card actions: scrollable row */
		.card-actions {
			flex-wrap: nowrap;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
			gap: 0.375rem;
		}

		.card-actions::-webkit-scrollbar { display: none; }

		/* Bigger touch targets */
		.act {
			padding: 0.45em 0.75em;
			white-space: nowrap;
			flex-shrink: 0;
		}

		/* Corner buttons: sit higher to avoid toaster overlap */
		.corner-btns { bottom: 1rem; right: 1rem; }

		/* Collection picker: full-width on mobile */
		.col-picker-dropdown {
			right: auto;
			left: 0;
		}
	}
</style>

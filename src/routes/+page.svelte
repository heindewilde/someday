<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { addToast } from '$lib/toasts.svelte';
	import ShortcutHelp from '$lib/components/ShortcutHelp.svelte';
	import EmojiPicker from '$lib/components/EmojiPicker.svelte';

	let { data } = $props();

	// --- Optimistic article state ---
	type Article = typeof data.articles[0];
	let articles = $state<Article[]>([...data.articles]);
	$effect(() => { articles = [...data.articles]; });

	// --- UI state ---
	let urlInput = $state('');
	let saving = $state(false);
	let saveError = $state('');
	let showTagInput = $state<string | null>(null);
	let tagInputValue = $state('');
	let showNewCollection = $state(false);
	let newCollectionName = $state('');
	let newCollectionIcon = $state('📁');
	let hoveredArticleId = $state<string | null>(null);
	let showShortcutHelp = $state(false);
	let isDark = $state(false);
	let searchValue = $state(data.q ?? '');
	let searchTimer: ReturnType<typeof setTimeout>;
	let showStats = $state(false);
	let showCollectionPicker = $state<string | null>(null);
	let hoveredCollectionId = $state<string | null>(null);
	let showCollectionMenu = $state<string | null>(null);
	let renamingCollectionId = $state<string | null>(null);
	let renameColName = $state('');
	let renameColIcon = $state('');
	let showEmojiPicker = $state<'new' | 'rename' | null>(null);
	let hoveredTagSidebarId = $state<string | null>(null);
	let showTagMenu = $state<string | null>(null);
	let renamingTagId = $state<string | null>(null);
	let renameTagName = $state('');

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
			if (!(e.target as HTMLElement).closest('.tag-menu-wrap')) showTagMenu = null;
			if (!(e.target as HTMLElement).closest('.emoji-wrap')) showEmojiPicker = null;
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

	// --- Paste shortcut ---
	function onKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || (target as HTMLElement).isContentEditable;

		if (!isEditing && (e.metaKey || e.ctrlKey) && e.key === 'v') {
			e.preventDefault();
			navigator.clipboard.readText().then((text) => {
				const trimmed = text.trim();
				if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) saveUrl(trimmed);
			});
		}
		if (e.key === 'Escape') { showShortcutHelp = false; return; }
		if (!isEditing && e.key === '?') { e.preventDefault(); showShortcutHelp = true; return; }
		if (!isEditing && hoveredArticleId) {
			const a = articles.find(x => x.id === hoveredArticleId);
			if (!a) return;
			if (e.key === 'r') { e.preventDefault(); toggleRead(a.id, a.isRead ?? false); }
			if (e.key === 'f') { e.preventDefault(); toggleFavorite(a.id, a.isFavorite ?? false); }
			if (e.key === 'e') { e.preventDefault(); archiveArticle(a.id); }
			if (e.key === 'Delete') { e.preventDefault(); deleteArticle(a.id); }
		}
	}

	// --- Save URL ---
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
				const err = await res.json().catch(() => ({}));
				saveError = err.message ?? 'Failed to save';
			} else {
				urlInput = '';
				invalidateAll();
			}
		} catch {
			saveError = 'Failed to save article';
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

	async function moveToCollection(articleId: string, collectionId: string | null) {
		const a = articles.find(x => x.id === articleId);
		if (!a) return;
		const old = a.collectionId;
		a.collectionId = collectionId;
		try { await patch(articleId, { collectionId }); invalidateAll(); }
		catch { a.collectionId = old; addToast('Failed to move', 'error'); }
	}

	async function createCollection() {
		const name = newCollectionName.trim();
		if (!name) return;
		const res = await fetch('/api/collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, icon: newCollectionIcon })
		});
		if (!res.ok) { addToast('Failed to create collection', 'error'); return; }
		newCollectionName = '';
		newCollectionIcon = '📁';
		showNewCollection = false;
		invalidateAll();
	}

	async function renameCollection(id: string) {
		const name = renameColName.trim();
		if (!name) return;
		const res = await fetch(`/api/collections/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, icon: renameColIcon })
		});
		if (!res.ok) { addToast('Failed to rename collection', 'error'); return; }
		renamingCollectionId = null;
		invalidateAll();
	}

	async function deleteCollection(id: string, articleCount: number) {
		if (articleCount > 0 && !confirm(`This collection contains ${articleCount} article${articleCount === 1 ? '' : 's'}. They won't be deleted. Remove the collection anyway?`)) return;
		const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
		if (!res.ok) { addToast('Failed to delete collection', 'error'); return; }
		if (data.activeCollection === id) navTo({ collection: null });
		invalidateAll();
	}

	async function renameTag(id: string) {
		const name = renameTagName.trim();
		if (!name) return;
		const res = await fetch(`/api/tags/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (!res.ok) { addToast('Failed to rename tag', 'error'); return; }
		renamingTagId = null;
		invalidateAll();
	}

	async function deleteTag(id: string, count: number) {
		if (count > 0 && !confirm(`Remove tag from ${count} article${count === 1 ? '' : 's'} and delete it?`)) return;
		const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
		if (!res.ok) { addToast('Failed to delete tag', 'error'); return; }
		if (data.activeTag) navTo({ tag: null });
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
			<p class="section-label">Collections</p>
			{#each data.collections as col}
				<div
					class="col-item-wrap"
					onmouseenter={() => hoveredCollectionId = col.id}
					onmouseleave={() => { if (showCollectionMenu !== col.id) hoveredCollectionId = null; }}
				>
					{#if renamingCollectionId === col.id}
						<div class="new-collection-form">
							<div class="emoji-wrap">
								<button
									type="button"
									class="col-icon-btn"
									onclick={(e) => { e.stopPropagation(); showEmojiPicker = showEmojiPicker === 'rename' ? null : 'rename'; }}
								>{renameColIcon}</button>
								{#if showEmojiPicker === 'rename'}
									<div class="emoji-popover">
										<EmojiPicker onselect={(e) => { renameColIcon = e; showEmojiPicker = null; }} />
									</div>
								{/if}
							</div>
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
							<span>{col.icon}</span>
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
										<button onclick={() => { renamingCollectionId = col.id; renameColName = col.name; renameColIcon = col.icon ?? '📁'; showCollectionMenu = null; hoveredCollectionId = null; }}>Rename</button>
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
					<div class="emoji-wrap">
						<button
							type="button"
							class="col-icon-btn"
							onclick={(e) => { e.stopPropagation(); showEmojiPicker = showEmojiPicker === 'new' ? null : 'new'; }}
						>{newCollectionIcon}</button>
						{#if showEmojiPicker === 'new'}
							<div class="emoji-popover">
								<EmojiPicker onselect={(e) => { newCollectionIcon = e; showEmojiPicker = null; }} />
							</div>
						{/if}
					</div>
					<input
						class="col-name-input"
						type="text"
						placeholder="Name…"
						bind:value={newCollectionName}
						onkeydown={(e) => { if (e.key === 'Enter') createCollection(); if (e.key === 'Escape') { showNewCollection = false; showEmojiPicker = null; } }}
					/>
					<button class="col-save-btn" onclick={createCollection} disabled={!newCollectionName.trim()}>Add</button>
				</div>
			{:else}
				<button
					class="nav-item new-col-btn"
					onclick={() => { showNewCollection = true; newCollectionName = ''; newCollectionIcon = '📁'; }}
				>
					<svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
					New collection
				</button>
			{/if}
		</div>

		{#if data.tags.length > 0}
			<div class="sidebar-section">
				<p class="section-label">Tags</p>
				{#each data.tags as tag}
					<div
						class="col-item-wrap"
						onmouseenter={() => hoveredTagSidebarId = tag.id}
						onmouseleave={() => { if (showTagMenu !== tag.id) hoveredTagSidebarId = null; }}
					>
						{#if renamingTagId === tag.id}
							<div class="new-collection-form">
								<input
									class="col-name-input"
									type="text"
									bind:value={renameTagName}
									onkeydown={(e) => { if (e.key === 'Enter') renameTag(tag.id); if (e.key === 'Escape') renamingTagId = null; }}
								/>
								<button class="col-save-btn" onclick={() => renameTag(tag.id)} disabled={!renameTagName.trim()}>Save</button>
							</div>
						{:else}
							<button
								class="nav-item"
								class:active={data.activeTag === tag.slug}
								onclick={() => navTo({ tag: tag.slug, collection: null })}
							>
								<span class="tag-dot"></span>
								{tag.name}
								{#if tag.articleCount > 0}
									<span class="badge">{tag.articleCount}</span>
								{/if}
							</button>
							{#if hoveredTagSidebarId === tag.id || showTagMenu === tag.id}
								<div class="col-menu-wrap tag-menu-wrap">
									<button
										class="col-menu-btn"
										onclick={(e) => { e.stopPropagation(); showTagMenu = showTagMenu === tag.id ? null : tag.id; }}
										aria-label="Tag options"
									>···</button>
									{#if showTagMenu === tag.id}
										<div class="col-menu-dropdown">
											<button onclick={() => { renamingTagId = tag.id; renameTagName = tag.name; showTagMenu = null; hoveredTagSidebarId = null; }}>Rename</button>
											<button class="danger" onclick={() => { showTagMenu = null; deleteTag(tag.id, tag.articleCount); }}>Delete</button>
										</div>
									{/if}
								</div>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<div class="sidebar-footer">
			<button class="nav-item" onclick={toggleDark} title={isDark ? 'Switch to light' : 'Switch to dark'}>
				{#if isDark}
					<svg width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 1v1M7.5 13v1M1 7.5h1M13 7.5h1M3.2 3.2l.7.7M11.1 11.1l.7.7M11.1 3.2l-.7.7M3.2 11.8l.7-.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
					Light mode
				{:else}
					<svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M3 9A5.5 5.5 0 009.5 3c.28 0 .56.02.83.06A5.5 5.5 0 113 9z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
					Dark mode
				{/if}
			</button>
			<a href="/settings" class="nav-item">
				<svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" stroke-width="1.3"/><path d="M12.2 9.2l.8 1.4-1.4 1.4-1.4-.8a4.5 4.5 0 01-1.3.5L8.5 13h-2l-.4-1.3a4.5 4.5 0 01-1.3-.5l-1.4.8-1.4-1.4.8-1.4a4.5 4.5 0 01-.5-1.3L2 7.5v-1l1.3-.4a4.5 4.5 0 01.5-1.3l-.8-1.4 1.4-1.4 1.4.8a4.5 4.5 0 011.3-.5L7.5 2h1l.4 1.3a4.5 4.5 0 011.3.5l1.4-.8 1.4 1.4-.8 1.4a4.5 4.5 0 01.5 1.3L14 7.5v1l-1.3.4a4.5 4.5 0 01-.5 1.3z" stroke="currentColor" stroke-width="1.3"/></svg>
				Settings
			</a>
			<a href="/auth/logout" class="nav-item">
				<svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M9 2H12.5C12.7761 2 13 2.22386 13 2.5V12.5C13 12.7761 12.7761 13 12.5 13H9M6 10.5L9 7.5M9 7.5L6 4.5M9 7.5H2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
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

		<div class="search-wrap">
			<svg width="13" height="13" viewBox="0 0 15 15" fill="none" class="search-icon"><path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zM9.36 10.07L12 12.71" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
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

		<div class="list-header">
			<h2>{filterLabels[data.filter] ?? 'Articles'}{data.activeTag ? ` · #${data.activeTag}` : ''}{data.activeCollection ? ` · ${data.collections.find(c => c.id === data.activeCollection)?.name}` : ''}{data.q ? ` · "${data.q}"` : ''}</h2>
			<span class="count">{data.total}</span>
		</div>

		<div class="article-list">
			{#if data.articles.length === 0}
				<div class="empty">
					<p class="empty-title">Nothing here yet</p>
					<p class="empty-sub">Paste a URL above or press Cmd+V anywhere on this page</p>
				</div>
			{:else}
			{#each articles as article (article.id)}
					<article
						class="card"
						class:read={article.isRead}
						onmouseenter={() => hoveredArticleId = article.id}
						onmouseleave={() => { if (hoveredArticleId === article.id) hoveredArticleId = null; }}
					>
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
							<button class="act" class:act-on={article.isRead} onclick={() => toggleRead(article.id, article.isRead ?? false)}>
								{#if article.isRead}
									<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5L5.5 10.5L12.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
									Unread
								{:else}
									<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.4"/></svg>
									Read
								{/if}
							</button>
							<button class="act" class:act-on={article.isFavorite} onclick={() => toggleFavorite(article.id, article.isFavorite ?? false)}>
								<svg width="12" height="12" viewBox="0 0 15 15" fill={article.isFavorite ? 'currentColor' : 'none'}><path d="M7.5 2L9.18 5.41L13 6.01L10.25 8.7L10.91 12.5L7.5 10.73L4.09 12.5L4.75 8.7L2 6.01L5.82 5.41L7.5 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
								{article.isFavorite ? 'Saved' : 'Favorite'}
							</button>
							{#if data.filter === 'archive'}
								<button class="act" onclick={() => unarchiveArticle(article.id)}>
									<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3.5" width="12" height="2" rx="0.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 5.5v6a1 1 0 001 1h8a1 1 0 001-1v-6" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 9V6M6 7.5l1.5-1.5L9 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
									Unarchive
								</button>
							{:else}
								<button class="act" onclick={() => archiveArticle(article.id)}>
									<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3.5" width="12" height="2" rx="0.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 5.5v6a1 1 0 001 1h8a1 1 0 001-1v-6" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 8.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
									Archive
								</button>
							{/if}
							{#if data.collections.length > 0}
								{@const currentCol = data.collections.find(c => c.id === article.collectionId)}
								<div class="col-picker-wrap">
									<button
										class="act"
										class:act-on={!!currentCol}
										onclick={() => showCollectionPicker = showCollectionPicker === article.id ? null : article.id}
									>
										<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M1 4.5A1.5 1.5 0 012.5 3h3.672a1.5 1.5 0 011.06.44l.829.828A1.5 1.5 0 009.12 4.8H12.5A1.5 1.5 0 0114 6.3V11.5A1.5 1.5 0 0112.5 13h-10A1.5 1.5 0 011 11.5V4.5z" stroke="currentColor" stroke-width="1.3"/></svg>
										{currentCol ? `${currentCol.icon} ${currentCol.name}` : 'Collection'}
									</button>
									{#if showCollectionPicker === article.id}
										<div class="col-picker-dropdown">
											{#each data.collections as col}
												<button
													class="col-picker-opt"
													class:active={article.collectionId === col.id}
													onclick={() => { moveToCollection(article.id, article.collectionId === col.id ? null : col.id); showCollectionPicker = null; }}
												>
													<span>{col.icon} {col.name}</span>
													{#if article.collectionId === col.id}
														<svg width="10" height="10" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5L5.5 10.5L12.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
													{/if}
												</button>
											{/each}
											{#if article.collectionId}
												<div class="col-picker-sep"></div>
												<button class="col-picker-opt col-picker-remove" onclick={() => { moveToCollection(article.id, null); showCollectionPicker = null; }}>
													Remove from collection
												</button>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
							<a class="act" href={article.url} target="_blank" rel="noopener">
								<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M9 2H13V6M13 2L6.5 8.5M5.5 3.5H3a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
								Original
							</a>
							<button class="act act-del" onclick={() => deleteArticle(article.id)}>
								<svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M5 5l5 5M10 5l-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
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

<div class="stats-anchor">
	{#if showStats}
		<div class="stats-popover">
			<p class="stats-label">Reading stats</p>
			<div class="stats-row">
				<span class="stats-value">{stats.articles.toLocaleString()}</span>
				<span class="stats-unit">articles read</span>
			</div>
			<div class="stats-row">
				<span class="stats-value">{stats.words.toLocaleString()}</span>
				<span class="stats-unit">words</span>
			</div>
			<div class="stats-row">
				<span class="stats-value">{fmtTime(stats.minutes)}</span>
				<span class="stats-unit">reading time</span>
			</div>
		</div>
	{/if}
	<button
		class="stats-btn"
		onclick={() => showStats = !showStats}
		title="Reading stats"
		aria-label="Reading stats"
	>
		<svg width="13" height="13" viewBox="0 0 15 15" fill="none">
			<rect x="1" y="9" width="3" height="5" rx="0.5" fill="currentColor"/>
			<rect x="6" y="5" width="3" height="9" rx="0.5" fill="currentColor"/>
			<rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor"/>
		</svg>
	</button>
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

	.emoji-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.col-icon-btn {
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		background: var(--color-bg);
		cursor: pointer;
		font-size: 0.9375rem;
		display: grid;
		place-items: center;
		transition: border-color 0.1s;
	}

	.col-icon-btn:hover { border-color: var(--color-text); }

	.emoji-popover {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: 60;
		width: 200px;
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

	.tag-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-border-strong);
		flex-shrink: 0;
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
	.search-icon { color: var(--color-subtle); flex-shrink: 0; }
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

	/* Save bar */
	.save-bar { margin-bottom: 0.75rem; }

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
		gap: 0.15rem;
		font-size: 0.6875rem;
		color: var(--color-subtle);
	}

	.tag-name {
		background: none;
		border: none;
		padding: 0;
		font-size: inherit;
		font-family: inherit;
		color: inherit;
		cursor: pointer;
		line-height: inherit;
	}

	.tag-name:hover { color: var(--color-muted); text-decoration: underline; text-underline-offset: 2px; }

	.tag-x {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-border-strong);
		font-size: 0.75rem;
		line-height: 1;
		opacity: 0;
		transition: opacity 0.15s, color 0.1s;
	}

	.card:hover .tag-x,
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
		background: var(--color-text);
		border-color: var(--color-text);
		color: #fff;
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

	.col-picker-sep {
		height: 1px;
		background: var(--color-border);
		margin: 0.25rem 0;
	}

	.col-picker-remove { color: var(--color-muted); }
	.col-picker-remove:hover { color: #dc2626; background: #fef2f2; }

	.act-del:hover {
		background: #fef2f2;
		border-color: #fca5a5;
		color: #dc2626;
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

	.stats-anchor {
		position: fixed;
		bottom: 1.25rem;
		left: 1.25rem;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.stats-btn {
		display: grid;
		place-items: center;
		width: 1.875rem;
		height: 1.875rem;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-subtle);
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.15s, border-color 0.15s, color 0.15s;
	}

	.stats-btn:hover {
		opacity: 1;
		border-color: var(--color-border-strong);
		color: var(--color-muted);
	}

	.stats-popover {
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
		margin: 0 0 0.625rem;
	}

	.stats-row {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		padding: 0.2rem 0;
	}

	.stats-value {
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.stats-unit {
		font-size: 0.75rem;
		color: var(--color-muted);
	}
</style>

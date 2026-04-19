<script lang="ts">
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/toasts.svelte';
	import { ArrowLeft, Check, Circle, Star, ExternalLink, Printer, Bell, Languages, Sparkles, Trash2, ChevronDown, Highlighter, X } from 'lucide-svelte';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let article = $state({ ...data.article });

	type Highlight = { id: string; selectedText: string; startOffset: number; endOffset: number; note: string | null; createdAt: Date | null };
	let highlights = $state<Highlight[]>([]);
	$effect(() => { highlights = data.highlights ?? []; });
	let highlightMode = $state(false);
	let activeHighlightId = $state<string | null>(null);
	let noteInputs = $state<Record<string, string>>({});
	let proseEl = $state<HTMLElement | null>(null);

	type SimilarArticle = { id: string; title: string; url: string | null; siteName: string | null; favicon: string | null; readingTimeMinutes: number | null; isRead: boolean | null };
	let similar = $state<SimilarArticle[] | null>(null);
	let loadingSimilar = $state(false);
	let showSimilar = $state(false);

	let translatedTitle = $state<string | null>(null);
	let translatedHtml = $state<string | null>(null);
	let loadingTranslate = $state(false);
	let targetLang = $state('en');
	let showLangPicker = $state(false);

	const LANGS = [
		['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'],
		['pt', 'Portuguese'], ['it', 'Italian'], ['nl', 'Dutch'], ['pl', 'Polish'],
		['ru', 'Russian'], ['ja', 'Japanese'], ['zh', 'Chinese'], ['ko', 'Korean'],
		['ar', 'Arabic'], ['tr', 'Turkish'], ['sv', 'Swedish'],
	];

	function esc(s: string) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	async function callTranslate(text: string): Promise<string> {
		const res = await fetch('/api/translate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text, target: targetLang })
		});
		if (!res.ok) throw new Error('Translation failed');
		return (await res.json()).translated as string;
	}

	async function translateArticle() {
		if (translatedHtml !== null) {
			translatedTitle = null;
			translatedHtml = null;
			return;
		}
		if (loadingTranslate) return;
		loadingTranslate = true;
		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(article.content ?? '', 'text/html');
			const blockEls = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li'));
			const blockData = blockEls
				.map(el => ({ tag: el.tagName.toLowerCase(), text: el.textContent?.trim() ?? '' }))
				.filter(b => b.text.length > 0);

			// Build chunks, tracking start index of each chunk so we can map tags back
			const chunkInfos: { texts: string[]; startIdx: number }[] = [];
			let currentTexts: string[] = [];
			let currentLen = 0;
			let startIdx = 0;
			for (let i = 0; i < blockData.length; i++) {
				const { text } = blockData[i];
				if (currentLen + text.length + 2 > 2000 && currentTexts.length > 0) {
					chunkInfos.push({ texts: currentTexts, startIdx });
					startIdx = i;
					currentTexts = [text];
					currentLen = text.length;
				} else {
					currentTexts.push(text);
					currentLen += text.length + 2;
				}
			}
			if (currentTexts.length > 0) chunkInfos.push({ texts: currentTexts, startIdx });

			const [titleResult, ...chunkResults] = await Promise.all([
				callTranslate(article.title ?? ''),
				...chunkInfos.map(({ texts }) => callTranslate(texts.join('\n\n')))
			]);

			// Reassemble with original tags
			const htmlParts: string[] = [];
			chunkResults.forEach((result, ci) => {
				const { startIdx } = chunkInfos[ci];
				result.split('\n\n').filter(Boolean).forEach((text, i) => {
					const tag = blockData[startIdx + i]?.tag ?? 'p';
					const safe = esc(text);
					if (tag === 'blockquote') htmlParts.push(`<blockquote><p>${safe}</p></blockquote>`);
					else if (['h1','h2','h3','h4','h5','h6'].includes(tag)) htmlParts.push(`<${tag}>${safe}</${tag}>`);
					else htmlParts.push(`<p>${safe}</p>`);
				});
			});

			translatedTitle = titleResult;
			translatedHtml = htmlParts.join('\n');
		} catch {
			addToast('Translation failed', 'error');
		} finally {
			loadingTranslate = false;
		}
	}

	async function fetchSimilar() {
		if (similar !== null) { showSimilar = !showSimilar; return; }
		if (loadingSimilar) return;
		loadingSimilar = true;
		try {
			const res = await fetch(`/api/articles/${article.id}/similar`);
			similar = res.ok ? await res.json() : [];
		} catch {
			similar = [];
		} finally {
			loadingSimilar = false;
			showSimilar = true;
		}
	}

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

	let deleteTimeout: ReturnType<typeof setTimeout> | null = null;

	async function deleteArticle() {
		let undone = false;
		addToast('Article deleted', 'info', {
			undoFn: () => { undone = true; if (deleteTimeout) clearTimeout(deleteTimeout); }
		});
		deleteTimeout = setTimeout(async () => {
			if (undone) return;
			await fetch(`/api/articles/${article.id}`, { method: 'DELETE' });
			goto('/');
		}, 5600);
	}

	const savedDate = article.savedAt
		? new Date(article.savedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		: null;

	// --- Reminders ---
	let reminderData = $state<typeof data.reminder | null>(null);
	$effect(() => { reminderData = data.reminder ?? null; });
	let showReminder = $state(false);

	function toDatetimeLocal(d: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function defaultRemindAt(): string {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		d.setHours(9, 0, 0, 0);
		return toDatetimeLocal(d);
	}

	function reminderInputValue(): string {
		return reminderData ? toDatetimeLocal(new Date(reminderData.remindAt)) : defaultRemindAt();
	}

	let reminderDatetime = $state(reminderInputValue());

	async function saveReminder() {
		const res = await fetch('/api/reminders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ articleId: article.id, remindAt: reminderDatetime })
		});
		if (res.ok) {
			reminderData = await res.json();
			showReminder = false;
			addToast('Reminder set', 'success');
		} else {
			addToast('Failed to set reminder', 'error');
		}
	}

	async function deleteReminder() {
		if (!reminderData) return;
		const res = await fetch(`/api/reminders/${reminderData.id}`, { method: 'DELETE' });
		if (res.ok) {
			reminderData = null;
			showReminder = false;
			addToast('Reminder removed', 'info');
		}
	}

	function firstTextNodeIn(node: Node): Text | null {
		if (node.nodeType === Node.TEXT_NODE) return node as Text;
		for (const child of node.childNodes) {
			const t = firstTextNodeIn(child);
			if (t) return t;
		}
		return null;
	}

	function lastTextNodeIn(node: Node): Text | null {
		if (node.nodeType === Node.TEXT_NODE) return node as Text;
		const children = Array.from(node.childNodes);
		for (let i = children.length - 1; i >= 0; i--) {
			const t = lastTextNodeIn(children[i]);
			if (t) return t;
		}
		return null;
	}

	function getTextOffsets(container: Element, range: Range): { start: number; end: number } {
		const pre = document.createRange();
		pre.setStart(container, 0);
		pre.setEnd(range.startContainer, range.startOffset);
		const start = pre.toString().length;
		const end = start + range.toString().length;
		return { start, end };
	}

	// Wraps each text node in the range with its own <mark> — avoids block-in-inline DOM corruption.
	function wrapRangeTextNodes(range: Range, id: string) {
		const ancestor = range.commonAncestorContainer;
		const root = ancestor.nodeType === Node.ELEMENT_NODE
			? ancestor as Element
			: ancestor.parentElement!;

		// Resolve concrete text node + offset for range boundaries (handles element containers)
		let startNode: Text, startOff: number;
		if (range.startContainer.nodeType === Node.TEXT_NODE) {
			startNode = range.startContainer as Text;
			startOff = range.startOffset;
		} else {
			const el = range.startContainer as Element;
			const ref = el.childNodes[range.startOffset];
			startNode = (ref ? firstTextNodeIn(ref) : null) ?? firstTextNodeIn(el)!;
			startOff = 0;
		}

		let endNode: Text, endOff: number;
		if (range.endContainer.nodeType === Node.TEXT_NODE) {
			endNode = range.endContainer as Text;
			endOff = range.endOffset;
		} else {
			const el = range.endContainer as Element;
			const ref = el.childNodes[range.endOffset - 1];
			endNode = (ref ? lastTextNodeIn(ref) : null) ?? lastTextNodeIn(el)!;
			endOff = endNode?.length ?? 0;
		}

		if (!startNode! || !endNode!) return;

		// Snapshot text nodes before touching DOM
		const textNodes: Text[] = [];
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) textNodes.push(node);

		let inRange = false;
		for (const tn of textNodes) {
			if (tn === startNode) inRange = true;
			if (!inRange) continue;

			const ns = tn === startNode ? startOff : 0;
			const ne = tn === endNode ? endOff : tn.length;

			if (ns < ne) {
				const mark = document.createElement('mark');
				mark.dataset.highlightId = id;
				mark.className = 'highlight-mark';
				mark.addEventListener('click', () => { activeHighlightId = id; });
				const r = document.createRange();
				r.setStart(tn, ns);
				r.setEnd(tn, ne);
				r.surroundContents(mark);
			}

			if (tn === endNode) break;
		}
	}

	// Re-applies a saved highlight by character offsets into the prose text content.
	function applyHighlightMark(container: Element, start: number, end: number, id: string) {
		// Snapshot text nodes + their offsets before touching DOM
		const nodes: Array<{ tn: Text; nodeStart: number }> = [];
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
		let offset = 0;
		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			nodes.push({ tn: node, nodeStart: offset });
			offset += node.length;
		}

		for (const { tn, nodeStart } of nodes) {
			const nodeEnd = nodeStart + tn.length;
			if (nodeEnd <= start || nodeStart >= end) continue;

			const ns = Math.max(0, start - nodeStart);
			const ne = Math.min(tn.length, end - nodeStart);
			if (ns >= ne) continue;

			const mark = document.createElement('mark');
			mark.dataset.highlightId = id;
			mark.className = 'highlight-mark';
			mark.addEventListener('click', () => { activeHighlightId = id; });
			const r = document.createRange();
			r.setStart(tn, ns);
			r.setEnd(tn, ne);
			try { r.surroundContents(mark); } catch { /* already wrapped or malformed */ }

			if (nodeEnd >= end) break;
		}
	}

	function removeHighlightMark(id: string) {
		if (!proseEl) return;
		proseEl.querySelectorAll(`mark[data-highlight-id="${id}"]`).forEach(mark => {
			const parent = mark.parentNode!;
			while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
			parent.removeChild(mark);
		});
		proseEl.normalize();
	}

	// Window-level mouseup so selection works even when mouse is released outside the prose div.
	$effect(() => {
		if (!highlightMode) return;
		async function onWindowMouseup() {
			if (!proseEl) return;
			const sel = window.getSelection();
			if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
			const liveRange = sel.getRangeAt(0);
			if (!proseEl.contains(liveRange.commonAncestorContainer)) return;
			const selectedText = sel.toString().trim();
			if (!selectedText) return;
			const { start, end } = getTextOffsets(proseEl, liveRange);
			const range = liveRange.cloneRange();
			sel.removeAllRanges();
			const tempId = '_tmp_' + Date.now();
			wrapRangeTextNodes(range, tempId);
			const res = await fetch(`/api/articles/${article.id}/highlights`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ selectedText, startOffset: start, endOffset: end })
			});
			if (!res.ok) {
				removeHighlightMark(tempId);
				addToast('Failed to save highlight', 'error');
				return;
			}
			const highlight = await res.json() as Highlight;
			// There may be multiple <mark> elements (one per text node)
			proseEl!.querySelectorAll(`mark[data-highlight-id="${tempId}"]`).forEach(m => {
				(m as HTMLElement).dataset.highlightId = highlight.id;
				m.addEventListener('click', () => { activeHighlightId = highlight.id; });
			});
			highlights = [...highlights, highlight];
			noteInputs[highlight.id] = '';
			activeHighlightId = highlight.id;
		}
		window.addEventListener('mouseup', onWindowMouseup);
		return () => window.removeEventListener('mouseup', onWindowMouseup);
	});

	async function saveNote(id: string) {
		const note = noteInputs[id] ?? '';
		const res = await fetch(`/api/highlights/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ note })
		});
		if (res.ok) {
			highlights = highlights.map(h => h.id === id ? { ...h, note } : h);
			addToast('Note saved', 'success');
		}
	}

	async function deleteHighlight(id: string) {
		await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
		removeHighlightMark(id);
		highlights = highlights.filter(h => h.id !== id);
		if (activeHighlightId === id) activeHighlightId = null;
	}

	// Apply existing highlights when prose mounts and when content changes
	$effect(() => {
		if (!proseEl || translatedHtml !== null) return;
		for (const h of highlights) {
			noteInputs[h.id] = h.note ?? '';
		}
		setTimeout(() => {
			if (!proseEl) return;
			for (const h of highlights) {
				if (!proseEl!.querySelector(`mark[data-highlight-id="${h.id}"]`)) {
					applyHighlightMark(proseEl!, h.startOffset, h.endOffset, h.id);
				}
			}
		}, 0);
	});

	$effect(() => {
		function handleMousedown(e: MouseEvent) {
			if (!(e.target as HTMLElement).closest('.similar-wrap')) showSimilar = false;
			if (!(e.target as HTMLElement).closest('.remind-wrap')) showReminder = false;
			if (!(e.target as HTMLElement).closest('.translate-wrap')) showLangPicker = false;
			if (!(e.target as HTMLElement).closest('.highlight-panel') && !(e.target as HTMLElement).closest('.highlight-mark')) {
				activeHighlightId = null;
			}
		}
		window.addEventListener('mousedown', handleMousedown);
		return () => window.removeEventListener('mousedown', handleMousedown);
	});
</script>

<svelte:head>
	<title>{article.title} — Someday</title>
</svelte:head>

<div class="page">
	<header class="topbar">
		<a href="/" class="back">
			<ArrowLeft size={14} strokeWidth={1.5} />
			Back
		</a>

		<div class="topbar-actions">
			<button class="act" class:act-on={article.isRead} onclick={toggleRead}>
				{#if article.isRead}
					<Check size={12} strokeWidth={1.6} />
					Mark unread
				{:else}
					<Circle size={12} strokeWidth={1.4} />
					Mark read
				{/if}
			</button>
			<button class="act" class:act-on={article.isFavorite} onclick={toggleFavorite}>
				<Star size={12} strokeWidth={1.4} fill={article.isFavorite ? 'currentColor' : 'none'} />
				{article.isFavorite ? 'Favorited' : 'Favorite'}
			</button>
			{#if article.url}
			<a class="act" href={article.url} target="_blank" rel="noopener">
				<ExternalLink size={12} strokeWidth={1.4} />
				Original
			</a>
			{/if}
			<button class="act" onclick={() => window.print()}>
				<Printer size={12} strokeWidth={1.4} />
				Save as PDF
			</button>
			<div class="remind-wrap">
					<button class="act" class:act-on={reminderData !== null} onclick={() => { reminderDatetime = reminderInputValue(); showReminder = !showReminder; }}>
						<Bell size={12} strokeWidth={1.4} fill={reminderData !== null ? 'currentColor' : 'none'} />
						Remind
					</button>
					{#if showReminder}
						<div class="remind-dropdown">
							<p class="remind-label">{reminderData ? 'Update reminder' : 'Set reminder'}</p>
							<input
								class="remind-input"
								type="datetime-local"
								bind:value={reminderDatetime}
							/>
							<div class="remind-actions">
								{#if reminderData}
									<button class="remind-btn remind-btn-del" onclick={deleteReminder}>Remove</button>
								{/if}
								<button class="remind-btn remind-btn-save" onclick={saveReminder}>
									{reminderData ? 'Update' : 'Set reminder'}
								</button>
							</div>
						</div>
					{/if}
				</div>
				<div class="translate-wrap">
					<button class="act translate-btn" class:act-on={translatedHtml !== null} onclick={translateArticle} disabled={!article.content || loadingTranslate}>
						<Languages size={12} strokeWidth={1.4} />
						{loadingTranslate ? 'Translating…' : 'Translate'}
					</button>
					<button class="act lang-chevron" class:act-on={translatedHtml !== null || showLangPicker} onclick={() => showLangPicker = !showLangPicker} title="Pick language">
						<ChevronDown size={10} strokeWidth={1.6} />
					</button>
					{#if showLangPicker}
						<div class="lang-dropdown">
							{#each LANGS as [code, name]}
								<button
									class="lang-opt"
									class:active={targetLang === code}
									onclick={() => { targetLang = code; showLangPicker = false; }}
								>
									{name}
									{#if targetLang === code}<Check size={10} strokeWidth={1.8} />{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
				<div class="similar-wrap">
				<button class="act" class:act-on={showSimilar} onclick={fetchSimilar}>
					<Sparkles size={12} strokeWidth={1.4} />
					Similar
				</button>
				{#if showSimilar}
					<div class="similar-dropdown">
						{#if loadingSimilar}
							<p class="similar-empty">Finding similar articles…</p>
						{:else if similar && similar.length > 0}
							{#each similar as s}
								<a href="/articles/{s.id}" class="similar-item">
									<div class="similar-meta">
										{#if s.favicon}
											<img src={s.favicon} alt="" width="12" height="12" class="similar-fav"
												onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
										{/if}
										<span class="similar-site">{s.siteName ?? (s.url ? new URL(s.url).hostname : '')}</span>
										{#if s.readingTimeMinutes}<span class="similar-time">· {s.readingTimeMinutes} min</span>{/if}
										{#if s.isRead}<span class="similar-read">· read</span>{/if}
									</div>
									<p class="similar-title">{s.title}</p>
								</a>
							{/each}
						{:else}
							<p class="similar-empty">No similar articles found in your library.</p>
						{/if}
					</div>
				{/if}
			</div>
			<button class="act" class:act-on={highlightMode} onclick={() => { highlightMode = !highlightMode; if (!highlightMode) activeHighlightId = null; }}>
				<Highlighter size={12} strokeWidth={1.4} />
				Highlight
			</button>
			<button class="act act-del" onclick={deleteArticle}>
				<Trash2 size={12} strokeWidth={1.4} />
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
			<span class="site">{article.siteName ?? (article.url ? new URL(article.url).hostname : '')}</span>
			{#if article.author}<span class="sep">·</span><span class="author">{article.author}</span>{/if}
			{#if article.readingTimeMinutes}<span class="sep">·</span><span class="rtime">{article.readingTimeMinutes} min read</span>{/if}
			{#if savedDate}<span class="sep">·</span><span class="rtime">Saved {savedDate}</span>{/if}
			{#if article.isPaywalled}<span class="paywall-badge">Paywall</span>{/if}
			{#if article.source === 'email'}<span class="source-badge source-email">Email</span>{/if}
			{#if article.source === 'product'}<span class="source-badge source-product">Product</span>{/if}
			{#if article.source === 'pdf'}<span class="source-badge source-pdf">PDF</span>{/if}
		</div>

		<h1 class="article-title">{translatedTitle ?? article.title}</h1>

		{#if article.coverImage}
			<img src={article.coverImage} alt="" class="cover"
				onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
		{/if}

		<div bind:this={proseEl} class:highlight-active={highlightMode} role="article">
			{#if translatedHtml !== null}
				<div class="prose prose-neutral dark:prose-invert max-w-none">
					{@html translatedHtml}
				</div>
			{:else if article.content}
				<div class="prose prose-neutral dark:prose-invert max-w-none">
					{@html article.content}
				</div>
			{:else}
				<div class="no-content">
					<p>No saved content for this article.</p>
					{#if article.url}<a href={article.url} target="_blank" rel="noopener">Open original →</a>{/if}
				</div>
			{/if}
		</div>

	</div>
</div>

{#if highlightMode || highlights.length > 0}
<div class="highlight-panel">
	<div class="hp-header">
		<span class="hp-title">Highlights</span>
		{#if highlights.length > 0}<span class="hp-count">{highlights.length}</span>{/if}
	</div>
	{#if highlights.length === 0}
		<p class="hp-empty">Select text in the article to highlight it.</p>
	{:else}
		<div class="hp-list">
			{#each highlights as h (h.id)}
				<div
					class="hp-item"
					class:hp-item-active={activeHighlightId === h.id}
					role="button"
					tabindex="0"
					onclick={() => {
						const opening = activeHighlightId !== h.id;
						activeHighlightId = opening ? h.id : null;
						noteInputs[h.id] ??= h.note ?? '';
						if (opening) {
							const mark = proseEl?.querySelector(`mark[data-highlight-id="${h.id}"]`);
							mark?.scrollIntoView({ behavior: 'smooth', block: 'center' });
						}
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							const opening = activeHighlightId !== h.id;
							activeHighlightId = opening ? h.id : null;
							noteInputs[h.id] ??= h.note ?? '';
							if (opening) {
								const mark = proseEl?.querySelector(`mark[data-highlight-id="${h.id}"]`);
								mark?.scrollIntoView({ behavior: 'smooth', block: 'center' });
							}
						}
					}}
				>
					<div class="hp-item-header">
						<span class="hp-quote">"{h.selectedText.length > 80 ? h.selectedText.slice(0, 80) + '…' : h.selectedText}"</span>
						<button class="hp-del" onclick={(e) => { e.stopPropagation(); deleteHighlight(h.id); }} title="Remove highlight">
							<X size={10} strokeWidth={1.8} />
						</button>
					</div>
					{#if activeHighlightId === h.id}
						<textarea
							class="hp-note-input"
							placeholder="Add a note…"
							rows={3}
							bind:value={noteInputs[h.id]}
							onclick={(e) => e.stopPropagation()}
						></textarea>
						<button class="hp-save" onclick={(e) => { e.stopPropagation(); saveNote(h.id); }}>Save note</button>
					{:else if h.note}
						<p class="hp-note-preview">{h.note}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	{#if highlightMode}
		<p class="hp-mode-hint">Highlight mode on — select text to highlight</p>
	{/if}
</div>
{/if}

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
		min-width: 0;
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
		background: var(--color-border);
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}

	.act-del:hover {
		background: var(--color-danger-bg);
		border-color: var(--color-danger-border);
		color: var(--color-danger);
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

	.paywall-badge {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-warning);
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning-border);
		border-radius: 3px;
		padding: 0.1em 0.4em;
		margin-left: 0.25rem;
	}
	.source-badge {
		font-size: 0.75rem;
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

	.remind-wrap {
		position: relative;
	}

	.remind-dropdown {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		width: 230px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.remind-label {
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-subtle);
		margin: 0;
	}

	.remind-input {
		font-size: 0.8125rem;
		font-family: inherit;
		color: var(--color-text);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 0.3em 0.5em;
		width: 100%;
		box-sizing: border-box;
		outline: none;
	}

	.remind-input:focus {
		border-color: var(--color-border-strong);
	}

	.remind-actions {
		display: flex;
		gap: 0.375rem;
		justify-content: flex-end;
	}

	.remind-btn {
		font-size: 0.75rem;
		font-family: inherit;
		padding: 0.25em 0.6em;
		border-radius: 5px;
		border: 1px solid var(--color-border);
		cursor: pointer;
		background: none;
		color: var(--color-muted);
		transition: all 0.1s;
	}

	.remind-btn-save {
		background: var(--color-text);
		border-color: var(--color-text);
		color: #fff;
	}

	.remind-btn-del:hover {
		background: var(--color-danger-bg);
		border-color: var(--color-danger-border);
		color: var(--color-danger);
	}

	.translate-wrap {
		display: inline-flex;
		align-items: center;
		position: relative;
	}

	.translate-btn {
		border-radius: 5px 0 0 5px;
	}

	.lang-chevron {
		border-left: none;
		border-radius: 0 5px 5px 0;
		padding: 0.2em 0.4em;
		align-self: stretch;
	}

	.lang-dropdown {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		overflow: hidden;
		min-width: 130px;
		padding: 0.25rem;
	}

	.lang-opt {
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

	.lang-opt:hover { background: var(--color-bg); }
	.lang-opt.active { font-weight: 500; }

	.similar-wrap {
		position: relative;
	}

	.similar-dropdown {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		width: 300px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		overflow: hidden;
	}

	.similar-item {
		display: block;
		padding: 0.625rem 0.875rem;
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		transition: background 0.1s;
	}

	.similar-item:last-child { border-bottom: none; }
	.similar-item:hover { background: var(--color-bg); }

	.similar-meta {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.2rem;
	}

	.similar-fav { border-radius: 2px; object-fit: contain; }
	.similar-site { font-size: 0.6875rem; color: var(--color-muted); }
	.similar-time { font-size: 0.6875rem; color: var(--color-subtle); }
	.similar-read { font-size: 0.6875rem; color: var(--color-subtle); }

	.similar-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
		margin: 0;
		letter-spacing: -0.01em;
		line-height: 1.35;
	}

	.similar-empty {
		font-size: 0.8125rem;
		color: var(--color-muted);
		margin: 0;
		padding: 0.875rem;
	}

	.highlight-active {
		cursor: text;
	}

	.highlight-active :global(::selection) {
		background: rgba(253, 224, 71, 0.5);
	}

	:global(.highlight-mark) {
		background: rgba(253, 224, 71, 0.45) !important;
		border-radius: 2px;
		cursor: pointer;
		transition: background 0.1s;
	}

	:global(.highlight-mark:hover) {
		background: rgba(253, 224, 71, 0.75) !important;
	}

	.highlight-panel {
		position: fixed;
		right: 1.25rem;
		top: 56px;
		width: 272px;
		max-height: calc(100vh - 72px);
		overflow-y: auto;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 20;
		display: flex;
		flex-direction: column;
	}

	.hp-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.625rem 0.75rem 0.5rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.hp-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-subtle);
	}

	.hp-count {
		font-size: 0.6875rem;
		font-weight: 600;
		background: var(--color-border);
		color: var(--color-muted);
		border-radius: 10px;
		padding: 0.1em 0.45em;
	}

	.hp-empty {
		font-size: 0.8125rem;
		color: var(--color-muted);
		padding: 0.875rem 0.75rem;
		margin: 0;
		line-height: 1.45;
	}

	.hp-mode-hint {
		font-size: 0.75rem;
		color: var(--color-subtle);
		padding: 0.5rem 0.75rem;
		margin: 0;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.hp-list {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.hp-item {
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.1s;
	}

	.hp-item:last-child {
		border-bottom: none;
	}

	.hp-item:hover {
		background: var(--color-bg);
	}

	.hp-item-active {
		background: var(--color-bg);
	}

	.hp-item-header {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
	}

	.hp-quote {
		font-size: 0.8125rem;
		color: var(--color-text);
		line-height: 1.4;
		flex: 1;
		font-style: italic;
	}

	.hp-del {
		flex-shrink: 0;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.15rem;
		color: var(--color-subtle);
		border-radius: 3px;
		display: flex;
		align-items: center;
		transition: color 0.1s, background 0.1s;
		margin-top: 0.1rem;
	}

	.hp-del:hover {
		color: var(--color-danger);
		background: var(--color-danger-bg);
	}

	.hp-note-input {
		margin-top: 0.5rem;
		width: 100%;
		box-sizing: border-box;
		font-size: 0.8125rem;
		font-family: inherit;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		padding: 0.4em 0.5em;
		resize: vertical;
		outline: none;
		line-height: 1.5;
	}

	.hp-note-input:focus {
		border-color: var(--color-border-strong);
	}

	.hp-save {
		margin-top: 0.375rem;
		font-size: 0.75rem;
		font-family: inherit;
		padding: 0.25em 0.65em;
		border-radius: 5px;
		border: none;
		cursor: pointer;
		background: var(--color-text);
		color: #fff;
		transition: opacity 0.1s;
	}

	.hp-save:hover {
		opacity: 0.85;
	}

	.hp-note-preview {
		margin: 0.375rem 0 0;
		font-size: 0.8125rem;
		color: var(--color-muted);
		line-height: 1.4;
		white-space: pre-wrap;
	}

	@media (max-width: 1024px) {
		.highlight-panel {
			right: 0.5rem;
			width: 240px;
		}
	}

	@media (max-width: 768px) {
		.highlight-panel {
			position: fixed;
			bottom: 0;
			right: 0;
			left: 0;
			width: 100%;
			top: auto;
			max-height: 50vh;
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		}
	}

	@media print {
		.topbar { display: none; }

		.reader {
			max-width: 100%;
			padding: 0;
			margin: 0;
		}

		.page {
			background: #fff;
		}

		.cover {
			max-height: 280px;
		}

		:global(.prose a) {
			color: inherit;
			text-decoration: underline;
		}

		:global(.prose pre) {
			white-space: pre-wrap;
			word-break: break-word;
		}
	}

	@media (max-width: 640px) {
		.topbar {
			padding: 0.5rem 0.75rem;
			gap: 0.5rem;
		}

		.topbar-actions {
			flex-wrap: nowrap;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
			gap: 0.25rem;
		}

		.topbar-actions::-webkit-scrollbar { display: none; }

		.act {
			padding: 0.4em 0.65em;
			white-space: nowrap;
			flex-shrink: 0;
			min-height: 2rem;
		}

		.reader {
			padding: 1.5rem 1rem 4rem;
		}

		.article-title {
			font-size: 1.375rem;
		}
	}
</style>

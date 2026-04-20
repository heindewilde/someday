import { error, redirect } from '@sveltejs/kit';
import { saveArticle } from '$lib/server/saveArticle';
import type { PageServerLoad } from './$types';

// Extract the first http(s) URL from a blob of text (share-target `text` field).
function firstUrlIn(text: string): string | null {
	const match = text.match(/https?:\/\/\S+/);
	return match ? match[0] : null;
}

export const load: PageServerLoad = async ({ url, locals, request }) => {
	// Block drive-by `<img src="/save?url=…">` / `<iframe>` / cross-origin fetch vectors.
	// Top-level navigations (bookmarklet, share sheet, direct URL) send
	// Sec-Fetch-Dest: document. Older browsers omit the header entirely — we
	// accept that case rather than break them.
	const dest = request.headers.get('sec-fetch-dest');
	if (dest && dest !== 'document') error(400, 'Bad request');

	const rawUrl = url.searchParams.get('url');
	const text = url.searchParams.get('text');
	const title = url.searchParams.get('title');

	const target = (rawUrl && rawUrl.trim()) || (text && firstUrlIn(text)) || null;

	if (!locals.user) {
		const next = '/save' + url.search;
		redirect(302, '/auth?next=' + encodeURIComponent(next));
	}

	if (!target) {
		return { state: 'empty' as const, title };
	}

	const result = await saveArticle(locals.user.id, target);

	if (result.kind === 'ok' || result.kind === 'duplicate') {
		redirect(303, '/articles/' + result.articleId);
	}

	return { state: 'error' as const, message: result.message, title };
};

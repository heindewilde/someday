import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const LINGVA = env.LINGVA_URL || 'https://lingva.ml';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { text, target = 'en' } = await request.json();
	if (!text?.trim()) return json({ translated: '' });

	const url = `${LINGVA}/api/v1/auto/${target}/${encodeURIComponent(text)}`;
	const res = await fetch(url);
	if (!res.ok) return json({ error: 'Translation failed' }, { status: 502 });

	const data = await res.json();
	return json({ translated: data.translation });
};

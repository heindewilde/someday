import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const LINGVA = env.LINGVA_URL || 'https://lingva.ml';

// BCP-47 language codes supported by Lingva
const ALLOWED_LANGS = new Set([
	'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs',
	'bg', 'ca', 'ceb', 'zh', 'zh-tw', 'co', 'hr', 'cs', 'da', 'nl',
	'en', 'eo', 'et', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el',
	'gu', 'ht', 'ha', 'haw', 'he', 'hi', 'hmn', 'hu', 'is', 'ig',
	'id', 'ga', 'it', 'ja', 'jv', 'kn', 'kk', 'km', 'rw', 'ko',
	'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms',
	'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'ny', 'or',
	'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr',
	'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw',
	'sv', 'tl', 'tg', 'ta', 'tt', 'te', 'th', 'tr', 'tk', 'uk',
	'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu',
]);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { text, target = 'en' } = await request.json();
	if (!text?.trim()) return json({ translated: '' });

	if (!ALLOWED_LANGS.has(target)) {
		return json({ error: 'Unsupported language' }, { status: 400 });
	}

	const url = `${LINGVA}/api/v1/auto/${target}/${encodeURIComponent(text)}`;
	const res = await fetch(url);
	if (!res.ok) return json({ error: 'Translation failed' }, { status: 502 });

	const data = await res.json();
	return json({ translated: data.translation });
};

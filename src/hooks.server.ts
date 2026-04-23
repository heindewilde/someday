import { migrate } from '$lib/server/migrate';
import { getSession } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

// Run once at startup; all requests wait on first call, instant after.
const ready = migrate();

if (!env.LINGVA_URL) {
	console.warn(
		'[someday] LINGVA_URL is not set — translations will be proxied through the public ' +
		'https://lingva.ml instance. Article text will be sent to that third-party server. ' +
		'Set LINGVA_URL to your own Lingva instance to keep reading content private.'
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	await ready;
	event.locals.user = await getSession(event.cookies);
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// style-src unsafe-inline is required for Svelte's scoped style injection;
	// img-src data: allows favicon data URIs, https: allows remote cover images.
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: https:",
			"font-src 'self'",
			"connect-src 'self'",
			"frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'",
		].join('; ')
	);
	return response;
};

import { migrate } from '$lib/server/migrate';
import { getSession } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

// Run once at startup; all requests wait on first call, instant after.
const ready = migrate();

export const handle: Handle = async ({ event, resolve }) => {
	await ready;
	event.locals.user = await getSession(event.cookies);
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// CSP (including nonce for SvelteKit's inline bootstrap script) is handled
	// by the kit.csp config in svelte.config.js.
	return response;
};

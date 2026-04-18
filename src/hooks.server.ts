import { migrate } from '$lib/server/migrate';
import { getSession } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

// Run once at startup; all requests wait on first call, instant after.
const ready = migrate();

export const handle: Handle = async ({ event, resolve }) => {
	await ready;
	event.locals.user = await getSession(event.cookies);
	return resolve(event);
};

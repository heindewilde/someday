import { migrate } from '$lib/server/migrate';
import { getSession } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

migrate();

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await getSession(event.cookies);
	return resolve(event);
};

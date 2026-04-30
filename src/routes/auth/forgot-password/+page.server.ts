import { fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { users, passwordResetTokens } from '$lib/server/schema';
import { lookupRegionForEmail } from '$lib/server/auth';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import type { Actions, RequestEvent } from './$types';

const ONE_HOUR_MS = 60 * 60 * 1000;

export const actions: Actions = {
	default: async ({ request, url }: RequestEvent) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();

		if (!email) return fail(400, { sent: false });

		const region = await lookupRegionForEmail(email);
		if (region) {
			const { db } = getDb(region);
			const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
			if (user) {
				const token = createId();
				const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
				await db.insert(passwordResetTokens).values({ token, userId: user.id, expiresAt });
				const origin = url.origin;
				// TODO: send email
				console.log('[forgot-password] Reset URL:', `${origin}/auth/reset-password?token=${token}`);
			}
		}

		// Always return sent: true to prevent email enumeration
		return { sent: true };
	}
};

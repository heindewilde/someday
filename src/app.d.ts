import type { Region } from '$lib/server/db';

declare global {
	namespace App {
		interface Locals {
			user: { id: string; email: string; name: string | null; region: Region } | null;
		}
	}
}

export {};

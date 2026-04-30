import type { Region } from '$lib/server/db';

declare global {
	namespace App {
		interface Locals {
			user: { id: string; email: string; username: string | null; region: Region } | null;
		}
	}
}

export {};

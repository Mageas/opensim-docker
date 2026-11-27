import type { Session, SessionUser } from '#lib/server/sessions.js';

declare global {
	namespace App {
		interface Error {
			message: string;
			/** Shown to the user and logged with the error, to find one in the other. */
			id?: string;
		}
		interface Locals {
			user: SessionUser | null;
			session: Session | null;
		}
	}
}

export {};

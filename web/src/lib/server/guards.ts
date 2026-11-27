import { redirect } from '@sveltejs/kit';
import type { SessionUser } from './sessions.js';

/**
 * The logged-in user, or a redirect to the login page. Every account load and action calls
 * it: a guard in a layout would not cover form actions.
 */
export function requireUser(locals: App.Locals): SessionUser {
	if (!locals.user) redirect(303, '/login');
	return locals.user;
}

import { redirect } from '@sveltejs/kit';
import { runtime } from '#lib/server/runtime.js';
import { deleteSessionCookie } from '#lib/server/session-cookie.js';
import { invalidateSession } from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types.js';

/** Logging out changes state, so it only answers POST; a visit goes home. */
export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		if (locals.session) await invalidateSession(runtime().db, locals.session.id);
		deleteSessionCookie(cookies);
		redirect(303, '/');
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { loginForm, parseForm } from '#lib/server/forms.js';
import { authenticate } from '#lib/server/opensim/accounts.js';
import { loginAttemptsByAddress, loginFailuresByName } from '#lib/server/rate-limit.js';
import { runtime } from '#lib/server/runtime.js';
import { setSessionCookie } from '#lib/server/session-cookie.js';
import { createSession, invalidateSession } from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/account');
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, getClientAddress }) => {
		const formData = await request.formData();
		const typedName = formData.get('avatarName');
		const values = { avatarName: typeof typedName === 'string' ? typedName : '' };

		const address = getClientAddress();
		if (loginAttemptsByAddress.isLimited(address))
			return fail(429, { values, error: 'rate_limited' as const });
		loginAttemptsByAddress.hit(address);

		const form = parseForm(loginForm, formData);
		if (!form.ok) return fail(400, { values, errors: form.errors });

		const { firstName, lastName } = form.data.avatarName;
		// Counted on the name too, so that guesses spread over many addresses still stop.
		const nameKey = `${firstName} ${lastName}`.toLowerCase();
		if (loginFailuresByName.isLimited(nameKey))
			return fail(429, { values, error: 'rate_limited' as const });

		const { db } = runtime();
		const result = await authenticate(db, firstName, lastName, form.data.password);
		if (!result.ok) {
			if (result.reason === 'credentials_invalid') loginFailuresByName.hit(nameKey);
			return fail(400, { values, error: result.reason });
		}
		loginFailuresByName.reset(nameKey);

		if (locals.session) await invalidateSession(db, locals.session.id);
		const { token, session } = await createSession(db, result.user.id);
		setSessionCookie(cookies, token, session.expiresAt);
		redirect(303, '/account');
	}
};

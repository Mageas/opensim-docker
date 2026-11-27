import { fail, redirect } from '@sveltejs/kit';
import { fieldError, parseForm, signupForm } from '#lib/server/forms.js';
import { createAccount, NameTakenError } from '#lib/server/opensim/accounts.js';
import { signupAttemptsByAddress } from '#lib/server/rate-limit.js';
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
		if (signupAttemptsByAddress.isLimited(address))
			return fail(429, { values, error: 'rate_limited' as const });
		signupAttemptsByAddress.hit(address);

		const form = parseForm(signupForm, formData);
		if (!form.ok) return fail(400, { values, errors: form.errors });

		const { db } = runtime();
		let user;
		try {
			user = await createAccount(db, { ...form.data.avatarName, password: form.data.password });
		} catch (error) {
			if (error instanceof NameTakenError) {
				return fail(400, { values, errors: fieldError(signupForm, 'avatarName', 'name_taken') });
			}
			throw error;
		}

		if (locals.session) await invalidateSession(db, locals.session.id);
		const { token, session } = await createSession(db, user.id);
		setSessionCookie(cookies, token, session.expiresAt);
		redirect(303, '/account?done=created');
	}
};

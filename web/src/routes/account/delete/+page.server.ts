import { fail, redirect } from '@sveltejs/kit';
import { deleteAccountForm, fieldError, parseForm } from '#lib/server/forms.js';
import { requireUser } from '#lib/server/guards.js';
import {
	checkPassword,
	deleteAccount,
	DeletionBlockedError,
	getDeletionBlocker
} from '#lib/server/opensim/accounts.js';
import { passwordFailuresByAccount } from '#lib/server/rate-limit.js';
import { runtime } from '#lib/server/runtime.js';
import { deleteSessionCookie } from '#lib/server/session-cookie.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return { blocker: await getDeletionBlocker(runtime().db, user.id) };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const user = requireUser(locals);
		if (passwordFailuresByAccount.isLimited(user.id))
			return fail(429, { error: 'rate_limited' as const });

		const form = parseForm(deleteAccountForm, await request.formData());
		if (!form.ok) return fail(400, { errors: form.errors });

		const { db } = runtime();
		if (!(await checkPassword(db, user.id, form.data.password))) {
			passwordFailuresByAccount.hit(user.id);
			return fail(400, { errors: fieldError(deleteAccountForm, 'password', 'password_wrong') });
		}
		passwordFailuresByAccount.reset(user.id);

		try {
			await deleteAccount(db, user.id);
		} catch (error) {
			if (error instanceof DeletionBlockedError) return fail(409, { error: error.blocker });
			throw error;
		}
		deleteSessionCookie(cookies);
		redirect(303, '/?done=deleted');
	}
};

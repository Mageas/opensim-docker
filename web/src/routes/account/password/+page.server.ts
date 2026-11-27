import { fail, redirect } from '@sveltejs/kit';
import { transaction } from '#lib/server/db.js';
import {
	changePasswordForm,
	fieldError,
	parseForm,
	passwordContainsName
} from '#lib/server/forms.js';
import { requireUser } from '#lib/server/guards.js';
import { changePassword, checkPassword } from '#lib/server/opensim/accounts.js';
import { passwordFailuresByAccount } from '#lib/server/rate-limit.js';
import { runtime } from '#lib/server/runtime.js';
import { setSessionCookie } from '#lib/server/session-cookie.js';
import { createSession, invalidateUserSessions } from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ locals }) => {
	requireUser(locals);
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const user = requireUser(locals);
		if (passwordFailuresByAccount.isLimited(user.id))
			return fail(429, { error: 'rate_limited' as const });

		const form = parseForm(changePasswordForm, await request.formData());
		if (!form.ok) return fail(400, { errors: form.errors });
		if (passwordContainsName(form.data.password, user)) {
			return fail(400, {
				errors: fieldError(changePasswordForm, 'password', 'password_contains_name')
			});
		}

		const { db } = runtime();
		if (!(await checkPassword(db, user.id, form.data.currentPassword))) {
			passwordFailuresByAccount.hit(user.id);
			return fail(400, {
				errors: fieldError(changePasswordForm, 'currentPassword', 'password_wrong')
			});
		}
		passwordFailuresByAccount.reset(user.id);

		// A new password ends every web session, this one included, in the same transaction.
		await transaction(db, async (connection) => {
			await changePassword(connection, user.id, form.data.password);
			await invalidateUserSessions(connection, user.id);
		});
		const { token, session } = await createSession(db, user.id);
		setSessionCookie(cookies, token, session.expiresAt);
		redirect(303, '/account?done=password');
	}
};

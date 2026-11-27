import { redirect } from '@sveltejs/kit';
import { isTheme, samePath, saveTheme } from '#lib/server/theme.js';
import type { Actions, PageServerLoad } from './$types.js';

/** Only takes the switcher's POST; a visit goes home. */
export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const theme = form.get('theme');
		if (isTheme(theme)) saveTheme(cookies, theme);
		redirect(303, samePath(form.get('redirectTo'), url));
	}
};

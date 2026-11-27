import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, '/account');
	return { deleted: url.searchParams.get('done') === 'deleted' };
};

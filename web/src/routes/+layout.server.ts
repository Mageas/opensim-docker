import { runtime } from '#lib/server/runtime.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = ({ locals }) => ({
	user: locals.user && { firstName: locals.user.firstName, lastName: locals.user.lastName },
	grid: runtime().grid
});

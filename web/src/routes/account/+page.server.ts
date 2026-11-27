import { redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/guards.js';
import { getAccountSummary } from '#lib/server/opensim/accounts.js';
import { runtime } from '#lib/server/runtime.js';
import type { PageServerLoad } from './$types.js';

const NOTICES = ['created', 'password'] as const;
type Notice = (typeof NOTICES)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const account = await getAccountSummary(runtime().db, user.id);
	if (!account) redirect(303, '/login');

	const done = url.searchParams.get('done');
	const notice: Notice | null = NOTICES.find((value) => value === done) ?? null;
	return { account, notice };
};

import { runtime } from '#lib/server/runtime.js';
import type { RequestHandler } from './$types';

/** For the container health check: answers 200 while the database answers. */
export const GET: RequestHandler = async () => {
	try {
		await runtime().db.query('SELECT 1');
		return new Response('ok\n', { headers: { 'content-type': 'text/plain' } });
	} catch {
		return new Response('database unreachable\n', {
			status: 503,
			headers: { 'content-type': 'text/plain' }
		});
	}
};

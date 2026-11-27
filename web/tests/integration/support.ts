import { randomBytes } from 'node:crypto';
import { afterAll, inject } from 'vitest';
import { createDb, type Db } from '../../src/lib/server/db.ts';
import { connectAsRoot } from '../support/database.ts';

/**
 * The portal's pool (restricted account) and a root connection for setting up and reading
 * rows the portal cannot reach. Both close after the file's tests.
 */
export function useDatabase() {
	const config = inject('database');
	const db: Db = createDb(config);
	const root = connectAsRoot(config);
	afterAll(async () => {
		await db.end();
		await (await root).end();
	});
	return { db, root: () => root, config };
}

/** A name no other test uses: test files share one database and run in parallel. */
export function uniqueName(): { firstName: string; lastName: string } {
	const suffix = randomBytes(5).toString('hex');
	return { firstName: `Test${suffix}`, lastName: 'Resident' };
}

export const STRONG_PASSWORD = 'correct horse battery staple';

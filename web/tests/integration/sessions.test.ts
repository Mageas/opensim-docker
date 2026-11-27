import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';
import { createAccount } from '../../src/lib/server/opensim/accounts.ts';
import {
	createSession,
	invalidateSession,
	invalidateUserSessions,
	SESSION_LIFETIME_MS,
	validateSessionToken
} from '../../src/lib/server/sessions.ts';
import { STRONG_PASSWORD, uniqueName, useDatabase } from './support.ts';

const DAY = 24 * 60 * 60 * 1000;

describe('sessions', () => {
	const { db, root } = useDatabase();
	const newUser = async () => createAccount(db, { ...uniqueName(), password: STRONG_PASSWORD });

	const sessionRows = async (userId: string) => {
		const [rows] = await (
			await root()
		).query<RowDataPacket[]>('SELECT id, expires_at FROM web_sessions WHERE user_id = ?', [userId]);
		return rows;
	};

	it('stores only the SHA-256 of the token and finds the user back from the token', async () => {
		const user = await newUser();
		const { token, session } = await createSession(db, user.id);

		const rows = await sessionRows(user.id);
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(createHash('sha256').update(token).digest('hex'));
		expect(rows[0].id).not.toBe(token);

		const result = await validateSessionToken(db, token);
		expect(result).toMatchObject({
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			session: { id: session.id, userId: user.id },
			renewed: false
		});
	});

	it('knows no unknown token', async () => {
		expect(await validateSessionToken(db, 'not-a-token')).toBeNull();
	});

	it('drops an expired session', async () => {
		const user = await newUser();
		const { token } = await createSession(
			db,
			user.id,
			new Date(Date.now() - SESSION_LIFETIME_MS - 1000)
		);

		expect(await validateSessionToken(db, token)).toBeNull();
		expect(await sessionRows(user.id)).toHaveLength(0);
	});

	it('extends a session used in its last 15 days', async () => {
		const user = await newUser();
		const now = new Date();
		const { token } = await createSession(db, user.id, new Date(now.getTime() - 20 * DAY));

		const result = await validateSessionToken(db, token, now);
		expect(result?.renewed).toBe(true);
		const expected = now.getTime() + SESSION_LIFETIME_MS;
		expect(Math.abs(result!.session.expiresAt.getTime() - expected)).toBeLessThan(1000);
		const [row] = await sessionRows(user.id);
		expect(Math.abs((row.expires_at as Date).getTime() - expected)).toBeLessThan(1000);
	});

	it('ends one session or all of a user', async () => {
		const user = await newUser();
		const first = await createSession(db, user.id);
		const second = await createSession(db, user.id);
		const third = await createSession(db, user.id);

		await invalidateSession(db, first.session.id);
		expect(await validateSessionToken(db, first.token)).toBeNull();
		expect(await validateSessionToken(db, second.token)).not.toBeNull();

		await invalidateUserSessions(db, user.id);
		expect(await validateSessionToken(db, second.token)).toBeNull();
		expect(await validateSessionToken(db, third.token)).toBeNull();
	});

	it('ends with the account: a session of a removed account is worthless', async () => {
		const user = await newUser();
		const { token } = await createSession(db, user.id);
		await (await root()).query('DELETE FROM UserAccounts WHERE PrincipalID = ?', [user.id]);

		expect(await validateSessionToken(db, token)).toBeNull();
	});

	it('clears expired sessions when it creates one', async () => {
		const stale = await newUser();
		await createSession(db, stale.id, new Date(Date.now() - SESSION_LIFETIME_MS - DAY));
		expect(await sessionRows(stale.id)).toHaveLength(1);

		await createSession(db, (await newUser()).id);
		expect(await sessionRows(stale.id)).toHaveLength(0);
	});
});

import { createHash, randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { Queryable } from './db.js';

/**
 * Sessions live in the web_sessions table. The cookie holds a random token; the table holds
 * only its SHA-256, so a leaked table gives no usable cookie.
 */

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_LIFETIME_MS = 30 * DAY;
/** A session used in its last 15 days is extended, so an active user stays logged in. */
const RENEW_WITHIN_MS = 15 * DAY;

export interface SessionUser {
	id: string;
	firstName: string;
	lastName: string;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

interface SessionRow extends RowDataPacket {
	user_id: string;
	expires_at: Date;
	FirstName: string;
	LastName: string;
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export function sessionIdFromToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
	db: Queryable,
	userId: string,
	now = new Date()
): Promise<{ token: string; session: Session }> {
	const token = generateSessionToken();
	const session: Session = {
		id: sessionIdFromToken(token),
		userId,
		expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS)
	};
	await db.execute('DELETE FROM web_sessions WHERE expires_at <= :now', { now });
	await db.execute(
		'INSERT INTO web_sessions (id, user_id, created_at, expires_at) VALUES (:id, :userId, :now, :expiresAt)',
		{ id: session.id, userId, now, expiresAt: session.expiresAt }
	);
	return { token, session };
}

/**
 * The session and account behind a cookie token, or null when the token is unknown, the
 * session has expired or the account is gone. `renewed` tells the caller to resend the cookie.
 */
export async function validateSessionToken(
	db: Queryable,
	token: string,
	now = new Date()
): Promise<{ session: Session; user: SessionUser; renewed: boolean } | null> {
	const id = sessionIdFromToken(token);
	const [rows] = await db.execute<SessionRow[]>(
		`SELECT s.user_id, s.expires_at, a.FirstName, a.LastName
		 FROM web_sessions s
		 JOIN UserAccounts a ON a.PrincipalID = s.user_id
		 WHERE s.id = :id`,
		{ id }
	);
	const row = rows[0];
	if (!row) return null;

	const session: Session = { id, userId: row.user_id, expiresAt: row.expires_at };
	if (session.expiresAt.getTime() <= now.getTime()) {
		await invalidateSession(db, id);
		return null;
	}

	let renewed = false;
	if (session.expiresAt.getTime() - now.getTime() < RENEW_WITHIN_MS) {
		session.expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
		await db.execute('UPDATE web_sessions SET expires_at = :expiresAt WHERE id = :id', {
			expiresAt: session.expiresAt,
			id
		});
		renewed = true;
	}

	return {
		session,
		user: { id: session.userId, firstName: row.FirstName, lastName: row.LastName },
		renewed
	};
}

export async function invalidateSession(db: Queryable, sessionId: string): Promise<void> {
	await db.execute('DELETE FROM web_sessions WHERE id = :sessionId', { sessionId });
}

export async function invalidateUserSessions(db: Queryable, userId: string): Promise<void> {
	await db.execute('DELETE FROM web_sessions WHERE user_id = :userId', { userId });
}

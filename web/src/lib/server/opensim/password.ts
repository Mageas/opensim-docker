import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * OpenSim's password scheme (AuthenticationServiceBase.SetPassword):
 * hash = md5(md5(password) + ":" + salt), lowercase hex. Viewers send md5(password),
 * so the simulator can only check passwords stored this way: a stronger hash would lock
 * every user out of the grid.
 */

export interface PasswordHash {
	hash: string;
	salt: string;
}

function md5(text: string): string {
	return createHash('md5').update(text, 'utf8').digest('hex');
}

function digest(password: string, salt: string): string {
	return md5(`${md5(password)}:${salt}`);
}

export function hashPassword(password: string): PasswordHash {
	// 32 hex characters, the size of OpenSim's own salt (an md5 of a random UUID).
	const salt = randomBytes(16).toString('hex');
	return { hash: digest(password, salt), salt };
}

export function verifyPassword(password: string, stored: PasswordHash): boolean {
	const actual = Buffer.from(digest(password, stored.salt), 'utf8');
	const expected = Buffer.from(stored.hash, 'utf8');
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Checked when the name matches no account, so both paths take the same time. */
export const DECOY_PASSWORD_HASH: PasswordHash = hashPassword(randomBytes(32).toString('hex'));

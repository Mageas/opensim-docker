import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateSessionToken, sessionIdFromToken } from './sessions.js';

describe('session tokens', () => {
	it('are 256 random bits, URL-safe', () => {
		const tokens = new Set(Array.from({ length: 100 }, generateSessionToken));
		expect(tokens.size).toBe(100);
		for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	it('are stored as their SHA-256, never as themselves', () => {
		const token = generateSessionToken();
		const id = sessionIdFromToken(token);
		expect(id).toBe(createHash('sha256').update(token).digest('hex'));
		expect(id).not.toContain(token);
	});
});

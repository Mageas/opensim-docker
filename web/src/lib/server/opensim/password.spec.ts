import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

const md5 = (text: string) => createHash('md5').update(text, 'utf8').digest('hex');

describe('OpenSim password hashes', () => {
	it('verifies hashes that OpenSim 0.9.3.0 wrote', () => {
		// From the auth table of a test simulator: `create user Con Sole consolepw ...`.
		expect(
			verifyPassword('consolepw', {
				hash: '2364cec11283a6b07c317ba0c32da992',
				salt: 'c6f52efccfd4bf1422941873bd38e56b'
			})
		).toBe(true);
		// The estate owner that the simulator created at its first start, password "ownerpw".
		expect(
			verifyPassword('ownerpw', {
				hash: '087e6eb1a01cfc15f8c9bca37509a5be',
				salt: '21272882e417f1e505a70e6a86642749'
			})
		).toBe(true);
	});

	it('hashes as the simulator checks: md5(md5(password) + ":" + salt)', () => {
		const { hash, salt } = hashPassword('correct horse battery staple');
		expect(salt).toMatch(/^[0-9a-f]{32}$/);
		expect(hash).toBe(md5(`${md5('correct horse battery staple')}:${salt}`));
	});

	it('rejects a wrong password', () => {
		const stored = hashPassword('correct horse battery staple');
		expect(verifyPassword('correct horse battery stapler', stored)).toBe(false);
		expect(verifyPassword('', stored)).toBe(false);
	});

	it('hashes non-ASCII passwords as UTF-8, as viewers do', () => {
		const stored = hashPassword('mot de passe très sûr 🔑');
		expect(verifyPassword('mot de passe très sûr 🔑', stored)).toBe(true);
		expect(stored.hash).toBe(md5(`${md5('mot de passe très sûr 🔑')}:${stored.salt}`));
	});

	it('draws a new salt each time', () => {
		const first = hashPassword('same password here');
		const second = hashPassword('same password here');
		expect(first.salt).not.toBe(second.salt);
		expect(first.hash).not.toBe(second.hash);
	});

	it('rejects a stored hash of another length without throwing', () => {
		expect(verifyPassword('anything', { hash: 'short', salt: 'x' })).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';
import { isTheme, samePath } from './theme.js';

describe('isTheme', () => {
	it('knows light and dark only', () => {
		expect(isTheme('light')).toBe(true);
		expect(isTheme('dark')).toBe(true);
		expect(isTheme('Dark')).toBe(false);
		expect(isTheme('')).toBe(false);
		expect(isTheme(null)).toBe(false);
	});
});

describe('samePath', () => {
	const base = new URL('https://account.example.org/theme');

	it('keeps a path of this site, without its query', () => {
		expect(samePath('/account', base)).toBe('/account');
		expect(samePath('/account?done=created', base)).toBe('/account');
		expect(samePath('https://account.example.org/login', base)).toBe('/login');
	});

	it.each([
		'https://attacker.example/',
		'//attacker.example/path',
		'/\\attacker.example',
		'javascript:alert(1)',
		'http://account.example.org/login'
	])('sends %j home', (value) => {
		expect(samePath(value, base)).toBe('/');
	});

	it('sends a missing value home', () => {
		expect(samePath(null, base)).toBe('/');
		expect(samePath(new Blob(['/account']), base)).toBe('/');
	});
});

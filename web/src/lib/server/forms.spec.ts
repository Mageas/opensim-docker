import { describe, expect, it } from 'vitest';
import {
	changePasswordForm,
	deleteAccountForm,
	loginForm,
	parseForm,
	passwordContainsName,
	signupForm
} from './forms.js';

const formData = (fields: Record<string, string | Blob>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.append(key, value);
	return data;
};

const STRONG = 'purple monkey dishwasher';

describe('login form', () => {
	it('splits the avatar name and keeps the password as typed', () => {
		const result = parseForm(
			loginForm,
			formData({ avatarName: '  Ada   Lovelace ', password: ' pw ' })
		);
		expect(result).toEqual({
			ok: true,
			data: { avatarName: { firstName: 'Ada', lastName: 'Lovelace' }, password: ' pw ' }
		});
	});

	it('accepts names that predate the rules for new avatars', () => {
		const result = parseForm(loginForm, formData({ avatarName: 'Jean-Luc Léger', password: 'x' }));
		expect(result.ok).toBe(true);
	});

	it.each([
		['', 'name_required'],
		['   ', 'name_required'],
		['Ada', 'name_two_words'],
		['Ada King Lovelace', 'name_two_words'],
		['Ada Love​lace', 'name_characters'],
		['Ada 😀', 'name_characters'],
		['Ada\tLovelace', 'name_characters'],
		[`${'A'.repeat(70)} ${'B'.repeat(70)}`, 'name_length']
	])('refuses the name %j with %s', (avatarName, code) => {
		expect(parseForm(loginForm, formData({ avatarName, password: 'x' }))).toEqual({
			ok: false,
			errors: { avatarName: code }
		});
	});

	it('reports missing fields and file uploads as missing values', () => {
		const result = parseForm(loginForm, formData({ avatarName: new Blob(['Ada Lovelace']) }));
		expect(result).toEqual({
			ok: false,
			errors: { avatarName: 'name_required', password: 'password_required' }
		});
	});

	it('refuses a password longer than 128 characters', () => {
		const result = parseForm(
			loginForm,
			formData({ avatarName: 'Ada Lovelace', password: 'x'.repeat(129) })
		);
		expect(result).toEqual({ ok: false, errors: { password: 'password_too_long' } });
	});
});

describe('signup form', () => {
	const valid = { avatarName: 'Ada Lovelace', password: STRONG, passwordConfirm: STRONG };

	it('accepts a valid avatar', () => {
		expect(parseForm(signupForm, formData(valid))).toEqual({
			ok: true,
			data: {
				avatarName: { firstName: 'Ada', lastName: 'Lovelace' },
				password: STRONG,
				passwordConfirm: STRONG
			}
		});
	});

	it.each([
		['A Lovelace', 'name_length'],
		[`Ada ${'L'.repeat(32)}`, 'name_length'],
		['Jean-Luc Picard', 'name_characters'],
		['Léa Martin', 'name_characters'],
		['1Ada Lovelace', 'name_characters'],
		['Ada Love_lace', 'name_characters'],
		['<script> alert', 'name_characters']
	])('refuses the new name %j with %s', (avatarName, code) => {
		expect(parseForm(signupForm, formData({ ...valid, avatarName }))).toEqual({
			ok: false,
			errors: { avatarName: code }
		});
	});

	it('accepts names of 2 and 31 characters, with digits after the first letter', () => {
		const avatarName = `Al ${'B'.repeat(30)}7`;
		expect(parseForm(signupForm, formData({ ...valid, avatarName })).ok).toBe(true);
	});

	it('needs 15 characters, counted as viewers count them', () => {
		const fourteen = 'a'.repeat(13) + '🔑';
		const fifteen = 'a'.repeat(14) + '🔑';
		expect(
			parseForm(signupForm, formData({ ...valid, password: fourteen, passwordConfirm: fourteen }))
		).toEqual({
			ok: false,
			errors: { password: 'password_too_short' }
		});
		expect(
			parseForm(signupForm, formData({ ...valid, password: fifteen, passwordConfirm: fifteen })).ok
		).toBe(true);
	});

	it('refuses more than 128 characters', () => {
		const long = 'a'.repeat(129);
		expect(
			parseForm(signupForm, formData({ ...valid, password: long, passwordConfirm: long }))
		).toEqual({
			ok: false,
			errors: { password: 'password_too_long' }
		});
	});

	it('refuses control characters', () => {
		const withNewline = 'purple monkey\ndishwasher';
		expect(
			parseForm(
				signupForm,
				formData({ ...valid, password: withNewline, passwordConfirm: withNewline })
			)
		).toEqual({ ok: false, errors: { password: 'password_characters' } });
	});

	it('refuses a password that holds the avatar name', () => {
		const password = 'my name is ada.lovelace!';
		expect(
			parseForm(signupForm, formData({ ...valid, password, passwordConfirm: password }))
		).toEqual({
			ok: false,
			errors: { password: 'password_contains_name' }
		});
	});

	it('refuses two different passwords', () => {
		expect(parseForm(signupForm, formData({ ...valid, passwordConfirm: `${STRONG}!` }))).toEqual({
			ok: false,
			errors: { passwordConfirm: 'password_mismatch' }
		});
	});
});

describe('change password form', () => {
	it('needs the current password and a confirmed new one', () => {
		expect(
			parseForm(
				changePasswordForm,
				formData({ currentPassword: 'old', password: STRONG, passwordConfirm: STRONG })
			)
		).toEqual({
			ok: true,
			data: { currentPassword: 'old', password: STRONG, passwordConfirm: STRONG }
		});
		expect(
			parseForm(changePasswordForm, formData({ password: 'short', passwordConfirm: 'short' }))
		).toEqual({
			ok: false,
			errors: { currentPassword: 'password_required', password: 'password_too_short' }
		});
		expect(
			parseForm(
				changePasswordForm,
				formData({ currentPassword: 'old', password: STRONG, passwordConfirm: 'other' })
			)
		).toEqual({ ok: false, errors: { passwordConfirm: 'password_mismatch' } });
	});
});

describe('delete account form', () => {
	it('needs the password', () => {
		expect(parseForm(deleteAccountForm, formData({}))).toEqual({
			ok: false,
			errors: { password: 'password_required' }
		});
		expect(parseForm(deleteAccountForm, formData({ password: 'x' }))).toEqual({
			ok: true,
			data: { password: 'x' }
		});
	});
});

describe('passwordContainsName', () => {
	const name = { firstName: 'Ada', lastName: 'Lovelace' };

	it.each(['adalovelace2026', 'ADA LOVELACE rocks', 'ada.lovelace', 'ada_love-lace'])(
		'finds %j',
		(password) => {
			expect(passwordContainsName(password, name)).toBe(true);
		}
	);

	it('ignores one name alone', () => {
		expect(passwordContainsName('lovelace and babbage engines', name)).toBe(false);
	});
});

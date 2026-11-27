import { z } from 'zod';
import {
	NAME_MAX_LENGTH,
	NAME_MIN_LENGTH,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	type ErrorCode
} from '#lib/account-rules.js';

/** Zod messages are error codes; the pages turn them into text. */
const code = (value: ErrorCode) => value;

/** Characters as viewers count them, so an emoji is one, not two. */
const length = (value: string) => [...value].length;

export interface AvatarName {
	firstName: string;
	lastName: string;
}

/**
 * "First Last", as viewers ask for it. A first or last name never holds a space: viewers
 * split the name on it. Any other check is left to the account lookup, since accounts made
 * from the console may predate the rules for new names.
 */
const avatarName = z
	.string({ error: code('name_required') })
	.trim()
	.min(1, code('name_required'))
	.refine((value) => length(value) <= 2 * 64 + 1, code('name_length'))
	// UserAccounts stores names in Latin-1: MariaDB would turn any other character into "?".
	.regex(/^[\x20-\x7E\xA0-\xFF]+$/, code('name_characters'))
	.transform((value, context): AvatarName => {
		const parts = value.split(/ +/);
		if (parts.length !== 2) {
			context.addIssue({ code: 'custom', message: code('name_two_words') });
			return z.NEVER;
		}
		return { firstName: parts[0], lastName: parts[1] };
	});

/** A name for a new avatar: ASCII letters and digits, as Second Life names were. */
const newAvatarName = avatarName.superRefine((name, context) => {
	for (const part of [name.firstName, name.lastName]) {
		if (length(part) < NAME_MIN_LENGTH || length(part) > NAME_MAX_LENGTH) {
			context.addIssue({ code: 'custom', message: code('name_length') });
			return;
		}
		if (!/^[A-Za-z][A-Za-z0-9]*$/.test(part)) {
			context.addIssue({ code: 'custom', message: code('name_characters') });
			return;
		}
	}
});

/** A password typed to prove who you are: never trimmed, checked only for size. */
const currentPassword = z
	.string({ error: code('password_required') })
	.min(1, code('password_required'))
	.refine((value) => length(value) <= PASSWORD_MAX_LENGTH, code('password_too_long'));

const newPassword = z
	.string({ error: code('password_required') })
	.min(1, code('password_required'))
	.refine((value) => length(value) >= PASSWORD_MIN_LENGTH, code('password_too_short'))
	.refine((value) => length(value) <= PASSWORD_MAX_LENGTH, code('password_too_long'))
	// Nobody can type these in a viewer's password field.
	.refine((value) => !/\p{Cc}/u.test(value), code('password_characters'));

const passwordConfirm = z.string({ error: code('password_mismatch') });

/** The avatar's name is the first word an attacker tries (NIST context-specific words). */
export function passwordContainsName(password: string, name: AvatarName): boolean {
	const flat = password.toLowerCase().replace(/[\s._-]/g, '');
	return flat.includes(`${name.firstName}${name.lastName}`.toLowerCase());
}

export const loginForm = z.object({ avatarName, password: currentPassword });

export const signupForm = z
	.object({ avatarName: newAvatarName, password: newPassword, passwordConfirm })
	.superRefine((form, context) => {
		if (passwordContainsName(form.password, form.avatarName)) {
			context.addIssue({
				code: 'custom',
				path: ['password'],
				message: code('password_contains_name')
			});
		}
		if (form.password !== form.passwordConfirm) {
			context.addIssue({
				code: 'custom',
				path: ['passwordConfirm'],
				message: code('password_mismatch')
			});
		}
	});

export const changePasswordForm = z
	.object({ currentPassword, password: newPassword, passwordConfirm })
	.superRefine((form, context) => {
		if (form.password !== form.passwordConfirm) {
			context.addIssue({
				code: 'custom',
				path: ['passwordConfirm'],
				message: code('password_mismatch')
			});
		}
	});

export const deleteAccountForm = z.object({ password: currentPassword });

export type FieldErrors<T> = Partial<Record<keyof T & string, ErrorCode>>;

/** One field's error, typed like parseForm's errors so that pages read both the same way. */
export function fieldError<T>(
	_schema: z.ZodType<T>,
	field: keyof T & string,
	error: ErrorCode
): FieldErrors<T> {
	return { [field]: error } as FieldErrors<T>;
}

export type ParsedForm<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors<T> };

/** Reads a submitted form through a schema, keeping the first error code of each field. */
export function parseForm<T extends Record<string, unknown>>(
	schema: z.ZodType<T>,
	formData: FormData
): ParsedForm<T> {
	const fields: Record<string, FormDataEntryValue> = {};
	for (const [key, value] of formData) fields[key] = value;

	const result = schema.safeParse(fields);
	if (result.success) return { ok: true, data: result.data };

	const errors: Record<string, ErrorCode> = {};
	for (const issue of result.error.issues) {
		const field = String(issue.path[0] ?? '');
		errors[field] ??= issue.message as ErrorCode;
	}
	return { ok: false, errors: errors as FieldErrors<T> };
}

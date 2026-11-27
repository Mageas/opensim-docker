/** Rules shared by the forms (input attributes) and the server (validation). */

/** Second Life's limit, which viewers expect. */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 31;

/**
 * NIST SP 800-63B-4: at least 15 characters for a password used alone, no composition
 * rules. Firestorm accepts up to 255 characters on OpenSim grids.
 */
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export const ERROR_CODES = [
	'name_required',
	'name_two_words',
	'name_length',
	'name_characters',
	'name_taken',
	'password_required',
	'password_too_short',
	'password_too_long',
	'password_characters',
	'password_contains_name',
	'password_mismatch',
	'password_wrong',
	'credentials_invalid',
	'account_disabled',
	'account_online',
	'account_estate_owner',
	'account_privileged',
	'rate_limited'
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

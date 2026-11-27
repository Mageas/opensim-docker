import { m } from '#lib/paraglide/messages.js';
import {
	NAME_MAX_LENGTH,
	NAME_MIN_LENGTH,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	type ErrorCode
} from '#lib/account-rules.js';

const TEXT: Record<ErrorCode, () => string> = {
	name_required: () => m.error_name_required(),
	name_two_words: () => m.error_name_two_words(),
	name_length: () => m.error_name_length({ min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH }),
	name_characters: () => m.error_name_characters(),
	name_taken: () => m.error_name_taken(),
	password_required: () => m.error_password_required(),
	password_too_short: () => m.error_password_too_short({ min: PASSWORD_MIN_LENGTH }),
	password_too_long: () => m.error_password_too_long({ max: PASSWORD_MAX_LENGTH }),
	password_characters: () => m.error_password_characters(),
	password_contains_name: () => m.error_password_contains_name(),
	password_mismatch: () => m.error_password_mismatch(),
	password_wrong: () => m.error_password_wrong(),
	credentials_invalid: () => m.error_credentials_invalid(),
	account_disabled: () => m.error_account_disabled(),
	account_online: () => m.error_account_online(),
	account_estate_owner: () => m.error_account_estate_owner(),
	account_privileged: () => m.error_account_privileged(),
	rate_limited: () => m.error_rate_limited()
};

export function errorText(code: ErrorCode): string {
	return TEXT[code]();
}

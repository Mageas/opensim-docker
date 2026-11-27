import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from './account-rules.js';
import { errorText } from './error-text.js';

describe('errorText', () => {
	it.each(ERROR_CODES)('has a sentence for %s', (code) => {
		const text = errorText(code);
		expect(text).toMatch(/^[A-Z].*\.$/);
		expect(text).not.toContain('{');
	});
});

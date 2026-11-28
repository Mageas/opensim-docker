import { describe, expect, it } from 'vitest';
import { amountRange, checkAmount, formatEuros, priceInCents } from './pricing.js';

const pricing = { perEuro: 250, maxCents: 50_00 };

describe('priceInCents', () => {
	it('charges the exact price when the amount divides evenly', () => {
		expect(priceInCents(1000, pricing)).toBe(400);
	});

	it('rounds a part of a cent up, so no unit sells below its price', () => {
		expect(priceInCents(1001, pricing)).toBe(401);
	});
});

describe('checkAmount', () => {
	it('accepts amounts from Stripe’s 0.50 € minimum to the maximum', () => {
		for (const perEuro of [1, 3, 7, 250, 1000]) {
			const range = amountRange({ perEuro, maxCents: 50_00 });
			expect(checkAmount(range.min, { perEuro, maxCents: 50_00 })).toBeNull();
			expect(checkAmount(range.min - 1, { perEuro, maxCents: 50_00 })).not.toBeNull();
		}
		const { min, max } = amountRange(pricing);
		expect([min, max]).toEqual([123, 12_500]);
		expect(checkAmount(min, pricing)).toBeNull();
		expect(checkAmount(max, pricing)).toBeNull();
		expect(checkAmount(min - 1, pricing)).toBe('amount_too_small');
		expect(checkAmount(max + 1, pricing)).toBe('amount_too_large');
	});

	it('refuses amounts that are not whole and positive', () => {
		for (const amount of [0, -250, 12.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2]) {
			expect(checkAmount(amount, pricing)).toBe('amount_invalid');
		}
	});
});

describe('formatEuros', () => {
	it("writes the price in the viewer's language", () => {
		expect(formatEuros(250, 'en')).toBe('€2.50');
		expect(formatEuros(250, 'fr')).toMatch(/^2,50\s€$/);
	});

	it('falls back to English for a language tag it cannot read', () => {
		expect(formatEuros(250, 'not a tag')).toBe('€2.50');
		expect(formatEuros(250, '')).toBe('€2.50');
	});
});

/** What currency costs, in euro cents. Both values come from the grid's administrator. */
export interface Pricing {
	/** Currency units that one euro buys. */
	perEuro: number;
	/** The most that one purchase may charge, in cents. */
	maxCents: number;
}

/** Stripe's smallest charge in euros. */
export const MIN_CENTS = 50;

export type AmountProblem = 'amount_invalid' | 'amount_too_small' | 'amount_too_large';

/** Rounded up, so the grid never sells a unit below its price. */
export function priceInCents(amount: number, pricing: Pricing): number {
	return Math.ceil((amount * 100) / pricing.perEuro);
}

/** The smallest and largest amounts that checkAmount accepts. */
export function amountRange(pricing: Pricing): { min: number; max: number } {
	return {
		// The first amount whose price, rounded up, reaches MIN_CENTS.
		min: Math.floor(((MIN_CENTS - 1) * pricing.perEuro) / 100) + 1,
		max: Math.floor((pricing.maxCents * pricing.perEuro) / 100)
	};
}

export function checkAmount(amount: number, pricing: Pricing): AmountProblem | null {
	if (!Number.isSafeInteger(amount) || amount < 1) return 'amount_invalid';
	const price = priceInCents(amount, pricing);
	if (price < MIN_CENTS) return 'amount_too_small';
	if (price > pricing.maxCents) return 'amount_too_large';
	return null;
}

/** "€2.50" in the viewer's language, falling back to English for a tag Intl does not know. */
export function formatEuros(cents: number, language: string): string {
	let locale = 'en';
	try {
		locale = Intl.getCanonicalLocales(language)[0] ?? 'en';
	} catch {
		// Viewers send their UI language, such as "en" or "fr"; anything else gets English.
	}
	return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

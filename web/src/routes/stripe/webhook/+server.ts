import { error } from '@sveltejs/kit';
import { handleStripeEvent, readStripeEvent } from '#lib/server/money/purchases.js';
import { runtime } from '#lib/server/runtime.js';
import type { RequestHandler } from './$types';

/**
 * Stripe's webhook. An error answer makes Stripe send the event again later, which is
 * safe: a purchase is credited once whatever the number of deliveries.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { payments, db } = runtime();
	if (!payments) error(404);

	// The signature covers the exact bytes, so the body is read as text, not parsed.
	const body = await request.text();
	let event;
	try {
		event = readStripeEvent(payments, body, request.headers.get('stripe-signature') ?? '');
	} catch {
		return new Response('Invalid signature\n', { status: 400 });
	}
	await handleStripeEvent(payments, db, event);
	return new Response(null, { status: 204 });
};

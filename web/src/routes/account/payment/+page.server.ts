import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/guards.js';
import {
	finishCardSetup,
	getSavedCard,
	removeCard,
	startCardSetup
} from '#lib/server/money/cards.js';
import { purchaseWentThrough } from '#lib/server/money/purchases.js';
import { runtime } from '#lib/server/runtime.js';
import type { Actions, PageServerLoad } from './$types.js';

const NOTICES = ['saved', 'removed', 'purchase', 'purchase_failed', 'failed'] as const;
type Notice = (typeof NOTICES)[number];

function requirePayments() {
	const { payments } = runtime();
	if (!payments) error(404);
	return payments;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const { stripe } = requirePayments();
	const { db } = runtime();

	// Stripe Checkout comes back here once the card is saved.
	const sessionId = url.searchParams.get('session_id');
	if (sessionId) {
		const saved = await finishCardSetup(stripe, db, user.id, sessionId);
		redirect(303, `/account/payment?done=${saved ? 'saved' : 'failed'}`);
	}

	// The bank's page comes back here after a purchase that it had to check.
	const paymentIntentId = url.searchParams.get('payment_intent');
	if (paymentIntentId) {
		const paid = await purchaseWentThrough(stripe, user.id, paymentIntentId);
		redirect(303, `/account/payment?done=${paid ? 'purchase' : 'purchase_failed'}`);
	}

	const done = url.searchParams.get('done');
	const notice: Notice | null = NOTICES.find((value) => value === done) ?? null;
	const card = await getSavedCard(db, user.id);
	return { card: card && { brand: card.brand, last4: card.last4 }, notice };
};

export const actions: Actions = {
	save: async ({ locals, url }) => {
		const user = requireUser(locals);
		const { stripe } = requirePayments();
		redirect(303, await startCardSetup(stripe, runtime().db, user, url.origin), {
			external: ['https://checkout.stripe.com']
		});
	},
	remove: async ({ locals }) => {
		const user = requireUser(locals);
		const { stripe } = requirePayments();
		await removeCard(stripe, runtime().db, user.id);
		redirect(303, '/account/payment?done=removed');
	}
};

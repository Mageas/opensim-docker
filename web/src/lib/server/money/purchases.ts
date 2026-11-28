import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import Stripe from 'stripe';
import type { Queryable } from '../db.js';
import { getSavedCard } from './cards.js';
import { sendMoney, type MoneyServer } from './money-server.js';
import { priceInCents, type Pricing } from './pricing.js';

/**
 * A purchase is a Stripe PaymentIntent on the avatar's saved card, recorded in
 * web_purchases under the PaymentIntent's id. The viewer's request and Stripe's webhook
 * both try to credit it; the status column lets only one of them do it.
 *
 *   pending -> crediting -> credited
 *                        -> credit_failed (paid, not credited: an administrator credits it)
 *   pending -> failed
 */

export interface Payments {
	stripe: Stripe;
	webhookSecret: string;
	pricing: Pricing;
	moneyServer: MoneyServer;
}

export type PurchaseResult =
	| { ok: true }
	| { ok: false; reason: 'no_card' | 'processing' | 'credit_failed' }
	/** `message` is the bank's reason, in English, when Stripe gives one. */
	| { ok: false; reason: 'declined'; message?: string }
	| { ok: false; reason: 'action_required'; url: string };

type Status = 'pending' | 'crediting' | 'credited' | 'credit_failed' | 'failed';

interface PurchaseRow extends RowDataPacket {
	user_id: string;
	amount: number;
}

/** Records a PaymentIntent that this portal created; a second call for it changes nothing. */
async function recordPurchase(db: Queryable, intent: Stripe.PaymentIntent, now: Date) {
	await db.execute(
		`INSERT IGNORE INTO web_purchases (id, user_id, amount, price_cents, status, created_at, updated_at)
		 VALUES (:id, :userId, :amount, :price, 'pending', :now, :now)`,
		{
			id: intent.id,
			userId: intent.metadata.avatar_id,
			amount: Number(intent.metadata.amount),
			price: intent.amount,
			now
		}
	);
}

async function setStatus(db: Queryable, id: string, status: Status, now: Date) {
	await db.execute('UPDATE web_purchases SET status = :status, updated_at = :now WHERE id = :id', {
		status,
		now,
		id
	});
}

/** Credits a paid purchase, once: a call that finds it credited, or being credited, returns. */
export async function creditPurchase(
	payments: Payments,
	db: Queryable,
	id: string,
	now = new Date()
): Promise<void> {
	const [claim] = await db.execute<ResultSetHeader>(
		"UPDATE web_purchases SET status = 'crediting', updated_at = :now WHERE id = :id AND status = 'pending'",
		{ id, now }
	);
	if (claim.affectedRows !== 1) return;

	const [rows] = await db.execute<PurchaseRow[]>(
		'SELECT user_id, amount FROM web_purchases WHERE id = :id',
		{ id }
	);
	const purchase = rows[0];
	try {
		await sendMoney(payments.moneyServer, {
			receiverId: purchase.user_id,
			amount: purchase.amount,
			description: `Purchase ${id}`
		});
	} catch (error) {
		// Whether the Money Server applied it is unknown: crediting again could pay twice.
		await setStatus(db, id, 'credit_failed', now);
		throw error;
	}
	await setStatus(db, id, 'credited', now);
}

/** Charges the avatar's saved card for `amount` and credits it when the bank says yes. */
export async function buyCurrency(
	payments: Payments,
	db: Queryable,
	input: { userId: string; amount: number; origin: string },
	now = new Date()
): Promise<PurchaseResult> {
	const card = await getSavedCard(db, input.userId);
	if (!card) return { ok: false, reason: 'no_card' };

	let intent: Stripe.PaymentIntent;
	try {
		intent = await payments.stripe.paymentIntents.create(
			{
				amount: priceInCents(input.amount, payments.pricing),
				currency: 'eur',
				customer: card.customerId,
				payment_method: card.paymentMethodId,
				allowed_payment_method_types: ['card'],
				confirm: true,
				// With a return URL, a bank's check comes back as a page to open, which the
				// viewer can show as a link. Stripe adds ?payment_intent= when it sends the buyer back.
				return_url: `${input.origin}/account/payment`,
				description: `${input.amount} currency units`,
				metadata: { avatar_id: input.userId, amount: String(input.amount) }
			},
			{ idempotencyKey: randomUUID() }
		);
	} catch (error) {
		if (error instanceof Stripe.errors.StripeCardError) {
			// error.message starts with Stripe's request id; raw.message is the bank's reason alone.
			const { message } = error.raw as { message?: string };
			return { ok: false, reason: 'declined', message };
		}
		throw error;
	}

	await recordPurchase(db, intent, now);
	switch (intent.status) {
		case 'succeeded':
			try {
				await creditPurchase(payments, db, intent.id, now);
			} catch (error) {
				console.error(`[purchases] ${intent.id} is paid but not credited`, error);
				return { ok: false, reason: 'credit_failed' };
			}
			return { ok: true };
		case 'requires_action': {
			const url = intent.next_action?.redirect_to_url?.url;
			if (url) return { ok: false, reason: 'action_required', url };
			break;
		}
		case 'processing':
			return { ok: false, reason: 'processing' };
	}
	await setStatus(db, intent.id, 'failed', now);
	return { ok: false, reason: 'declined' };
}

/**
 * Whether the bank's check let this avatar's purchase through. Stripe sends the buyer back
 * from the bank's page whatever the outcome, with the PaymentIntent's id in the address.
 */
export async function purchaseWentThrough(
	stripe: Stripe,
	userId: string,
	paymentIntentId: string
): Promise<boolean> {
	let intent: Stripe.PaymentIntent;
	try {
		intent = await stripe.paymentIntents.retrieve(paymentIntentId);
	} catch (error) {
		if (error instanceof Stripe.errors.StripeInvalidRequestError) return false;
		throw error;
	}
	if (intent.metadata.avatar_id !== userId) return false;
	return intent.status === 'succeeded' || intent.status === 'processing';
}

/** Reads a webhook request: throws when Stripe did not sign it with the endpoint's secret. */
export function readStripeEvent(payments: Payments, body: string, signature: string): Stripe.Event {
	return payments.stripe.webhooks.constructEvent(body, signature, payments.webhookSecret);
}

/**
 * Settles the purchases that the viewer could not: a bank's check passed in the browser,
 * or a payment that was still processing. Events for anything else are ignored.
 */
export async function handleStripeEvent(
	payments: Payments,
	db: Queryable,
	event: Stripe.Event,
	now = new Date()
): Promise<void> {
	if (event.type !== 'payment_intent.succeeded' && event.type !== 'payment_intent.payment_failed')
		return;
	const intent = event.data.object;
	if (!intent.metadata.avatar_id || !intent.metadata.amount) return;

	if (event.type === 'payment_intent.succeeded') {
		await recordPurchase(db, intent, now);
		await creditPurchase(payments, db, intent.id, now);
	} else {
		await db.execute(
			"UPDATE web_purchases SET status = 'failed', updated_at = :now WHERE id = :id AND status = 'pending'",
			{ id: intent.id, now }
		);
	}
}

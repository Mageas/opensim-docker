import type { RowDataPacket } from 'mysql2/promise';
import type Stripe from 'stripe';
import type { Queryable } from '../db.js';
import type { SessionUser } from '../sessions.js';

/**
 * Each avatar that saves a card gets a Stripe customer. The card itself stays at Stripe:
 * web_customers only keeps the ids, and the brand and last digits to show.
 */

export interface SavedCard {
	customerId: string;
	paymentMethodId: string;
	brand: string;
	last4: string;
}

interface CustomerRow extends RowDataPacket {
	customer_id: string;
	payment_method_id: string | null;
	card_brand: string | null;
	card_last4: string | null;
}

async function getCustomerRow(db: Queryable, userId: string): Promise<CustomerRow | undefined> {
	const [rows] = await db.execute<CustomerRow[]>(
		'SELECT customer_id, payment_method_id, card_brand, card_last4 FROM web_customers WHERE user_id = :userId',
		{ userId }
	);
	return rows[0];
}

export async function getCustomerId(db: Queryable, userId: string): Promise<string | null> {
	return (await getCustomerRow(db, userId))?.customer_id ?? null;
}

export async function getSavedCard(db: Queryable, userId: string): Promise<SavedCard | null> {
	const row = await getCustomerRow(db, userId);
	if (!row?.payment_method_id) return null;
	return {
		customerId: row.customer_id,
		paymentMethodId: row.payment_method_id,
		brand: row.card_brand ?? '',
		last4: row.card_last4 ?? ''
	};
}

async function ensureCustomer(stripe: Stripe, db: Queryable, user: SessionUser): Promise<string> {
	const existing = await getCustomerRow(db, user.id);
	if (existing) return existing.customer_id;

	// Two clicks at once get the same customer back from Stripe, instead of two.
	const customer = await stripe.customers.create(
		{ name: `${user.firstName} ${user.lastName}`, metadata: { avatar_id: user.id } },
		{ idempotencyKey: `customer-${user.id}` }
	);
	await db.execute(
		'INSERT IGNORE INTO web_customers (user_id, customer_id) VALUES (:userId, :customerId)',
		{ userId: user.id, customerId: customer.id }
	);
	return customer.id;
}

/** The URL of a Stripe Checkout page that saves a card, for the viewer's purchases. */
export async function startCardSetup(
	stripe: Stripe,
	db: Queryable,
	user: SessionUser,
	origin: string
): Promise<string> {
	const customer = await ensureCustomer(stripe, db, user);
	const session = await stripe.checkout.sessions.create({
		mode: 'setup',
		customer,
		allowed_payment_method_types: ['card'],
		success_url: `${origin}/account/payment?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/account/payment`
	});
	if (!session.url) throw new Error('Stripe returned a Checkout session without a URL');
	return session.url;
}

/**
 * Keeps the card that a finished Checkout session saved, in place of the previous one.
 * False when the session is not this avatar's, or not complete.
 */
export async function finishCardSetup(
	stripe: Stripe,
	db: Queryable,
	userId: string,
	sessionId: string
): Promise<boolean> {
	const row = await getCustomerRow(db, userId);
	if (!row) return false;

	const session = await stripe.checkout.sessions.retrieve(sessionId, {
		expand: ['setup_intent.payment_method']
	});
	if (session.customer !== row.customer_id || session.status !== 'complete') return false;
	const setupIntent = session.setup_intent as Stripe.SetupIntent | null;
	const method = setupIntent?.payment_method as Stripe.PaymentMethod | null | undefined;
	if (!method?.card) return false;

	if (row.payment_method_id && row.payment_method_id !== method.id) {
		await stripe.paymentMethods.detach(row.payment_method_id);
	}
	await db.execute(
		`UPDATE web_customers
		 SET payment_method_id = :methodId, card_brand = :brand, card_last4 = :last4
		 WHERE user_id = :userId`,
		{ methodId: method.id, brand: method.card.brand, last4: method.card.last4, userId }
	);
	return true;
}

export async function removeCard(stripe: Stripe, db: Queryable, userId: string): Promise<void> {
	const card = await getSavedCard(db, userId);
	if (!card) return;
	await stripe.paymentMethods.detach(card.paymentMethodId);
	await db.execute(
		`UPDATE web_customers
		 SET payment_method_id = NULL, card_brand = NULL, card_last4 = NULL
		 WHERE user_id = :userId`,
		{ userId }
	);
}

/** Deletes the avatar's Stripe customer, and with it the saved card, once the account is gone. */
export async function deleteCustomer(stripe: Stripe, customerId: string): Promise<void> {
	await stripe.customers.del(customerId);
}

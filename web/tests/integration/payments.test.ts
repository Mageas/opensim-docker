import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { RowDataPacket } from 'mysql2/promise';
import Stripe from 'stripe';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	answerHelperRequest,
	buyCurrencyForViewer,
	quoteCurrency,
	quoteLand,
	type HelperContext
} from '../../src/lib/server/money/helper.ts';
import {
	buyCurrency,
	handleStripeEvent,
	purchaseWentThrough,
	readStripeEvent,
	type Payments
} from '../../src/lib/server/money/purchases.ts';
import { createAccount } from '../../src/lib/server/opensim/accounts.ts';
import {
	methodCall,
	methodResponse,
	parseMethodCall,
	parseMethodResponse
} from '../../src/lib/server/xmlrpc.ts';
import { STRONG_PASSWORD, uniqueName, useDatabase } from './support.ts';

/**
 * Purchases against two fakes on localhost: a Stripe API that answers by saved card
 * (pm_ok, pm_3ds, pm_processing, pm_declined), as the sandbox's test cards do, and a
 * Money Server that records each SendMoney.
 */

const ORIGIN = 'https://account.example.org';

interface IntentRequest {
	params: URLSearchParams;
}

function listen(server: Server): Promise<number> {
	return new Promise((resolve) =>
		server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port))
	);
}

function readBody(request: import('node:http').IncomingMessage): Promise<string> {
	return new Promise((resolve) => {
		let body = '';
		request.on('data', (chunk: Buffer) => (body += chunk.toString()));
		request.on('end', () => resolve(body));
	});
}

function intentFrom(params: URLSearchParams, id: string, status: string) {
	const metadata: Record<string, string> = {};
	for (const [key, value] of params) {
		const match = /^metadata\[(.+)\]$/.exec(key);
		if (match) metadata[match[1]] = value;
	}
	return {
		id,
		object: 'payment_intent',
		amount: Number(params.get('amount')),
		currency: 'eur',
		status,
		metadata,
		next_action:
			status === 'requires_action'
				? {
						type: 'redirect_to_url',
						redirect_to_url: { url: `https://hooks.stripe.test/3ds/${id}` }
					}
				: null
	};
}

const intents: IntentRequest[] = [];
/** What the fake answers to a GET of each PaymentIntent it created. */
const created = new Map<string, ReturnType<typeof intentFrom>>();
const transfers: { receiverID: string; amount: number }[] = [];
let moneyServerAccepts = true;

const fakeStripe = createServer((request, response) => {
	void readBody(request).then((body) => {
		response.setHeader('content-type', 'application/json');
		const retrieved = /^\/v1\/payment_intents\/([^/?]+)/.exec(request.url ?? '');
		if (request.method === 'GET' && retrieved && created.has(retrieved[1])) {
			response.end(JSON.stringify(created.get(retrieved[1])));
			return;
		}
		if (request.method !== 'POST' || request.url !== '/v1/payment_intents') {
			response.statusCode = 404;
			response.end(
				JSON.stringify({ error: { type: 'invalid_request_error', message: 'Not faked' } })
			);
			return;
		}
		const params = new URLSearchParams(body);
		intents.push({ params });
		const id = `pi_${randomBytes(6).toString('hex')}`;
		const method = params.get('payment_method');
		if (method === 'pm_declined') {
			response.statusCode = 402;
			response.setHeader('request-id', 'req_fake');
			response.end(
				JSON.stringify({
					error: {
						type: 'card_error',
						code: 'card_declined',
						decline_code: 'insufficient_funds',
						message: 'Your card has insufficient funds.'
					}
				})
			);
			return;
		}
		const status =
			method === 'pm_3ds'
				? 'requires_action'
				: method === 'pm_processing'
					? 'processing'
					: 'succeeded';
		const intent = intentFrom(params, id, status);
		created.set(id, intent);
		response.end(JSON.stringify(intent));
	});
});

const fakeMoneyServer = createServer((request, response) => {
	void readBody(request).then((body) => {
		const call = parseMethodCall(body);
		if (moneyServerAccepts) {
			transfers.push({
				receiverID: call.params.receiverID as string,
				amount: call.params.amount as number
			});
		}
		response.setHeader('content-type', 'text/xml');
		response.end(
			methodResponse(
				moneyServerAccepts ? { success: true } : { success: false, message: 'refused' }
			)
		);
	});
});

describe('payments', () => {
	const { db, root } = useDatabase();
	let payments: Payments;
	let context: HelperContext;

	beforeAll(async () => {
		const [stripePort, moneyPort] = await Promise.all([
			listen(fakeStripe),
			listen(fakeMoneyServer)
		]);
		payments = {
			stripe: new Stripe('sk_test_fake', {
				host: '127.0.0.1',
				port: stripePort,
				protocol: 'http',
				maxNetworkRetries: 0,
				telemetry: false
			}),
			webhookSecret: 'whsec_test',
			pricing: { perEuro: 250, maxCents: 50_00 },
			moneyServer: { url: `http://127.0.0.1:${moneyPort}/`, scriptKey: 'test-key' }
		};
		context = { payments, db, origin: ORIGIN, gridName: 'Test Grid' };
	});

	afterAll(async () => {
		await Promise.all(
			[fakeStripe, fakeMoneyServer].map((server) => new Promise((resolve) => server.close(resolve)))
		);
	});

	beforeEach(() => {
		intents.length = 0;
		transfers.length = 0;
		moneyServerAccepts = true;
	});

	/** An avatar whose saved card answers as `paymentMethod` does in the fake. */
	async function buyer(paymentMethod?: string) {
		const user = await createAccount(db, { ...uniqueName(), password: STRONG_PASSWORD });
		if (paymentMethod) {
			await (
				await root()
			).query(
				"INSERT INTO web_customers (user_id, customer_id, payment_method_id, card_brand, card_last4) VALUES (?, ?, ?, 'visa', '4242')",
				[user.id, `cus_${user.id.slice(0, 8)}`, paymentMethod]
			);
		}
		return user;
	}

	async function purchases(userId: string) {
		const [rows] = await (
			await root()
		).query<RowDataPacket[]>(
			'SELECT id, amount, price_cents, status FROM web_purchases WHERE user_id = ?',
			[userId]
		);
		return rows;
	}

	function event(type: string, intent: Record<string, unknown>): Stripe.Event {
		return {
			id: `evt_${randomBytes(6).toString('hex')}`,
			type,
			data: { object: intent }
		} as unknown as Stripe.Event;
	}

	async function purchaseIntent(userId: string, amount: number) {
		const [row] = await purchases(userId);
		return {
			id: row.id as string,
			object: 'payment_intent',
			amount: priceFor(amount),
			status: 'succeeded',
			metadata: { avatar_id: userId, amount: String(amount) }
		};
	}

	const priceFor = (amount: number) => Math.ceil((amount * 100) / 250);

	describe('buyCurrency', () => {
		it('asks for a saved card first', async () => {
			const user = await buyer();
			const result = await buyCurrency(payments, db, {
				userId: user.id,
				amount: 1000,
				origin: ORIGIN
			});
			expect(result).toEqual({ ok: false, reason: 'no_card' });
			expect(intents).toHaveLength(0);
		});

		it('charges the saved card the price, then credits the avatar once', async () => {
			const user = await buyer('pm_ok');
			const result = await buyCurrency(payments, db, {
				userId: user.id,
				amount: 1000,
				origin: ORIGIN
			});

			expect(result).toEqual({ ok: true });
			const params = intents[0].params;
			expect(Object.fromEntries(params)).toMatchObject({
				amount: '400',
				currency: 'eur',
				customer: `cus_${user.id.slice(0, 8)}`,
				payment_method: 'pm_ok',
				confirm: 'true',
				return_url: `${ORIGIN}/account/payment`,
				'metadata[avatar_id]': user.id,
				'metadata[amount]': '1000'
			});
			expect(transfers).toEqual([{ receiverID: user.id, amount: 1000 }]);
			expect(await purchases(user.id)).toEqual([
				expect.objectContaining({ amount: 1000, price_cents: 400, status: 'credited' })
			]);
		});

		it('gives the bank’s page when it asks for a check, and credits nothing yet', async () => {
			const user = await buyer('pm_3ds');
			const result = await buyCurrency(payments, db, {
				userId: user.id,
				amount: 500,
				origin: ORIGIN
			});

			expect(result).toMatchObject({ ok: false, reason: 'action_required' });
			expect((result as { url: string }).url).toMatch(/^https:\/\/hooks\.stripe\.test\/3ds\/pi_/);
			expect(transfers).toHaveLength(0);
			expect(await purchases(user.id)).toEqual([expect.objectContaining({ status: 'pending' })]);
		});

		it('passes on the bank’s reason for a refusal', async () => {
			const user = await buyer('pm_declined');
			const result = await buyCurrency(payments, db, {
				userId: user.id,
				amount: 500,
				origin: ORIGIN
			});

			expect(result).toEqual({
				ok: false,
				reason: 'declined',
				message: 'Your card has insufficient funds.'
			});
			expect(transfers).toHaveLength(0);
		});

		it('keeps a paid purchase that the Money Server refused for an administrator', async () => {
			const user = await buyer('pm_ok');
			moneyServerAccepts = false;
			const result = await buyCurrency(payments, db, {
				userId: user.id,
				amount: 500,
				origin: ORIGIN
			});

			expect(result).toEqual({ ok: false, reason: 'credit_failed' });
			expect(await purchases(user.id)).toEqual([
				expect.objectContaining({ status: 'credit_failed' })
			]);

			// A webhook delivery afterwards does not try again.
			moneyServerAccepts = true;
			await handleStripeEvent(
				payments,
				db,
				event('payment_intent.succeeded', await purchaseIntent(user.id, 500))
			);
			expect(transfers).toHaveLength(0);
		});
	});

	describe('purchaseWentThrough', () => {
		it('tells whether the bank’s check let the avatar’s purchase through', async () => {
			const user = await buyer('pm_3ds');
			const other = await buyer('pm_ok');
			const result = await buyCurrency(payments, db, {
				userId: user.id,
				amount: 500,
				origin: ORIGIN
			});
			const id = (result as { url: string }).url.split('/').pop()!;

			expect(await purchaseWentThrough(payments.stripe, user.id, id)).toBe(false);
			created.get(id)!.status = 'succeeded';
			expect(await purchaseWentThrough(payments.stripe, user.id, id)).toBe(true);
			expect(await purchaseWentThrough(payments.stripe, other.id, id)).toBe(false);
			expect(await purchaseWentThrough(payments.stripe, user.id, 'pi_unknown')).toBe(false);
		});
	});

	describe('handleStripeEvent', () => {
		it('credits a purchase once the bank’s check passed, whatever the number of deliveries', async () => {
			const user = await buyer('pm_3ds');
			await buyCurrency(payments, db, { userId: user.id, amount: 500, origin: ORIGIN });
			const succeeded = event('payment_intent.succeeded', await purchaseIntent(user.id, 500));

			await Promise.all([
				handleStripeEvent(payments, db, succeeded),
				handleStripeEvent(payments, db, succeeded)
			]);
			await handleStripeEvent(payments, db, succeeded);

			expect(transfers).toEqual([{ receiverID: user.id, amount: 500 }]);
			expect(await purchases(user.id)).toEqual([expect.objectContaining({ status: 'credited' })]);
		});

		it('records a purchase that the webhook announces before the viewer’s request does', async () => {
			const user = await buyer();
			const intent = {
				id: `pi_${randomBytes(6).toString('hex')}`,
				amount: 200,
				status: 'succeeded',
				metadata: { avatar_id: user.id, amount: '500' }
			};
			await handleStripeEvent(payments, db, event('payment_intent.succeeded', intent));

			expect(transfers).toEqual([{ receiverID: user.id, amount: 500 }]);
			expect(await purchases(user.id)).toEqual([
				expect.objectContaining({ id: intent.id, price_cents: 200, status: 'credited' })
			]);
		});

		it('marks a purchase failed when the bank’s check fails', async () => {
			const user = await buyer('pm_3ds');
			await buyCurrency(payments, db, { userId: user.id, amount: 500, origin: ORIGIN });
			const intent = { ...(await purchaseIntent(user.id, 500)), status: 'requires_payment_method' };

			await handleStripeEvent(payments, db, event('payment_intent.payment_failed', intent));
			expect(await purchases(user.id)).toEqual([expect.objectContaining({ status: 'failed' })]);
		});

		it('ignores payments that this portal did not create', async () => {
			await handleStripeEvent(
				payments,
				db,
				event('payment_intent.succeeded', { id: 'pi_elsewhere', amount: 100, metadata: {} })
			);
			expect(transfers).toHaveLength(0);
		});
	});

	describe('readStripeEvent', () => {
		it('accepts what Stripe signed with the endpoint’s secret, and nothing else', () => {
			const payload = JSON.stringify({
				id: 'evt_1',
				type: 'payment_intent.succeeded',
				data: { object: {} }
			});
			const signed = payments.stripe.webhooks.generateTestHeaderString({
				payload,
				secret: 'whsec_test'
			});
			const forged = payments.stripe.webhooks.generateTestHeaderString({
				payload,
				secret: 'whsec_other'
			});

			expect(readStripeEvent(payments, payload, signed).id).toBe('evt_1');
			expect(() => readStripeEvent(payments, payload, forged)).toThrow();
			expect(() => readStripeEvent(payments, `${payload} `, signed)).toThrow();
		});
	});

	describe('the viewer helper', () => {
		async function post(method: string, params: Record<string, string | number>, helper = context) {
			const request = new Request(`${ORIGIN}/currency.php`, {
				method: 'POST',
				headers: { 'content-type': 'text/xml' },
				body: methodCall(method, params)
			});
			const response = await answerHelperRequest(helper, request, {
				getCurrencyQuote: quoteCurrency,
				buyCurrency: buyCurrencyForViewer,
				preflightBuyLandPrep: quoteLand
			});
			expect(response.headers.get('content-type')).toBe('text/xml');
			return parseMethodResponse(await response.text());
		}

		it('quotes the price in euros and asks for the password', async () => {
			expect(await post('getCurrencyQuote', { currencyBuy: 1000, language: 'en' })).toEqual({
				success: true,
				currency: { estimatedLocalCost: '€4.00', currencyBuy: 1000 },
				confirm: 'password'
			});
		});

		it('says what the smallest purchase is', async () => {
			expect(await post('getCurrencyQuote', { currencyBuy: 10 })).toEqual({
				success: false,
				errorMessage: 'Buy at least 123.',
				errorURI: ''
			});
		});

		it('buys with the avatar’s password and saved card', async () => {
			const user = await buyer('pm_ok');
			const result = await post('buyCurrency', {
				agentId: user.id,
				currencyBuy: 1000,
				password: STRONG_PASSWORD
			});
			expect(result).toEqual({ success: true });
			expect(transfers).toEqual([{ receiverID: user.id, amount: 1000 }]);
		});

		it('refuses a wrong password, then stops trying after five', async () => {
			const user = await buyer('pm_ok');
			const attempt = () =>
				post('buyCurrency', { agentId: user.id, currencyBuy: 1000, password: 'not the password' });
			for (let i = 0; i < 5; i++) {
				expect(await attempt()).toMatchObject({
					success: false,
					errorMessage: 'The password is wrong.'
				});
			}
			expect(
				await post('buyCurrency', {
					agentId: user.id,
					currencyBuy: 1000,
					password: STRONG_PASSWORD
				})
			).toMatchObject({
				success: false,
				errorMessage: 'Too many wrong passwords. Wait 15 minutes, then try again.'
			});
			expect(intents).toHaveLength(0);
		});

		it('links to the payment page when no card is saved', async () => {
			const user = await buyer();
			expect(
				await post('buyCurrency', {
					agentId: user.id,
					currencyBuy: 1000,
					password: STRONG_PASSWORD
				})
			).toMatchObject({ success: false, errorURI: `${ORIGIN}/account/payment` });
		});

		it('links to the bank’s page when it asks for a check', async () => {
			const user = await buyer('pm_3ds');
			const result = await post('buyCurrency', {
				agentId: user.id,
				currencyBuy: 1000,
				password: STRONG_PASSWORD
			});
			expect(result.success).toBe(false);
			expect(result.errorURI).toMatch(/^https:\/\/hooks\.stripe\.test\/3ds\//);
		});

		it('prices only the currency a parcel needs beyond the balance', async () => {
			expect(
				await post('preflightBuyLandPrep', { currencyBuy: 0, billableArea: 512 })
			).toMatchObject({
				success: true,
				currency: {},
				confirm: ''
			});
			expect(
				await post('preflightBuyLandPrep', { currencyBuy: 500, billableArea: 512 })
			).toMatchObject({
				success: true,
				currency: { estimatedLocalCost: '€2.00', currencyBuy: 500 },
				confirm: 'password'
			});
		});

		it('says so when the grid sells no currency', async () => {
			expect(
				await post('getCurrencyQuote', { currencyBuy: 1000 }, { ...context, payments: null })
			).toEqual({
				success: false,
				errorMessage: 'Buying currency is not available on Test Grid.',
				errorURI: ''
			});
		});
	});
});

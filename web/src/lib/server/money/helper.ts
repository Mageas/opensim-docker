import { m } from '#lib/paraglide/messages.js';
import type { Db } from '../db.js';
import { checkPassword } from '../opensim/accounts.js';
import { passwordFailuresByAccount } from '../rate-limit.js';
import { methodResponse, parseMethodCall, XmlRpcError, type XmlRpcStruct } from '../xmlrpc.js';
import {
	amountRange,
	checkAmount,
	formatEuros,
	priceInCents,
	type AmountProblem
} from './pricing.js';
import { buyCurrency, type Payments } from './purchases.js';

/**
 * The viewer's "helper" protocol: XML-RPC posts to <economy URL>currency.php and
 * landtool.php, as Second Life viewers send them (llcurrencyuimanager.cpp,
 * llfloaterbuyland.cpp). A failure carries errorMessage, and errorURI for a link that
 * the viewer offers to open.
 *
 * Viewers also send agentId and secureSessionId, but a standalone simulator keeps
 * sessions in memory, so nothing here could check them: a purchase asks for the avatar's
 * password instead (confirm = "password").
 */

export interface HelperContext {
	payments: Payments | null;
	db: Db;
	/** The portal's address, for the links the viewer shows. */
	origin: string;
	gridName: string;
}

type Method = (
	context: HelperContext,
	params: XmlRpcStruct
) => XmlRpcStruct | Promise<XmlRpcStruct>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Viewer requests are about 1 kB. */
const MAX_BODY_LENGTH = 16_384;

function text(params: XmlRpcStruct, name: string): string {
	const value = params[name];
	return typeof value === 'string' ? value : '';
}

function integer(params: XmlRpcStruct, name: string): number {
	const value = params[name];
	return typeof value === 'number' ? value : Number(value);
}

function failure(message: string, uri = ''): XmlRpcStruct {
	return { success: false, errorMessage: message, errorURI: uri };
}

function amountFailure(problem: AmountProblem, payments: Payments): XmlRpcStruct {
	const { min, max } = amountRange(payments.pricing);
	switch (problem) {
		case 'amount_invalid':
			return failure(m.viewer_amount_invalid());
		case 'amount_too_small':
			return failure(m.viewer_amount_too_small({ min }));
		case 'amount_too_large':
			return failure(m.viewer_amount_too_large({ max }));
	}
}

/** getCurrencyQuote: the price of `currencyBuy` in euros, confirmed by password. */
export const quoteCurrency: Method = (context, params) => {
	const { payments } = context;
	if (!payments) return failure(m.viewer_payments_off({ grid: context.gridName }));
	const amount = integer(params, 'currencyBuy');
	const problem = checkAmount(amount, payments.pricing);
	if (problem) return amountFailure(problem, payments);

	const price = priceInCents(amount, payments.pricing);
	return {
		success: true,
		currency: {
			estimatedLocalCost: formatEuros(price, text(params, 'language')),
			currencyBuy: amount
		},
		confirm: 'password'
	};
};

/** buyCurrency: checks the password, then charges the avatar's saved card. */
export const buyCurrencyForViewer: Method = async (context, params) => {
	const { payments, db, origin } = context;
	if (!payments) return failure(m.viewer_payments_off({ grid: context.gridName }));
	const amount = integer(params, 'currencyBuy');
	const problem = checkAmount(amount, payments.pricing);
	if (problem) return amountFailure(problem, payments);

	const userId = text(params, 'agentId');
	if (!UUID.test(userId)) return failure(m.viewer_unavailable());
	if (passwordFailuresByAccount.isLimited(userId)) return failure(m.viewer_rate_limited());
	if (!(await checkPassword(db, userId, text(params, 'password')))) {
		passwordFailuresByAccount.hit(userId);
		return failure(m.viewer_password_wrong());
	}
	passwordFailuresByAccount.reset(userId);

	const result = await buyCurrency(payments, db, { userId, amount, origin });
	if (result.ok) return { success: true };
	const paymentPage = `${origin}/account/payment`;
	switch (result.reason) {
		case 'no_card':
			return failure(m.viewer_no_card(), paymentPage);
		case 'declined':
			return failure(
				result.message ? m.viewer_declined_reason({ reason: result.message }) : m.viewer_declined(),
				paymentPage
			);
		case 'action_required':
			return failure(m.viewer_action_required(), result.url);
		case 'processing':
			return failure(m.viewer_processing());
		case 'credit_failed':
			return failure(m.viewer_credit_failed());
	}
};

/**
 * preflightBuyLandPrep: the grid sells no membership or land use plans, so only the
 * currency the parcel needs beyond the balance, if any, has a price.
 */
export const quoteLand: Method = async (context, params) => {
	const plans = {
		success: true,
		membership: { upgrade: false, action: '' },
		landUse: { upgrade: false, action: '' }
	};
	if (!(integer(params, 'currencyBuy') > 0)) return { ...plans, currency: {}, confirm: '' };

	const quote = await quoteCurrency(context, params);
	if (quote.success !== true) return quote;
	return { ...plans, currency: quote.currency, confirm: 'password' };
};

/**
 * buyLandPrep: buys the missing currency, if any. The viewer then asks the region for the
 * parcel, and the region's money module pays the seller.
 */
export const buyLand: Method = (context, params) =>
	integer(params, 'currencyBuy') > 0 ? buyCurrencyForViewer(context, params) : { success: true };

/** Answers one XML-RPC post with the method of that name. */
export async function answerHelperRequest(
	context: HelperContext,
	request: Request,
	methods: Record<string, Method>
): Promise<Response> {
	const body = await request.text();
	if (body.length > MAX_BODY_LENGTH) return new Response('Request too large\n', { status: 413 });

	let call;
	try {
		call = parseMethodCall(body);
	} catch (error) {
		if (error instanceof XmlRpcError) return new Response(`${error.message}\n`, { status: 400 });
		throw error;
	}
	const method = Object.hasOwn(methods, call.method) ? methods[call.method] : undefined;
	const result = method ? await method(context, call.params) : failure(m.viewer_unavailable());
	return new Response(methodResponse(result), { headers: { 'content-type': 'text/xml' } });
}

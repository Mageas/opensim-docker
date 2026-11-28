import Stripe from 'stripe';
import {
	CURRENCY_PER_EURO,
	MONEY_SCRIPT_KEY,
	MONEY_SERVER_URL,
	MYSQL_DATABASE,
	MYSQL_HOST,
	MYSQL_PASSWORD,
	MYSQL_PORT,
	MYSQL_USER,
	OPENSIM_GRID_NAME,
	OPENSIM_LOGIN_URI,
	PURCHASE_MAX_EUROS,
	SIGNUP_ENABLED,
	STRIPE_SECRET_KEY,
	STRIPE_WEBHOOK_SECRET
} from '$app/env/private';
import { createDb, type Db } from './db.js';
import type { Payments } from './money/purchases.js';

/** What the portal shows about the grid, for connecting a viewer. */
export interface Grid {
	name: string;
	loginUri: string;
}

export interface Runtime {
	db: Db;
	grid: Grid;
	/** False when the grid's administrator closed account creation. */
	signupEnabled: boolean;
	/** Null when STRIPE_SECRET_KEY is blank: viewers cannot buy currency. */
	payments: Payments | null;
}

function configurePayments(): Payments | null {
	if (!STRIPE_SECRET_KEY) return null;
	const missing = Object.entries({
		STRIPE_WEBHOOK_SECRET,
		CURRENCY_PER_EURO,
		PURCHASE_MAX_EUROS,
		MONEY_SERVER_URL,
		MONEY_SCRIPT_KEY
	})
		.filter(([, value]) => !value)
		.map(([name]) => name);
	if (missing.length > 0) {
		throw new Error(`STRIPE_SECRET_KEY is set, so payments also need ${missing.join(', ')}`);
	}
	return {
		stripe: new Stripe(STRIPE_SECRET_KEY, { maxNetworkRetries: 2 }),
		webhookSecret: STRIPE_WEBHOOK_SECRET,
		pricing: { perEuro: CURRENCY_PER_EURO!, maxCents: PURCHASE_MAX_EUROS! * 100 },
		moneyServer: { url: MONEY_SERVER_URL, scriptKey: MONEY_SCRIPT_KEY }
	};
}

let current: Runtime | undefined;

/** Opens the database pool, once, at server start (the `init` hook). */
export function configure(): void {
	current = {
		db: createDb({
			host: MYSQL_HOST,
			port: MYSQL_PORT,
			database: MYSQL_DATABASE,
			user: MYSQL_USER,
			password: MYSQL_PASSWORD
		}),
		grid: { name: OPENSIM_GRID_NAME, loginUri: OPENSIM_LOGIN_URI },
		signupEnabled: SIGNUP_ENABLED,
		payments: configurePayments()
	};
}

export function runtime(): Runtime {
	if (!current) throw new Error('configure() has not run');
	return current;
}

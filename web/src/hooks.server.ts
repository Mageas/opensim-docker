import {
	sequence,
	type Handle,
	type HandleServerError,
	type ServerInit
} from '@sveltejs/kit/hooks';
import { baseLocale } from '#lib/paraglide/runtime.js';
import { configure, runtime } from '#lib/server/runtime.js';
import { validateSessionToken } from '#lib/server/sessions.js';
import {
	deleteSessionCookie,
	readSessionToken,
	setSessionCookie
} from '#lib/server/session-cookie.js';
import { readTheme } from '#lib/server/theme.js';

export const init: ServerInit = async () => {
	configure();
	// Fails the start, rather than the first request, when the database is out of reach.
	await runtime().db.query('SELECT 1');
};

const authenticate: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;

	const token = readSessionToken(event.cookies);
	if (token) {
		const result = await validateSessionToken(runtime().db, token);
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
			if (result.renewed) setSessionCookie(event.cookies, token, result.session.expiresAt);
		} else {
			deleteSessionCookie(event.cookies);
		}
	}

	return resolve(event);
};

/** The Content-Security-Policy header comes from the `csp` option in vite.config.ts. */
const secureHeaders: Handle = async ({ event, resolve }) => {
	const theme = readTheme(event.cookies) ?? '';
	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%paraglide.lang%', baseLocale).replace('%theme%', theme)
	});

	const headers = response.headers;
	// Pages show account data: no shared or browser cache may keep them.
	headers.set('Cache-Control', 'no-store');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('X-Frame-Options', 'DENY');
	headers.set('Referrer-Policy', 'same-origin');
	headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
	// No includeSubDomains: other services may share the parent domain over plain HTTP.
	if (event.url.protocol === 'https:') {
		headers.set('Strict-Transport-Security', 'max-age=31536000');
	}
	return response;
};

export const handle: Handle = sequence(authenticate, secureHeaders);

/** Logs unexpected errors with an id that the error page shows, to find one from the other. */
export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (kind !== 'unknown') return;
	const id = crypto.randomUUID();
	console.error(`[error ${id}] ${event.request.method} ${event.url.pathname}`, error);
	return { id };
};

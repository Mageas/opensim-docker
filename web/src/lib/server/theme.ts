import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';

/**
 * The visitor's theme choice, kept in a cookie so that the server renders the page in it:
 * no flash of the other theme, and no inline script for the content security policy to
 * allow. Without a choice, the page follows the system.
 */

export type Theme = 'light' | 'dark';

const COOKIE = 'theme';
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function isTheme(value: unknown): value is Theme {
	return value === 'light' || value === 'dark';
}

export function readTheme(cookies: Cookies): Theme | null {
	const value = cookies.get(COOKIE);
	return isTheme(value) ? value : null;
}

export function saveTheme(cookies: Cookies, theme: Theme): void {
	cookies.set(COOKIE, theme, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: ONE_YEAR_SECONDS
	});
}

/** A path of this site to go back to, from a form field: anything else gives the home page. */
export function samePath(value: unknown, base: URL): string {
	if (typeof value !== 'string') return '/';
	try {
		const target = new URL(value, base);
		return target.origin === base.origin ? target.pathname : '/';
	} catch {
		return '/';
	}
}

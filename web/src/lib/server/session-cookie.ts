import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';

/** __Host- ties the cookie to this exact origin over HTTPS; `vite dev` serves plain HTTP. */
const NAME = dev ? 'session' : '__Host-session';

const OPTIONS = { path: '/', httpOnly: true, secure: !dev, sameSite: 'lax' } as const;

export function readSessionToken(cookies: Cookies): string | null {
	return cookies.get(NAME) ?? null;
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(NAME, token, { ...OPTIONS, expires: expiresAt });
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(NAME, OPTIONS);
}

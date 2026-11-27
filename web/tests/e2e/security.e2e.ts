import { expect, signUp, test } from './fixtures.ts';

test('pages carry a strict content security policy and hardening headers', async ({ page }) => {
	const response = await page.goto('/signup');
	const headers = response!.headers();

	const csp = headers['content-security-policy'];
	expect(csp).toContain("default-src 'none'");
	expect(csp).toMatch(/script-src 'self' 'nonce-[^']+'/);
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain("form-action 'self'");
	expect(csp).toContain("base-uri 'none'");
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['referrer-policy']).toBe('same-origin');
	expect(headers['cross-origin-opener-policy']).toBe('same-origin');
	expect(headers['cache-control']).toBe('no-store');
});

test('the page runs under its policy without violations', async ({ page, avatar }) => {
	const violations: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') violations.push(message.text());
	});
	await signUp(page, avatar);
	await page.getByRole('link', { name: 'Change the password' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Change the password');
	expect(violations).toEqual([]);
});

test('the session cookie is host-only, secure, HTTP-only and same-site', async ({
	page,
	context,
	avatar
}) => {
	await signUp(page, avatar);
	const cookies = await context.cookies();

	expect(cookies.map((cookie) => cookie.name)).toEqual(['__Host-session']);
	expect(cookies[0]).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'Lax' });
	expect(cookies[0].value).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

test('forms refuse posts from another site', async ({ request }) => {
	for (const path of [
		'/login',
		'/signup',
		'/logout',
		'/theme',
		'/account/password',
		'/account/delete'
	]) {
		const response = await request.post(path, {
			headers: {
				Origin: 'https://attacker.example',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			data: 'avatarName=Ada+Lovelace&password=x'
		});
		expect(response.status(), path).toBe(403);
	}
});

test('logging out takes a POST: a link to /logout does nothing', async ({ page, avatar }) => {
	await signUp(page, avatar);
	await page.goto('/logout');
	await expect(page).toHaveURL('/account');
});

test('the skip link moves focus to the content', async ({ page }) => {
	await page.goto('/login');
	await page.keyboard.press('Tab');
	const skip = page.getByRole('link', { name: 'Skip to content' });
	await expect(skip).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('main')).toBeFocused();
});

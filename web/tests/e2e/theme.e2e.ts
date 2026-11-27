import { expect, test } from './fixtures.ts';

const toDark = 'Switch to the dark theme';
const toLight = 'Switch to the light theme';

test('the page follows the system until a theme is chosen', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');

	await expect(page.locator('html')).toHaveAttribute('data-theme', '');
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'light dark');
	await expect(page.getByRole('button', { name: toLight })).toBeVisible();
	await expect(page.getByRole('button', { name: toDark })).toBeHidden();
});

test('the switch changes the theme at once and remembers it', async ({ page, context }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/login');
	await page.getByRole('button', { name: toDark }).click();

	const html = page.locator('html');
	await expect(html).toHaveAttribute('data-theme', 'dark');
	await expect(html).toHaveCSS('color-scheme', 'dark');
	await expect(page.getByRole('button', { name: toLight })).toBeVisible();
	await expect(page.getByRole('button', { name: toDark })).toBeHidden();
	await expect(page).toHaveURL('/login');

	await expect
		.poll(async () => (await context.cookies()).find((cookie) => cookie.name === 'theme'))
		.toMatchObject({ value: 'dark', httpOnly: true, sameSite: 'Lax', path: '/' });

	await page.reload();
	await expect(html).toHaveAttribute('data-theme', 'dark');

	await page.getByRole('button', { name: toLight }).click();
	await expect(html).toHaveAttribute('data-theme', 'light');
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.reload();
	await expect(html).toHaveCSS('color-scheme', 'light');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the switch posts the choice and comes back to the page', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/signup');
		await page.getByRole('button', { name: toDark }).click();

		await expect(page).toHaveURL('/signup');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	});
});

test('a visit to /theme goes home', async ({ page }) => {
	await page.goto('/theme');
	await expect(page).toHaveURL('/');
});

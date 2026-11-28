import { expect, signUp, test } from './fixtures.ts';

/** The portal on port 4176 runs with payments on, on the same database. */
const PAYMENTS = 'http://localhost:4176';

test.describe('with payments on', () => {
	test.use({ baseURL: PAYMENTS });

	test('the account page leads to the payment method', async ({ page, avatar }) => {
		await signUp(page, avatar);
		await expect(page.getByRole('heading', { name: 'Buying currency' })).toBeVisible();

		await page.getByRole('link', { name: 'Payment method' }).click();
		await expect(page).toHaveURL('/account/payment');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Payment method');
		await expect(page.getByText('No card saved yet.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save a card' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Remove the card' })).toHaveCount(0);
		await expect(page.getByRole('complementary')).toContainText('Card details stay with Stripe');
	});

	test('the payment page needs a login', async ({ page }) => {
		await page.goto('/account/payment');
		await expect(page).toHaveURL('/login');
	});
});

test.describe('with payments off', () => {
	test('the account page offers no payment and the payment page does not exist', async ({
		page,
		avatar
	}) => {
		await signUp(page, avatar);
		await expect(page.getByRole('heading', { name: 'Buying currency' })).toHaveCount(0);

		const response = await page.goto('/account/payment');
		expect(response?.status()).toBe(404);
	});
});

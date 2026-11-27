import { randomBytes, randomInt } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export interface Avatar {
	name: string;
	password: string;
}

export const test = base.extend<{ avatar: Avatar }>({
	// Each test comes from its own address, so one test's rate limits never block another.
	context: async ({ context }, use) => {
		const address = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
		await context.setExtraHTTPHeaders({ 'X-Forwarded-For': address });
		await use(context);
	},
	// eslint-disable-next-line no-empty-pattern -- Playwright fixtures take their dependencies first.
	avatar: async ({}, use) => {
		await use({
			name: `E2e${randomBytes(5).toString('hex')} Tester`,
			password: 'purple monkey dishwasher'
		});
	}
});

export async function signUp(page: Page, avatar: Avatar): Promise<void> {
	await page.goto('/signup');
	await page.getByLabel('Avatar name').fill(avatar.name);
	await page.getByLabel('Password', { exact: true }).fill(avatar.password);
	await page.getByLabel('Confirm the password').fill(avatar.password);
	await page.getByRole('button', { name: 'Create the account' }).click();
	await expect(page).toHaveURL('/account?done=created');
}

export async function logIn(page: Page, avatar: Avatar): Promise<void> {
	await page.goto('/login');
	await page.getByLabel('Avatar name').fill(avatar.name);
	await page.getByLabel('Password').fill(avatar.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL('/account');
}

export async function logOut(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Log out' }).click();
	await expect(page).toHaveURL('/');
}

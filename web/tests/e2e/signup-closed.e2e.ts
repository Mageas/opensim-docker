import { expect, logIn, signUp, test } from './fixtures.ts';

/** The portal on port 4175 runs with SIGNUP_ENABLED=false, on the same database. */
const CLOSED = 'http://localhost:4175';

test.use({ baseURL: CLOSED });

test('no page offers to create an account', async ({ page }) => {
	for (const path of ['/', '/login']) {
		await page.goto(path);
		await expect(page.getByRole('link', { name: 'Create an account' })).toHaveCount(0);
	}
	await page.goto('/');
	await expect(page.getByText('Log in to see your avatar')).toBeVisible();
	await page.goto('/login');
	await expect(page.getByText('Account creation is closed on Test Grid.')).toBeVisible();
});

test('the signup page says creation is closed and shows no form', async ({ page }) => {
	await page.goto('/signup');

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create an account');
	await expect(page.getByText('Account creation is closed on Test Grid.')).toBeVisible();
	await expect(page.getByRole('textbox')).toHaveCount(0);
	await expect(page.getByRole('main').getByRole('link', { name: 'Log in' })).toBeVisible();
});

test('a signup posted straight to the server is refused', async ({ request, page, avatar }) => {
	const response = await request.post('/signup', {
		headers: { Origin: CLOSED, 'X-Forwarded-For': '10.250.0.1' },
		form: { avatarName: avatar.name, password: avatar.password, passwordConfirm: avatar.password }
	});
	expect(response.status()).toBe(403);

	await page.goto('/login');
	await page.getByLabel('Avatar name').fill(avatar.name);
	await page.getByLabel('Password').fill(avatar.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page.getByText('The avatar name or the password is wrong.')).toBeVisible();
});

test('existing avatars still log in', async ({ browser, page, avatar }) => {
	const open = await browser.newContext({
		baseURL: 'http://localhost:4174',
		extraHTTPHeaders: { 'X-Forwarded-For': '10.251.0.1' }
	});
	await signUp(await open.newPage(), avatar);
	await open.close();

	await logIn(page, avatar);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(avatar.name);
});

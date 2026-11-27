import { expect, logIn, logOut, signUp, test } from './fixtures.ts';

test('the home page tells how to connect a viewer', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle('Test Grid');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test Grid');
	await expect(page.getByText('http://grid.example.org:9000/')).toBeVisible();
	const nav = page.getByRole('navigation', { name: 'Main' });
	await expect(nav.getByRole('link', { name: 'Log in' })).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Create an account' })).toBeVisible();
});

test('the login URI copies to the clipboard', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/');

	await page.getByRole('button', { name: 'Copy the login URI' }).click();

	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		'http://grid.example.org:9000/'
	);
});

test('a new avatar signs up, logs out and logs back in', async ({ page, avatar }) => {
	await signUp(page, avatar);

	await expect(page.getByRole('status')).toHaveText(
		'Your avatar is ready. Log in with your viewer using this name and password.'
	);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(avatar.name);
	await expect(page.getByText('Not in the grid')).toBeVisible();
	await expect(page.getByRole('definition').filter({ hasText: 'Never' })).toBeVisible();
	await expect(page).toHaveTitle('My account · Test Grid');

	await logOut(page);
	await expect(
		page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log in' })
	).toBeVisible();

	await logIn(page, avatar);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(avatar.name);
	await expect(page.getByRole('status')).toHaveCount(0);
});

test('signup explains each wrong field and moves focus to the first one', async ({ page }) => {
	await page.goto('/signup');
	await page.getByLabel('Avatar name').fill('Ada');
	await page.getByLabel('Password', { exact: true }).fill('too short');
	await page.getByRole('button', { name: 'Create the account' }).click();

	const name = page.getByLabel('Avatar name');
	await expect(name).toBeFocused();
	await expect(name).toHaveAttribute('aria-invalid', 'true');
	await expect(name).toHaveAccessibleDescription(
		/Enter a first and a last name, separated by a space\./
	);
	await expect(name).toHaveValue('Ada');
	const password = page.getByLabel('Password', { exact: true });
	await expect(password).toHaveAttribute('aria-invalid', 'true');
	await expect(password).toHaveAccessibleDescription(/Use at least 15 characters\./);
});

test('signup refuses two different passwords', async ({ page, avatar }) => {
	await page.goto('/signup');
	await page.getByLabel('Avatar name').fill(avatar.name);
	await page.getByLabel('Password', { exact: true }).fill(avatar.password);
	await page.getByLabel('Confirm the password').fill(`${avatar.password}!`);
	await page.getByRole('button', { name: 'Create the account' }).click();

	const confirm = page.getByLabel('Confirm the password');
	await expect(confirm).toBeFocused();
	await expect(confirm).toHaveAccessibleDescription('The two passwords differ.');
});

test('signup refuses a name that exists, whatever its case', async ({ page, avatar }) => {
	await signUp(page, avatar);
	await logOut(page);

	await page.goto('/signup');
	await page.getByLabel('Avatar name').fill(avatar.name.toLowerCase());
	await page.getByLabel('Password', { exact: true }).fill(avatar.password);
	await page.getByLabel('Confirm the password').fill(avatar.password);
	await page.getByRole('button', { name: 'Create the account' }).click();

	await expect(page.getByLabel('Avatar name')).toHaveAccessibleDescription(
		/An avatar already has this name\./
	);
	await expect(page).toHaveURL('/signup');
});

test('login gives one message for a wrong password and an unknown name', async ({
	page,
	avatar
}) => {
	await signUp(page, avatar);
	await logOut(page);

	for (const [name, password] of [
		[avatar.name, 'not the password at all'],
		['Nobody Here', avatar.password]
	]) {
		await page.goto('/login');
		await page.getByLabel('Avatar name').fill(name);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Log in' }).click();

		const alert = page.getByText('The avatar name or the password is wrong.');
		await expect(alert).toBeVisible();
		await expect(alert).toBeFocused();
		await expect(page).toHaveURL('/login');
	}
});

test('repeated wrong passwords on one name are stopped', async ({ page, avatar }) => {
	await signUp(page, avatar);
	await logOut(page);
	await page.goto('/login');
	await page.getByLabel('Avatar name').fill(avatar.name);

	for (let attempt = 0; attempt < 5; attempt++) {
		await page.getByLabel('Password').fill(`wrong password ${attempt}`);
		await page.getByRole('button', { name: 'Log in' }).click();
		await expect(page.getByText('The avatar name or the password is wrong.')).toBeVisible();
	}
	await page.getByLabel('Password').fill(avatar.password);
	await page.getByRole('button', { name: 'Log in' }).click();

	await expect(
		page.getByText('Too many attempts. Wait a few minutes, then try again.')
	).toBeVisible();
	await expect(page).toHaveURL('/login');
});

test('the account pages need a login', async ({ page }) => {
	for (const path of ['/account', '/account/password', '/account/delete']) {
		await page.goto(path);
		await expect(page).toHaveURL('/login');
	}
});

test('a logged-in visitor of the login and signup pages lands on the account', async ({
	page,
	avatar
}) => {
	await signUp(page, avatar);
	for (const path of ['/', '/login', '/signup']) {
		await page.goto(path);
		await expect(page).toHaveURL('/account');
	}
});

test('a new password replaces the old one', async ({ page, avatar }) => {
	await signUp(page, avatar);
	await page.getByRole('link', { name: 'Change the password' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Change the password');

	await page.getByLabel('Current password').fill('not my password');
	await page.getByLabel('New password', { exact: true }).fill('a brand new passphrase');
	await page.getByLabel('Confirm the new password').fill('a brand new passphrase');
	await page.getByRole('button', { name: 'Change the password' }).click();
	const current = page.getByLabel('Current password');
	await expect(current).toBeFocused();
	await expect(current).toHaveAccessibleDescription('The current password is wrong.');

	await current.fill(avatar.password);
	await page.getByLabel('New password', { exact: true }).fill('a brand new passphrase');
	await page.getByLabel('Confirm the new password').fill('a brand new passphrase');
	await page.getByRole('button', { name: 'Change the password' }).click();
	await expect(page).toHaveURL('/account?done=password');
	await expect(page.getByRole('status')).toHaveText(
		'Your password has changed. Use the new one in your viewer.'
	);

	await logOut(page);
	await page.goto('/login');
	await page.getByLabel('Avatar name').fill(avatar.name);
	await page.getByLabel('Password').fill(avatar.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page.getByText('The avatar name or the password is wrong.')).toBeVisible();

	await logIn(page, { ...avatar, password: 'a brand new passphrase' });
});

test('a new password ends the other sessions', async ({ browser, page, avatar }) => {
	await signUp(page, avatar);
	const other = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': '10.200.0.1' } });
	const otherPage = await other.newPage();
	await logIn(otherPage, avatar);

	await page.goto('/account/password');
	await page.getByLabel('Current password').fill(avatar.password);
	await page.getByLabel('New password', { exact: true }).fill('a brand new passphrase');
	await page.getByLabel('Confirm the new password').fill('a brand new passphrase');
	await page.getByRole('button', { name: 'Change the password' }).click();
	await expect(page).toHaveURL('/account?done=password');

	await otherPage.goto('/account');
	await expect(otherPage).toHaveURL('/login');
	await other.close();
});

test('deleting the account takes the password and removes the avatar', async ({ page, avatar }) => {
	await signUp(page, avatar);
	await page.getByRole('link', { name: 'Delete the account' }).click();
	await expect(page.getByText(`This deletes ${avatar.name} for good`)).toBeVisible();

	await page.getByLabel('Password').fill('not my password');
	await page.getByRole('button', { name: 'Delete my account' }).click();
	await expect(page.getByLabel('Password')).toHaveAccessibleDescription(
		/The current password is wrong\./
	);

	await page.getByLabel('Password').fill(avatar.password);
	await page.getByRole('button', { name: 'Delete my account' }).click();
	await expect(page).toHaveURL('/?done=deleted');
	await expect(page.getByRole('status')).toHaveText('Your account has been deleted.');

	await page.goto('/login');
	await page.getByLabel('Avatar name').fill(avatar.name);
	await page.getByLabel('Password').fill(avatar.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page.getByText('The avatar name or the password is wrong.')).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('signup, logout, login and errors work as plain forms', async ({ page, avatar }) => {
		await page.goto('/signup');
		await page.getByLabel('Avatar name').fill(avatar.name);
		await page.getByRole('button', { name: 'Create the account' }).click();
		await expect(page.getByLabel('Password', { exact: true })).toHaveAccessibleDescription(
			/Enter the password\./
		);
		await expect(page.getByLabel('Avatar name')).toHaveValue(avatar.name);

		await signUp(page, avatar);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(avatar.name);
		await logOut(page);
		await logIn(page, avatar);
	});
});

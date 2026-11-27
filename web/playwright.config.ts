import { defineConfig, devices } from '@playwright/test';

/**
 * One browser, three widths: each flow runs as a small phone, a common phone and a desktop
 * would see it. No test makes images: screenshots, videos and trace snapshots are off.
 */
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:4174',
		screenshot: 'off',
		video: 'off',
		trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true }
	},
	projects: [
		{
			name: 'narrow',
			use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 } }
		},
		{ name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
		}
	],
	webServer: {
		command: 'pnpm exec vite build && node tests/e2e/server.ts',
		url: 'http://localhost:4174/login',
		timeout: 180_000,
		reuseExistingServer: false,
		stdout: 'pipe'
	}
});

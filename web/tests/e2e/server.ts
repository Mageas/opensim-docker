/**
 * Playwright's web server: a throwaway database, then two builds of the portal on it,
 * behind a pretend proxy (X-Forwarded-For) so each test can come from its own address:
 * port 4175 with account creation closed, then port 4174 as deployed by default.
 * Playwright waits for 4174, which starts last.
 *
 *   node tests/e2e/server.ts
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { startTestDatabase } from '../support/database.ts';

const { container, config } = await startTestDatabase();

function startPortal(port: number, env: Record<string, string>): ChildProcess {
	return spawn(process.execPath, ['build/index.js'], {
		stdio: 'inherit',
		env: {
			...process.env,
			PORT: String(port),
			ORIGIN: `http://localhost:${port}`,
			ADDRESS_HEADER: 'X-Forwarded-For',
			XFF_DEPTH: '1',
			MYSQL_HOST: config.host,
			MYSQL_PORT: String(config.port),
			MYSQL_DATABASE: config.database,
			MYSQL_USER: config.user,
			MYSQL_PASSWORD: config.password,
			OPENSIM_GRID_NAME: 'Test Grid',
			OPENSIM_LOGIN_URI: 'http://grid.example.org:9000/',
			...env
		}
	});
}

async function waitForHealth(port: number): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt++) {
		const ready = await fetch(`http://localhost:${port}/health`).then(
			(response) => response.ok,
			() => false
		);
		if (ready) return;
		await sleep(100);
	}
	throw new Error(`The portal on port ${port} did not start`);
}

const portals: ChildProcess[] = [];
let stopping = false;

/** One way out, whether Playwright stops us or a portal exits on its own. */
async function shutdown(code: number) {
	if (stopping) return;
	stopping = true;
	for (const portal of portals) portal.kill('SIGTERM');
	await container.stop();
	process.exit(code);
}

process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));

for (const [port, env] of [
	[4175, { SIGNUP_ENABLED: 'false' }],
	[4174, {}]
] as const) {
	const portal = startPortal(port, env);
	portal.on('exit', (code) => void shutdown(code ?? 1));
	portals.push(portal);
	await waitForHealth(port);
}

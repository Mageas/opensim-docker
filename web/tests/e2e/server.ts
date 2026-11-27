/**
 * Playwright's web server: a throwaway database, then the built portal on port 4174,
 * behind a pretend proxy (X-Forwarded-For) so each test can come from its own address.
 *
 *   node tests/e2e/server.ts
 */
import { spawn } from 'node:child_process';
import { startTestDatabase } from '../support/database.ts';

const { container, config } = await startTestDatabase();

const server = spawn(process.execPath, ['build/index.js'], {
	stdio: 'inherit',
	env: {
		...process.env,
		PORT: '4174',
		ORIGIN: 'http://localhost:4174',
		ADDRESS_HEADER: 'X-Forwarded-For',
		XFF_DEPTH: '1',
		MYSQL_HOST: config.host,
		MYSQL_PORT: String(config.port),
		MYSQL_DATABASE: config.database,
		MYSQL_USER: config.user,
		MYSQL_PASSWORD: config.password,
		OPENSIM_GRID_NAME: 'Test Grid',
		OPENSIM_LOGIN_URI: 'http://grid.example.org:9000/'
	}
});

let stopping = false;

/** One way out, whether Playwright stops us or the portal exits on its own. */
async function shutdown(code: number) {
	if (stopping) return;
	stopping = true;
	server.kill('SIGTERM');
	await container.stop();
	process.exit(code);
}

process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));
server.on('exit', (code) => void shutdown(code ?? 1));

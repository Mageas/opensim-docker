import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';
import mysql from 'mysql2/promise';
import { setupDatabase } from '../../scripts/setup-db.ts';

/**
 * A throwaway MariaDB, as the compose files run it, holding OpenSim 0.9.3.0's schema
 * (tests/fixtures/opensim-schema.sql, dumped from a simulator's first start) and prepared
 * by scripts/setup-db.ts, so tests use the portal's own restricted account.
 */

export interface TestDatabase {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
	rootPassword: string;
}

const ROOT_PASSWORD = 'test-root';

/**
 * Testcontainers ignores Docker contexts, which OrbStack and Colima rely on: point it at the
 * current context's socket. Inside the Docker VM, the socket is at the usual place.
 */
function useCurrentDockerContext(): void {
	process.env.DOCKER_HOST ??= execFileSync(
		'docker',
		['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'],
		{ encoding: 'utf8' }
	).trim();
	process.env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE ??= '/var/run/docker.sock';
}

export async function startTestDatabase(): Promise<{
	container: StartedMariaDbContainer;
	config: TestDatabase;
}> {
	useCurrentDockerContext();
	const container = await new MariaDbContainer('mariadb:11.4')
		.withDatabase('opensim')
		.withRootPassword(ROOT_PASSWORD)
		.withCommand(['--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci'])
		.start();

	const config: TestDatabase = {
		host: container.getHost(),
		port: container.getPort(),
		database: 'opensim',
		user: 'opensim_web',
		password: 'test-web',
		rootPassword: ROOT_PASSWORD
	};

	const root = await connectAsRoot(config, { multipleStatements: true });
	try {
		const schema = await readFile(
			new URL('../fixtures/opensim-schema.sql', import.meta.url),
			'utf8'
		);
		await root.query(schema);
		await setupDatabase(root, config);
	} finally {
		await root.end();
	}
	return { container, config };
}

export function connectAsRoot(config: TestDatabase, options: mysql.ConnectionOptions = {}) {
	return mysql.createConnection({
		host: config.host,
		port: config.port,
		database: config.database,
		user: 'root',
		password: config.rootPassword,
		timezone: 'Z',
		...options
	});
}

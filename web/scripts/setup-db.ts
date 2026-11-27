/**
 * Prepares the OpenSim database for the portal, as root, before the portal starts: creates
 * the web_sessions table and the portal's own MariaDB account, with only the privileges it
 * needs. Safe to run on every deploy.
 *
 *   node scripts/setup-db.ts
 *
 * Reads MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_ROOT_PASSWORD, and the portal's
 * account in MYSQL_USER and MYSQL_PASSWORD.
 */
import mysql from 'mysql2/promise';

/** user_id has the character set of UserAccounts.PrincipalID, which it joins on. */
const WEB_SESSIONS_TABLE = `
	CREATE TABLE IF NOT EXISTS web_sessions (
		id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
		user_id CHAR(36) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
		created_at DATETIME NOT NULL,
		expires_at DATETIME NOT NULL,
		PRIMARY KEY (id),
		KEY user_id (user_id),
		KEY expires_at (expires_at)
	) ENGINE=InnoDB`;

/** MariaDB needs SELECT on the columns a DELETE or UPDATE filters on. */
const GRANTS: Record<string, string[]> = {
	web_sessions: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
	UserAccounts: ['SELECT', 'INSERT', 'DELETE'],
	auth: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
	inventoryfolders: ['SELECT', 'INSERT', 'DELETE'],
	inventoryitems: ['SELECT', 'INSERT', 'DELETE'],
	Avatars: ['SELECT', 'INSERT', 'DELETE'],
	GridUser: ['SELECT', 'DELETE'],
	estate_settings: ['SELECT'],
	tokens: ['SELECT', 'DELETE'],
	AgentPrefs: ['SELECT', 'DELETE'],
	Friends: ['SELECT', 'DELETE'],
	im_offline: ['SELECT', 'DELETE'],
	userprofile: ['SELECT', 'DELETE'],
	userdata: ['SELECT', 'DELETE'],
	usernotes: ['SELECT', 'DELETE'],
	userpicks: ['SELECT', 'DELETE'],
	usersettings: ['SELECT', 'DELETE'],
	classifieds: ['SELECT', 'DELETE'],
	os_groups_membership: ['SELECT', 'DELETE'],
	os_groups_rolemembership: ['SELECT', 'DELETE'],
	os_groups_principals: ['SELECT', 'DELETE'],
	os_groups_invites: ['SELECT', 'DELETE']
};

/** The host part of the portal's account: it connects over the Docker network. */
const HOST = '%';

const ER_NONEXISTING_GRANT = 1141;
const ER_NO_SUCH_TABLE = 1146;

export interface SetupOptions {
	database: string;
	user: string;
	password: string;
}

/**
 * Throws if `user` already holds server-wide or database-wide privileges: the setup resets
 * this account's password, so pointing it at root or at OpenSim's own account would lock
 * them out.
 */
async function assertDedicatedAccount(connection: mysql.Connection, user: string): Promise<void> {
	let grants: string[];
	try {
		const [rows] = await connection.query<mysql.RowDataPacket[]>('SHOW GRANTS FOR ?@?', [
			user,
			HOST
		]);
		grants = rows.map((row) => String(Object.values(row)[0]));
	} catch (error) {
		if ((error as { errno?: number }).errno === ER_NONEXISTING_GRANT) return;
		throw error;
	}
	const broad = grants.find(
		(grant) => !grant.startsWith('GRANT USAGE ON *.*') && / ON (\*|`[^`]+`)\.\* TO /.test(grant)
	);
	if (broad) {
		throw new Error(
			`${user}@${HOST} has database-wide privileges: MYSQL_USER must be an account of its own for the portal`
		);
	}
}

export async function setupDatabase(
	connection: mysql.Connection,
	options: SetupOptions
): Promise<void> {
	const { database, user, password } = options;
	await assertDedicatedAccount(connection, user);

	await connection.query(`USE ??`, [database]);
	await connection.query(WEB_SESSIONS_TABLE);

	await connection.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [user, HOST, password]);
	await connection.query('ALTER USER ?@? IDENTIFIED BY ?', [user, HOST, password]);
	// GRANT only adds, so a running portal never loses a privilege while this runs. A
	// privilege taken out of GRANTS needs a REVOKE by hand.
	try {
		for (const [table, privileges] of Object.entries(GRANTS)) {
			await connection.query(`GRANT ${privileges.join(', ')} ON ??.?? TO ?@?`, [
				database,
				table,
				user,
				HOST
			]);
		}
	} catch (error) {
		if ((error as { errno?: number }).errno === ER_NO_SUCH_TABLE) {
			throw new Error(
				'OpenSim has not created its tables yet: start the simulator once, then run this again',
				{
					cause: error
				}
			);
		}
		throw error;
	}
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

if (import.meta.main) {
	const database = requireEnv('MYSQL_DATABASE');
	const user = requireEnv('MYSQL_USER');
	const connection = await mysql.createConnection({
		host: requireEnv('MYSQL_HOST'),
		port: Number(process.env.MYSQL_PORT ?? 3306),
		user: 'root',
		password: requireEnv('MYSQL_ROOT_PASSWORD')
	});
	try {
		await setupDatabase(connection, { database, user, password: requireEnv('MYSQL_PASSWORD') });
		console.log(`[setup-db] ${user} is ready on ${database}`);
	} finally {
		await connection.end();
	}
}

import type { RowDataPacket } from 'mysql2/promise';
import { transaction, type Connection, type Db, type Queryable } from '../db.js';
import { buildNewAccount } from './new-account.js';
import {
	DECOY_PASSWORD_HASH,
	hashPassword,
	verifyPassword,
	type PasswordHash
} from './password.js';

/**
 * Accounts are OpenSim's own rows in its database: the simulator reads them at each viewer
 * login, so a change made here applies to the grid at once. Names are compared the way
 * OpenSim compares them, through the case-insensitive collation of UserAccounts.
 */

export class NameTakenError extends Error {
	constructor() {
		super('An account already has this name');
	}
}

export type DeletionBlocker = 'account_online' | 'account_estate_owner' | 'account_privileged';

export class DeletionBlockedError extends Error {
	constructor(readonly blocker: DeletionBlocker) {
		super(`Account deletion refused: ${blocker}`);
	}
}

export interface AccountSummary {
	id: string;
	firstName: string;
	lastName: string;
	createdAt: Date | null;
	lastLoginAt: Date | null;
	online: boolean;
}

export type AuthenticationResult =
	| { ok: true; user: { id: string; firstName: string; lastName: string } }
	| { ok: false; reason: 'credentials_invalid' | 'account_disabled' };

interface PasswordRow extends RowDataPacket {
	passwordHash: string | null;
	passwordSalt: string | null;
}

interface LoginRow extends PasswordRow {
	PrincipalID: string;
	FirstName: string;
	LastName: string;
	UserLevel: number;
}

interface SummaryRow extends RowDataPacket {
	PrincipalID: string;
	FirstName: string;
	LastName: string;
	Created: number | null;
	Online: string | null;
	Login: string | null;
}

interface BlockerRow extends RowDataPacket {
	UserLevel: number;
	online: number;
	estateOwner: number;
}

/** The stored hash, or null when the account has none. Callers then check the decoy, so every check costs the same. */
function storedHash(row: PasswordRow | undefined): PasswordHash | null {
	return row?.passwordHash && row.passwordSalt
		? { hash: row.passwordHash, salt: row.passwordSalt }
		: null;
}

function fromUnixSeconds(value: number | string | null): Date | null {
	const seconds = Number(value);
	return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
}

export async function authenticate(
	db: Queryable,
	firstName: string,
	lastName: string,
	password: string
): Promise<AuthenticationResult> {
	const [rows] = await db.execute<LoginRow[]>(
		`SELECT a.PrincipalID, a.FirstName, a.LastName, a.UserLevel, auth.passwordHash, auth.passwordSalt
		 FROM UserAccounts a
		 LEFT JOIN auth ON auth.UUID = a.PrincipalID
		 WHERE a.FirstName = :firstName AND a.LastName = :lastName
		 LIMIT 1`,
		{ firstName, lastName }
	);
	const row = rows[0];
	// Accounts without a password, such as the simulator's GRID SERVICES, cannot log in.
	const stored = storedHash(row);
	const matches = verifyPassword(password, stored ?? DECOY_PASSWORD_HASH);

	if (!row || !stored || !matches) return { ok: false, reason: 'credentials_invalid' };
	// Negative levels are OpenSim's way to bar an account from logging in.
	if (row.UserLevel < 0) return { ok: false, reason: 'account_disabled' };
	return {
		ok: true,
		user: { id: row.PrincipalID, firstName: row.FirstName, lastName: row.LastName }
	};
}

/** Creates an avatar as the console's `create user` does, in one transaction. */
export async function createAccount(
	db: Db,
	input: { firstName: string; lastName: string; password: string },
	now = new Date()
): Promise<{ id: string; firstName: string; lastName: string }> {
	const rows = buildNewAccount({
		firstName: input.firstName,
		lastName: input.lastName,
		password: hashPassword(input.password),
		now: Math.floor(now.getTime() / 1000)
	});

	// UserAccounts has no unique key on names: the lock keeps two signups for one name apart.
	await transaction(
		db,
		async (connection) => {
			const [existing] = await connection.execute<RowDataPacket[]>(
				'SELECT 1 FROM UserAccounts WHERE FirstName = :FirstName AND LastName = :LastName LIMIT 1',
				{ FirstName: rows.account.FirstName, LastName: rows.account.LastName }
			);
			if (existing.length > 0) throw new NameTakenError();

			await insertRow(connection, 'UserAccounts', rows.account);
			await insertRow(connection, 'auth', rows.auth);
			for (const folder of rows.folders) await insertRow(connection, 'inventoryfolders', folder);
			for (const item of rows.items) await insertRow(connection, 'inventoryitems', item);
			for (const entry of rows.avatar) await insertRow(connection, 'Avatars', entry);
		},
		'opensim_web_signup'
	);

	return { id: rows.account.PrincipalID, firstName: input.firstName, lastName: input.lastName };
}

/** Column names come from the row types in new-account.ts, never from user input. */
async function insertRow(
	connection: Connection,
	table: string,
	row: Record<string, string | number>
): Promise<void> {
	const columns = Object.keys(row);
	await connection.execute(
		`INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')})
		 VALUES (${columns.map((column) => `:${column}`).join(', ')})`,
		row
	);
}

export async function checkPassword(
	db: Queryable,
	userId: string,
	password: string
): Promise<boolean> {
	const [rows] = await db.execute<PasswordRow[]>(
		'SELECT passwordHash, passwordSalt FROM auth WHERE UUID = :userId',
		{ userId }
	);
	const stored = storedHash(rows[0]);
	const matches = verifyPassword(password, stored ?? DECOY_PASSWORD_HASH);
	return stored !== null && matches;
}

/** Sets a new password, as AuthenticationServiceBase.SetPassword does: new salt, new hash. */
export async function changePassword(
	db: Queryable,
	userId: string,
	password: string
): Promise<void> {
	const { hash, salt } = hashPassword(password);
	await db.execute(
		'UPDATE auth SET passwordHash = :hash, passwordSalt = :salt WHERE UUID = :userId',
		{ hash, salt, userId }
	);
}

export async function getAccountSummary(
	db: Queryable,
	userId: string
): Promise<AccountSummary | null> {
	const [rows] = await db.execute<SummaryRow[]>(
		`SELECT a.PrincipalID, a.FirstName, a.LastName, a.Created, g.Online, g.Login
		 FROM UserAccounts a
		 LEFT JOIN GridUser g ON g.UserID = a.PrincipalID
		 WHERE a.PrincipalID = :userId`,
		{ userId }
	);
	const row = rows[0];
	if (!row) return null;
	return {
		id: row.PrincipalID,
		firstName: row.FirstName,
		lastName: row.LastName,
		createdAt: fromUnixSeconds(row.Created),
		lastLoginAt: fromUnixSeconds(row.Login),
		// OpenSim writes "True" and "False".
		online: row.Online?.toLowerCase() === 'true'
	};
}

/** Why the account cannot be deleted from the portal, or null when it can. */
export async function getDeletionBlocker(
	db: Queryable,
	userId: string
): Promise<DeletionBlocker | null> {
	const [rows] = await db.execute<BlockerRow[]>(
		`SELECT a.UserLevel,
		        EXISTS (SELECT 1 FROM GridUser WHERE UserID = a.PrincipalID AND Online = 'true') AS online,
		        EXISTS (SELECT 1 FROM estate_settings WHERE EstateOwner = a.PrincipalID) AS estateOwner
		 FROM UserAccounts a
		 WHERE a.PrincipalID = :userId`,
		{ userId }
	);
	const row = rows[0];
	if (!row) return null;
	// The simulator keeps an online avatar's inventory in memory and would write it back.
	if (row.online) return 'account_online';
	// An estate without its owner cannot be managed from a viewer.
	if (row.estateOwner) return 'account_estate_owner';
	if (row.UserLevel > 0) return 'account_privileged';
	return null;
}

/**
 * Rows that belong to the account alone. What it built or left in the world stays: objects
 * and parcels belong to the regions, the simulator holds them in memory and would write
 * them back, and estate lists are cached the same way. Assets stay too, since objects and
 * other inventories may use them. Friends also matches Hypergrid entries, "<id>;<url>;...".
 */
const DELETE_STATEMENTS = [
	'DELETE FROM inventoryitems WHERE avatarID = :id',
	'DELETE FROM inventoryfolders WHERE agentID = :id',
	'DELETE FROM Avatars WHERE PrincipalID = :id',
	'DELETE FROM AgentPrefs WHERE PrincipalID = :id',
	"DELETE FROM Friends WHERE PrincipalID = :id OR Friend = :id OR Friend LIKE CONCAT(:id, ';%')",
	'DELETE FROM im_offline WHERE PrincipalID = :id',
	'DELETE FROM userprofile WHERE useruuid = :id',
	'DELETE FROM userdata WHERE UserId = :id',
	'DELETE FROM usernotes WHERE useruuid = :id OR targetuuid = :id',
	'DELETE FROM userpicks WHERE creatoruuid = :id',
	'DELETE FROM usersettings WHERE useruuid = :id',
	'DELETE FROM classifieds WHERE creatoruuid = :id',
	'DELETE FROM os_groups_membership WHERE PrincipalID = :id',
	'DELETE FROM os_groups_rolemembership WHERE PrincipalID = :id',
	'DELETE FROM os_groups_principals WHERE PrincipalID = :id',
	'DELETE FROM os_groups_invites WHERE PrincipalID = :id',
	'DELETE FROM GridUser WHERE UserID = :id',
	'DELETE FROM tokens WHERE UUID = :id',
	'DELETE FROM auth WHERE UUID = :id',
	'DELETE FROM web_sessions WHERE user_id = :id',
	'DELETE FROM UserAccounts WHERE PrincipalID = :id'
];

/** Deletes the account and everything that is its alone, in one transaction. */
export async function deleteAccount(db: Db, userId: string): Promise<void> {
	await transaction(db, async (connection) => {
		const blocker = await getDeletionBlocker(connection, userId);
		if (blocker) throw new DeletionBlockedError(blocker);
		for (const sql of DELETE_STATEMENTS) await connection.execute(sql, { id: userId });
	});
}

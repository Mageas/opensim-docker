import { createHash, randomUUID } from 'node:crypto';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';
import {
	authenticate,
	changePassword,
	checkPassword,
	createAccount,
	deleteAccount,
	DeletionBlockedError,
	getAccountSummary,
	getDeletionBlocker,
	NameTakenError
} from '../../src/lib/server/opensim/accounts.ts';
import type { NewAccount } from '../../src/lib/server/opensim/new-account.ts';
import { createSession, validateSessionToken } from '../../src/lib/server/sessions.ts';
import { expectedConsoleRows, normalizeAccountRows } from '../support/console-reference.ts';
import { STRONG_PASSWORD, uniqueName, useDatabase } from './support.ts';

const md5 = (text: string) => createHash('md5').update(text, 'utf8').digest('hex');

async function select(connection: Connection, sql: string, params: unknown[]) {
	const [rows] = await connection.query<RowDataPacket[]>(sql, params);
	return rows;
}

async function readAccountRows(connection: Connection, id: string) {
	const [account] = await select(connection, 'SELECT * FROM UserAccounts WHERE PrincipalID = ?', [
		id
	]);
	const [auth] = await select(connection, 'SELECT * FROM auth WHERE UUID = ?', [id]);
	return {
		account,
		auth,
		folders: (await select(connection, 'SELECT * FROM inventoryfolders WHERE agentID = ?', [
			id
		])) as unknown as NewAccount['folders'],
		items: (await select(connection, 'SELECT * FROM inventoryitems WHERE avatarID = ?', [
			id
		])) as unknown as NewAccount['items'],
		avatar: (await select(connection, 'SELECT * FROM Avatars WHERE PrincipalID = ?', [
			id
		])) as unknown as NewAccount['avatar']
	};
}

describe('accounts', () => {
	const { db, root } = useDatabase();
	const newUser = async (password = STRONG_PASSWORD) =>
		createAccount(db, { ...uniqueName(), password });

	describe('createAccount', () => {
		it("stores the rows of OpenSim's own `create user`", async () => {
			const user = await newUser();
			const rows = await readAccountRows(await root(), user.id);

			expect(normalizeAccountRows(rows)).toEqual(expectedConsoleRows());
			expect(rows.account).toMatchObject({
				FirstName: user.firstName,
				LastName: user.lastName,
				Email: ''
			});
		});

		it('stores a password the simulator accepts', async () => {
			const user = await newUser();
			const [auth] = await select(
				await root(),
				'SELECT passwordHash, passwordSalt FROM auth WHERE UUID = ?',
				[user.id]
			);
			// LLLoginService receives md5(password) from the viewer and checks it this way.
			expect(auth.passwordHash).toBe(md5(`${md5(STRONG_PASSWORD)}:${auth.passwordSalt}`));
		});

		it('refuses a name that exists, whatever its case', async () => {
			const name = uniqueName();
			await createAccount(db, { ...name, password: STRONG_PASSWORD });

			await expect(
				createAccount(db, {
					firstName: name.firstName.toUpperCase(),
					lastName: name.lastName.toLowerCase(),
					password: STRONG_PASSWORD
				})
			).rejects.toBeInstanceOf(NameTakenError);
		});

		it('creates one account when the same name is sent five times at once', async () => {
			const name = uniqueName();
			const results = await Promise.allSettled(
				Array.from({ length: 5 }, () => createAccount(db, { ...name, password: STRONG_PASSWORD }))
			);

			expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
			for (const result of results.filter((result) => result.status === 'rejected')) {
				expect(result.reason).toBeInstanceOf(NameTakenError);
			}
			const accounts = await select(
				await root(),
				'SELECT PrincipalID FROM UserAccounts WHERE FirstName = ? AND LastName = ?',
				[name.firstName, name.lastName]
			);
			expect(accounts).toHaveLength(1);
		});

		it('leaves nothing behind when a step fails', async () => {
			const name = uniqueName();
			const connection = await root();
			// Makes the last insert of the creation fail, for this name only.
			await connection.query(
				`CREATE TRIGGER fail_avatars BEFORE INSERT ON Avatars FOR EACH ROW
				 BEGIN
				   IF NEW.PrincipalID IN (SELECT PrincipalID FROM UserAccounts WHERE FirstName = '${name.firstName}') THEN
				     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced failure';
				   END IF;
				 END`
			);
			try {
				await expect(createAccount(db, { ...name, password: STRONG_PASSWORD })).rejects.toThrow(
					'forced failure'
				);
			} finally {
				await connection.query('DROP TRIGGER fail_avatars');
			}
			const leftovers = await select(connection, 'SELECT 1 FROM UserAccounts WHERE FirstName = ?', [
				name.firstName
			]);
			expect(leftovers).toHaveLength(0);
		});
	});

	describe('authenticate', () => {
		it('accepts the right password and gives the stored name', async () => {
			const user = await newUser();
			expect(await authenticate(db, user.firstName, user.lastName, STRONG_PASSWORD)).toEqual({
				ok: true,
				user: { id: user.id, firstName: user.firstName, lastName: user.lastName }
			});
		});

		it('matches the name without regard to case, as OpenSim does', async () => {
			const user = await newUser();
			const result = await authenticate(
				db,
				user.firstName.toLowerCase(),
				user.lastName.toUpperCase(),
				STRONG_PASSWORD
			);
			expect(result).toMatchObject({ ok: true, user: { firstName: user.firstName } });
		});

		it('gives the same answer for a wrong password and an unknown name', async () => {
			const user = await newUser();
			const wrong = await authenticate(db, user.firstName, user.lastName, `${STRONG_PASSWORD}!`);
			const unknown = await authenticate(db, 'Nobody', 'Here', STRONG_PASSWORD);
			expect(wrong).toEqual({ ok: false, reason: 'credentials_invalid' });
			expect(unknown).toEqual(wrong);
		});

		it('refuses an account without a password row', async () => {
			const user = await newUser();
			await (await root()).query('DELETE FROM auth WHERE UUID = ?', [user.id]);
			expect(await authenticate(db, user.firstName, user.lastName, STRONG_PASSWORD)).toEqual({
				ok: false,
				reason: 'credentials_invalid'
			});
		});

		it('refuses an account barred with a negative level', async () => {
			const user = await newUser();
			await (
				await root()
			).query('UPDATE UserAccounts SET UserLevel = -1 WHERE PrincipalID = ?', [user.id]);
			expect(await authenticate(db, user.firstName, user.lastName, STRONG_PASSWORD)).toEqual({
				ok: false,
				reason: 'account_disabled'
			});
		});

		it('accepts accounts that the console created, whose password it hashed', async () => {
			const id = randomUUID();
			const salt = md5(randomUUID());
			const connection = await root();
			await connection.query(
				"INSERT INTO UserAccounts (PrincipalID, ScopeID, FirstName, LastName, Created) VALUES (?, '00000000-0000-0000-0000-000000000000', 'Jean-Luc', ?, 0)",
				[id, `Console${salt.slice(0, 6)}`]
			);
			await connection.query(
				'INSERT INTO auth (UUID, passwordHash, passwordSalt) VALUES (?, ?, ?)',
				[id, md5(`${md5('short')}:${salt}`), salt]
			);
			const result = await authenticate(db, 'Jean-Luc', `Console${salt.slice(0, 6)}`, 'short');
			expect(result).toMatchObject({ ok: true, user: { id } });
		});
	});

	describe('changePassword', () => {
		it('replaces the hash and the salt', async () => {
			const user = await newUser();
			const connection = await root();
			const [before] = await select(connection, 'SELECT * FROM auth WHERE UUID = ?', [user.id]);

			await changePassword(db, user.id, 'a brand new passphrase');

			const [after] = await select(connection, 'SELECT * FROM auth WHERE UUID = ?', [user.id]);
			expect(after.passwordSalt).not.toBe(before.passwordSalt);
			expect(after.passwordHash).toBe(
				md5(`${md5('a brand new passphrase')}:${after.passwordSalt}`)
			);
			expect(await checkPassword(db, user.id, 'a brand new passphrase')).toBe(true);
			expect(await checkPassword(db, user.id, STRONG_PASSWORD)).toBe(false);
		});

		it('checks no password for an account that has none', async () => {
			expect(await checkPassword(db, randomUUID(), STRONG_PASSWORD)).toBe(false);
		});
	});

	describe('getAccountSummary', () => {
		it('reads the creation time and an empty grid history', async () => {
			const before = Math.floor(Date.now() / 1000) * 1000;
			const user = await newUser();
			const summary = await getAccountSummary(db, user.id);

			expect(summary).toMatchObject({
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				lastLoginAt: null,
				online: false
			});
			expect(summary!.createdAt!.getTime()).toBeGreaterThanOrEqual(before);
		});

		it('reads the last login and the online flag that OpenSim writes', async () => {
			const user = await newUser();
			await (
				await root()
			).query("INSERT INTO GridUser (UserID, Online, Login) VALUES (?, 'True', '1795790992')", [
				user.id
			]);
			expect(await getAccountSummary(db, user.id)).toMatchObject({
				online: true,
				lastLoginAt: new Date(1_795_790_992_000)
			});
		});

		it('gives nothing for an unknown id', async () => {
			expect(await getAccountSummary(db, randomUUID())).toBeNull();
		});
	});

	describe('getDeletionBlocker', () => {
		it('lets an ordinary offline account go', async () => {
			expect(await getDeletionBlocker(db, (await newUser()).id)).toBeNull();
		});

		it('keeps an avatar that is in the grid', async () => {
			const user = await newUser();
			await (
				await root()
			).query("INSERT INTO GridUser (UserID, Online) VALUES (?, 'True')", [user.id]);
			expect(await getDeletionBlocker(db, user.id)).toBe('account_online');
		});

		it('keeps an estate owner', async () => {
			const user = await newUser();
			await (
				await root()
			).query(
				`INSERT INTO estate_settings (EstateName, AbuseEmailToEstateOwner, DenyAnonymous, ResetHomeOnTeleport,
				   FixedSun, DenyTransacted, BlockDwell, DenyIdentified, AllowVoice, UseGlobalTime, PricePerMeter,
				   TaxFree, AllowDirectTeleport, RedirectGridX, RedirectGridY, ParentEstateID, SunPosition,
				   EstateSkipScripts, BillableFactor, PublicAccess, AbuseEmail, EstateOwner, DenyMinors)
				 VALUES ('Test Estate', 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, '', ?, 0)`,
				[user.id]
			);
			expect(await getDeletionBlocker(db, user.id)).toBe('account_estate_owner');
		});

		it('keeps an account with administrator rights', async () => {
			const user = await newUser();
			await (
				await root()
			).query('UPDATE UserAccounts SET UserLevel = 200 WHERE PrincipalID = ?', [user.id]);
			expect(await getDeletionBlocker(db, user.id)).toBe('account_privileged');
		});
	});

	describe('deleteAccount', () => {
		const GROUP = '11111111-1111-1111-1111-111111111111';
		const ROLE = '22222222-2222-2222-2222-222222222222';

		/** One row per table that holds the user's data, plus rows of `other` that must stay. */
		async function seed(connection: Connection, id: string, other: string) {
			const statements: [string, unknown[]][] = [
				['INSERT INTO GridUser (UserID) VALUES (?)', [id]],
				['INSERT INTO GridUser (UserID) VALUES (?)', [other]],
				["INSERT INTO tokens (UUID, token, validity) VALUES (?, 'tok', NOW())", [id]],
				['INSERT INTO AgentPrefs (PrincipalID) VALUES (?)', [id]],
				['INSERT INTO Friends (PrincipalID, Friend) VALUES (?, ?)', [id, other]],
				['INSERT INTO Friends (PrincipalID, Friend) VALUES (?, ?)', [other, id]],
				[
					'INSERT INTO Friends (PrincipalID, Friend) VALUES (?, ?)',
					[randomUUID(), `${id};http://hg.example:8002/;secret`]
				],
				['INSERT INTO Friends (PrincipalID, Friend) VALUES (?, ?)', [other, randomUUID()]],
				[
					"INSERT INTO im_offline (PrincipalID, FromID, Message) VALUES (?, ?, 'to the user')",
					[id, other]
				],
				[
					"INSERT INTO im_offline (PrincipalID, FromID, Message) VALUES (?, ?, 'from the user')",
					[other, id]
				],
				[
					`INSERT INTO userprofile (useruuid, profilePartner, profileAllowPublish, profileMaturePublish, profileURL,
					   profileWantToMask, profileWantToText, profileSkillsMask, profileSkillsText, profileLanguages,
					   profileImage, profileAboutText, profileFirstImage, profileFirstText)
					 VALUES (?, '', '0', '0', '', 0, '', 0, '', '', '', 'about me', '', '')`,
					[id]
				],
				["INSERT INTO userdata (UserId, TagId) VALUES (?, 'tag')", [id]],
				["INSERT INTO usernotes (useruuid, targetuuid, notes) VALUES (?, ?, 'note')", [id, other]],
				["INSERT INTO usernotes (useruuid, targetuuid, notes) VALUES (?, ?, 'note')", [other, id]],
				[
					`INSERT INTO userpicks (pickuuid, creatoruuid, toppick, parceluuid, name, description, snapshotuuid,
					   user, originalname, simname, posglobal, sortorder, enabled)
					 VALUES (?, ?, 'false', '', 'pick', '', '', '', '', '', '', 0, 'true')`,
					[randomUUID(), id]
				],
				[
					"INSERT INTO usersettings (useruuid, imviaemail, visible, email) VALUES (?, 'false', 'true', '')",
					[id]
				],
				[
					`INSERT INTO classifieds (classifieduuid, creatoruuid, creationdate, expirationdate, category, name,
					   description, parceluuid, parentestate, snapshotuuid, simname, posglobal, parcelname,
					   classifiedflags, priceforlisting)
					 VALUES (?, ?, 0, 0, '', 'ad', '', '', 0, '', '', '', '', 0, 0)`,
					[randomUUID(), id]
				],
				['INSERT INTO os_groups_membership (GroupID, PrincipalID) VALUES (?, ?)', [GROUP, id]],
				['INSERT INTO os_groups_membership (GroupID, PrincipalID) VALUES (?, ?)', [GROUP, other]],
				[
					'INSERT INTO os_groups_rolemembership (GroupID, RoleID, PrincipalID) VALUES (?, ?, ?)',
					[GROUP, ROLE, id]
				],
				['INSERT INTO os_groups_principals (PrincipalID) VALUES (?)', [id]],
				[
					'INSERT INTO os_groups_invites (InviteID, GroupID, PrincipalID) VALUES (?, ?, ?)',
					[randomUUID(), GROUP, id]
				]
			];
			for (const [sql, params] of statements) await connection.query(sql, params);
		}

		const TABLES_BY_USER: [string, string][] = [
			['UserAccounts', 'PrincipalID = :id'],
			['auth', 'UUID = :id'],
			['tokens', 'UUID = :id'],
			['GridUser', 'UserID = :id'],
			['inventoryfolders', 'agentID = :id'],
			['inventoryitems', 'avatarID = :id'],
			['Avatars', 'PrincipalID = :id'],
			['AgentPrefs', 'PrincipalID = :id'],
			['Friends', "PrincipalID = :id OR Friend = :id OR Friend LIKE CONCAT(:id, ';%')"],
			['im_offline', 'PrincipalID = :id'],
			['userprofile', 'useruuid = :id'],
			['userdata', 'UserId = :id'],
			['usernotes', 'useruuid = :id OR targetuuid = :id'],
			['userpicks', 'creatoruuid = :id'],
			['usersettings', 'useruuid = :id'],
			['classifieds', 'creatoruuid = :id'],
			['os_groups_membership', 'PrincipalID = :id'],
			['os_groups_rolemembership', 'PrincipalID = :id'],
			['os_groups_principals', 'PrincipalID = :id'],
			['os_groups_invites', 'PrincipalID = :id'],
			['web_sessions', 'user_id = :id']
		];

		async function countRows(connection: Connection, id: string) {
			const counts: Record<string, number> = {};
			for (const [table, where] of TABLES_BY_USER) {
				const [rows] = await connection.query<RowDataPacket[]>({
					sql: `SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`,
					namedPlaceholders: true,
					values: { id }
				});
				counts[table] = Number(rows[0].n);
			}
			return counts;
		}

		it("removes every row of the account and keeps other avatars' rows", async () => {
			const user = await newUser();
			const other = await newUser();
			const connection = await root();
			await seed(connection, user.id, other.id);
			await createSession(db, user.id);
			const { token: otherToken } = await createSession(db, other.id);

			const userCounts = await countRows(connection, user.id);
			expect(Object.entries(userCounts).filter(([, n]) => n === 0)).toEqual([]);
			const otherBefore = await readAccountRows(connection, other.id);

			await deleteAccount(db, user.id);

			const after = await countRows(connection, user.id);
			expect(after).toEqual(Object.fromEntries(TABLES_BY_USER.map(([table]) => [table, 0])));

			expect(await readAccountRows(connection, other.id)).toEqual(otherBefore);
			expect(await validateSessionToken(db, otherToken)).not.toBeNull();
			const kept = await select(
				connection,
				'SELECT Message FROM im_offline WHERE PrincipalID = ?',
				[other.id]
			);
			expect(kept.map((row) => String(row.Message))).toEqual(['from the user']);
			const otherFriends = await select(
				connection,
				'SELECT Friend FROM Friends WHERE PrincipalID = ?',
				[other.id]
			);
			expect(otherFriends).toHaveLength(1);
			expect(otherFriends[0].Friend).not.toBe(user.id);
		});

		it('refuses a blocked account and deletes nothing', async () => {
			const user = await newUser();
			const connection = await root();
			await connection.query("INSERT INTO GridUser (UserID, Online) VALUES (?, 'True')", [user.id]);
			const before = await countRows(connection, user.id);

			await expect(deleteAccount(db, user.id)).rejects.toEqual(
				new DeletionBlockedError('account_online')
			);
			expect(await countRows(connection, user.id)).toEqual(before);
		});
	});
});

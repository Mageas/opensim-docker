import mysql from 'mysql2/promise';
import { describe, expect, it } from 'vitest';
import { setupDatabase } from '../../scripts/setup-db.ts';
import { useDatabase } from './support.ts';

const ER_TABLEACCESS_DENIED = 1142;

describe('scripts/setup-db.ts', () => {
	const { db, root, config } = useDatabase();

	it.each([
		'SELECT * FROM prims LIMIT 1',
		'SELECT * FROM assets LIMIT 1',
		'SELECT * FROM estate_managers LIMIT 1',
		"UPDATE UserAccounts SET UserLevel = 250 WHERE FirstName = 'nobody'",
		'DELETE FROM regionsettings',
		'DROP TABLE web_sessions',
		'CREATE TABLE intruder (id INT)'
	])('keeps the portal account away from %s', async (sql) => {
		await expect(db.query(sql)).rejects.toMatchObject({ errno: ER_TABLEACCESS_DENIED });
	});

	it('runs again without harm and keeps the account usable', async () => {
		await setupDatabase(await root(), config);
		const [rows] = await db.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS n FROM web_sessions');
		expect(rows[0].n).toEqual(expect.any(Number));
	});

	it('refuses an account with database-wide privileges and leaves its grants alone', async () => {
		const connection = await root();
		await connection.query("CREATE USER IF NOT EXISTS 'broad'@'%' IDENTIFIED BY 'x'");
		await connection.query("GRANT ALL PRIVILEGES ON opensim.* TO 'broad'@'%'");

		await expect(
			setupDatabase(connection, { ...config, user: 'broad', password: 'y' })
		).rejects.toThrow(/database-wide privileges/);
		const [grants] = await connection.query<mysql.RowDataPacket[]>("SHOW GRANTS FOR 'broad'@'%'");
		expect(grants.map((row) => String(Object.values(row)[0])).join('\n')).toContain(
			'GRANT ALL PRIVILEGES ON `opensim`.*'
		);
	});

	it('refuses root', async () => {
		await expect(
			setupDatabase(await root(), { ...config, user: 'root', password: 'y' })
		).rejects.toThrow(/database-wide privileges/);
	});
});

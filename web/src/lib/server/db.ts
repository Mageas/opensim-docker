import mysql from 'mysql2/promise';

export type Db = mysql.Pool;
export type Connection = mysql.PoolConnection;
export type Queryable = Db | Connection;

export interface DbConfig {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
}

export function createDb(config: DbConfig): Db {
	return mysql.createPool({
		...config,
		connectionLimit: 5,
		charset: 'utf8mb4',
		timezone: 'Z',
		namedPlaceholders: true,
		enableKeepAlive: true
	});
}

const LOCK_TIMEOUT_SECONDS = 10;

/**
 * Runs `work` in one transaction on one connection: commits if it returns, rolls back if it
 * throws. With `lock`, the transaction also holds that MariaDB named lock, so two callers
 * with the same lock run one after the other.
 */
export async function transaction<T>(
	db: Db,
	work: (connection: Connection) => Promise<T>,
	lock?: string
): Promise<T> {
	const connection = await db.getConnection();
	try {
		if (lock) {
			const [rows] = await connection.query<mysql.RowDataPacket[]>(
				'SELECT GET_LOCK(:lock, :timeout) AS acquired',
				{ lock, timeout: LOCK_TIMEOUT_SECONDS }
			);
			if (rows[0]?.acquired !== 1) throw new Error(`Timed out waiting for lock ${lock}`);
		}
		try {
			await connection.beginTransaction();
			const result = await work(connection);
			await connection.commit();
			return result;
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			if (lock) await connection.query('SELECT RELEASE_LOCK(:lock)', { lock });
		}
	} finally {
		connection.release();
	}
}

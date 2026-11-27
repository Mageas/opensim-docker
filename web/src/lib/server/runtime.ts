import {
	MYSQL_DATABASE,
	MYSQL_HOST,
	MYSQL_PASSWORD,
	MYSQL_PORT,
	MYSQL_USER,
	OPENSIM_GRID_NAME,
	OPENSIM_LOGIN_URI
} from '$app/env/private';
import { createDb, type Db } from './db.js';

/** What the portal shows about the grid, for connecting a viewer. */
export interface Grid {
	name: string;
	loginUri: string;
}

let current: { db: Db; grid: Grid } | undefined;

/** Opens the database pool, once, at server start (the `init` hook). */
export function configure(): void {
	current = {
		db: createDb({
			host: MYSQL_HOST,
			port: MYSQL_PORT,
			database: MYSQL_DATABASE,
			user: MYSQL_USER,
			password: MYSQL_PASSWORD
		}),
		grid: { name: OPENSIM_GRID_NAME, loginUri: OPENSIM_LOGIN_URI }
	};
}

export function runtime(): { db: Db; grid: Grid } {
	if (!current) throw new Error('configure() has not run');
	return current;
}

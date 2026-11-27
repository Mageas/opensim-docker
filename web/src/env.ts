import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Checked when the server starts: a missing or invalid value stops it with the variable's
 * name. `vite build` also runs the app to analyse it, without these values: it gets blanks.
 */

function required(value: string | undefined): string {
	if (value) return value;
	if (building) return '';
	throw new Error('Value is missing');
}

function port(value: string | undefined): number {
	if (!value) return 3306;
	const number = Number(value);
	if (!Number.isInteger(number) || number < 1 || number > 65535)
		throw new Error('Not a port number');
	return number;
}

function httpUrl(value: string | undefined): string {
	const url = required(value);
	if (url && !/^https?:\/\/[^\s/]+/.test(url)) throw new Error('Not an http:// or https:// URL');
	return url;
}

export const variables = defineEnvVars({
	MYSQL_HOST: {
		schema: required,
		description: 'Host of the MariaDB server holding the OpenSim database'
	},
	MYSQL_PORT: { schema: port, description: 'Port of the MariaDB server, 3306 by default' },
	MYSQL_DATABASE: { schema: required, description: 'Name of the OpenSim database' },
	MYSQL_USER: {
		schema: required,
		description: "The portal's own MariaDB account (scripts/setup-db.ts)"
	},
	MYSQL_PASSWORD: { schema: required, description: "Password of the portal's MariaDB account" },
	OPENSIM_GRID_NAME: { schema: required, description: 'Grid name shown on every page' },
	OPENSIM_LOGIN_URI: {
		schema: httpUrl,
		description: 'Login URI that viewers add, e.g. http://grid.example.org:9000/'
	}
});

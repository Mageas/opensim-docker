import { describe, expect, it } from 'vitest';
import {
	expectedConsoleRows,
	normalizeAccountRows
} from '../../../../tests/support/console-reference.ts';
import { buildNewAccount, ZERO_UUID } from './new-account.js';

const build = () =>
	buildNewAccount({
		firstName: 'Ada',
		lastName: 'Lovelace',
		password: { hash: 'h'.repeat(32), salt: 's'.repeat(32) },
		now: 1_795_790_823
	});

describe('buildNewAccount', () => {
	it("writes the rows of OpenSim's own `create user`", () => {
		expect(normalizeAccountRows(build())).toEqual(expectedConsoleRows());
	});

	it('gives every row a fresh id and ties them to the account', () => {
		const rows = build();
		const id = rows.account.PrincipalID;
		const ids = [
			id,
			...rows.folders.map((f) => f.folderID),
			...rows.items.map((i) => i.inventoryID)
		];

		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.every((value) => /^[0-9a-f-]{36}$/.test(value) && value !== ZERO_UUID)).toBe(true);
		expect(rows.auth.UUID).toBe(id);
		expect(rows.folders.every((folder) => folder.agentID === id)).toBe(true);
		expect(rows.items.every((item) => item.avatarID === id && item.creatorID === id)).toBe(true);
		expect(rows.avatar.every((entry) => entry.PrincipalID === id)).toBe(true);
	});

	it('stores the name, the password hash and the creation time as given', () => {
		const rows = build();
		expect(rows.account).toMatchObject({
			FirstName: 'Ada',
			LastName: 'Lovelace',
			Created: 1_795_790_823
		});
		expect(rows.auth).toMatchObject({ passwordHash: 'h'.repeat(32), passwordSalt: 's'.repeat(32) });
		expect(rows.items.every((item) => item.creationDate === 1_795_790_823)).toBe(true);
	});

	it('has exactly one root folder', () => {
		const roots = build().folders.filter((folder) => folder.parentFolderID === ZERO_UUID);
		expect(roots).toHaveLength(1);
		expect(roots[0].folderName).toBe('My Inventory');
	});
});

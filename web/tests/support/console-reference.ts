import { readFileSync } from 'node:fs';
import type { NewAccount } from '../../src/lib/server/opensim/new-account.ts';

/**
 * Compares an account's rows with tests/fixtures/console-user.json, the rows that OpenSim's
 * own `create user` wrote. Ids differ on every run, so both sides name things instead:
 * a folder by its name, an item by "<folder>/<name>".
 */

type Rows = Pick<NewAccount, 'folders' | 'items' | 'avatar'> & {
	account: Record<string, unknown>;
	auth: Record<string, unknown>;
};

export const consoleReference = JSON.parse(
	readFileSync(new URL('../fixtures/console-user.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

export function normalizeAccountRows(rows: Rows) {
	const principalId = rows.account.PrincipalID;
	const folderName = new Map<string, string | null>([
		['00000000-0000-0000-0000-000000000000', null]
	]);
	for (const folder of rows.folders) folderName.set(folder.folderID, folder.folderName);
	const itemPath = new Map<string, string>();
	for (const item of rows.items) {
		itemPath.set(item.inventoryID, `${folderName.get(item.parentFolderID)}/${item.inventoryName}`);
	}
	const ref = (id: string) => (itemPath.has(id) ? { item: itemPath.get(id) } : id);

	return {
		account: {
			ScopeID: rows.account.ScopeID,
			ServiceURLs: rows.account.ServiceURLs,
			UserLevel: rows.account.UserLevel,
			UserFlags: rows.account.UserFlags,
			UserTitle: rows.account.UserTitle,
			active: rows.account.active
		},
		auth: { webLoginKey: rows.auth.webLoginKey, accountType: rows.auth.accountType },
		folders: rows.folders
			.map((folder) => ({
				name: folder.folderName,
				type: folder.type,
				version: folder.version,
				parent: folderName.get(folder.parentFolderID) ?? null
			}))
			.sort((a, b) => `${a.parent ?? ''}|${a.name}`.localeCompare(`${b.parent ?? ''}|${b.name}`)),
		items: rows.items
			.map((item) => ({
				folder: folderName.get(item.parentFolderID),
				name: item.inventoryName,
				asset: ref(item.assetID),
				assetType: item.assetType,
				invType: item.invType,
				flags: item.flags,
				description: item.inventoryDescription,
				creatorIsOwner: item.creatorID === principalId,
				basePermissions: item.inventoryBasePermissions,
				currentPermissions: item.inventoryCurrentPermissions,
				everyOnePermissions: item.inventoryEveryOnePermissions,
				groupPermissions: item.inventoryGroupPermissions,
				nextPermissions: item.inventoryNextPermissions,
				salePrice: item.salePrice,
				saleType: item.saleType,
				groupID: item.groupID,
				groupOwned: item.groupOwned
			}))
			.sort((a, b) => `${a.folder}|${a.name}`.localeCompare(`${b.folder}|${b.name}`)),
		avatar: Object.fromEntries(
			rows.avatar.map((entry): [string, unknown] => {
				if (!entry.Name.startsWith('Wearable')) return [entry.Name, entry.Value];
				const [itemId, asset] = entry.Value.split(':');
				return [entry.Name, { item: itemPath.get(itemId), asset }];
			})
		)
	};
}

/** The fixture in the same order as normalizeAccountRows, without its "source" note. */
export function expectedConsoleRows() {
	const reference = Object.fromEntries(
		Object.entries(consoleReference).filter(([key]) => key !== 'source')
	) as ReturnType<typeof normalizeAccountRows>;
	return {
		...reference,
		folders: [...reference.folders].sort((a, b) =>
			`${a.parent ?? ''}|${a.name}`.localeCompare(`${b.parent ?? ''}|${b.name}`)
		),
		items: [...reference.items].sort((a, b) =>
			`${a.folder}|${a.name}`.localeCompare(`${b.folder}|${b.name}`)
		)
	};
}

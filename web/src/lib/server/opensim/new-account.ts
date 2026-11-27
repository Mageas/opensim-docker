import { randomUUID } from 'node:crypto';
import type { PasswordHash } from './password.js';

/**
 * The rows OpenSim 0.9.3.0 writes when the console runs `create user` on a standalone
 * simulator (UserAccountService.CreateUser with CreateDefaultAvatarEntries = true):
 * the account, its password, the inventory skeleton and the default "Ruth" outfit.
 * tests/fixtures/console-user.json holds the rows OpenSim itself wrote, and the
 * integration tests compare this builder's output with them.
 *
 * Unlike the console, no home region is set: standalone keeps regions in memory, so the
 * database cannot name one. A login without a home goes to a default region.
 */

export const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

/** libOpenMetaverse FolderType values. */
const FolderType = {
	Texture: 0,
	Sound: 1,
	CallingCard: 2,
	Landmark: 3,
	Clothing: 5,
	Object: 6,
	Notecard: 7,
	Root: 8,
	LSLText: 10,
	BodyPart: 13,
	Trash: 14,
	Snapshot: 15,
	LostAndFound: 16,
	Animation: 20,
	Gesture: 21,
	Favorites: 23,
	CurrentOutfit: 46,
	Settings: 56
} as const;

const AssetType = { Clothing: 5, Bodypart: 13, Link: 24 } as const;
const INV_TYPE_WEARABLE = 18;

/** PermissionMask.All (move, modify, copy, transfer) and PermissionMask.Copy. */
const PERMISSIONS_ALL = 581632;
const PERMISSIONS_COPY = 32768;

/** AvatarWearable.DEFAULT_* assets, shipped in OpenSim's asset library. */
const DEFAULT_OUTFIT = [
	{ name: 'Default Eyes', wearable: 3, asset: '4bb6fa4d-1cd2-498a-a84c-95c1a0e745a7' },
	{ name: 'Default Shape', wearable: 0, asset: '66c41e39-38f9-f75a-024e-585989bfab73' },
	{ name: 'Default Skin', wearable: 1, asset: '77c41e39-38f9-f75a-024e-585989bbabbb' },
	{ name: 'Default Hair', wearable: 2, asset: 'd342e6c0-b9d2-11dc-95ff-0800200c9a66' },
	{ name: 'Default Shirt', wearable: 4, asset: '00000000-38f9-1111-024e-222222111110' },
	{ name: 'Default Pants', wearable: 5, asset: '00000000-38f9-1111-024e-222222111120' }
] as const;

/** AvatarAppearance's default visual parameters, as OpenSim stores them. */
const DEFAULT_VISUAL_PARAMS =
	'33,61,85,23,58,127,63,85,63,42,0,85,63,36,85,95,153,63,34,0,63,109,88,132,63,136,81,85,103,136,127,0,150,150,150,127,0,0,0,0,0,127,0,0,255,127,114,127,99,63,127,140,127,127,0,0,0,191,0,104,0,0,0,0,0,0,0,0,0,145,216,133,0,127,0,127,170,0,0,127,127,109,85,127,127,63,85,42,150,150,150,150,150,150,150,25,150,150,150,0,127,0,0,144,85,127,132,127,85,0,127,127,127,127,127,127,59,127,85,127,127,106,47,79,127,127,204,2,141,66,0,0,127,127,0,0,0,0,127,0,159,0,0,178,127,36,85,131,127,127,127,153,95,0,140,75,27,127,127,0,150,150,198,0,0,63,30,127,165,209,198,127,127,153,204,51,51,255,255,255,204,0,255,150,150,150,150,150,150,150,150,150,150,0,150,150,150,150,150,0,127,127,150,150,150,150,150,150,150,150,0,0,150,51,132,150,150,150';

export type AccountRow = {
	PrincipalID: string;
	ScopeID: string;
	FirstName: string;
	LastName: string;
	Email: string;
	ServiceURLs: string;
	Created: number;
	UserLevel: number;
	UserFlags: number;
	UserTitle: string;
	active: number;
};

export type AuthRow = {
	UUID: string;
	passwordHash: string;
	passwordSalt: string;
	webLoginKey: string;
	accountType: string;
};

export type FolderRow = {
	folderName: string;
	type: number;
	version: number;
	folderID: string;
	agentID: string;
	parentFolderID: string;
};

export type ItemRow = {
	assetID: string;
	assetType: number;
	inventoryName: string;
	inventoryDescription: string;
	inventoryNextPermissions: number;
	inventoryCurrentPermissions: number;
	invType: number;
	creatorID: string;
	inventoryBasePermissions: number;
	inventoryEveryOnePermissions: number;
	salePrice: number;
	saleType: number;
	creationDate: number;
	groupID: string;
	groupOwned: number;
	flags: number;
	inventoryID: string;
	avatarID: string;
	parentFolderID: string;
	inventoryGroupPermissions: number;
};

export type AvatarRow = {
	PrincipalID: string;
	Name: string;
	Value: string;
};

/** Type aliases, not interfaces, so the rows pass as query parameters. */
export interface NewAccount {
	account: AccountRow;
	auth: AuthRow;
	folders: FolderRow[];
	items: ItemRow[];
	avatar: AvatarRow[];
}

export interface NewAccountInput {
	firstName: string;
	lastName: string;
	password: PasswordHash;
	/** Unix time in seconds. */
	now: number;
	newId?: () => string;
}

export function buildNewAccount(input: NewAccountInput): NewAccount {
	const newId = input.newId ?? randomUUID;
	const principalId = newId();
	const folders: FolderRow[] = [];
	const items: ItemRow[] = [];

	// OpenSim bumps a folder's version for each folder or item stored in it.
	const bump = (folderId: string) => {
		const parent = folders.find((folder) => folder.folderID === folderId);
		if (parent) parent.version += 1;
	};

	const addFolder = (parentFolderID: string, type: number, folderName: string): string => {
		const folderID = newId();
		folders.push({
			folderName,
			type,
			version: 1,
			folderID,
			agentID: principalId,
			parentFolderID
		});
		bump(parentFolderID);
		return folderID;
	};

	const addItem = (item: {
		folder: string;
		name: string;
		asset: string;
		assetType: number;
		flags: number;
		permissions: number;
	}): string => {
		const inventoryID = newId();
		items.push({
			assetID: item.asset,
			assetType: item.assetType,
			inventoryName: item.name,
			inventoryDescription: '',
			inventoryNextPermissions: item.permissions,
			inventoryCurrentPermissions: item.permissions,
			invType: INV_TYPE_WEARABLE,
			creatorID: principalId,
			inventoryBasePermissions: item.permissions,
			inventoryEveryOnePermissions: item.permissions,
			salePrice: 0,
			saleType: 0,
			creationDate: input.now,
			groupID: ZERO_UUID,
			groupOwned: 0,
			flags: item.flags,
			inventoryID,
			avatarID: principalId,
			parentFolderID: item.folder,
			inventoryGroupPermissions: item.permissions
		});
		bump(item.folder);
		return inventoryID;
	};

	// XInventoryService.CreateUserInventory, in its order.
	const root = addFolder(ZERO_UUID, FolderType.Root, 'My Inventory');
	addFolder(root, FolderType.Animation, 'Animations');
	const bodyParts = addFolder(root, FolderType.BodyPart, 'Body Parts');
	const callingCards = addFolder(root, FolderType.CallingCard, 'Calling Cards');
	const friends = addFolder(callingCards, FolderType.CallingCard, 'Friends');
	addFolder(friends, FolderType.CallingCard, 'All');
	const clothing = addFolder(root, FolderType.Clothing, 'Clothing');
	const currentOutfit = addFolder(root, FolderType.CurrentOutfit, 'Current Outfit');
	addFolder(root, FolderType.Favorites, 'Favorites');
	addFolder(root, FolderType.Gesture, 'Gestures');
	addFolder(root, FolderType.Landmark, 'Landmarks');
	addFolder(root, FolderType.LostAndFound, 'Lost And Found');
	addFolder(root, FolderType.Notecard, 'Notecards');
	addFolder(root, FolderType.Object, 'Objects');
	addFolder(root, FolderType.Snapshot, 'Photo Album');
	addFolder(root, FolderType.LSLText, 'Scripts');
	addFolder(root, FolderType.Sound, 'Sounds');
	addFolder(root, FolderType.Texture, 'Textures');
	addFolder(root, FolderType.Trash, 'Trash');
	addFolder(root, FolderType.Settings, 'Settings');

	// UserAccountService.CreateDefaultAppearanceEntries: each wearable, then its
	// Current Outfit link.
	const avatar: AvatarRow[] = [];
	for (const piece of DEFAULT_OUTFIT) {
		const isClothing = piece.wearable >= 4;
		const itemId = addItem({
			folder: isClothing ? clothing : bodyParts,
			name: piece.name,
			asset: piece.asset,
			assetType: isClothing ? AssetType.Clothing : AssetType.Bodypart,
			flags: piece.wearable,
			permissions: PERMISSIONS_ALL
		});
		addItem({
			folder: currentOutfit,
			name: piece.name,
			asset: itemId,
			assetType: AssetType.Link,
			flags: piece.wearable,
			permissions: PERMISSIONS_COPY
		});
		avatar.push({
			PrincipalID: principalId,
			Name: `Wearable ${piece.wearable}:0`,
			Value: `${itemId}:${piece.asset}`
		});
	}
	avatar.push(
		{ PrincipalID: principalId, Name: 'AvatarHeight', Value: '1.9' },
		{ PrincipalID: principalId, Name: 'AvatarType', Value: '1' },
		{ PrincipalID: principalId, Name: 'Serial', Value: '0' },
		{ PrincipalID: principalId, Name: 'VisualParams', Value: DEFAULT_VISUAL_PARAMS }
	);

	return {
		account: {
			PrincipalID: principalId,
			ScopeID: ZERO_UUID,
			FirstName: input.firstName,
			LastName: input.lastName,
			Email: '',
			ServiceURLs: 'HomeURI= InventoryServerURI= AssetServerURI=',
			Created: input.now,
			UserLevel: 0,
			UserFlags: 0,
			UserTitle: '',
			active: 1
		},
		auth: {
			UUID: principalId,
			passwordHash: input.password.hash,
			passwordSalt: input.password.salt,
			webLoginKey: ZERO_UUID,
			accountType: 'UserAccount'
		},
		folders,
		items,
		avatar
	};
}

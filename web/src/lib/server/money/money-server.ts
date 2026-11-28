import { createHash } from 'node:crypto';
import http from 'node:http';
import { methodCall, parseMethodResponse, type XmlRpcStruct } from '../xmlrpc.js';

/** The DTL/NSL Money Server, on the Docker network (the `money` service). */
export interface MoneyServer {
	url: string;
	/** MoneyScriptAccessKey in its MoneyServer.ini. */
	scriptKey: string;
}

/** MoneyScriptIPaddress in the MoneyServer.ini that opensim/docker-entrypoint.sh writes. */
const SCRIPT_SALT = 'opensim-web';

/** TransactionType.BuyMoney in the DTL/NSL module. */
export const BUY_MONEY = 5010;

const TIMEOUT_MS = 10_000;

const md5 = (text: string) => createHash('md5').update(text, 'ascii').digest('hex');

/**
 * The secretAccessCode that handleScriptTransaction expects: it hashes the key with the
 * address it sees the request come from.
 */
export function accessCode(scriptKey: string, clientAddress: string): string {
	return md5(`${md5(`${scriptKey}_${clientAddress}`)}_${SCRIPT_SALT}`);
}

/**
 * Posts an XML-RPC call whose body needs the connection's own local address, which is the
 * address the Money Server sees: the Docker network has no NAT between containers.
 */
async function call(
	server: MoneyServer,
	method: string,
	build: (localAddress: string) => XmlRpcStruct
): Promise<XmlRpcStruct> {
	const body = await new Promise<string>((resolve, reject) => {
		// A new connection each time, so that `connect` fires and gives the local address.
		const request = http.request(server.url, {
			method: 'POST',
			agent: false,
			headers: { 'content-type': 'text/xml' },
			timeout: TIMEOUT_MS
		});
		request.on('socket', (socket) => {
			socket.once('connect', () => {
				const body = methodCall(method, build(socket.localAddress ?? ''));
				request.setHeader('content-length', Buffer.byteLength(body));
				request.end(body);
			});
		});
		request.on('timeout', () => request.destroy(new Error('The Money Server did not answer')));
		request.on('error', reject);
		request.on('response', (response) => {
			const chunks: Buffer[] = [];
			response.on('data', (chunk: Buffer) => chunks.push(chunk));
			response.on('error', reject);
			response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		});
	});
	return parseMethodResponse(body);
}

export class MoneyServerRefusedError extends Error {}

/**
 * Credits `amount` to an avatar from the system. The Money Server then pushes the new
 * balance to the avatar's viewer, if it is in a region. The avatar must have entered a
 * region once since the Money Server runs: it only knows avatars that have.
 */
export async function sendMoney(
	server: MoneyServer,
	transfer: { receiverId: string; amount: number; description: string }
): Promise<void> {
	const result = await call(server, 'SendMoney', (localAddress) => ({
		receiverID: transfer.receiverId,
		amount: transfer.amount,
		transactionType: BUY_MONEY,
		description: transfer.description,
		secretAccessCode: accessCode(server.scriptKey, localAddress)
	}));
	if (result.success !== true) {
		const reason = typeof result.message === 'string' ? result.message : 'no reason given';
		throw new MoneyServerRefusedError(`The Money Server refused the transfer: ${reason}`);
	}
}

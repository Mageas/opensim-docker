import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { methodResponse, parseMethodCall, type XmlRpcStruct } from '../xmlrpc.js';
import { accessCode, BUY_MONEY, MoneyServerRefusedError, sendMoney } from './money-server.js';

const md5 = (text: string) => createHash('md5').update(text).digest('hex');

describe('accessCode', () => {
	it("matches handleScriptTransaction's check in the Money Server", () => {
		// md5(md5(MoneyScriptAccessKey + "_" + client IP) + "_" + MoneyScriptIPaddress)
		const expected = md5(`${md5('the-key_172.18.0.5')}_opensim-web`);
		expect(accessCode('the-key', '172.18.0.5')).toBe(expected);
	});
});

describe('sendMoney', () => {
	let server: Server | undefined;
	afterEach(
		() => new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
	);

	/** A Money Server that checks the access code against the address it sees, as the real one does. */
	async function fakeMoneyServer(
		answer: (params: XmlRpcStruct, codeMatches: boolean) => XmlRpcStruct
	) {
		const calls: XmlRpcStruct[] = [];
		server = createServer((request, response) => {
			let body = '';
			request.on('data', (chunk: Buffer) => (body += chunk.toString()));
			request.on('end', () => {
				const call = parseMethodCall(body);
				calls.push({ method: call.method, ...call.params });
				const matches =
					call.params.secretAccessCode ===
					accessCode('the-key', request.socket.remoteAddress ?? '');
				response.setHeader('content-type', 'text/xml');
				response.end(methodResponse(answer(call.params, matches)));
			});
		});
		await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
		const { port } = server.address() as AddressInfo;
		return { url: `http://127.0.0.1:${port}/`, calls };
	}

	it('sends SendMoney with an access code built from the address the server sees', async () => {
		const fake = await fakeMoneyServer((_, matches) => ({ success: matches }));
		await sendMoney(
			{ url: fake.url, scriptKey: 'the-key' },
			{ receiverId: 'avatar-id', amount: 1000, description: 'Purchase pi_1' }
		);
		// The fake answers success only when the access code matches the address it sees.
		expect(fake.calls).toHaveLength(1);
		expect(fake.calls[0]).toMatchObject({
			method: 'SendMoney',
			receiverID: 'avatar-id',
			amount: 1000,
			transactionType: BUY_MONEY,
			description: 'Purchase pi_1'
		});
	});

	it('throws with the reason when the Money Server refuses', async () => {
		const fake = await fakeMoneyServer(() => ({ success: false, message: 'not match Script Key' }));
		const transfer = sendMoney(
			{ url: fake.url, scriptKey: 'wrong-key' },
			{ receiverId: 'avatar-id', amount: 10, description: 'x' }
		);
		await expect(transfer).rejects.toThrow(MoneyServerRefusedError);
		await expect(transfer).rejects.toThrow('not match Script Key');
	});
});

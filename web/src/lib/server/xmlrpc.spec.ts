import { describe, expect, it } from 'vitest';
import {
	methodCall,
	methodResponse,
	parseMethodCall,
	parseMethodResponse,
	XmlRpcError
} from './xmlrpc.js';

/** As a Second Life viewer sends it, whitespace included. */
const VIEWER_CALL = `<?xml version="1.0"?>
<methodCall>
  <methodName>buyCurrency</methodName>
  <params><param><value><struct>
    <member><name>agentId</name><value><string>8f2a9c1e-0000-4000-8000-000000000001</string></value></member>
    <member><name>password</name><value><string>  two spaces &amp; &lt;brackets&gt; </string></value></member>
    <member><name>language</name><value>en</value></member>
    <member><name>currencyBuy</name><value><int>1000</int></value></member>
    <member><name>viewerBuildVersion</name><value><i4>-5</i4></value></member>
    <member><name>empty</name><value><string/></value></member>
  </struct></value></param></params>
</methodCall>`;

describe('parseMethodCall', () => {
	it("reads a viewer's call, keeping spaces and decoding entities", () => {
		expect(parseMethodCall(VIEWER_CALL)).toEqual({
			method: 'buyCurrency',
			params: {
				agentId: '8f2a9c1e-0000-4000-8000-000000000001',
				password: '  two spaces & <brackets> ',
				language: 'en',
				currencyBuy: 1000,
				viewerBuildVersion: -5,
				empty: ''
			}
		});
	});

	it('reads booleans and nested structs', () => {
		const xml = methodCall('x', { flag: true, off: false, inner: { name: 'a' } });
		expect(parseMethodCall(xml).params).toEqual({ flag: true, off: false, inner: { name: 'a' } });
	});

	it('refuses a document with a DTD, whose entities could expand without end', () => {
		const xml = `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]><methodCall><methodName>&a;</methodName></methodCall>`;
		expect(() => parseMethodCall(xml)).toThrow(XmlRpcError);
	});

	it('refuses what is not a method call', () => {
		expect(() => parseMethodCall('<html><body>hello</body></html>')).toThrow(XmlRpcError);
		expect(() => parseMethodCall('<methodCall><params>')).toThrow(XmlRpcError);
		expect(() =>
			parseMethodCall(
				'<methodCall><methodName>x</methodName><params><param><value><int>one</int></value></param></params></methodCall>'
			)
		).toThrow(XmlRpcError);
	});
});

describe('methodResponse and parseMethodResponse', () => {
	it('round-trip a struct, escaping markup in strings', () => {
		const result = {
			success: false,
			errorMessage: 'A <b> & "quotes"',
			currency: { estimatedLocalCost: '2,50 €', currencyBuy: 625 }
		};
		expect(parseMethodResponse(methodResponse(result))).toEqual(result);
	});

	it('throws on a fault', () => {
		const fault =
			'<?xml version="1.0"?><methodResponse><fault><value><struct><member><name>faultCode</name><value><int>1</int></value></member></struct></value></fault></methodResponse>';
		expect(() => parseMethodResponse(fault)).toThrow(XmlRpcError);
	});
});

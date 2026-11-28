import { XMLParser } from 'fast-xml-parser';

/**
 * The part of XML-RPC that viewers and the Money Server use: one struct as the only
 * parameter, holding strings, integers, booleans and nested structs.
 */

export type XmlRpcValue = string | number | boolean | XmlRpcStruct;
export interface XmlRpcStruct {
	[name: string]: XmlRpcValue;
}

export interface MethodCall {
	method: string;
	params: XmlRpcStruct;
}

export class XmlRpcError extends Error {}

const parser = new XMLParser({
	ignoreAttributes: true,
	parseTagValue: false,
	// Passwords may start or end with spaces.
	trimValues: false,
	isArray: (name) => name === 'member' || name === 'param'
});

type Node = string | { [key: string]: unknown };

function parseDocument(xml: string): Record<string, unknown> {
	// No caller of these endpoints sends a DTD, and its entities could expand without end.
	if (/<!DOCTYPE/i.test(xml)) throw new XmlRpcError('DTDs are not accepted');
	try {
		return parser.parse(xml, true) as Record<string, unknown>;
	} catch (error) {
		throw new XmlRpcError('Not well-formed XML', { cause: error });
	}
}

/** The element inside a <value>, without the whitespace text between tags. */
function typed(node: Node): [string, Node] {
	if (typeof node === 'string') return ['string', node];
	const type = Object.keys(node).find((key) => !key.startsWith('#'));
	if (!type) return ['string', ''];
	return [type, node[type] as Node];
}

function decodeValue(node: Node): XmlRpcValue {
	const [type, content] = typed(node);
	switch (type) {
		case 'string':
			return typeof content === 'string' ? content : '';
		case 'int':
		case 'i4': {
			const number = typeof content === 'string' ? Number(content) : NaN;
			if (!Number.isInteger(number)) throw new XmlRpcError('An <int> holds no integer');
			return number;
		}
		case 'double':
			return Number(content);
		case 'boolean':
			return content === '1' || content === 'true';
		case 'struct':
			return decodeStruct(content);
		default:
			throw new XmlRpcError(`Unsupported value type: ${type}`);
	}
}

function decodeStruct(node: Node): XmlRpcStruct {
	const struct: XmlRpcStruct = {};
	if (typeof node === 'string') return struct;
	for (const member of (node.member as { name?: unknown; value?: Node }[] | undefined) ?? []) {
		if (typeof member.name !== 'string') throw new XmlRpcError('Member without a name');
		struct[member.name] = decodeValue(member.value ?? '');
	}
	return struct;
}

function firstParam(params: unknown): XmlRpcStruct {
	const param = (params as { param?: { value?: Node }[] } | undefined)?.param?.[0];
	if (!param) return {};
	const value = decodeValue(param.value ?? '');
	if (typeof value !== 'object') throw new XmlRpcError('The parameter is not a struct');
	return value;
}

export function parseMethodCall(xml: string): MethodCall {
	const call = parseDocument(xml).methodCall as { methodName?: unknown; params?: unknown };
	if (!call || typeof call.methodName !== 'string')
		throw new XmlRpcError('Not an XML-RPC method call');
	return { method: call.methodName.trim(), params: firstParam(call.params) };
}

/** The struct a method returned. Throws on a fault or a document that is not a response. */
export function parseMethodResponse(xml: string): XmlRpcStruct {
	const response = parseDocument(xml).methodResponse as { params?: unknown; fault?: unknown };
	if (!response) throw new XmlRpcError('Not an XML-RPC method response');
	if (response.fault) throw new XmlRpcError('The server answered with a fault');
	return firstParam(response.params);
}

function escape(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function encodeValue(value: XmlRpcValue): string {
	if (typeof value === 'string') return `<string>${escape(value)}</string>`;
	if (typeof value === 'boolean') return `<boolean>${value ? 1 : 0}</boolean>`;
	if (typeof value === 'number') {
		return Number.isInteger(value) ? `<int>${value}</int>` : `<double>${value}</double>`;
	}
	return encodeStruct(value);
}

function encodeStruct(struct: XmlRpcStruct): string {
	const members = Object.entries(struct).map(
		([name, value]) =>
			`<member><name>${escape(name)}</name><value>${encodeValue(value)}</value></member>`
	);
	return `<struct>${members.join('')}</struct>`;
}

export function methodCall(method: string, params: XmlRpcStruct): string {
	return `<?xml version="1.0"?><methodCall><methodName>${escape(method)}</methodName><params><param><value>${encodeStruct(params)}</value></param></params></methodCall>`;
}

export function methodResponse(result: XmlRpcStruct): string {
	return `<?xml version="1.0"?><methodResponse><params><param><value>${encodeStruct(result)}</value></param></params></methodResponse>`;
}

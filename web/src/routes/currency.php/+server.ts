import {
	answerHelperRequest,
	buyCurrencyForViewer,
	quoteCurrency
} from '#lib/server/money/helper.js';
import { runtime } from '#lib/server/runtime.js';
import type { RequestHandler } from './$types';

/** The viewer's Buy currency window. The simulator gives viewers this portal as its economy URL. */
export const POST: RequestHandler = ({ request, url }) => {
	const { payments, db, grid } = runtime();
	return answerHelperRequest({ payments, db, origin: url.origin, gridName: grid.name }, request, {
		getCurrencyQuote: quoteCurrency,
		buyCurrency: buyCurrencyForViewer
	});
};

import { answerHelperRequest, buyLand, quoteLand } from '#lib/server/money/helper.js';
import { runtime } from '#lib/server/runtime.js';
import type { RequestHandler } from './$types';

/** The viewer's Buy land window, which buys the currency a parcel needs beyond the balance. */
export const POST: RequestHandler = ({ request, url }) => {
	const { payments, db, grid } = runtime();
	return answerHelperRequest({ payments, db, origin: url.origin, gridName: grid.name }, request, {
		preflightBuyLandPrep: quoteLand,
		buyLandPrep: buyLand
	});
};

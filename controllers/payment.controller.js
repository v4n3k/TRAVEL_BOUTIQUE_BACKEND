import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { getDotEnvVar } from '../utils/utils.js';

const IS_DEV = getDotEnvVar('NODE_ENV') === 'dev';
const FRONTEND_URL = getDotEnvVar('FRONTEND_URL');
const LOCAL_FRONTEND_URL = getDotEnvVar('LOCAL_FRONTEND_URL');
const SHOP_ID = getDotEnvVar('SHOP_ID');
const YOOKASSA_SECRET_KEY = getDotEnvVar('YOOKASSA_SECRET_KEY');

const YooKassa = new YooCheckout(
	{ shopId: SHOP_ID, secretKey: YOOKASSA_SECRET_KEY }
);

class PaymentController {
	async createPayment(req, res) {
		try {
			const { amount, excursionId, excursionKey } = req.body;

			if (!amount) {
				return res.status(400).json({ error: 'Missing required amount field' });
			}

			if (!excursionId || !excursionKey) {
				return res.status(400).json({ error: 'Missing required excursion fields' });
			}

			const excursionKeyFromDbResult = await db.query(
				'SELECT key FROM excursions WHERE id = $1',
				[excursionId]
			);
			const excursionKeyFromDb = excursionKeyFromDbResult.rows[0].key;

			if (excursionKey !== excursionKeyFromDb) {
				return res.status(400).json({ error: 'Invalid excursion key' });
			}

			const payload = {
				amount: {
					value: `${amount}.00`,
					currency: 'RUB'
				},
				payment_method_data: {
					type: 'bank_card'
				},
				confirmation: {
					type: 'redirect',
					return_url: IS_DEV ? LOCAL_FRONTEND_URL : FRONTEND_URL
				},
				capture: true
			};

			const idempotenceKey = uuidv4();

			const payment = await YooKassa.createPayment(payload, idempotenceKey);

			res.json(payment);
		} catch (err) {
			res.status(500).json({ error: err });
			console.log(err);
		}
	}
}

export default new PaymentController();
import YooKassa from 'yookassa';
import { getDotEnvVar } from '../utils/utils';

const FRONTEND_URL = getDotEnvVar('FRONTEND_URL');
const SHOP_ID = getDotEnvVar('SHOP_ID');
const YOOKASSA_SECRET_KEY = getDotEnvVar('YOOKASSA_SECRET_KEY');

YooKassa.setAuth(SHOP_ID, YOOKASSA_SECRET_KEY);

class PaymentController {
	async createPayment(req, res) {
		const { amount, description } = req.body;

		try {
			const payment = await YooKassa.Payment.create({
				amount: {
					value: `${amount}.00`,
					currency: 'RUB'
				},
				confirmation: {
					type: 'redirect',
					return_url: FRONTEND_URL,
				},
				capture: true,
				description: description || 'Оплата товара'
			});

			res.json({ id: payment.id, confirmationUrl: payment.confirmation.confirmation_url });
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async checkPaymentStatus(req, res) {
		try {
			const paymentId = req.params.paymentId;

			const paymentInfo = await YooKassa.Payment.findOne(paymentId);

			if (paymentInfo.paid) {
				res.json({ success: true });
			} else {
				res.json({ success: false });
			}
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	};
}

export default new PaymentController();
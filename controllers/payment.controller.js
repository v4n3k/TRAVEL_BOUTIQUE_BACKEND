import { YooCheckout } from '@a2seven/yoo-checkout';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { formatPhoneForYookassa, getDotEnvVar } from '../utils/utils.js';

const IS_DEV = getDotEnvVar('NODE_ENV') === 'dev';
const FRONTEND_URL = getDotEnvVar('FRONTEND_URL');
const LOCAL_FRONTEND_URL = getDotEnvVar('LOCAL_FRONTEND_URL');
const SHOP_ID = getDotEnvVar('SHOP_ID');
const YOOKASSA_SECRET_KEY = getDotEnvVar('YOOKASSA_SECRET_KEY');

const YooKassa = new YooCheckout(
	{ shopId: SHOP_ID, secretKey: YOOKASSA_SECRET_KEY }
);

const errorMessages = {
	invalidExcursionKey: {
		error: 'Invalid excursion key',
		errorRu: 'Неверный ключ экскурсии'
	},
	excursionNotFound: {
		error: 'Excursion not found',
		errorRu: 'Экскурсия не найдена'
	},
	invalidAmount: {
		error: 'Invalid amount value',
		errorRu: 'Неверное значение суммы'
	},
	invalidPhoneFormat: {
		error: 'Invalid phone number format. Must be E.164 (e.g., +79001234567)',
		errorRu: 'Неверный формат номера телефона. Должен быть E.164 (например, +79001234567)'
	},

	missingRequiredFields: {
		error: 'Missing required excursion fields',
		errorRu: 'Отсутствуют обязательные поля экскурсии'
	},
	internalServerError: {
		error: 'Internal Server Error',
		errorRu: 'Внутренняя ошибка сервера'
	},
	yookassaApiDefault: {
		error: 'Yookassa API Error',
		errorRu: 'Ошибка API ЮKassa'
	},
	yookassaNetwork: {
		error: 'No response from Yookassa (Network Error or Timeout)',
		errorRu: 'Нет ответа от ЮKassa (ошибка сети или таймаут)'
	},
	requestPreparation: {
		error: 'Error preparing request',
		errorRu: 'Ошибка при подготовке запроса'
	}

};

class PaymentController {
	async createPayment(req, res) {
		try {
			const { amount: rawAmount, phone, excursionId, excursionKey } = req.body;

			const amount = Number(rawAmount);

			if (!excursionId || !excursionKey || !phone) {
				return res.status(400).json(errorMessages.missingRequiredFields);
			}

			if (isNaN(amount) || amount <= 0) {
				return res.status(400).json(errorMessages.invalidAmount);
			}

			const formattedPhone = formatPhoneForYookassa(phone);
			if (!formattedPhone) {
				return res.status(400).json(errorMessages.invalidPhoneFormat);
			}

			const excursionKeyFromDbResult = await db.query(
				'SELECT key FROM excursions WHERE id = $1',
				[excursionId]
			);

			if (excursionKeyFromDbResult.rows.length === 0) {
				return res.status(404).json(errorMessages.excursionNotFound);
			}

			const excursionKeyFromDb = excursionKeyFromDbResult.rows[0].key;

			if (excursionKey !== excursionKeyFromDb) {
				return res.status(400).json(errorMessages.invalidExcursionKey);
			}

			const receipt = {
				customer: {
					phone: formattedPhone,
				},
				items: [
					{
						description: `Оплата экскурсии`,
						quantity: '1.00', // Amount of the item
						amount: {
							value: amount.toFixed(2),
							currency: 'RUB'
						},
						vat_code: '1', // 0% of VAT (НДС)
						payment_mode: 'full_prepayment',
						payment_subject: 'service'
					}
				],
			};

			const payload = {
				amount: {
					value: amount.toFixed(2),
					currency: 'RUB'
				},
				payment_method_data: {
					type: 'bank_card'
				},
				confirmation: {
					type: 'redirect',
					return_url: IS_DEV ? LOCAL_FRONTEND_URL : FRONTEND_URL
				},
				capture: true,
				description: `Оплата экскурсии`,
				receipt
			};

			const idempotenceKey = uuidv4();

			const payment = await YooKassa.createPayment(payload, idempotenceKey);

			res.json({ confirmationUrl: payment.confirmation.confirmation_url });

		} catch (err) {
			console.error('Ошибка при создании платежа:', err);

			let finalError = errorMessages.internalServerError;
			let statusCode = 500;

			if (err.response) {
				statusCode = err.response.status;
				finalError = {
					error: err.response.data.description || err.response.data.message || errorMessages.yookassaApiDefault.error,
					errorRu: err.response.data.description || err.response.data.message || errorMessages.yookassaApiDefault.errorRu
				};
			} else if (err.request) {
				finalError = errorMessages.yookassaNetwork;
			} else {
				finalError = {
					error: err.message || errorMessages.yookassaApiDefault.error,
					errorRu: err.message || errorMessages.yookassaApiDefault.errorRu
				};
			}

			res.status(statusCode).json(finalError);
		}
	}
}

export default new PaymentController();
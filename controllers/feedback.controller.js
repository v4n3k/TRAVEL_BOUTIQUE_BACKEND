import { getDotEnvVar } from '../utils/utils.js';

class FeedbackController {
	async sendFeedbackToTelegramBot(req, res) {
		try {
			const { name, phone, comment } = req.body;

			if (!name || !phone || !comment) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const message = `Имя: ${name}\nТелефон: ${phone}\nКомментарий: ${comment}`;

			const response = await fetch(`https://api.telegram.org/bot${getDotEnvVar('BOT_TOKEN')}/sendMessage`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					chat_id: getDotEnvVar('CHAT_ID'),
					text: message,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to send feedback to Telegram bot');
			}

			res.json({ message: 'Feedback sent successfully' });
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
}

export default new FeedbackController();
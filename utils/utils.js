import jwt from 'jsonwebtoken';

export const getDotEnvVar = (varName) => {
	const varValue = process.env[varName];

	if (!varValue) {
		throw new Error(`Environment variable ${varName} is not set`);
	}

	return varValue;
};

export const getImageUrl = (req, res) => {
	try {
		if (!req.files) {
			res.status(400).send('Image is not uploaded');
		};

		let imageUrl = null;

		if (req.files && req.files.length > 0) {
			const imgFile = req.files[0];
			imageUrl = `${req.protocol}://${req.get('host')}/uploads/${imgFile.filename}`;
		}

		return imageUrl;
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

export const validateAuthToken = (req) => {
	try {
		const token = req.cookies.authToken;

		if (!token) {
			throw new Error('Authentication required');
		}

		jwt.verify(token, getDotEnvVar('JWT_SECRET'), (err) => {
			if (err) {
				throw new Error('Invalid token');
			}
		});

		return true;
	} catch (err) {
		throw err;
	}
};

export const formatPhoneForYookassa = (inputPhone) => {
	if (!inputPhone || typeof inputPhone !== 'string') {
		return null;
	}

	// Шаг 1: Удаляем все символы, кроме цифр и возможного плюса в начале строки.
	// Это позволяет сохранить + если он был введен в начале.
	let cleanedPhone = inputPhone.replace(/[^\d+]/g, '');

	// Шаг 2: Обрабатываем специфичные для России префиксы (8 -> +7),
	// если номер не начинается с плюса.
	if (!cleanedPhone.startsWith('+')) {
		if (cleanedPhone.startsWith('8') && cleanedPhone.length === 11) {
			// Российский номер, начинающийся с 8, заменяем на +7
			cleanedPhone = '+7' + cleanedPhone.substring(1);
		} else if (cleanedPhone.length === 10) {
			// Если 10-значный номер (без 8 или +), предполагаем российский 9xx и добавляем +7
			// Будьте осторожны: это предположение! Если у вас международная аудитория,
			// потребуется более сложная логика определения страны или явный ввод кода страны.
			cleanedPhone = '+7' + cleanedPhone;
		}
		// Для других стран без + в начале потребуется аналогичная логика.
		// Например, для США: if (cleanedPhone.length === 10) { cleanedPhone = '+1' + cleanedPhone; }
	}

	// Шаг 3: Проверяем финальный формат с помощью регулярного выражения E.164
	const yookassaPhoneRegex = /^\+\d{7,15}$/;

	if (yookassaPhoneRegex.test(cleanedPhone)) {
		return cleanedPhone;
	} else {
		return null; // Номер не соответствует формату E.164
	}
};

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

export const validateAuthToken = (req, res) => {
	const token = req.cookies.authToken;

	if (!token) {
		return res.status(401).json({ error: 'Authentication required' });
	}

	jwt.verify(token, getDotEnvVar("JWT_SECRET"), (err) => {
		if (err) {
			return res.status(403).json({ error: 'Invalid token' });
		}
	});
};
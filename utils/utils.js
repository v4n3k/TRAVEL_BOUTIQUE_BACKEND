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
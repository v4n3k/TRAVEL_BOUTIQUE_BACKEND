import { db } from '../db.js';

class ExcursionController {
	async createNewExcursion(req, res) {
		try {
			const {
				name,
				info,
				personsAmount,
				accompanistsAmount,
				price
			} = req.body;

			if (
				!name ||
				!info ||
				typeof personsAmount !== 'number' ||
				typeof accompanistsAmount !== 'number' ||
				typeof price !== 'number'
			) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			let imageUrl = null;

			if (req.files && req.files.length > 0) {
				const imgFile = req.files[0];
				imageUrl = `${req.protocol}://${req.get('host')}/uploads/${imgFile.filename}`;
			}

			const newExcursionResult = await db.query(
				`INSERT INTO excursions 
					(name, "uploadedImage", info, "personsAmount", "accompanistsAmount", price) 
					VALUES ($1, $2, $3, $4, $5, $6) 
				RETURNING *`,
				[name, imageUrl, info, personsAmount, accompanistsAmount, price]
			);

			const newExcursion = newExcursionResult.rows[0];

			res.json(newExcursion.rows[0]);

		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async getExcursions(req, res) {
		try {
			const excursionsResult = await db.query('SELECT * FROM excursions');

			const excursions = excursionsResult.rows;

			for (const excursion of excursions) {
				const eventsResult = await db.query(
					'SELECT id, name, time FROM "excursionEvents" WHERE "excursionId" = $1',
					[excursion.id]
				);
				excursion.excursionEvents = eventsResult.rows;
			}

			res.json(excursions);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
}

export default new ExcursionController();
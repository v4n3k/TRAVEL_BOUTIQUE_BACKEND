import { db } from '../db.js';
import { getImageUrl } from '../utils/utils.js';

class ExcursionController {
	async getExcursions(_, res) {
		try {
			const excursionsResult = await db.query('SELECT * FROM excursions');

			const excursions = excursionsResult.rows;

			if (!excursions) {
				res.status(404).json({ error: 'Excursions not found' });
			}

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

	async getExcursionById(req, res) {
		try {
			const id = parseInt(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json({ error: 'Invalid excursion ID' });
			}

			const excursionResult = await db.query(
				'SELECT * FROM excursions WHERE id = $1',
				[id]
			);

			const excursion = excursionResult.rows[0];

			if (!excursion) {
				return res.status(404).json({ error: 'Excursion not found' });
			}

			const excursionEventsResult = await db.query(
				`SELECT
					*,
					TO_CHAR(time, 'HH24:MI') AS time
		  	FROM
					"excursionEvents"
		  	WHERE
					"excursionId" = $1`,
				[id]
			);

			excursion.excursionEvents = excursionEventsResult.rows;

			res.json(excursion);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	createNewExcursion = async (req, res) => {
		try {
			const {
				name,
				city,
				info,
				personsAmount,
				accompanistsAmount,
				price,
				excursionEvents
			} = req.body;

			if (!name || !city || !info) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const timeRegExp = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

			JSON.parse(excursionEvents).forEach((excursionEvent) => {
				if (!excursionEvent.name || !excursionEvent.time) {
					return res.status(400).json({ error: 'Invalid time for excursion event' });
				}
			});


			const imageUrl = getImageUrl(req, res);

			const newExcursionResult = await db.query(
				`INSERT INTO excursions 
				 (name, city, "imgSrc", info, "personsAmount", "accompanistsAmount", price) 
				 VALUES ($1, $2, $3, $4, $5, $6, $7) 
				RETURNING *`,
				[name, city, imageUrl, info, personsAmount, accompanistsAmount, price]
			);

			const parsedExcursionEvents = JSON.parse(excursionEvents);

			if (!Array.isArray(parsedExcursionEvents)) {
				return res.status(400).json({ error: 'excursionEvents must be an array' });
			}

			for (const excursionEvent of parsedExcursionEvents) {
				if (
					!excursionEvent
					|| typeof excursionEvent.name !== 'string'
					|| !excursionEvent.name.trim()
				) {
					console.warn('Skipping excursionEvent with missing or invalid name:', excursionEvent);
					continue;
				}

				await db.query(
					`INSERT INTO "excursionEvents" ("excursionId", name, time) 
						 VALUES ($1, $2, $3)`,
					[newExcursionResult.rows[0].id, excursionEvent.name, excursionEvent.time]
				);
			}

			const newExcursion = newExcursionResult.rows[0];

			res.json(newExcursion);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	};
}

export default new ExcursionController();
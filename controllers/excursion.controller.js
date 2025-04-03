import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

	async createNewExcursion(req, res) {
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

	async updateExcursion(req, res) {
		try {
			const id = parseInt(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json({ error: 'Invalid excursion ID' });
			}

			const {
				name,
				city,
				info,
				personsAmount,
				accompanistsAmount,
				price,
				excursionEvents
			} = req.body;

			const imageUrl = getImageUrl(req, res);
			const setClauses = [];
			const values = [];
			let valueIndex = 1;
			let hasExcursionUpdateFields = false;

			if (name !== undefined) {
				setClauses.push(`name = $${valueIndex}`);
				values.push(name);
				valueIndex++;
				hasExcursionUpdateFields = true;
			}
			if (city !== undefined) {
				setClauses.push(`city = $${valueIndex}`);
				values.push(city);
				valueIndex++;
				hasExcursionUpdateFields = true;
			}
			if (info !== undefined) {
				setClauses.push(`info = $${valueIndex}`);
				values.push(info);
				valueIndex++;
				hasExcursionUpdateFields = true;
			}
			if (personsAmount !== undefined) {
				setClauses.push(`"personsAmount" = $${valueIndex}`);
				values.push(personsAmount);
				valueIndex++;
				hasExcursionUpdateFields = true;
			}
			if (accompanistsAmount !== undefined) {
				setClauses.push(`"accompanistsAmount" = $${valueIndex}`);
				values.push(accompanistsAmount);
				valueIndex++;
				hasExcursionUpdateFields = true;
			}
			if (price !== undefined) {
				setClauses.push(`price = $${valueIndex}`);
				values.push(price);
				valueIndex++;
				hasExcursionUpdateFields = true;
			}
			if (imageUrl) {
				setClauses.push(`"imgSrc" = $${valueIndex}`);
				values.push(imageUrl);
				valueIndex++;
				hasExcursionUpdateFields = true;
			}

			if (setClauses.length === 0 && excursionEvents === undefined) {
				return res.status(400).json({ error: 'No fields to update provided' });
			}

			let updatedExcursion;
			if (hasExcursionUpdateFields) {
				const updateQuery = `
          UPDATE excursions
          SET ${setClauses.join(', ')}
          WHERE id = $${valueIndex}
          RETURNING *
        `;
				values.push(id);
				const updatedExcursionResult = await db.query(updateQuery, values);
				updatedExcursion = updatedExcursionResult.rows[0];

				if (!updatedExcursion) {
					return res.status(404).json({ error: 'Excursion not found' });
				}
			} else {
				const excursionResult = await db.query(
					'SELECT * FROM excursions WHERE id = $1', [id]
				);
				updatedExcursion = excursionResult.rows[0];
				if (!updatedExcursion) {
					return res.status(404).json({ error: 'Excursion not found' });
				}
			}

			if (excursionEvents !== undefined) {
				try {
					JSON.parse(excursionEvents).forEach((excursionEvent) => {
						if (!excursionEvent.name || !excursionEvent.time) {
							return res.status(400).json({ error: 'Invalid time for excursion event in update' });
						}
					});
				} catch (error) {
					return res.status(400).json({ error: 'Invalid excursionEvents format in update, must be valid JSON array' });
				}

				const parsedExcursionEvents = JSON.parse(excursionEvents);
				if (!Array.isArray(parsedExcursionEvents)) {
					return res.status(400).json({ error: 'excursionEvents must be an array for update' });
				}

				await db.query('DELETE FROM "excursionEvents" WHERE "excursionId" = $1', [id]);

				for (const excursionEvent of parsedExcursionEvents) {
					if (
						!excursionEvent
						|| typeof excursionEvent.name !== 'string'
						|| !excursionEvent.name.trim()
					) {
						console.warn('Skipping excursionEvent with missing or invalid name during update:', excursionEvent);
						continue;
					}

					await db.query(
						`INSERT INTO "excursionEvents" ("excursionId", name, time)
              VALUES ($1, $2, $3)`,
						[id, excursionEvent.name, excursionEvent.time]
					);
				}
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

			updatedExcursion.excursionEvents = excursionEventsResult.rows;
			return res.status(404).json(updatedExcursion);

		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async deleteExcursion(req, res) {
		try {
			const id = parseInt(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json({ error: 'Invalid excursion ID' });
			}

			await db.query('DELETE FROM "excursionEvents" WHERE "excursionId" = $1', [id]);

			const deleteResult = await db.query('DELETE FROM excursions WHERE id = $1 RETURNING *', [id]);

			if (deleteResult.rows.length === 0) {
				return res.status(404).json({ error: 'Excursion not found' });
			}

			const deletedExcursion = deleteResult.rows[0];
			const imageUrl = deletedExcursion.imgSrc;

			if (imageUrl) {
				const filename = path.basename(imageUrl);

				const __filename = fileURLToPath(import.meta.url);
				const __dirname = path.dirname(__filename);

				const imagePath = path.join(__dirname, '../uploads', filename);

				if (fs.existsSync(imagePath)) {
					try {
						fs.unlinkSync(imagePath);
						console.log(`Deleted image: ${imagePath}`);
					} catch (unlinkError) {
						console.error(`Error deleting image: ${imagePath}`, unlinkError);
					}
				} else {
					console.warn(`Image file not found: ${imagePath}`);
				}
			}

			res.json({ message: 'Excursion deleted successfully', deletedExcursion: deleteResult.rows[0] });
		} catch (err) {

			res.status(500).json({ error: err.message });
		}
	}

	async generateKey(req, res) {
		try {
			const id = req.params.id;

			let key;
			let isKeyUnique = false;

			while (!isKeyUnique) {
				key = Array.from({ length: 10 }, () => String(Math.floor(Math.random() * 10))).join('');

				const result = await db.query('SELECT id FROM excursions WHERE key = $1', [key]);

				if (result.rows.length === 0) {
					isKeyUnique = true;
				}
			}

			await db.query('UPDATE excursions SET key = $1 WHERE id = $2', [key, id]);

			res.json(key);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
}

export default new ExcursionController();
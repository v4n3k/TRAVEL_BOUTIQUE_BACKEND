import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { getImageUrl, validateAuthToken } from '../utils/utils.js';

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

	async getExcursionsByCategoryName(req, res) {
		try {
			const categoryName = req.params.categoryName;

			if (!categoryName) {
				return res.status(400).json({ error: 'Category name is required' });
			}

			const excursionsResult = await db.query(
				'SELECT * FROM excursions WHERE "categoryName" = $1',
				[categoryName]
			);

			const excursions = excursionsResult.rows;

			if (!excursions || excursions.length === 0) {
				return res
					.status(404)
					.json({ error: 'No excursions found for this category' });
			}

			const excursionsWithEvents = await Promise.all(
				excursions.map(async (excursion) => {
					const excursionEventsResult = await db.query(
						`SELECT
						 *,
						 TO_CHAR(time, 'HH24:MI') AS time
						 FROM
						 "excursionEvents"
						 WHERE
						 "excursionId" = $1`,
						[excursion.id]
					);
					excursion.excursionEvents = excursionEventsResult.rows;
					return excursion;
				})
			);

			res.json(excursionsWithEvents);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async getExcursionsBySearch(req, res) {
		try {
			validateAuthToken(req);

			const { searchQuery } = req.body;

			if (!searchQuery) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const excursionsResult = await db.query('SELECT * FROM excursions');
			const excursions = excursionsResult.rows;

			if (!excursions || excursions.length === 0) {
				return res.status(404).json({ error: 'No excursions found' });
			}

			const excursionsWithEvents = await Promise.all(
				excursions.map(async (excursion) => {
					const excursionEventsResult = await db.query(
						`SELECT
						 *,
						 TO_CHAR(time, 'HH24:MI') AS time
						 FROM
						 "excursionEvents"
						 WHERE
						 "excursionId" = $1`,
						[excursion.id]
					);
					excursion.excursionEvents = excursionEventsResult.rows;
					return excursion;
				})
			);

			const filteredExcursions = excursionsWithEvents.filter((excursion) => {
				return excursion.name.toLowerCase().includes(searchQuery.toLowerCase());
			});

			if (!filteredExcursions || filteredExcursions.length === 0) {
				return res
					.status(404)
					.json({ error: 'No excursions found for this search query' });
			}

			res.json(filteredExcursions);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async getAllExcursionsCities(req, res) {
		try {
			const citiesResult = await db.query(
				`SELECT name as city from categories WHERE type = $1`,
				['cities']
			);

			const cities = citiesResult.rows.map((row, index) => {
				return {
					id: index + 1,
					name: row.city,
				};
			});

			if (!cities || cities.length === 0) {
				return res.status(404).json({ error: 'No cities found' });
			}

			res.json([...cities, ...cities]);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async createNewExcursion(req, res) {
		try {
			validateAuthToken(req);

			const {
				name,
				categoryName,
				info,
				personsAmount,
				accompanistsAmount,
				price,
				excursionEvents
			} = req.body;

			if (!name || !categoryName) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const persons = personsAmount === undefined || personsAmount === "undefined" ? null : parseInt(personsAmount, 10);
			const accompanists = accompanistsAmount === undefined || accompanistsAmount === "undefined" ? null : parseInt(accompanistsAmount, 10);
			const excursionPrice = price === undefined || price === "undefined" ? null : parseInt(price, 10);
			const excursionInfo = info === undefined || info === "undefined" ? null : info;

			console.log(info);

			JSON.parse(excursionEvents).forEach((excursionEvent) => {
				if (!excursionEvent.name || !excursionEvent.time) {
					return res.status(400).json({ error: 'Invalid time for excursion event' });
				}
			});

			const imageUrl = getImageUrl(req, res);

			const newExcursionResult = await db.query(
				`INSERT INTO excursions 
				 (name, "categoryName", "imgSrc", info, "personsAmount", "accompanistsAmount", price) 
				 VALUES ($1, $2, $3, $4, $5, $6, $7) 
				RETURNING *`,
				[name, categoryName, imageUrl, excursionInfo, persons, accompanists, excursionPrice]
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
			console.log(err);
		}
	};

	async updateExcursion(req, res) {
		try {
			validateAuthToken(req);

			const id = parseInt(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json({ error: 'Invalid excursion ID' });
			}

			const {
				name,
				categoryName,
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
			if (categoryName !== undefined) {
				setClauses.push(`categoryName = $${valueIndex}`);
				values.push(categoryName);
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

			return res.json(updatedExcursion);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async deleteExcursion(req, res) {
		try {
			validateAuthToken(req);

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
			validateAuthToken(req);

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
import { db } from '../db.js';
import { getImageUrl } from '../utils/utils.js';

class CategoryController {
	async createNewCategory(req, res) {
		try {
			const { name } = req.body;

			if (!name) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const imageUrl = getImageUrl(req, res);

			const newCategoryResult = await db.query(
				`INSERT INTO categories 
				  (name,  "imgSrc") 
				 	VALUES ($1, $2)`,
				[name, imageUrl]
			);

			const newCategory = newCategoryResult.rows[0];

			res.json(newCategory);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
}

export default new CategoryController();

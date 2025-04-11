import { db } from '../db.js';
import { getImageUrl, validateAuthToken } from '../utils/utils.js';

class CategoryController {
	async getCategories(req, res) {
		try {
			validateAuthToken(req);

			const categoriesResult = await db.query('SELECT * FROM categories');
			const categories = categoriesResult.rows;

			const categoriesByType = {
				cities: [],
				careerGuidance: [],
				weekends: [],
			};

			categories.forEach(category => {
				if (categoriesByType[category.type]) {
					categoriesByType[category.type].push(category);
				}
			});

			res.json(categoriesByType);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async getCategoriesBySearch(req, res) {
		try {
			validateAuthToken(req);

			const { categoryType, searchQuery } = req.body;

			if (!categoryType || !searchQuery) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			if (categoryType !== 'cities' && categoryType !== 'careerGuidance' && categoryType !== 'weekends') {
				return res.status(400).json({ error: 'Invalid category type' });
			}

			const categoriesByTypeResult = await db.query(
				'SELECT * FROM categories WHERE type = $1',
				[categoryType]
			);
			const categoriesByType = categoriesByTypeResult.rows;

			if (!categoriesByType || categoriesByType.length === 0) {
				return res.status(404).json({ error: 'No categories found for this type' });
			}

			const categories = categoriesByType.filter(category =>
				category.name.toLowerCase().includes(searchQuery.toLowerCase())
			);

			if (!categories || categories.length === 0) {
				return res.status(404).json({ error: 'No categories found for this search query' });
			}

			res.json(categories);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async createNewCategory(req, res) {
		try {
			validateAuthToken(req);

			const { name, type } = req.body;

			if (!name || !type) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const imageUrl = getImageUrl(req, res);

			const newCategoryResult = await db.query(
				`INSERT INTO categories
					(name, "imgSrc", type) 
				 	VALUES($1, $2, $3)`,
				[name, imageUrl, type]
			);

			const newCategory = newCategoryResult.rows[0];

			res.json(newCategory);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
}

export default new CategoryController();;

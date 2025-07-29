import { db } from '../db.js';
import { getImageUrl, validateAuthToken } from '../utils/utils.js';

class CategoryController {
	async getCategories(req, res) {
		try {
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

	async getCategoryById(req, res) {
		try {
			validateAuthToken(req);

			const { id } = req.params;

			if (parseInt(id) <= 0) {
				return res.status(400).json({ error: 'Invalid category ID' });
			}

			const categoryResult = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
			const category = categoryResult.rows[0];

			if (!category.id) {
				return res.status(404).json({ error: 'Category not found' });
			}

			res.json(category);

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

	async updateCategory(req, res) {
		try {
			validateAuthToken(req);

			const { id } = req.params;
			const { name } = req.body;

			if (parseInt(id) <= 0) {
				return res.status(400).json({ error: 'Invalid category ID' });
			}

			const imageUrl = getImageUrl(req, res);

			if (!name && !imageUrl) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const setClauses = [];
			const values = [];
			let valueIndex = 1;

			if (name) {
				setClauses.push(`name = $${valueIndex}`);
				values.push(name);
				valueIndex++;
			}

			if (imageUrl) {
				setClauses.push(`"imgSrc" = $${valueIndex}`);
				values.push(imageUrl);
				valueIndex++;
			}

			if (setClauses.length === 0) {
				return res.status(400).json({ error: 'Missing required fields' });
			}

			const updateQuery = `
				UPDATE categories 
				SET ${setClauses.join(', ')} 
				WHERE id = $${valueIndex}
				RETURNING *
			`;
			values.push(id);

			const updatedCategoryResult = await db.query(updateQuery, values);
			const updatedCategory = updatedCategoryResult.rows[0];

			res.json(updatedCategory);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	async deleteCategory(req, res) {
		try {
			validateAuthToken(req);

			const { id } = req.params;

			if (parseInt(id) <= 0) {
				return res.status(400).json({ error: 'Invalid category ID' });
			}

			const deleteResult = await db.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

			if (deleteResult.rows.length === 0) {
				return res.status(404).json({ error: 'Category not found' });
			}

			const deletedCategory = deleteResult.rows[0];
			const imageUrl = deletedCategory.imgSrc;

			if (imageUrl) {
				const filename = path.basename(imageUrl);

				const __filename = fileURLToPath(import.meta.url);
				const __dirname = path.dirname(__filename);

				const imagePath = path.join(__dirname, '../uploads', filename);

				if (fs.existsSync(imagePath)) {
					fs.unlinkSync(imagePath);
				}
			}

			res.json(deletedCategory);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
}
export default new CategoryController();

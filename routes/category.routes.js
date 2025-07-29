import express from 'express';
import { default as CategoryController } from '../controllers/category.controller.js';

export const router = express.Router();

router.get('/categories', CategoryController.getCategories);
router.post('/categories', CategoryController.getCategoriesBySearch);
router.get('/category/:id', CategoryController.getCategoryById);
router.post('/category', CategoryController.createNewCategory);
router.patch('/category/:id', CategoryController.updateCategory);
router.delete('/category/:id', CategoryController.deleteCategory);

export default router;
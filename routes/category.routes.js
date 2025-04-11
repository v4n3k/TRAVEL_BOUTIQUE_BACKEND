import express from 'express';
import { default as CategoryController } from '../controllers/category.controller.js';

export const router = express.Router();

router.get('/categories', CategoryController.getCategories);
router.post('/categories', CategoryController.getCategoriesBySearch);
router.post('/category', CategoryController.createNewCategory);

export default router;
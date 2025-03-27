import express from 'express';
import { default as CategoryController } from '../controllers/category.controller.js';

export const router = express.Router();

router.post('/category', CategoryController.createNewCategory);

export default router;
import express from 'express';
import { default as ExcursionController } from '../controllers/excursion.controller.js';

export const router = express.Router();

router.get('/excursions', ExcursionController.getExcursionsWithCities);
router.get('/excursion/:id', ExcursionController.getExcursionById);
router.get('/excursions/cities', ExcursionController.getAllExcursionsCities);
router.get('/excursions/:categoryName', ExcursionController.getExcursionsByCategoryName);
router.post('/excursions', ExcursionController.getExcursionsBySearch);
router.post('/excursion', ExcursionController.createNewExcursion);
router.patch('/excursion/:id', ExcursionController.updateExcursion);
router.delete('/excursion/:id', ExcursionController.deleteExcursion);
router.patch('/excursion/:id/key', ExcursionController.generateKey);

export default router;
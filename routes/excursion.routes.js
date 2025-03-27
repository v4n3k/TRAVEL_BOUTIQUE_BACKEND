import express from 'express';
import { default as ExcursionController } from '../controllers/excursion.controller.js';

export const router = express.Router();

router.get('/excursions', ExcursionController.getExcursions);
router.get('/excursion/:id', ExcursionController.getExcursionById);
router.post('/excursion', ExcursionController.createNewExcursion);

export default router;
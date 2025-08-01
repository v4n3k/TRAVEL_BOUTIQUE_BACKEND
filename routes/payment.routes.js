import express from 'express';
import { default as PaymentController } from '../controllers/payment.controller.js';

export const router = express.Router();

router.post('/payment', PaymentController.createPayment);

export default router;
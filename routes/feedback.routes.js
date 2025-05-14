import express from 'express';
import { default as FeedbackController } from '../controllers/feedback.controller.js';

export const router = express.Router();

router.post('/feedback', FeedbackController.sendFeedbackToTelegramBot);

export default router;
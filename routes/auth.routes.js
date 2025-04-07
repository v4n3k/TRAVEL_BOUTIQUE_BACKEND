import express from 'express';
import AuthController from '../controllers/auth.controller.js';

export const router = express.Router();

router.post('/auth/sign_up', AuthController.signUp);
router.post('/auth/sign_in', AuthController.signIn);
router.post('/auth/sign_out', AuthController.signOut);
router.get('/auth/check_token', AuthController.checkIsAuth)


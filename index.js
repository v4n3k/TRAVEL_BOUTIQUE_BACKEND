process.on('uncaughtException', (err) => {
	console.error('UNCAUGHT EXCEPTION: Server is shutting down...', err);
	process.exit(1);
});

process.on('unhandledRejection', (reason) => {
	console.error('UNHANDLED REJECTION: Server is shutting down...', reason);
	process.exit(1);
});

import pkg from 'cookie-parser';
import cors from 'cors';
import { config as dotenvConfig } from 'dotenv-esm';
import express from 'express';
import fs from 'fs/promises';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase } from './db.js';
import { router as authRouter } from './routes/auth.routes.js';
import { router as categoryRouter } from './routes/category.routes.js';
import { router as excursionRouter } from './routes/excursion.routes.js';
import { router as feedbackRouter } from './routes/feedback.routes.js';
import { router as paymentRouter } from './routes/payment.routes.js';
import { getDotEnvVar } from './utils/utils.js';

dotenvConfig();
const cookieParse = pkg;

const PORT = getDotEnvVar("BACKEND_PORT");
const FRONTEND_URL = getDotEnvVar("FRONTEND_URL");
const LOCAL_FRONTEND_URL = getDotEnvVar("LOCAL_FRONTEND_URL");
const IS_DEV = getDotEnvVar('NODE_ENV') === 'dev';

const app = express();

const startServer = async () => {
	try {
		console.log('Starting server initialization...');


		console.log('Initializing database...');
		await initializeDatabase();
		console.log('Database initialized successfully.');

		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const imageStorageDirectory = path.join(__dirname, 'uploads');

		console.log('Ensuring uploads directory exists...');
		await fs.mkdir(imageStorageDirectory, { recursive: true });
		console.log('Uploads directory ready.');

		app.use(helmet());
		app.use(express.json());
		app.use(cookieParse());
		app.use(cors({
			origin: IS_DEV ? LOCAL_FRONTEND_URL : FRONTEND_URL,
			methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'],
			allowedHeaders: [
				'Content-Type',
				'Authorization',
				'Accept',
				'Origin',
				'X-Requested-With'
			],
			credentials: true,
			preflightContinue: false,
			optionsSuccessStatus: 204
		}));

		app.use('/uploads', (req, res, next) => {
			res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
			next();
		});
		app.use('/uploads', express.static(imageStorageDirectory));

		const storage = multer.diskStorage({
			destination: (req, file, cb) => {
				cb(null, imageStorageDirectory);
			},
			filename: (req, file, cb) => {
				const ext = path.extname(file.originalname);
				const filename = `${uuidv4()}${ext}`;
				cb(null, filename);
			}
		});
		const upload = multer({ storage });

		app.use('/api/excursion', upload.any());
		app.use('/api/category', upload.any());

		app.use('/api', authRouter);
		app.use('/api', excursionRouter);
		app.use('/api', categoryRouter);
		app.use('/api', feedbackRouter);
		app.use('/api', paymentRouter);

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT} in ${getDotEnvVar('NODE_ENV')} mode`);
		});

	} catch (error) {
		console.error('FATAL ERROR: Server failed to start:', error);
		process.exit(1);
	}
};

startServer();
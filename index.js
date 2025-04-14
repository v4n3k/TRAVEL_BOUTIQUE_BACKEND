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
import { router as authRouter } from './routes/auth.routes.js';
import { router as categoryRouter } from './routes/category.routes.js';
import { router as excursionRouter } from './routes/excursion.routes.js';
import { getDotEnvVar } from './utils/utils.js';

dotenvConfig();

const cookieParse = pkg;

const PORT = getDotEnvVar("BACKEND_PORT");
const isDev = getDotEnvVar('NODE_ENV') === 'dev';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParse());
app.use(cors({
	origin: isDev ? 'http://localhost:5173' : 'http://103.88.243.252',
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imageStorageDirectory = path.join(__dirname, 'uploads');

await fs.mkdir(imageStorageDirectory, { recursive: true });

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

const start = (PORT) => {
	console.log(`Server is running on port ${PORT} in ${getDotEnvVar('NODE_ENV')} mode`);
};

app.listen(PORT, start(PORT)); 

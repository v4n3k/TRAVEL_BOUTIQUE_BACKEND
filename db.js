import { config as dotenvConfig } from 'dotenv-esm';
import pg from "pg";
import { getDotEnvVar } from './utils/utils.js';

dotenvConfig();

const { Pool } = pg;

const pool = new Pool({
  user: getDotEnvVar("DB_USER"),
  password: getDotEnvVar("DB_PASSWORD"),
  host: getDotEnvVar("DB_HOST"),
  port: getDotEnvVar("DB_PORT"),
  database: getDotEnvVar("DATABASE"),
});

export { pool as db };

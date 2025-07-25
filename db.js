import { config as dotenvConfig } from 'dotenv-esm';
import fs from "fs";
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

async function initializeDatabase() {
  try {
    const sql = fs.readFileSync("database.sql", "utf-8");
    console.log("Attempting to execute database.sql...");
    await pool.query(sql);
  } catch (error) {
    console.error("ERROR: Failed to initialize database:", error);
    process.exit(1);
  }
}

export { pool as db, initializeDatabase };

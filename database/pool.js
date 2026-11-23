import "dotenv/config";

import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const sslEnabled = process.env.DATABASE_SSL !== "false";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: sslEnabled
    ? { rejectUnauthorized: false }
    : false,

  max: Math.max(
    1,
    Number(process.env.PG_POOL_MAX || 10)
  ),

  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("error", error => {
  console.error(
    "[PostgreSQL] Pool error:",
    error.message
  );
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function initializeDatabase() {
  const here = path.dirname(
    fileURLToPath(import.meta.url)
  );

  const schemaPath = path.join(
    here,
    "schema.sql"
  );

  const schema = await fs.readFile(
    schemaPath,
    "utf8"
  );

  await pool.query(schema);

  console.log("[PostgreSQL] Database schema initialized.");
}

export async function closeDatabase() {
  await pool.end();

  console.log("[PostgreSQL] Database pool closed.");
}

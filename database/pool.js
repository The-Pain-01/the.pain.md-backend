import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : {
          rejectUnauthorized: false
        },

  max: Number(process.env.PG_POOL_MAX || 10),

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000
});

pool.on("error", error => {
  console.error(
    "[PostgreSQL] Pool error:",
    error.message
  );
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initializeDatabase() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const here = path.dirname(
    fileURLToPath(import.meta.url)
  );

  const schema = await fs.readFile(
    path.join(here, "schema.sql"),
    "utf8"
  );

  await pool.query(schema);
}

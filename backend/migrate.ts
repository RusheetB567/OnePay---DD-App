import { readFile } from "node:fs/promises";
import { Pool } from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_TLS !== "local"
      ? { rejectUnauthorized: true }
      : undefined,
});
try {
  for (const file of ["001-foundation.sql", "002-financial-domains.sql"]) {
    await pool.query(
      await readFile(new URL(`./migrations/${file}`, import.meta.url), "utf8"),
    );
  }
  console.log("Foundation and financial-domain migrations applied.");
} finally {
  await pool.end();
}

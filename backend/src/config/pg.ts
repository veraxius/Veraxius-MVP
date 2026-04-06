import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false as any
});

export async function ensureUsersTable(): Promise<void> {
  const sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  try {
    await pool.query(sql);
    // eslint-disable-next-line no-console
    console.log("Ensured users table exists");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error ensuring users table:", err);
  }
}

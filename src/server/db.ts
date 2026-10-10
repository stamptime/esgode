import "server-only";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL. Corre `vercel env pull .env.local`.");
}

export const sql = neon(process.env.DATABASE_URL);

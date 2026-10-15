import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// A local SQLite file in development, a hosted libSQL (Turso) database in
// production. TURSO_* are the names the Vercel Turso integration sets.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

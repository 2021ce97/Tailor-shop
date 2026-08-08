import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as core from "./schema-core";
import * as inventory from "./schema-inventory";
import * as tailoring from "./schema-tailoring";
import * as sales from "./schema-sales";

const connectionString = process.env.DATABASE_URL?.replace(
  /pooler\.supabase\.co(?=:)/,
  "pooler.supabase.com"
);

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
}

const shouldUseSsl = /sslmode=(require|verify-ca|verify-full)/i.test(connectionString) || /supabase\.(co|com)/i.test(connectionString);
const client = postgres(connectionString, {
  max: 10,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(client, {
  schema: { ...core, ...inventory, ...tailoring, ...sales },
});

export * from "./schema-core";
export * from "./schema-inventory";
export * from "./schema-tailoring";
export * from "./schema-sales";

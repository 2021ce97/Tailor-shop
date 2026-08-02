import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as core from "./schema-core";
import * as inventory from "./schema-inventory";
import * as tailoring from "./schema-tailoring";
import * as sales from "./schema-sales";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
}

const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, {
  schema: { ...core, ...inventory, ...tailoring, ...sales },
});

export * from "./schema-core";
export * from "./schema-inventory";
export * from "./schema-tailoring";
export * from "./schema-sales";

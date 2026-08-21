import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __db_client__: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL!;

// Reuse the connection across hot reloads in dev
const client =
  global.__db_client__ ?? postgres(connectionString, { max: 1 });

if (process.env.NODE_ENV !== "production") {
  global.__db_client__ = client;
}

export const db = drizzle(client, { schema });

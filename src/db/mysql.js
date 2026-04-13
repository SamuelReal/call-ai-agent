import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { runMySqlMigrations } from "./migrations.runner.js";

let pool;
let schemaReadyPromise;

function buildPool() {
  const sslConfig = env.MYSQL_SSL_ENABLED
    ? { rejectUnauthorized: env.MYSQL_SSL_REJECT_UNAUTHORIZED }
    : undefined;

  return mysql.createPool({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: env.MYSQL_CONNECTION_LIMIT,
    queueLimit: 0
  });
}

export function getMySqlPool() {
  if (!pool) {
    pool = buildPool();
  }
  return pool;
}

export async function ensureMySqlSchema() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    await runMySqlMigrations(getMySqlPool());
  })();

  return schemaReadyPromise;
}
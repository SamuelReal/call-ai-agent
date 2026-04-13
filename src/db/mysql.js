import mysql from "mysql2/promise";
import { env } from "../config/env.js";

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
    const db = getMySqlPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id VARCHAR(64) PRIMARY KEY,
        phone VARCHAR(32) NOT NULL UNIQUE,
        name VARCHAR(128) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS calls (
        call_id VARCHAR(64) PRIMARY KEY,
        data_json JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  })();

  return schemaReadyPromise;
}
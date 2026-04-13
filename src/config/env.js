import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
  API_VERSION: z.string().default("v1"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  DEEPSEEK_TIMEOUT_MS: z.string().default("12000"),
  STORAGE_PROVIDER: z.enum(["memory", "mysql"]).default("memory"),
  MYSQL_HOST: z.string().default("127.0.0.1"),
  MYSQL_PORT: z.string().default("3306"),
  MYSQL_USER: z.string().default("root"),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_DATABASE: z.string().default("call_ai_agent"),
  MYSQL_CONNECTION_LIMIT: z.string().default("10"),
  MYSQL_SSL_ENABLED: z.string().default("false"),
  MYSQL_SSL_REJECT_UNAUTHORIZED: z.string().default("true"),
  APPOINTMENTS_PROVIDER: z.enum(["memory", "api", "mysql"]).default("memory"),
  APPOINTMENTS_API_BASE_URL: z.string().url().default("http://localhost:4001"),
  APPOINTMENTS_API_KEY: z.string().optional(),
  APPOINTMENTS_API_AVAILABILITY_PATH: z.string().default("/api/v1/appointments/availability"),
  APPOINTMENTS_API_CREATE_PATH: z.string().default("/api/v1/appointments"),
  APPOINTMENTS_TIMEOUT_MS: z.string().default("6000"),
  INTERNAL_API_KEY: z.string().optional(),
  WEBHOOK_RATE_LIMIT_MAX: z.string().default("120"),
  WEBHOOK_RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
  INTERNAL_RATE_LIMIT_MAX: z.string().default("60"),
  INTERNAL_RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
  ZADARMA_BASE_URL: z.string().url().default("https://api.zadarma.com"),
  ZADARMA_API_KEY: z.string().optional(),
  ZADARMA_API_SECRET: z.string().optional(),
  ZADARMA_OUTBOUND_PATH: z.string().default("/v1/request/callback/"),
  ZADARMA_SECRET: z.string().optional(),
  ZADARMA_WEBHOOK_SIGNATURE_HEADER: z.string().default("x-zadarma-signature"),
  ZADARMA_WEBHOOK_TIMESTAMP_HEADER: z.string().default("x-zadarma-timestamp"),
  ZADARMA_WEBHOOK_TOLERANCE_SEC: z.string().default("300"),
  DEFAULT_TIMEZONE: z.string().default("Europe/Madrid")
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

function toBoolean(value, fallback) {
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(text)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(text)) {
    return false;
  }
  return fallback;
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
  DEEPSEEK_TIMEOUT_MS: Number(parsed.data.DEEPSEEK_TIMEOUT_MS),
  MYSQL_PORT: Number(parsed.data.MYSQL_PORT),
  MYSQL_CONNECTION_LIMIT: Number(parsed.data.MYSQL_CONNECTION_LIMIT),
  MYSQL_SSL_ENABLED: toBoolean(parsed.data.MYSQL_SSL_ENABLED, false),
  MYSQL_SSL_REJECT_UNAUTHORIZED: toBoolean(parsed.data.MYSQL_SSL_REJECT_UNAUTHORIZED, true),
  APPOINTMENTS_TIMEOUT_MS: Number(parsed.data.APPOINTMENTS_TIMEOUT_MS),
  WEBHOOK_RATE_LIMIT_MAX: Number(parsed.data.WEBHOOK_RATE_LIMIT_MAX),
  WEBHOOK_RATE_LIMIT_WINDOW_MS: Number(parsed.data.WEBHOOK_RATE_LIMIT_WINDOW_MS),
  INTERNAL_RATE_LIMIT_MAX: Number(parsed.data.INTERNAL_RATE_LIMIT_MAX),
  INTERNAL_RATE_LIMIT_WINDOW_MS: Number(parsed.data.INTERNAL_RATE_LIMIT_WINDOW_MS),
  ZADARMA_WEBHOOK_TOLERANCE_SEC: Number(parsed.data.ZADARMA_WEBHOOK_TOLERANCE_SEC)
};

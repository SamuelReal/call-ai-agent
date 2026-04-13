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
  APPOINTMENTS_PROVIDER: z.enum(["memory", "api"]).default("memory"),
  APPOINTMENTS_API_BASE_URL: z.string().url().default("http://localhost:4001"),
  APPOINTMENTS_API_KEY: z.string().optional(),
  APPOINTMENTS_API_AVAILABILITY_PATH: z.string().default("/api/v1/appointments/availability"),
  APPOINTMENTS_API_CREATE_PATH: z.string().default("/api/v1/appointments"),
  APPOINTMENTS_TIMEOUT_MS: z.string().default("6000"),
  INTERNAL_API_KEY: z.string().optional(),
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

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
  DEEPSEEK_TIMEOUT_MS: Number(parsed.data.DEEPSEEK_TIMEOUT_MS),
  APPOINTMENTS_TIMEOUT_MS: Number(parsed.data.APPOINTMENTS_TIMEOUT_MS),
  ZADARMA_WEBHOOK_TOLERANCE_SEC: Number(parsed.data.ZADARMA_WEBHOOK_TOLERANCE_SEC)
};

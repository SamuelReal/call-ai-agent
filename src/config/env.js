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
  REALTIME_WS_PATH: z.string().default("/ws/realtime"),
  REALTIME_WS_TOKEN: z.string().optional(),
  STT_PROVIDER: z.enum(["mock", "openai", "deepgram", "elevenlabs"]).default("mock"),
  TTS_PROVIDER: z.enum(["mock", "openai", "elevenlabs"]).default("mock"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_BASE_URL: z.string().url().default("https://api.elevenlabs.io"),
  ELEVENLABS_TIMEOUT_MS: z.string().default("15000"),
  ELEVENLABS_STT_MODEL_ID: z.string().default("scribe_v1"),
  ELEVENLABS_TTS_MODEL_ID: z.string().default("eleven_multilingual_v2"),
  ELEVENLABS_TTS_VOICE_ID: z.string().default("EXAVITQu4vr4xnSDxMaL"),
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
}).superRefine((data, ctx) => {
  const isProduction = data.NODE_ENV === "production";
  const usesElevenLabs = data.STT_PROVIDER === "elevenlabs" || data.TTS_PROVIDER === "elevenlabs";
  const usesMySql = data.STORAGE_PROVIDER === "mysql" || data.APPOINTMENTS_PROVIDER === "mysql";

  const missing = (path, message) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message
    });
  };

  const hasText = (value) => String(value || "").trim().length > 0;

  if (isProduction && !hasText(data.DEEPSEEK_API_KEY)) {
    missing("DEEPSEEK_API_KEY", "required in production");
  }

  if (usesElevenLabs && !hasText(data.ELEVENLABS_API_KEY)) {
    missing("ELEVENLABS_API_KEY", "required when STT/TTS provider is elevenlabs");
  }

  if (isProduction && !hasText(data.INTERNAL_API_KEY)) {
    missing("INTERNAL_API_KEY", "required in production");
  }

  if (isProduction && !hasText(data.REALTIME_WS_TOKEN)) {
    missing("REALTIME_WS_TOKEN", "required in production");
  }

  if (!hasText(data.ZADARMA_SECRET)) {
    missing("ZADARMA_SECRET", "required to validate webhook signatures");
  }

  if (usesMySql) {
    if (!hasText(data.MYSQL_HOST)) {
      missing("MYSQL_HOST", "required when MySQL is enabled");
    }
    if (!hasText(data.MYSQL_USER)) {
      missing("MYSQL_USER", "required when MySQL is enabled");
    }
    if (!hasText(data.MYSQL_PASSWORD)) {
      missing("MYSQL_PASSWORD", "required when MySQL is enabled");
    }
    if (!hasText(data.MYSQL_DATABASE)) {
      missing("MYSQL_DATABASE", "required when MySQL is enabled");
    }
  }
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
  ELEVENLABS_TIMEOUT_MS: Number(parsed.data.ELEVENLABS_TIMEOUT_MS),
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

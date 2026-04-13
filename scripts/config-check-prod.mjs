process.env.NODE_ENV = "production";

try {
  await import("../src/config/env.js");
  // eslint-disable-next-line no-console
  console.log("config_check_ok: production configuration is valid");
  process.exit(0);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("config_check_failed: production configuration is invalid");
  // eslint-disable-next-line no-console
  console.error(error?.message || String(error));
  process.exit(1);
}

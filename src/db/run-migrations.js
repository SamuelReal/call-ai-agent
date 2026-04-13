import { runMySqlMigrations } from "./migrations.runner.js";
import { getMySqlPool } from "./mysql.js";

runMySqlMigrations(getMySqlPool())
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("MySQL migrations completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("MySQL migrations failed", error);
    process.exit(1);
  });

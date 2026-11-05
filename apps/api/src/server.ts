import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 PingBoard API server listening on port ${env.PORT} (${env.NODE_ENV})`);
  logger.info(`AWS Region: ${env.AWS_REGION} | DynamoDB Table: ${env.DYNAMODB_TABLE_NAME}`);
  if (env.MOCK_AUTH) {
    logger.warn(`⚠️ MOCK_AUTH is enabled. Requests will authenticate automatically as usr_mock123`);
  }
});

// Graceful termination handling
const shutdown = () => {
  logger.info("Gracefully stopping API server...");
  server.close(() => {
    logger.info("API server stopped. Exiting process.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

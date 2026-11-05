import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DYNAMODB_TABLE_NAME: "PingBoardTestTable",
      AWS_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "mockAccessKeyId",
      AWS_SECRET_ACCESS_KEY: "mockSecretAccessKey",
      SQS_QUEUE_URL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
      CHECK_TIMEOUT_MS: "2000",
      MAX_RETRIES: "1",
      FAILURE_THRESHOLD: "3",
    },
  },
});

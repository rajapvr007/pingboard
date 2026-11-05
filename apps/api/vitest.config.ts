import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      MOCK_AUTH: "true",
      DYNAMODB_TABLE_NAME: "PingBoardTestTable",
      AWS_REGION: "us-east-1",
      PORT: "4000",
    },
  },
});

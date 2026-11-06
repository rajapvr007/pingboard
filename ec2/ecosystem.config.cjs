module.exports = {
  apps: [
    {
      name: "pingboard-api",
      script: "./apps/api/dist/server.js",
      instances: "max", // Cluster mode to utilize all CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        MOCK_AUTH: "false", // Or true if testing without Cognito
        AWS_REGION: "us-east-1",
        DYNAMODB_TABLE_NAME: "PingBoardTable",
      },
      watch: false,
      max_memory_restart: "400M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
    },
  ],
};

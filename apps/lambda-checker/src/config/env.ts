export const config = {
  region: process.env.AWS_REGION || "us-east-1",
  tableName: process.env.DYNAMODB_TABLE_NAME || "PingBoardTable",
  sqsQueueUrl: process.env.SQS_QUEUE_URL || "",
  defaultTimeoutMs: parseInt(process.env.CHECK_TIMEOUT_MS || "8000", 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || "1", 10),
  failureThreshold: parseInt(process.env.FAILURE_THRESHOLD || "3", 10),
  ttlDays: 30,
  sesSenderEmail: process.env.SES_SENDER_EMAIL || "alerts@pingboard.local",
  sesEnabled: process.env.SES_ENABLED === "true",
};

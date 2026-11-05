#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { DatabaseStack } from "../lib/database-stack";
import { QueueStack } from "../lib/queue-stack";
import { ComputeStack } from "../lib/compute-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1",
};

// 1. Auth Stack (AWS Cognito)
const authStack = new AuthStack(app, "PingBoard-AuthStack", {
  env,
  description: "PingBoard: AWS Cognito User Pool and SPA Client",
});

// 2. Database Stack (DynamoDB Single-Table)
const databaseStack = new DatabaseStack(app, "PingBoard-DatabaseStack", {
  env,
  description: "PingBoard: DynamoDB Single-Table with GSIs and 30-day TTL",
});

// 3. Queue Stack (SQS Check Queue + DLQ)
const queueStack = new QueueStack(app, "PingBoard-QueueStack", {
  env,
  description: "PingBoard: SQS Check Queue and Dead-Letter Queue",
});

// 4. Compute Stack (Lambda Checker, EventBridge Dispatcher, and Express API)
const computeStack = new ComputeStack(app, "PingBoard-ComputeStack", {
  env,
  table: databaseStack.table,
  checkQueue: queueStack.checkQueue,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  description: "PingBoard: Health-Check Lambdas, EventBridge 1m Rule, and Express API",
});
computeStack.addDependency(databaseStack);
computeStack.addDependency(queueStack);
computeStack.addDependency(authStack);

// 5. Frontend Hosting Stack (S3 + CloudFront CDN for React SPA)
const frontendStack = new FrontendStack(app, "PingBoard-FrontendStack", {
  env,
  description: "PingBoard: S3 Static Website and CloudFront Global Distribution",
});

app.synth();

import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface ComputeStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  checkQueue: sqs.Queue;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class ComputeStack extends cdk.Stack {
  public readonly workerLambda: lambda.Function;
  public readonly dispatcherLambda: lambda.Function;
  public readonly apiLambda: lambda.Function;
  public readonly apiFunctionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const lambdaCodePath = path.resolve(__dirname, "../../../apps/lambda-checker");
    const apiCodePath = path.resolve(__dirname, "../../../apps/api");

    /**
     * 1. Health-Checker Worker Lambda.
     * Consumes check jobs from SQS, executes HTTP checks, updates DynamoDB, and dispatches SES alerts.
     */
    this.workerLambda = new lambda.Function(this, "PingBoardWorkerFunction", {
      functionName: "pingboard-worker",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "dist/index.handler",
      code: lambda.Code.fromAsset(lambdaCodePath),
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      environment: {
        DYNAMODB_TABLE_NAME: props.table.tableName,
        SQS_QUEUE_URL: props.checkQueue.queueUrl,
        SES_ENABLED: "true",
        SES_SENDER_EMAIL: "alerts@pingboard.local",
        NODE_ENV: "production",
      },
    });

    // Grant Worker DynamoDB read/write, SQS consume, and SES email permissions
    props.table.grantReadWriteData(this.workerLambda);
    props.checkQueue.grantConsumeMessages(this.workerLambda);
    this.workerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"], // Restrict to verified domain/identity in production
      })
    );

    // Wire SQS Event Source to Worker Lambda
    this.workerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(props.checkQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
      })
    );

    /**
     * 2. EventBridge Scheduler Dispatcher Lambda.
     * Evaluates active monitors by interval (1, 5, 10 min) and feeds check jobs into SQS.
     */
    this.dispatcherLambda = new lambda.Function(this, "PingBoardDispatcherFunction", {
      functionName: "pingboard-dispatcher",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "dist/index.dispatcherHandler",
      code: lambda.Code.fromAsset(lambdaCodePath),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DYNAMODB_TABLE_NAME: props.table.tableName,
        SQS_QUEUE_URL: props.checkQueue.queueUrl,
        NODE_ENV: "production",
      },
    });

    // Grant Dispatcher permissions
    props.table.grantReadData(this.dispatcherLambda);
    props.checkQueue.grantSendMessages(this.dispatcherLambda);

    // EventBridge Rule: Trigger Dispatcher every 1 minute
    const minuteRule = new events.Rule(this, "OneMinuteCheckRule", {
      ruleName: "pingboard-1min-dispatcher-rule",
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description: "Triggers PingBoard health-check dispatcher every minute",
    });
    minuteRule.addTarget(new targets.LambdaFunction(this.dispatcherLambda));

    /**
     * 3. Express API Backend Lambda.
     * Serves Monitor CRUD, Metrics queries, and Status Page endpoints.
     */
    this.apiLambda = new lambda.Function(this, "PingBoardApiFunction", {
      functionName: "pingboard-api",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "dist/server.handler", // Or Lambda Function URL adapter
      code: lambda.Code.fromAsset(apiCodePath),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DYNAMODB_TABLE_NAME: props.table.tableName,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
        NODE_ENV: "production",
        MOCK_AUTH: "false",
      },
    });

    props.table.grantReadWriteData(this.apiLambda);

    // Enable HTTPS Lambda Function URL with CORS
    this.apiFunctionUrl = this.apiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["*"],
      },
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.apiFunctionUrl.url,
      description: "PingBoard Express API Endpoint URL",
      exportName: "PingBoard-ApiUrl",
    });
  }
}

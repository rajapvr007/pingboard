import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class QueueStack extends cdk.Stack {
  public readonly checkQueue: sqs.Queue;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Dead-Letter Queue (DLQ).
     * Collects poisoned messages or repeated unrecoverable failures for inspection.
     */
    this.dlq = new sqs.Queue(this, "PingBoardCheckDLQ", {
      queueName: "pingboard-check-dlq",
      retentionPeriod: cdk.Duration.days(14),
    });

    /**
     * Health Check SQS Queue.
     * Decouples EventBridge 1-minute scheduling from Lambda execution, buffering check jobs
     * and smoothing spikes. Visibility timeout is set to 60s (longer than the 10s HTTP timeout + retries).
     */
    this.checkQueue = new sqs.Queue(this, "PingBoardCheckQueue", {
      queueName: "pingboard-check-queue",
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: this.dlq,
      },
    });

    new cdk.CfnOutput(this, "CheckQueueUrl", {
      value: this.checkQueue.queueUrl,
      description: "SQS Check Queue URL",
      exportName: "PingBoard-CheckQueueUrl",
    });

    new cdk.CfnOutput(this, "CheckQueueArn", {
      value: this.checkQueue.queueArn,
      description: "SQS Check Queue ARN",
      exportName: "PingBoard-CheckQueueArn",
    });
  }
}

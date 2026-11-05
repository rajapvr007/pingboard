import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DatabaseStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Single-Table DynamoDB Architecture.
     * Consolidates Users, Monitors, Check Results, and Incidents into one table.
     * Uses On-Demand (PAY_PER_REQUEST) capacity for automatic scaling without provisioning overhead.
     */
    this.table = new dynamodb.Table(this, "PingBoardTable", {
      tableName: "PingBoardTable",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      // Automatically purges raw check records after 30 days without consuming write throughput
      timeToLiveAttribute: "expiresAt",
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For production change to RETAIN
    });

    /**
     * GSI1: Public Slug Lookup & Interval Scheduling Index
     * - Public page queries: GSI1PK = SLUG#<slug>, GSI1SK = PROFILE
     * - Dispatcher queries: GSI1PK = INTERVAL#<interval>, GSI1SK = MONITOR#<id>
     */
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "GSI1PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI1SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    /**
     * GSI2: Global Monitor Entity Lookup
     * - Allows looking up monitor metadata without knowing the partition owner user ID:
     *   GSI2PK = MONITOR#<id>, GSI2SK = METADATA
     */
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: {
        name: "GSI2PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI2SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
      description: "DynamoDB Table Name",
      exportName: "PingBoard-TableName",
    });

    new cdk.CfnOutput(this, "TableArn", {
      value: this.table.tableArn,
      description: "DynamoDB Table ARN",
      exportName: "PingBoard-TableArn",
    });
  }
}

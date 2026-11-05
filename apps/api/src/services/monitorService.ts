import { randomUUID } from "crypto";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamoClient";
import { env } from "../config/env";
import {
  CreateMonitorInput,
  UpdateMonitorInput,
  Monitor,
} from "@pingboard/shared";
import { NotFoundError } from "../utils/errors";

export class MonitorService {
  private tableName = env.DYNAMODB_TABLE_NAME;

  /**
   * Creates a new monitor in the single-table DynamoDB layout.
   * Access Pattern: AP-03
   * Key layout:
   *   PK: USER#<userId>
   *   SK: MONITOR#<monitorId>
   *   GSI1PK: INTERVAL#<checkInterval> (enables dispatcher to query monitors by interval)
   *   GSI1SK: MONITOR#<monitorId>
   *   GSI2PK: MONITOR#<monitorId>      (enables worker Lambda to look up monitor by ID)
   *   GSI2SK: METADATA
   */
  async createMonitor(userId: string, input: CreateMonitorInput): Promise<Monitor> {
    const monitorId = `mon_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const now = new Date().toISOString();

    const monitor: Monitor = {
      id: monitorId,
      userId,
      name: input.name,
      url: input.url,
      httpMethod: input.httpMethod,
      checkInterval: input.checkInterval,
      expectedStatusCode: input.expectedStatusCode,
      isActive: true,
      currentStatus: "PENDING",
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    };

    const item = {
      PK: `USER#${userId}`,
      SK: `MONITOR#${monitorId}`,
      entityType: "MONITOR",
      monitorId,
      userId,
      name: monitor.name,
      url: monitor.url,
      httpMethod: monitor.httpMethod,
      checkInterval: monitor.checkInterval,
      expectedStatusCode: monitor.expectedStatusCode,
      isActive: monitor.isActive,
      currentStatus: monitor.currentStatus,
      consecutiveFailures: monitor.consecutiveFailures,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `INTERVAL#${monitor.checkInterval}`,
      GSI1SK: `MONITOR#${monitorId}`,
      GSI2PK: `MONITOR#${monitorId}`,
      GSI2SK: "METADATA",
    };

    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return monitor;
  }

  /**
   * Retrieves all monitors for a specific user.
   * Access Pattern: AP-04
   */
  async listMonitors(userId: string): Promise<Monitor[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "MONITOR#",
      },
    });

    const result = await docClient.send(command);
    if (!result.Items) return [];

    return result.Items.map((item) => this.mapItemToMonitor(item));
  }

  /**
   * Retrieves a single monitor for a user.
   * Access Pattern: AP-03
   */
  async getMonitor(userId: string, monitorId: string): Promise<Monitor> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `MONITOR#${monitorId}`,
      },
    });

    const result = await docClient.send(command);
    if (!result.Item) {
      throw new NotFoundError(`Monitor with ID '${monitorId}' not found.`);
    }

    return this.mapItemToMonitor(result.Item);
  }

  /**
   * Updates an existing monitor.
   * Supports changing name, URL, method, interval, expected status code, and active state.
   */
  async updateMonitor(
    userId: string,
    monitorId: string,
    input: UpdateMonitorInput
  ): Promise<Monitor> {
    // Verify existence first
    const existing = await this.getMonitor(userId, monitorId);
    const now = new Date().toISOString();

    const updateExpressions: string[] = ["#updatedAt = :updatedAt"];
    const expressionNames: Record<string, string> = { "#updatedAt": "updatedAt" };
    const expressionValues: Record<string, unknown> = { ":updatedAt": now };

    if (input.name !== undefined) {
      updateExpressions.push("#name = :name");
      expressionNames["#name"] = "name";
      expressionValues[":name"] = input.name;
    }

    if (input.url !== undefined) {
      updateExpressions.push("#url = :url");
      expressionNames["#url"] = "url";
      expressionValues[":url"] = input.url;
    }

    if (input.httpMethod !== undefined) {
      updateExpressions.push("#httpMethod = :httpMethod");
      expressionNames["#httpMethod"] = "httpMethod";
      expressionValues[":httpMethod"] = input.httpMethod;
    }

    if (input.checkInterval !== undefined) {
      updateExpressions.push("#checkInterval = :checkInterval");
      expressionNames["#checkInterval"] = "checkInterval";
      expressionValues[":checkInterval"] = input.checkInterval;

      // Keep GSI1 updated if interval changes
      updateExpressions.push("#GSI1PK = :gsi1pk");
      expressionNames["#GSI1PK"] = "GSI1PK";
      expressionValues[":gsi1pk"] = `INTERVAL#${input.checkInterval}`;
    }

    if (input.expectedStatusCode !== undefined) {
      updateExpressions.push("#expectedStatusCode = :expectedStatusCode");
      expressionNames["#expectedStatusCode"] = "expectedStatusCode";
      expressionValues[":expectedStatusCode"] = input.expectedStatusCode;
    }

    if (input.isActive !== undefined) {
      updateExpressions.push("#isActive = :isActive");
      expressionNames["#isActive"] = "isActive";
      expressionValues[":isActive"] = input.isActive;
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `MONITOR#${monitorId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: "ALL_NEW",
    });

    const result = await docClient.send(command);
    if (!result.Attributes) {
      throw new NotFoundError(`Monitor with ID '${monitorId}' not found.`);
    }

    return this.mapItemToMonitor(result.Attributes);
  }

  /**
   * Deletes a monitor.
   * Access Pattern: AP-03
   */
  async deleteMonitor(userId: string, monitorId: string): Promise<void> {
    // Ensure it exists first
    await this.getMonitor(userId, monitorId);

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `MONITOR#${monitorId}`,
      },
    });

    await docClient.send(command);
  }

  private mapItemToMonitor(item: Record<string, any>): Monitor {
    return {
      id: item.monitorId,
      userId: item.userId,
      name: item.name,
      url: item.url,
      httpMethod: item.httpMethod,
      checkInterval: item.checkInterval,
      expectedStatusCode: item.expectedStatusCode,
      isActive: item.isActive,
      currentStatus: item.currentStatus || "PENDING",
      consecutiveFailures: item.consecutiveFailures || 0,
      lastCheckedAt: item.lastCheckedAt,
      lastStatusCode: item.lastStatusCode,
      lastResponseTimeMs: item.lastResponseTimeMs,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const monitorService = new MonitorService();

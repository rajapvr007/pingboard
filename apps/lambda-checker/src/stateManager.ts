import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "./config";
import { CheckJobMessage, ExecutionResult, StateTransitionResult } from "./types";

const client = new DynamoDBClient({
  region: config.region,
  ...(process.env.AWS_ACCESS_KEY_ID
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mockKey",
        },
      }
    : {}),
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export class StateManager {
  private tableName = config.tableName;

  /**
   * Persists check result in DynamoDB with a 30-day TTL.
   * Access Pattern: AP-07
   */
  async recordCheckResult(
    job: CheckJobMessage,
    result: ExecutionResult,
    timestamp: string = new Date().toISOString()
  ): Promise<string> {
    const checkId = `chk_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const expiresAt = Math.floor(Date.now() / 1000) + config.ttlDays * 24 * 60 * 60;

    const item = {
      PK: `MONITOR#${job.monitorId}`,
      SK: `CHECK#${timestamp}`,
      entityType: "CHECK_RESULT",
      checkId,
      monitorId: job.monitorId,
      timestamp,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      isUp: result.isUp,
      errorMessage: result.errorMessage,
      expiresAt,
    };

    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return checkId;
  }

  /**
   * Updates monitor state, tracks consecutive failures, opens/resolves incidents.
   */
  async updateMonitorState(
    job: CheckJobMessage,
    result: ExecutionResult,
    timestamp: string = new Date().toISOString()
  ): Promise<StateTransitionResult> {
    // 1. Fetch current monitor state
    const current = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${job.userId}`,
          SK: `MONITOR#${job.monitorId}`,
        },
      })
    );

    const prevFailures: number = current.Item?.consecutiveFailures ?? 0;
    const prevStatus: "UP" | "DOWN" = current.Item?.currentStatus === "DOWN" ? "DOWN" : "UP";
    const existingActiveIncidentId = current.Item?.activeIncidentId || null;
    const existingIncidentStartedAt = current.Item?.activeIncidentStartedAt || null;

    let newFailures = 0;
    let newStatus: "UP" | "DOWN" = prevStatus;
    let transitionedToDown = false;
    let transitionedToUp = false;
    let activeIncidentId = existingActiveIncidentId;
    let incidentStartedAt = existingIncidentStartedAt;

    if (result.isUp) {
      newFailures = 0;
      newStatus = "UP";
      if (prevStatus === "DOWN") {
        transitionedToUp = true;
      }
    } else {
      newFailures = prevFailures + 1;
      if (newFailures >= config.failureThreshold) {
        newStatus = "DOWN";
        if (prevStatus !== "DOWN") {
          transitionedToDown = true;
        }
      }
    }

    // 2. Incident Lifecycle
    // When transitioning to DOWN: open a new incident
    if (transitionedToDown) {
      activeIncidentId = `inc_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
      incidentStartedAt = timestamp;

      await docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: `MONITOR#${job.monitorId}`,
            SK: `INCIDENT#${timestamp}`,
            entityType: "INCIDENT",
            incidentId: activeIncidentId,
            monitorId: job.monitorId,
            monitorName: job.monitorName || current.Item?.name || "Monitor",
            userId: job.userId,
            status: "OPEN",
            cause: result.errorMessage || `Failed with status code ${result.statusCode}`,
            startedAt: timestamp,
            resolvedAt: null,
            durationSeconds: null,
          },
        })
      );
    }

    // When recovering to UP: resolve the active incident
    if (transitionedToUp && existingActiveIncidentId && existingIncidentStartedAt) {
      const startTime = new Date(existingIncidentStartedAt).getTime();
      const endTime = new Date(timestamp).getTime();
      const durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));

      await docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: `MONITOR#${job.monitorId}`,
            SK: `INCIDENT#${existingIncidentStartedAt}`,
          },
          UpdateExpression:
            "SET #status = :resolved, resolvedAt = :resolvedAt, durationSeconds = :duration",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":resolved": "RESOLVED",
            ":resolvedAt": timestamp,
            ":duration": durationSeconds,
          },
        })
      );

      activeIncidentId = null;
      incidentStartedAt = null;
    }

    // 3. Update monitor record
    await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${job.userId}`,
          SK: `MONITOR#${job.monitorId}`,
        },
        UpdateExpression:
          "SET currentStatus = :status, consecutiveFailures = :failures, lastCheckedAt = :checkedAt, lastStatusCode = :statusCode, lastResponseTimeMs = :responseTime, activeIncidentId = :actIncId, activeIncidentStartedAt = :actIncStart, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":status": newStatus,
          ":failures": newFailures,
          ":checkedAt": timestamp,
          ":statusCode": result.statusCode,
          ":responseTime": result.responseTimeMs,
          ":actIncId": activeIncidentId,
          ":actIncStart": incidentStartedAt,
          ":updatedAt": timestamp,
        },
      })
    );

    return {
      monitorId: job.monitorId,
      previousFailures: prevFailures,
      consecutiveFailures: newFailures,
      currentStatus: newStatus,
      transitionedToDown,
      transitionedToUp,
      activeIncidentId,
      incidentStartedAt: existingIncidentStartedAt,
    };
  }
}

export const stateManager = new StateManager();

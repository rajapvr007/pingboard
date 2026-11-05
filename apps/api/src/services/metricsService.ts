import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamoClient";
import { env } from "../config/env";
import { Incident } from "@pingboard/shared";

export interface MetricDataPoint {
  timestamp: string;
  responseTimeMs: number;
  isUp: boolean;
}

export interface MonitorMetrics {
  monitorId: string;
  range: "24h" | "7d" | "30d";
  uptimePercentage: number;
  averageResponseTimeMs: number;
  totalChecks: number;
  series: MetricDataPoint[];
}

export class MetricsService {
  private tableName = env.DYNAMODB_TABLE_NAME;

  /**
   * Queries check results for a monitor over the requested time window (24h, 7d, 30d).
   * Calculates uptime percentage, average response latency, and returns time-series points for Recharts.
   * Access Pattern: AP-08
   */
  async getMetrics(
    monitorId: string,
    range: "24h" | "7d" | "30d" = "24h"
  ): Promise<MonitorMetrics> {
    const now = new Date();
    let startTime: Date;

    switch (range) {
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "24h":
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :startSk AND :endSk",
      ExpressionAttributeValues: {
        ":pk": `MONITOR#${monitorId}`,
        ":startSk": `CHECK#${startTime.toISOString()}`,
        ":endSk": `CHECK#${now.toISOString()}`,
      },
    });

    const result = await docClient.send(command);
    const checks = result.Items || [];

    if (checks.length === 0) {
      return {
        monitorId,
        range,
        uptimePercentage: 100,
        averageResponseTimeMs: 0,
        totalChecks: 0,
        series: [],
      };
    }

    let upCount = 0;
    let totalLatency = 0;
    let validLatencyCount = 0;

    const series: MetricDataPoint[] = [];

    for (const item of checks) {
      if (item.isUp) {
        upCount++;
        if (typeof item.responseTimeMs === "number" && item.responseTimeMs > 0) {
          totalLatency += item.responseTimeMs;
          validLatencyCount++;
        }
      }

      series.push({
        timestamp: item.timestamp,
        responseTimeMs: item.responseTimeMs || 0,
        isUp: Boolean(item.isUp),
      });
    }

    const uptimePercentage = Number(((upCount / checks.length) * 100).toFixed(2));
    const averageResponseTimeMs =
      validLatencyCount > 0 ? Math.round(totalLatency / validLatencyCount) : 0;

    // Sub-sample series if data points exceed 100 to ensure fast chart rendering
    const sampledSeries = this.sampleSeries(series, 100);

    return {
      monitorId,
      range,
      uptimePercentage,
      averageResponseTimeMs,
      totalChecks: checks.length,
      series: sampledSeries,
    };
  }

  /**
   * Retrieves incident history for a monitor, newest first.
   * Access Pattern: AP-10
   */
  async getIncidents(monitorId: string, limit = 50): Promise<Incident[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `MONITOR#${monitorId}`,
        ":skPrefix": "INCIDENT#",
      },
      ScanIndexForward: false, // Newest incidents first
      Limit: limit,
    });

    const result = await docClient.send(command);
    if (!result.Items) return [];

    return result.Items.map((item) => ({
      id: item.incidentId,
      monitorId: item.monitorId,
      monitorName: item.monitorName || "Monitor",
      userId: item.userId,
      status: item.status,
      cause: item.cause,
      startedAt: item.startedAt,
      resolvedAt: item.resolvedAt || null,
      durationSeconds: item.durationSeconds || null,
    }));
  }

  private sampleSeries(data: MetricDataPoint[], maxPoints: number): MetricDataPoint[] {
    if (data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    const sampled: MetricDataPoint[] = [];
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }
    return sampled;
  }
}

export const metricsService = new MetricsService();

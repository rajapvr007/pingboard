import {
  PutCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamoClient";
import { env } from "../config/env";
import {
  UserProfile,
  StatusPageConfigInput,
  PublicStatusPageData,
  Monitor,
} from "@pingboard/shared";
import { ConflictError, NotFoundError } from "../utils/errors";

export class StatusPageService {
  private tableName = env.DYNAMODB_TABLE_NAME;

  /**
   * Retrieves status page settings for an authenticated user.
   * Access Pattern: AP-01
   */
  async getSettings(userId: string): Promise<UserProfile | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: "PROFILE",
      },
    });

    const result = await docClient.send(command);
    if (!result.Item) return null;

    return this.mapItemToProfile(result.Item);
  }

  /**
   * Creates or updates status page settings.
   * Enforces slug uniqueness via GSI1 lookup.
   */
  async updateSettings(
    userId: string,
    email: string,
    input: StatusPageConfigInput
  ): Promise<UserProfile> {
    const slugCheck = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :slugPk AND GSI1SK = :sk",
        ExpressionAttributeValues: {
          ":slugPk": `SLUG#${input.slug}`,
          ":sk": "PROFILE",
        },
      })
    );

    if (slugCheck.Items && slugCheck.Items.length > 0) {
      const existing = slugCheck.Items[0];
      if (existing.userId !== userId) {
        throw new ConflictError(`Slug '${input.slug}' is already taken by another user.`);
      }
    }

    const now = new Date().toISOString();
    const existingProfile = await this.getSettings(userId);

    const profile: UserProfile = {
      userId,
      email,
      slug: input.slug,
      companyName: input.companyName,
      supportEmail: input.supportEmail,
      isPublic: input.isPublic,
      createdAt: existingProfile ? existingProfile.createdAt : now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
          entityType: "USER_PROFILE",
          ...profile,
          GSI1PK: `SLUG#${input.slug}`,
          GSI1SK: "PROFILE",
        },
      })
    );

    return profile;
  }

  /**
   * Fetches public status page data without authentication.
   * Access Pattern: AP-02, AP-04, AP-10
   */
  async getPublicStatusPage(slug: string): Promise<PublicStatusPageData> {
    const slugQuery = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :slugPk AND GSI1SK = :sk",
        ExpressionAttributeValues: {
          ":slugPk": `SLUG#${slug}`,
          ":sk": "PROFILE",
        },
      })
    );

    if (!slugQuery.Items || slugQuery.Items.length === 0) {
      throw new NotFoundError(`Status page for '${slug}' was not found.`);
    }

    const profileItem = slugQuery.Items[0];
    if (!profileItem.isPublic) {
      throw new NotFoundError(`This status page is not public.`);
    }

    // Retrieve active monitors for this user
    const monitorsQuery = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${profileItem.userId}`,
          ":skPrefix": "MONITOR#",
        },
      })
    );

    const monitors: Monitor[] = (monitorsQuery.Items || [])
      .map((item) => ({
        id: item.monitorId,
        userId: item.userId,
        name: item.name,
        url: item.url,
        httpMethod: item.httpMethod,
        checkInterval: item.checkInterval,
        expectedStatusCode: item.expectedStatusCode,
        isActive: item.isActive,
        currentStatus: item.currentStatus || "UP",
        consecutiveFailures: item.consecutiveFailures || 0,
        lastCheckedAt: item.lastCheckedAt,
        lastResponseTimeMs: item.lastResponseTimeMs,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
      .filter((m) => m.isActive);

    // Fetch active & past incidents for all monitors
    const activeIncidents: PublicStatusPageData["activeIncidents"] = [];
    const pastIncidents: PublicStatusPageData["pastIncidents"] = [];

    for (const monitor of monitors) {
      const incidentQuery = await docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
          ExpressionAttributeValues: {
            ":pk": `MONITOR#${monitor.id}`,
            ":skPrefix": "INCIDENT#",
          },
          ScanIndexForward: false,
          Limit: 10,
        })
      );

      for (const inc of incidentQuery.Items || []) {
        if (inc.status === "OPEN") {
          activeIncidents.push({
            id: inc.incidentId,
            monitorName: inc.monitorName || monitor.name,
            startedAt: inc.startedAt,
            cause: inc.cause,
          });
        } else {
          pastIncidents.push({
            id: inc.incidentId,
            monitorName: inc.monitorName || monitor.name,
            startedAt: inc.startedAt,
            resolvedAt: inc.resolvedAt,
            durationSeconds: inc.durationSeconds,
            cause: inc.cause,
          });
        }
      }
    }

    // Calculate overall system status
    const downCount = monitors.filter((m) => m.currentStatus === "DOWN").length;
    let overallStatus: "OPERATIONAL" | "DEGRADED" | "OUTAGE" = "OPERATIONAL";

    if (monitors.length > 0 && downCount === monitors.length) {
      overallStatus = "OUTAGE";
    } else if (downCount > 0 || activeIncidents.length > 0) {
      overallStatus = "DEGRADED";
    }

    return {
      companyName: profileItem.companyName,
      slug: profileItem.slug,
      supportEmail: profileItem.supportEmail,
      overallStatus,
      updatedAt: new Date().toISOString(),
      monitors: monitors.map((m) => ({
        id: m.id,
        name: m.name,
        currentStatus: m.currentStatus,
        lastResponseTimeMs: m.lastResponseTimeMs,
        uptime30d: 99.9,
      })),
      activeIncidents,
      pastIncidents,
    };
  }

  private mapItemToProfile(item: Record<string, any>): UserProfile {
    return {
      userId: item.userId,
      email: item.email,
      slug: item.slug,
      companyName: item.companyName,
      supportEmail: item.supportEmail,
      isPublic: item.isPublic ?? true,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const statusPageService = new StatusPageService();

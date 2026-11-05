import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./stateManager";
import { config } from "./config";
import { CheckJobMessage } from "./types";

const sqsClient = new SQSClient({ region: config.region });

/**
 * EventBridge Scheduler Dispatcher Handler.
 * Fired every minute. Identifies which monitors are due based on their interval,
 * queries DynamoDB GSI1, and publishes check jobs to the SQS Check Queue.
 */
export async function dispatchScheduledChecks(eventTime: Date = new Date()): Promise<{ dispatchedCount: number }> {
  if (!config.sqsQueueUrl) {
    console.warn("SQS_QUEUE_URL is not configured. Skipping check dispatch.");
    return { dispatchedCount: 0 };
  }

  const minute = eventTime.getUTCMinutes();
  const intervalsToCheck: number[] = [1];

  if (minute % 5 === 0) {
    intervalsToCheck.push(5);
  }
  if (minute % 10 === 0) {
    intervalsToCheck.push(10);
  }

  let totalDispatched = 0;

  for (const interval of intervalsToCheck) {
    // Query GSI1 for all active monitors configured with this check interval
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": `INTERVAL#${interval}`,
        },
      })
    );

    const monitors = (queryResult.Items || []).filter((m) => m.isActive !== false);

    if (monitors.length === 0) continue;

    // Send messages in batches of 10 (SQS SendMessageBatch limit)
    for (let i = 0; i < monitors.length; i += 10) {
      const batch = monitors.slice(i, i + 10);
      const entries = batch.map((item, index) => {
        const message: CheckJobMessage = {
          monitorId: item.monitorId,
          monitorName: item.name,
          userId: item.userId,
          userEmail: item.userEmail,
          url: item.url,
          httpMethod: item.httpMethod || "GET",
          expectedStatusCode: item.expectedStatusCode || 200,
        };

        return {
          Id: `msg_${Date.now()}_${index}`,
          MessageBody: JSON.stringify(message),
        };
      });

      await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: config.sqsQueueUrl,
          Entries: entries,
        })
      );

      totalDispatched += batch.length;
    }
  }

  return { dispatchedCount: totalDispatched };
}

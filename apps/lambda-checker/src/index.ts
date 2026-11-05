import { SQSEvent, SQSHandler } from "aws-lambda";
import { performCheck } from "./httpChecker";
import { stateManager } from "./stateManager";
import { notifier } from "./notifier";
import { CheckJobMessage } from "./types";
import { dispatchScheduledChecks } from "./dispatcher";

/**
 * Main SQS consumer Lambda handler.
 * Consumes check jobs, executes HTTP health checks, saves results with a 30-day TTL,
 * tracks consecutive failures, opens/resolves incidents, and triggers SES alerts.
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const job: CheckJobMessage = JSON.parse(record.body);
      const timestamp = new Date().toISOString();

      // 1. Perform HTTP check with retry logic and latency measurement
      const result = await performCheck(job);

      // 2. Persist check result with 30-day TTL
      await stateManager.recordCheckResult(job, result, timestamp);

      // 3. Update monitor state, tracking failures, and managing incident lifecycle
      const transition = await stateManager.updateMonitorState(job, result, timestamp);

      // 4. Alerting via AWS SES on state transitions
      const recipientEmail = job.userEmail || "alerts@pingboard.local";
      const monitorName = job.monitorName || "Service Monitor";

      if (transition.transitionedToDown) {
        await notifier.sendDownAlert({
          monitorName,
          url: job.url,
          cause: result.errorMessage || `Unexpected status code ${result.statusCode}`,
          timestamp,
          recipientEmail,
        });
      } else if (transition.transitionedToUp && transition.incidentStartedAt) {
        const startTime = new Date(transition.incidentStartedAt).getTime();
        const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

        await notifier.sendRecoveryAlert({
          monitorName,
          url: job.url,
          startedAt: transition.incidentStartedAt,
          resolvedAt: timestamp,
          durationSeconds,
          recipientEmail,
        });
      }

      console.log(
        JSON.stringify({
          level: "INFO",
          message: "Check completed",
          monitorId: job.monitorId,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          isUp: result.isUp,
          consecutiveFailures: transition.consecutiveFailures,
          currentStatus: transition.currentStatus,
          transitionedToDown: transition.transitionedToDown,
          transitionedToUp: transition.transitionedToUp,
        })
      );
    } catch (err: any) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          message: "Failed to process check message",
          recordId: record.messageId,
          error: err.message,
          stack: err.stack,
        })
      );
      throw err;
    }
  }
};

export const dispatcherHandler = async () => {
  return await dispatchScheduledChecks();
};

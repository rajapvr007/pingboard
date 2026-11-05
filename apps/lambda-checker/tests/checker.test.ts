import { describe, it, expect, vi, beforeEach } from "vitest";
import { performCheck } from "../src/httpChecker";
import { stateManager, docClient } from "../src/stateManager";
import { notifier } from "../src/notifier";
import { handler } from "../src/index";
import { SQSEvent } from "aws-lambda";

describe("Lambda Health Checker - Phase 4 (Incidents & Alerts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("HTTP Check Execution & Retries", () => {
    it("should succeed when status matches expected code", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({ status: 200 } as any);

      const result = await performCheck(
        {
          monitorId: "mon_1",
          userId: "usr_1",
          url: "https://api.example.com/health",
          httpMethod: "GET",
          expectedStatusCode: 200,
        },
        mockFetch as any
      );

      expect(result.isUp).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.errorMessage).toBeNull();
      expect(result.attempts).toBe(1);
    });

    it("should retry and report failure if status code does not match", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 500 } as any);

      const result = await performCheck(
        {
          monitorId: "mon_1",
          userId: "usr_1",
          url: "https://api.example.com/health",
          httpMethod: "GET",
          expectedStatusCode: 200,
        },
        mockFetch as any
      );

      expect(result.isUp).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.attempts).toBe(2);
    });
  });

  describe("Incident Lifecycle Management", () => {
    it("should create an OPEN incident when monitor reaches 3 consecutive failures", async () => {
      // 2 failures previously, currently UP
      const sendSpy = vi.spyOn(docClient, "send")
        .mockResolvedValueOnce({
          Item: { consecutiveFailures: 2, currentStatus: "UP", name: "Billing API" },
        } as any) // GetCommand
        .mockResolvedValueOnce({} as any) // PutCommand (Incident)
        .mockResolvedValueOnce({} as any); // UpdateCommand (Monitor)

      const transition = await stateManager.updateMonitorState(
        {
          monitorId: "mon_1",
          userId: "usr_1",
          url: "https://billing.example.com",
          httpMethod: "GET",
          expectedStatusCode: 200,
        },
        {
          statusCode: 500,
          responseTimeMs: 85,
          isUp: false,
          errorMessage: "Internal Server Error",
          attempts: 2,
        },
        "2026-11-05T14:00:00.000Z"
      );

      expect(transition.consecutiveFailures).toBe(3);
      expect(transition.currentStatus).toBe("DOWN");
      expect(transition.transitionedToDown).toBe(true);
      expect(transition.activeIncidentId).toMatch(/^inc_/);

      // Verify incident creation PutCommand
      expect(sendSpy).toHaveBeenCalledTimes(3);
      const incidentPut = sendSpy.mock.calls[1][0] as any;
      expect(incidentPut.input.Item.entityType).toBe("INCIDENT");
      expect(incidentPut.input.Item.status).toBe("OPEN");
      expect(incidentPut.input.Item.cause).toBe("Internal Server Error");
    });

    it("should resolve the active incident when monitor recovers to UP", async () => {
      // Monitor was DOWN with active incident
      const startedAt = "2026-11-05T14:00:00.000Z";
      const resolvedAt = "2026-11-05T14:15:00.000Z";

      const sendSpy = vi.spyOn(docClient, "send")
        .mockResolvedValueOnce({
          Item: {
            consecutiveFailures: 3,
            currentStatus: "DOWN",
            activeIncidentId: "inc_123",
            activeIncidentStartedAt: startedAt,
          },
        } as any) // GetCommand
        .mockResolvedValueOnce({} as any) // UpdateCommand (Resolve Incident)
        .mockResolvedValueOnce({} as any); // UpdateCommand (Update Monitor)

      const transition = await stateManager.updateMonitorState(
        {
          monitorId: "mon_1",
          userId: "usr_1",
          url: "https://billing.example.com",
          httpMethod: "GET",
          expectedStatusCode: 200,
        },
        {
          statusCode: 200,
          responseTimeMs: 75,
          isUp: true,
          errorMessage: null,
          attempts: 1,
        },
        resolvedAt
      );

      expect(transition.consecutiveFailures).toBe(0);
      expect(transition.currentStatus).toBe("UP");
      expect(transition.transitionedToUp).toBe(true);

      // Verify incident resolution UpdateCommand
      expect(sendSpy).toHaveBeenCalledTimes(3);
      const incidentUpdate = sendSpy.mock.calls[1][0] as any;
      expect(incidentUpdate.input.Key.PK).toBe("MONITOR#mon_1");
      expect(incidentUpdate.input.Key.SK).toBe(`INCIDENT#${startedAt}`);
      expect(incidentUpdate.input.ExpressionAttributeValues[":resolved"]).toBe("RESOLVED");
      expect(incidentUpdate.input.ExpressionAttributeValues[":duration"]).toBe(900); // 15 mins = 900s
    });
  });

  describe("SES Alerting on State Transitions", () => {
    it("should trigger DOWN email alert on 3rd failure", async () => {
      const sendDownAlertSpy = vi.spyOn(notifier, "sendDownAlert").mockResolvedValue(true);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({ status: 500 } as any);

      // StateManager mock responses
      vi.spyOn(docClient, "send")
        .mockResolvedValueOnce({} as any) // Record check
        .mockResolvedValueOnce({
          Item: { consecutiveFailures: 2, currentStatus: "UP" },
        } as any) // Get monitor
        .mockResolvedValueOnce({} as any) // Put incident
        .mockResolvedValueOnce({} as any); // Update monitor

      const event: SQSEvent = {
        Records: [
          {
            messageId: "msg_down",
            receiptHandle: "handle_down",
            body: JSON.stringify({
              monitorId: "mon_alert",
              monitorName: "Payments API",
              userId: "usr_1",
              userEmail: "ops@example.com",
              url: "https://pay.example.com",
              httpMethod: "GET",
              expectedStatusCode: 200,
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: "",
            eventSource: "aws:sqs",
            eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:queue",
            awsRegion: "us-east-1",
          },
        ],
      };

      await handler(event, {} as any, () => {});

      expect(sendDownAlertSpy).toHaveBeenCalledTimes(1);
      expect(sendDownAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          monitorName: "Payments API",
          url: "https://pay.example.com",
          recipientEmail: "ops@example.com",
        })
      );

      global.fetch = originalFetch;
    });

    it("should trigger RECOVERY email alert when monitor returns UP", async () => {
      const sendRecoveryAlertSpy = vi.spyOn(notifier, "sendRecoveryAlert").mockResolvedValue(true);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({ status: 200 } as any);

      // StateManager mock responses
      vi.spyOn(docClient, "send")
        .mockResolvedValueOnce({} as any) // Record check
        .mockResolvedValueOnce({
          Item: {
            consecutiveFailures: 3,
            currentStatus: "DOWN",
            activeIncidentId: "inc_999",
            activeIncidentStartedAt: "2026-11-05T14:00:00.000Z",
          },
        } as any) // Get monitor
        .mockResolvedValueOnce({} as any) // Resolve incident
        .mockResolvedValueOnce({} as any); // Update monitor

      const event: SQSEvent = {
        Records: [
          {
            messageId: "msg_up",
            receiptHandle: "handle_up",
            body: JSON.stringify({
              monitorId: "mon_alert",
              monitorName: "Payments API",
              userId: "usr_1",
              userEmail: "ops@example.com",
              url: "https://pay.example.com",
              httpMethod: "GET",
              expectedStatusCode: 200,
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: "",
            eventSource: "aws:sqs",
            eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:queue",
            awsRegion: "us-east-1",
          },
        ],
      };

      await handler(event, {} as any, () => {});

      expect(sendRecoveryAlertSpy).toHaveBeenCalledTimes(1);
      expect(sendRecoveryAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          monitorName: "Payments API",
          url: "https://pay.example.com",
          recipientEmail: "ops@example.com",
          startedAt: "2026-11-05T14:00:00.000Z",
        })
      );

      global.fetch = originalFetch;
    });
  });
});

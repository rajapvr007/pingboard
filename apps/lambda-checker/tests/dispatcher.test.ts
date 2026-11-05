import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispatchScheduledChecks } from "../src/dispatcher";
import { docClient } from "../src/stateManager";
import { SQSClient } from "@aws-sdk/client-sqs";

vi.mock("@aws-sdk/client-sqs", () => {
  const mockSend = vi.fn().mockResolvedValue({});
  return {
    SQSClient: vi.fn(() => ({
      send: mockSend,
    })),
    SendMessageBatchCommand: vi.fn((input) => input),
  };
});

describe("Dispatcher - EventBridge Trigger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should query interval=1 and send messages to SQS", async () => {
    // Mock DynamoDB GSI1 query return 2 monitors
    vi.spyOn(docClient, "send").mockResolvedValueOnce({
      Items: [
        {
          monitorId: "mon_1",
          userId: "usr_1",
          url: "https://api1.example.com",
          checkInterval: 1,
          isActive: true,
        },
        {
          monitorId: "mon_2",
          userId: "usr_1",
          url: "https://api2.example.com",
          checkInterval: 1,
          isActive: true,
        },
      ],
    } as any);

    // Call at minute 3 (only interval 1 should run)
    const testDate = new Date("2026-11-05T14:03:00.000Z");
    const result = await dispatchScheduledChecks(testDate);

    expect(result.dispatchedCount).toBe(2);
    expect(docClient.send).toHaveBeenCalledTimes(1);
  });

  it("should query interval=1 and interval=5 at 5-minute boundaries", async () => {
    // Call at minute 5 (both interval 1 and interval 5)
    vi.spyOn(docClient, "send")
      .mockResolvedValueOnce({
        Items: [
          { monitorId: "mon_1", userId: "usr_1", url: "https://api1.com", checkInterval: 1, isActive: true },
        ],
      } as any)
      .mockResolvedValueOnce({
        Items: [
          { monitorId: "mon_5", userId: "usr_1", url: "https://api5.com", checkInterval: 5, isActive: true },
        ],
      } as any);

    const testDate = new Date("2026-11-05T14:05:00.000Z");
    const result = await dispatchScheduledChecks(testDate);

    expect(result.dispatchedCount).toBe(2);
    expect(docClient.send).toHaveBeenCalledTimes(2);
  });
});

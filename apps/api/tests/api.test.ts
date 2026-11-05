import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { docClient } from "../src/services/dynamoClient";

vi.mock("../src/services/dynamoClient", () => {
  return {
    docClient: {
      send: vi.fn(),
    },
  };
});

describe("PingBoard API - Phase 2 & 4 Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return 200 with healthy status", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe("POST /api/monitors", () => {
    it("should reject monitor creation when URL is invalid", async () => {
      const res = await request(app)
        .post("/api/monitors")
        .set("Authorization", "Bearer mock-token")
        .send({
          name: "My Monitor",
          url: "not-a-valid-url",
          checkInterval: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.details[0].field).toBe("url");
    });

    it("should reject monitor creation when interval is invalid", async () => {
      const res = await request(app)
        .post("/api/monitors")
        .set("Authorization", "Bearer mock-token")
        .send({
          name: "My Monitor",
          url: "https://example.com/health",
          checkInterval: 15,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.details[0].field).toBe("checkInterval");
    });

    it("should create a monitor successfully with valid parameters", async () => {
      vi.mocked(docClient.send).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/monitors")
        .set("Authorization", "Bearer mock-token")
        .send({
          name: "Production API",
          url: "https://api.example.com/health",
          httpMethod: "GET",
          checkInterval: 5,
          expectedStatusCode: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toMatch(/^mon_/);
      expect(res.body.data.name).toBe("Production API");
      expect(res.body.data.currentStatus).toBe("PENDING");
      expect(res.body.data.consecutiveFailures).toBe(0);
      expect(docClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/monitors", () => {
    it("should list all monitors for the authenticated user", async () => {
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Items: [
          {
            monitorId: "mon_123",
            userId: "usr_mock123",
            name: "API Service",
            url: "https://api.example.com",
            httpMethod: "GET",
            checkInterval: 1,
            expectedStatusCode: 200,
            isActive: true,
            currentStatus: "UP",
            consecutiveFailures: 0,
            createdAt: "2026-11-01T10:00:00Z",
            updatedAt: "2026-11-01T10:00:00Z",
          },
        ],
      } as any);

      const res = await request(app)
        .get("/api/monitors")
        .set("Authorization", "Bearer mock-token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe("mon_123");
      expect(res.body.data[0].name).toBe("API Service");
    });
  });

  describe("GET /api/monitors/:id", () => {
    it("should return 404 if monitor does not exist", async () => {
      vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined } as any);

      const res = await request(app)
        .get("/api/monitors/mon_notfound")
        .set("Authorization", "Bearer mock-token");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/monitors/:id/metrics", () => {
    it("should return uptime percentage and time series data", async () => {
      // 1. GetMonitor ownership check
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Item: { monitorId: "mon_123", userId: "usr_mock123", name: "API" },
      } as any);

      // 2. Query check results
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Items: [
          { timestamp: "2026-11-05T13:00:00Z", responseTimeMs: 120, isUp: true },
          { timestamp: "2026-11-05T13:05:00Z", responseTimeMs: 140, isUp: true },
          { timestamp: "2026-11-05T13:10:00Z", responseTimeMs: 0, isUp: false },
        ],
      } as any);

      const res = await request(app)
        .get("/api/monitors/mon_123/metrics?range=24h")
        .set("Authorization", "Bearer mock-token");

      expect(res.status).toBe(200);
      expect(res.body.data.monitorId).toBe("mon_123");
      expect(res.body.data.range).toBe("24h");
      expect(res.body.data.uptimePercentage).toBe(66.67);
      expect(res.body.data.averageResponseTimeMs).toBe(130);
      expect(res.body.data.series).toHaveLength(3);
    });
  });

  describe("GET /api/monitors/:id/incidents", () => {
    it("should return incident history for monitor", async () => {
      // 1. GetMonitor ownership check
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Item: { monitorId: "mon_123", userId: "usr_mock123", name: "API" },
      } as any);

      // 2. Query incidents
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Items: [
          {
            incidentId: "inc_001",
            monitorId: "mon_123",
            monitorName: "API",
            userId: "usr_mock123",
            status: "RESOLVED",
            cause: "HTTP 500",
            startedAt: "2026-11-05T10:00:00Z",
            resolvedAt: "2026-11-05T10:15:00Z",
            durationSeconds: 900,
          },
        ],
      } as any);

      const res = await request(app)
        .get("/api/monitors/mon_123/incidents")
        .set("Authorization", "Bearer mock-token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe("inc_001");
      expect(res.body.data[0].status).toBe("RESOLVED");
      expect(res.body.data[0].durationSeconds).toBe(900);
    });
  });

  describe("Status Page Settings & Public Status", () => {
    it("should update status page settings", async () => {
      vi.mocked(docClient.send)
        .mockResolvedValueOnce({ Items: [] } as any) // GSI1 slug check
        .mockResolvedValueOnce({ Item: null } as any) // Get existing
        .mockResolvedValueOnce({} as any); // Put

      const res = await request(app)
        .put("/api/status-page")
        .set("Authorization", "Bearer mock-token")
        .send({
          slug: "acme-corp",
          companyName: "Acme Corporation",
          supportEmail: "support@acme.com",
          isPublic: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe("acme-corp");
      expect(res.body.data.companyName).toBe("Acme Corporation");
    });

    it("should fetch public status page with monitors and incidents", async () => {
      // 1. Slug query
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Items: [
          {
            userId: "usr_mock123",
            companyName: "Acme Corp",
            slug: "acme-corp",
            supportEmail: "ops@acme.com",
            isPublic: true,
          },
        ],
      } as any);

      // 2. Query user monitors
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Items: [
          {
            monitorId: "mon_123",
            name: "API Gateway",
            currentStatus: "UP",
            isActive: true,
            lastResponseTimeMs: 110,
          },
        ],
      } as any);

      // 3. Query incidents for monitor
      vi.mocked(docClient.send).mockResolvedValueOnce({
        Items: [
          {
            incidentId: "inc_active",
            monitorName: "API Gateway",
            status: "OPEN",
            cause: "High error rates",
            startedAt: "2026-11-05T14:10:00Z",
          },
        ],
      } as any);

      const res = await request(app).get("/api/public/status/acme-corp");

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe("Acme Corp");
      expect(res.body.data.overallStatus).toBe("DEGRADED");
      expect(res.body.data.activeIncidents).toHaveLength(1);
      expect(res.body.data.activeIncidents[0].cause).toBe("High error rates");
    });
  });
});

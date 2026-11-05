import { CheckInterval, HttpMethod, MonitorStatus, IncidentStatus } from "./constants";

export interface UserProfile {
  userId: string;
  email: string;
  slug: string;
  companyName: string;
  supportEmail?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UptimeSummary {
  last24h: number;
  last7d: number;
  last30d: number;
}

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string;
  httpMethod: HttpMethod;
  checkInterval: CheckInterval;
  expectedStatusCode: number;
  isActive: boolean;
  currentStatus: MonitorStatus;
  consecutiveFailures: number;
  lastCheckedAt?: string;
  lastStatusCode?: number;
  lastResponseTimeMs?: number;
  uptimeSummary?: UptimeSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CheckResult {
  checkId: string;
  monitorId: string;
  timestamp: string;
  statusCode: number;
  responseTimeMs: number;
  isUp: boolean;
  errorMessage?: string | null;
  expiresAt: number; // Unix timestamp in seconds for DynamoDB TTL
}

export interface Incident {
  id: string;
  monitorId: string;
  monitorName: string;
  userId: string;
  status: IncidentStatus;
  cause: string;
  startedAt: string;
  resolvedAt?: string | null;
  durationSeconds?: number | null;
}

export interface PublicStatusPageData {
  companyName: string;
  slug: string;
  supportEmail?: string;
  overallStatus: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  updatedAt: string;
  monitors: Array<{
    id: string;
    name: string;
    currentStatus: MonitorStatus;
    lastResponseTimeMs?: number;
    uptime30d: number;
  }>;
  activeIncidents: Array<{
    id: string;
    monitorName: string;
    startedAt: string;
    cause: string;
  }>;
  pastIncidents: Array<{
    id: string;
    monitorName: string;
    startedAt: string;
    resolvedAt?: string | null;
    durationSeconds?: number | null;
    cause: string;
  }>;
}

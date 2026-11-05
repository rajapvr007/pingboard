import { HttpMethod } from "@pingboard/shared";

export interface CheckJobMessage {
  monitorId: string;
  monitorName?: string;
  userId: string;
  userEmail?: string;
  url: string;
  httpMethod: HttpMethod;
  expectedStatusCode: number;
  timeoutMs?: number;
}

export interface ExecutionResult {
  statusCode: number;
  responseTimeMs: number;
  isUp: boolean;
  errorMessage: string | null;
  attempts: number;
}

export interface StateTransitionResult {
  monitorId: string;
  previousFailures: number;
  consecutiveFailures: number;
  currentStatus: "UP" | "DOWN";
  transitionedToDown: boolean;
  transitionedToUp: boolean;
  activeIncidentId?: string | null;
  incidentStartedAt?: string | null;
}

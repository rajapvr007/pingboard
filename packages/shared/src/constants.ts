export const CHECK_INTERVALS = [1, 5, 10] as const;
export type CheckInterval = typeof CHECK_INTERVALS[number];

export const HTTP_METHODS = ["GET", "POST", "HEAD", "PUT", "PATCH"] as const;
export type HttpMethod = typeof HTTP_METHODS[number];

export const MONITOR_STATUSES = ["UP", "DOWN", "PENDING", "PAUSED"] as const;
export type MonitorStatus = typeof MONITOR_STATUSES[number];

export const INCIDENT_STATUSES = ["OPEN", "RESOLVED"] as const;
export type IncidentStatus = typeof INCIDENT_STATUSES[number];

export const DEFAULT_CONSECUTIVE_FAILURES_THRESHOLD = 3;
export const CHECK_RESULT_TTL_DAYS = 30;

import {
  Monitor,
  CreateMonitorInput,
  UpdateMonitorInput,
  UserProfile,
  StatusPageConfigInput,
  PublicStatusPageData,
  Incident,
} from "@pingboard/shared";

export interface MonitorMetricsData {
  monitorId: string;
  range: "24h" | "7d" | "30d";
  uptimePercentage: number;
  averageResponseTimeMs: number;
  totalChecks: number;
  series: Array<{
    timestamp: string;
    responseTimeMs: number;
    isUp: boolean;
  }>;
}

class ApiClient {
  private baseUrl = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
    : "/api";

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem("pingboard_token") || "mock-token";
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isPublic = endpoint.startsWith("/public");
    const headers = {
      ...(isPublic ? { "Content-Type": "application/json" } : this.getAuthHeader()),
      ...options.headers,
    };

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return {} as T;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error?.message || "An unexpected API error occurred.");
    }

    return data as T;
  }

  // --- Monitors API ---

  async listMonitors(): Promise<Monitor[]> {
    return this.request<Monitor[]>("/monitors");
  }

  async getMonitor(id: string): Promise<Monitor> {
    return this.request<Monitor>(`/monitors/${id}`);
  }

  async createMonitor(input: CreateMonitorInput): Promise<Monitor> {
    return this.request<Monitor>("/monitors", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateMonitor(id: string, input: UpdateMonitorInput): Promise<Monitor> {
    return this.request<Monitor>(`/monitors/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  async deleteMonitor(id: string): Promise<void> {
    return this.request<void>(`/monitors/${id}`, {
      method: "DELETE",
    });
  }

  // --- Metrics & Incidents API ---

  async getMetrics(id: string, range: "24h" | "7d" | "30d" = "24h"): Promise<MonitorMetricsData> {
    return this.request<MonitorMetricsData>(`/monitors/${id}/metrics?range=${range}`);
  }

  async getIncidents(id: string): Promise<Incident[]> {
    return this.request<Incident[]>(`/monitors/${id}/incidents`);
  }

  // --- Status Page Settings & Public Status ---

  async getStatusPageSettings(): Promise<UserProfile> {
    return this.request<UserProfile>("/status-page");
  }

  async updateStatusPageSettings(input: StatusPageConfigInput): Promise<UserProfile> {
    return this.request<UserProfile>("/status-page", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  async getPublicStatus(slug: string): Promise<PublicStatusPageData> {
    return this.request<PublicStatusPageData>(`/public/status/${slug}`);
  }
}

export const api = new ApiClient();

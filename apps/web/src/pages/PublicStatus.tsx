import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { PublicStatusPageData } from "@pingboard/shared";
import { UptimeHistoryBar } from "../components/status-page/UptimeHistoryBar";
import { IncidentTimeline } from "../components/status-page/IncidentTimeline";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Mail,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

export const PublicStatus: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicStatusPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(
    async (isManualRefresh = false) => {
      if (!slug) return;
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const res = await api.getPublicStatus(slug);
        setData(res);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load status page.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => loadStatus(true), 60000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Activity className="h-8 w-8 animate-pulse text-blue-600" />
          <span className="text-sm font-medium">Loading live service status...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-full w-fit mx-auto mb-4">
            <XCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Status Page Unavailable</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {error || "This status page does not exist or has been marked private by its owner."}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to PingBoard Home
          </Link>
        </div>
      </div>
    );
  }

  const isOperational = data.overallStatus === "OPERATIONAL";
  const isDegraded = data.overallStatus === "DEGRADED";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {data.companyName}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">Official Real-Time System Status</p>
          </div>

          <div className="flex items-center gap-3">
            {data.supportEmail && (
              <a
                href={`mailto:${data.supportEmail}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Contact Support
              </a>
            )}

            <button
              onClick={() => loadStatus(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors shadow-sm"
              title="Refresh status now"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : "text-slate-400"}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Banner */}
        <div
          className={`p-6 rounded-2xl border shadow-sm flex items-start sm:items-center gap-4 ${
            isOperational
              ? "bg-emerald-500 text-white border-emerald-600"
              : isDegraded
              ? "bg-amber-500 text-white border-amber-600"
              : "bg-rose-500 text-white border-rose-600"
          }`}
        >
          {isOperational ? (
            <ShieldCheck className="h-9 w-9 flex-shrink-0" />
          ) : isDegraded ? (
            <AlertTriangle className="h-9 w-9 flex-shrink-0" />
          ) : (
            <XCircle className="h-9 w-9 flex-shrink-0" />
          )}

          <div className="flex-1">
            <h2 className="text-lg font-bold">
              {isOperational
                ? "All Systems Fully Operational"
                : isDegraded
                ? "Partial System Degradation"
                : "Major Outage Detected"}
            </h2>
            <p className="text-xs mt-1 text-white/90">
              {isOperational
                ? "All services and monitored infrastructure endpoints are operating within normal parameters."
                : "Our operations team is actively monitoring degradation across affected system components."}
            </p>
          </div>

          <span className="text-[11px] text-white/80 self-end sm:self-center">
            Updated {new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Monitored Services with 30-Day Uptime Calendar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Monitored Services ({data.monitors.length})
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              30-Day Availability
            </span>
          </div>

          <div className="divide-y divide-slate-100 p-6 space-y-6">
            {data.monitors.length > 0 ? (
              data.monitors.map((m) => (
                <div key={m.id} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{m.name}</span>
                      {m.lastResponseTimeMs !== undefined && (
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-medium">
                          {m.lastResponseTimeMs}ms
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        m.currentStatus === "UP"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          m.currentStatus === "UP" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        }`}
                      />
                      {m.currentStatus === "UP" ? "Operational" : "Degraded"}
                    </span>
                  </div>

                  {/* 30-day block visualizer */}
                  <UptimeHistoryBar uptimePercentage={m.uptime30d} days={30} />
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active monitors configured on this status page yet.
              </div>
            )}
          </div>
        </div>

        {/* Incidents Timeline */}
        <IncidentTimeline
          activeIncidents={data.activeIncidents}
          pastIncidents={data.pastIncidents}
        />

        {/* Footer */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>Reliable uptime monitoring powered by</span>
            <Link to="/" className="font-bold text-slate-700 hover:text-blue-600">
              PingBoard
            </Link>
          </div>
          <div>Auto-refreshes every 60 seconds</div>
        </div>
      </div>
    </div>
  );
};

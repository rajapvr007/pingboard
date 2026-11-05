import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Monitor, Incident } from "@pingboard/shared";
import { api, MonitorMetricsData } from "../api/client";
import { StatusBadge } from "../components/common/StatusBadge";
import { ResponseTimeChart } from "../components/charts/ResponseTimeChart";
import {
  ArrowLeft,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
  ShieldCheck,
} from "lucide-react";

export const MonitorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [metrics, setMetrics] = useState<MonitorMetricsData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [monData, metricsData, incidentsData] = await Promise.all([
        api.getMonitor(id),
        api.getMetrics(id, range),
        api.getIncidents(id),
      ]);
      setMonitor(monData);
      setMetrics(metricsData);
      setIncidents(incidentsData);
    } catch (err) {
      console.error("Failed to load monitor details:", err);
    } finally {
      setLoading(false);
    }
  }, [id, range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!monitor && !loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Monitor Not Found</h2>
        <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-blue-600 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Monitors
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{monitor?.name}</h1>
              {monitor && <StatusBadge status={monitor.currentStatus} size="lg" />}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> {monitor?.url}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">
                {monitor?.httpMethod}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Checked every {monitor?.checkInterval} min
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Expected {monitor?.expectedStatusCode}
              </span>
            </div>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r === "24h" ? "Last 24 Hours" : r === "7d" ? "Last 7 Days" : "Last 30 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Uptime ({range})
            </span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.uptimePercentage ?? 100}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Total checks: {metrics?.totalChecks || 0}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Response Time
            </span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.averageResponseTimeMs ?? 0} ms
          </div>
          <div className="text-xs text-slate-400 mt-1">Calculated over {range}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Incidents
            </span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{incidents.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            {incidents.filter((i) => i.status === "OPEN").length} currently active
          </div>
        </div>
      </div>

      {/* Latency Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <ResponseTimeChart
          data={metrics?.series || []}
          averageMs={metrics?.averageResponseTimeMs}
        />
      </div>

      {/* Incidents History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Incident History</h2>
        </div>

        {incidents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Started At</th>
                  <th className="py-3 px-6">Resolved At</th>
                  <th className="py-3 px-6">Duration</th>
                  <th className="py-3 px-6">Root Cause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {incidents.map((incident) => {
                  const durationMins = incident.durationSeconds
                    ? Math.round(incident.durationSeconds / 60)
                    : null;
                  return (
                    <tr key={incident.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                            incident.status === "OPEN"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {incident.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-700">
                        {new Date(incident.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {incident.resolvedAt
                          ? new Date(incident.resolvedAt).toLocaleString()
                          : "Ongoing"}
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-700">
                        {durationMins !== null ? `${durationMins} min` : "Active"}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                        {incident.cause}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No incident history recorded for this monitor. 100% clean operational record!
          </div>
        )}
      </div>
    </div>
  );
};

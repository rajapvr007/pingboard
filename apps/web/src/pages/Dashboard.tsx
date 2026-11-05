import React, { useState, useEffect } from "react";
import { Monitor, CreateMonitorInput } from "@pingboard/shared";
import { api } from "../api/client";
import { MonitorCard } from "../components/monitors/MonitorCard";
import { MonitorModal } from "../components/monitors/MonitorModal";
import { Plus, CheckCircle2, AlertTriangle, Activity, Search, RefreshCw } from "lucide-react";

export const Dashboard: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UP" | "DOWN">("ALL");

  const loadMonitors = async () => {
    try {
      setLoading(true);
      const data = await api.listMonitors();
      setMonitors(data);
    } catch (err) {
      console.error("Failed to load monitors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitors();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMonitors, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveMonitor = async (data: CreateMonitorInput) => {
    if (editingMonitor) {
      await api.updateMonitor(editingMonitor.id, data);
    } else {
      await api.createMonitor(data);
    }
    await loadMonitors();
  };

  const handleDeleteMonitor = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this monitor?")) {
      await api.deleteMonitor(id);
      await loadMonitors();
    }
  };

  const handleToggleActive = async (monitor: Monitor) => {
    await api.updateMonitor(monitor.id, { isActive: !monitor.isActive });
    await loadMonitors();
  };

  // Metrics summary
  const totalCount = monitors.length;
  const upCount = monitors.filter((m) => m.isActive && m.currentStatus === "UP").length;
  const downCount = monitors.filter((m) => m.isActive && m.currentStatus === "DOWN").length;

  const validLatencies = monitors
    .filter((m) => m.lastResponseTimeMs !== undefined && m.lastResponseTimeMs > 0)
    .map((m) => m.lastResponseTimeMs as number);
  const avgLatency =
    validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 0;

  // Filtered monitors
  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "UP" && m.currentStatus === "UP") ||
      (filterStatus === "DOWN" && m.currentStatus === "DOWN");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitors</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time availability and latency health checks across your infrastructure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadMonitors}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setEditingMonitor(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Monitor
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{totalCount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Monitors
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{upCount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Operational
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{downCount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Outages
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{avgLatency} ms</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Response Time
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search monitors by name or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(["ALL", "UP", "DOWN"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === status
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {status === "ALL" ? "All Monitors" : status === "UP" ? "Operational" : "Down"}
            </button>
          ))}
        </div>
      </div>

      {/* Monitors List Grid */}
      {filteredMonitors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMonitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              onEdit={(m) => {
                setEditingMonitor(m);
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteMonitor}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <Activity className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No monitors found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No monitors match your search query."
              : "Get started by adding your first HTTP endpoint to track uptime and response times."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                setEditingMonitor(null);
                setIsModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add First Monitor
            </button>
          )}
        </div>
      )}

      {/* Monitor Create/Edit Modal */}
      <MonitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMonitor}
        initialData={editingMonitor}
      />
    </div>
  );
};

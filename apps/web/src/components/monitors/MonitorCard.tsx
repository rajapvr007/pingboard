import React from "react";
import { Link } from "react-router-dom";
import { Monitor } from "@pingboard/shared";
import { StatusBadge } from "../common/StatusBadge";
import { Clock, Globe, ArrowUpRight, Edit2, Trash2, Pause, Play } from "lucide-react";

interface Props {
  monitor: Monitor;
  onEdit: (monitor: Monitor) => void;
  onDelete: (id: string) => void;
  onToggleActive: (monitor: Monitor) => void;
}

export const MonitorCard: React.FC<Props> = ({
  monitor,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all p-5 flex flex-col justify-between">
      <div>
        {/* Top header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <Link
              to={`/monitors/${monitor.id}`}
              className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
            >
              {monitor.name}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{monitor.url}</span>
            </div>
          </div>

          <StatusBadge status={monitor.isActive ? monitor.currentStatus : "PAUSED"} />
        </div>

        {/* Badges & Metrics Row */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded">
            {monitor.httpMethod}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded">
            <Clock className="h-3 w-3" />
            Every {monitor.checkInterval}m
          </span>

          {monitor.lastResponseTimeMs !== undefined && (
            <span className="ml-auto text-xs font-semibold text-slate-700">
              {monitor.lastResponseTimeMs}ms
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100">
        <Link
          to={`/monitors/${monitor.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          View Metrics & Logs
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleActive(monitor)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
            title={monitor.isActive ? "Pause Check" : "Resume Check"}
          >
            {monitor.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-emerald-600" />}
          </button>
          <button
            onClick={() => onEdit(monitor)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit Monitor"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(monitor.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            title="Delete Monitor"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

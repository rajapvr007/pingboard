import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DataPoint {
  timestamp: string;
  responseTimeMs: number;
  isUp: boolean;
}

interface Props {
  data: DataPoint[];
  averageMs?: number;
}

export const ResponseTimeChart: React.FC<Props> = ({ data, averageMs }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
        <p className="text-sm font-medium">No check metrics recorded in this window</p>
        <p className="text-xs text-slate-400 mt-1">Data will populate automatically as health checks run</p>
      </div>
    );
  }

  // Format data for chart display
  const formattedData = data.map((d) => {
    const date = new Date(d.timestamp);
    return {
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      fullDate: date.toLocaleString(),
      latency: d.responseTimeMs,
      isUp: d.isUp,
    };
  });

  return (
    <div className="w-full">
      {averageMs !== undefined && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Response Time Trend
          </span>
          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100">
            Avg: {averageMs}ms
          </span>
        </div>
      )}

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              unit="ms"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs space-y-1">
                      <div className="text-slate-400 font-medium">{item.fullDate}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{item.latency} ms</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {item.isUp ? "OK" : "FAILED"}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#latencyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

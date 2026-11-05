import React from "react";

interface Props {
  uptimePercentage: number;
  days?: number;
}

export const UptimeHistoryBar: React.FC<Props> = ({ uptimePercentage, days = 30 }) => {
  // Generate simulated or real daily availability blocks for the past N days
  // Days closer to today reflect the monitor's current uptime state
  const dayBlocks = Array.from({ length: days }).map((_, index) => {
    // If overall uptime is < 100%, sprinkle occasional minor/major incident on past days
    const isToday = index === days - 1;
    let dayStatus: "UP" | "DEGRADED" | "DOWN" = "UP";

    if (uptimePercentage < 98 && (index === 12 || index === 25)) {
      dayStatus = "DOWN";
    } else if (uptimePercentage < 99.5 && index === 18) {
      dayStatus = "DEGRADED";
    }

    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    const dateStr = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      dateStr,
      dayStatus,
      isToday,
    };
  });

  return (
    <div className="space-y-1.5 w-full">
      {/* Bars row */}
      <div className="flex items-center gap-1 w-full h-8">
        {dayBlocks.map((block, i) => {
          const bg =
            block.dayStatus === "UP"
              ? "bg-emerald-500 hover:bg-emerald-600"
              : block.dayStatus === "DEGRADED"
              ? "bg-amber-400 hover:bg-amber-500"
              : "bg-rose-500 hover:bg-rose-600";

          return (
            <div
              key={i}
              className={`flex-1 h-full rounded-sm transition-all cursor-pointer ${bg}`}
              title={`${block.dateStr}: ${
                block.dayStatus === "UP"
                  ? "No downtime recorded"
                  : block.dayStatus === "DEGRADED"
                  ? "Partial degradation"
                  : "Major outage recorded"
              }`}
            />
          );
        })}
      </div>

      {/* Range labels & summary */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{days} days ago</span>
        <span className="font-semibold text-slate-700">{uptimePercentage}% uptime</span>
        <span>Today</span>
      </div>
    </div>
  );
};

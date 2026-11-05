import React from "react";
import { MonitorStatus } from "@pingboard/shared";

interface Props {
  status: MonitorStatus;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<Props> = ({ status, size = "md" }) => {
  const getStyles = () => {
    switch (status) {
      case "UP":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Operational",
        };
      case "DOWN":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
          label: "Down",
        };
      case "PAUSED":
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
          label: "Paused",
        };
      case "PENDING":
      default:
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          label: "Pending",
        };
    }
  };

  const { bg, dot, label } = getStyles();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs font-medium",
    lg: "px-3 py-1.5 text-sm font-semibold",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bg} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${status === "UP" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
};

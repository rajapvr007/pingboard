import React from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export interface PublicIncident {
  id: string;
  monitorName: string;
  startedAt: string;
  resolvedAt?: string | null;
  durationSeconds?: number | null;
  cause: string;
}

interface Props {
  activeIncidents: PublicIncident[];
  pastIncidents: PublicIncident[];
}

export const IncidentTimeline: React.FC<Props> = ({
  activeIncidents,
  pastIncidents,
}) => {
  return (
    <div className="space-y-6">
      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            Active Incidents ({activeIncidents.length})
          </h3>
          <div className="space-y-3">
            {activeIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-rose-50/70 border border-rose-200 rounded-xl p-5 shadow-sm space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[11px] rounded uppercase tracking-wider">
                      Investigating
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Outage on {incident.monitorName}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500">
                    Started {new Date(incident.startedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-rose-900 bg-white/60 p-3 rounded-lg border border-rose-100 font-mono">
                  {incident.cause}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Incidents */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          Past Incident History
        </h3>

        {pastIncidents.length > 0 ? (
          <div className="space-y-3">
            {pastIncidents.map((incident) => {
              const durationMins = incident.durationSeconds
                ? Math.round(incident.durationSeconds / 60)
                : null;
              return (
                <div
                  key={incident.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] rounded uppercase tracking-wider">
                        <CheckCircle2 className="h-3 w-3" />
                        Resolved
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Incident on {incident.monitorName}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(incident.startedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded border border-slate-100">
                    Root cause: {incident.cause}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>
                      Downtime:{" "}
                      <strong className="text-slate-700 font-semibold">
                        {durationMins !== null ? `${durationMins} min` : "Under 1 min"}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Resolved at {new Date(incident.resolvedAt || incident.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
            No incidents reported in the last 30 days. All systems operating at peak performance!
          </div>
        )}
      </div>
    </div>
  );
};

import type { Log } from "../../types";

interface AlertsPanelProps {
  errors: Log[];
}

export default function AlertsPanel({ errors }: AlertsPanelProps) {
  const recent = errors.slice(0, 5);

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/4 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Recent Alerts
        {recent.length > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-bold">
            {recent.length}
          </span>
        )}
      </h3>

      {recent.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">
          <p>No errors detected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((log, i) => {
            const time = new Date(log.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 animate-slideUp"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="mt-0.5 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-300 truncate">{log.message}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {log.service} • {time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useRef, useEffect } from "react";
import type { Log } from "../../types";

interface LogsTableProps {
  logs: Log[];
  isLive: boolean;
}

const levelConfig: Record<Log["level"], { badge: string; dot: string }> = {
  info:    { badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",    dot: "bg-cyan-400" },
  error:   { badge: "bg-red-500/15 text-red-400 border-red-500/25",      dot: "bg-red-400" },
  warning: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", dot: "bg-amber-400" },
  debug:   { badge: "bg-slate-500/15 text-slate-400 border-slate-500/25", dot: "bg-slate-400" },
};

export default function LogsTable({ logs, isLive }: LogsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length, isLive]);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[140px_110px_90px_1fr] gap-4 px-4 py-3 bg-slate-800/60 border-b border-slate-700/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <span>Timestamp</span>
        <span>Service</span>
        <span>Level</span>
        <span>Message</span>
      </div>

      {/* Scrollable rows */}
      <div ref={scrollRef} className="max-h-105 overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">No logs found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search</p>
          </div>
        ) : (
          logs.map((log, idx) => {
            const cfg = levelConfig[log.level];
            const time = new Date(log.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const isNew = idx === 0 && isLive;
            return (
              <div
                key={log.id}
                className={`grid grid-cols-[140px_110px_90px_1fr] gap-4 px-4 py-3 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors text-sm group ${
                  isNew ? "animate-highlightRow" : "animate-fadeIn"
                } ${log.level === "error" ? "bg-red-500/3" : ""}`}
                style={{ animationDelay: isNew ? "0ms" : `${idx * 20}ms` }}
              >
                {/* Time */}
                <span className="text-slate-500 font-mono text-xs flex items-center">
                  {timeStr}
                </span>

                {/* Service */}
                <span className="text-slate-300 font-medium truncate flex items-center text-xs">
                  {log.service}
                </span>

                {/* Level badge */}
                <span className="flex items-center">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {log.level.toUpperCase()}
                  </span>
                </span>

                {/* Message */}
                <span className="text-slate-300 truncate flex items-center group-hover:text-white transition-colors">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-800/40 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Showing {logs.length} log{logs.length !== 1 ? "s" : ""}
        </span>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Auto-updating
          </span>
        )}
      </div>
    </div>
  );
}

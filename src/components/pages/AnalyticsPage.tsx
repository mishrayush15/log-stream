import { useMemo } from "react";
import { useLogData } from "../../context/LogProvider";
import LogChart from "../dashboard/LogChart";
import LogLevelPie from "../dashboard/LogLevelPie";

export default function AnalyticsPage() {
  const { logs, stats, timeline } = useLogData();

  // Logs per service
  const logsPerService = useMemo(() => {
    const map: Record<string, { total: number; errors: number; warnings: number; info: number; debug: number }> = {};
    for (const log of logs) {
      if (!map[log.service]) map[log.service] = { total: 0, errors: 0, warnings: 0, info: 0, debug: 0 };
      map[log.service].total++;
      if (log.level === "error") map[log.service].errors++;
      if (log.level === "warning") map[log.service].warnings++;
      if (log.level === "info") map[log.service].info++;
      if (log.level === "debug") map[log.service].debug++;
    }
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [logs]);

  const maxServiceLogs = Math.max(...logsPerService.map((s) => s.total), 1);

  // Hourly buckets for heatmap-style activity
  const hourlyActivity = useMemo(() => {
    const now = Date.now();
    const buckets: { hour: string; count: number; errors: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const start = now - (i + 1) * 3600_000;
      const end = now - i * 3600_000;
      const label = new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const matching = logs.filter((l) => {
        const t = new Date(l.timestamp).getTime();
        return t >= start && t < end;
      });
      buckets.push({ hour: label, count: matching.length, errors: matching.filter((l) => l.level === "error").length });
    }
    return buckets;
  }, [logs]);

  const maxHourly = Math.max(...hourlyActivity.map((h) => h.count), 1);
  // Y-axis ticks for activity chart (4 steps)
  const activityYTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxHourly / 4) * (4 - i)));

  // Top error messages
  const topErrors = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of logs) {
      if (log.level === "error") {
        map[log.message] = (map[log.message] || 0) + 1;
      }
    }
    return Object.entries(map)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [logs]);

  const maxErrorCount = Math.max(...topErrors.map((e) => e.count), 1);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          Analytics
        </h2>
        <p className="text-sm text-slate-400 mt-1 ml-13">
          Deep insights into log patterns, error trends, and service behavior.
        </p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total Logs", value: stats.totalLogs, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
          { label: "Errors", value: stats.errorCount, color: "text-red-400 bg-red-500/10 border-red-500/20" },
          { label: "Warnings", value: stats.warningCount, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
          { label: "Info", value: stats.infoCount, color: "text-cyan-300 bg-cyan-500/5 border-cyan-500/10" },
          { label: "Debug", value: stats.debugCount, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
          { label: "Err/min", value: stats.errorsPerMinute, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
        ].map((p) => (
          <div key={p.label} className={`px-4 py-3 rounded-xl border text-center ${p.color}`}>
            <p className="text-lg font-bold leading-none">{p.value}</p>
            <p className="text-[10px] mt-1 opacity-70 uppercase tracking-wider">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row — Issues Timeline + Log Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <LogChart data={timeline} />
        </div>
        <div className="lg:col-span-2">
          <LogLevelPie logs={logs} />
        </div>
      </div>

      {/* 24-Hour Activity Chart */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            24-Hour Activity
          </h3>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Total
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60" />
              Errors
            </span>
          </div>
        </div>

        <div className="flex gap-0">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between h-40 pr-2 pb-7 shrink-0">
            {activityYTicks.map((tick, i) => (
              <span key={i} className="text-[10px] text-slate-500 text-right w-6 leading-none">
                {tick}
              </span>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 min-w-0">
            <div className="relative h-40 border-l border-b border-slate-700/40">
              {/* Horizontal grid lines */}
              {activityYTicks.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-slate-700/20"
                  style={{ top: `${(i / 4) * 100}%` }}
                />
              ))}

              {/* Bars */}
              <div className="absolute inset-0 flex items-end px-0.5">
                {hourlyActivity.map((h, i) => {
                  const pct = (h.count / maxHourly) * 100;
                  const errPct = h.count > 0 ? (h.errors / h.count) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex justify-center group px-[1px]">
                      <div className="relative w-full max-w-[20px]">
                        {/* Tooltip */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 px-2 py-1 rounded-md bg-slate-900 border border-slate-600/50 shadow-lg text-[10px] text-slate-300 whitespace-nowrap pointer-events-none">
                          {h.count} logs · {h.errors} err
                        </div>
                        <div
                          className="w-full rounded-t-sm overflow-hidden transition-all duration-300"
                          style={{ height: `${Math.max(pct, h.count > 0 ? 3 : 0)}%`, maxHeight: "100%" }}
                        >
                          {/* Error portion (top) */}
                          <div
                            className="w-full bg-red-500/60"
                            style={{ height: `${errPct}%`, minHeight: h.errors > 0 ? "2px" : "0px" }}
                          />
                          {/* Normal portion (bottom) */}
                          <div
                            className="w-full bg-linear-to-t from-emerald-600 to-emerald-400 flex-1"
                            style={{ height: `${100 - errPct}%` }}
                          />
                        </div>
                        {h.count === 0 && (
                          <div className="w-full h-[2px] rounded bg-slate-700/40" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels — show every 3rd to avoid clutter */}
            <div className="flex mt-2 px-0.5">
              {hourlyActivity.map((h, i) => (
                <div key={i} className="flex-1 text-center">
                  {i % 3 === 0 ? (
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{h.hour}</span>
                  ) : (
                    <span className="text-[10px] text-transparent select-none">·</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Service breakdown + Top Errors — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service breakdown */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
            Logs per Service
          </h3>
          <div className="space-y-4">
            {logsPerService.map((svc, i) => {
              const pct = Math.round((svc.total / maxServiceLogs) * 100);
              const errPct = svc.total > 0 ? Math.round((svc.errors / svc.total) * 100) : 0;
              const warnPct = svc.total > 0 ? Math.round((svc.warnings / svc.total) * 100) : 0;
              return (
                <div key={svc.name} className="animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-200 font-medium">{svc.name}</span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{svc.total}</span>
                  </div>
                  {/* Stacked bar */}
                  <div className="h-3 bg-slate-700/40 rounded-full overflow-hidden flex" style={{ width: `${pct}%`, minWidth: "20px" }}>
                    <div className="h-full bg-cyan-500/80" style={{ width: `${100 - errPct - warnPct}%` }} />
                    <div className="h-full bg-amber-500/80" style={{ width: `${warnPct}%` }} />
                    <div className="h-full bg-red-500/80" style={{ width: `${errPct}%` }} />
                  </div>
                  {/* Breakdown numbers */}
                  <div className="flex items-center gap-3 mt-1 text-[10px]">
                    <span className="text-cyan-400/70">{svc.info + svc.debug} ok</span>
                    <span className="text-amber-400/70">{svc.warnings} warn</span>
                    <span className="text-red-400/70">{svc.errors} err</span>
                  </div>
                </div>
              );
            })}
            {logsPerService.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No service data yet.</p>
            )}
          </div>
        </div>

        {/* Top errors — horizontal bar chart style */}
        <div className="rounded-xl border border-red-500/15 bg-red-500/[0.02] p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Top Error Messages
          </h3>
          {topErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No errors recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topErrors.map((err, i) => {
                const barPct = Math.round((err.count / maxErrorCount) * 100);
                return (
                  <div
                    key={i}
                    className="animate-slideUp"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300 truncate flex-1 mr-3">{err.message}</span>
                      <span className="text-xs font-bold text-red-400 tabular-nums shrink-0">
                        ×{err.count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-red-500 to-red-400 transition-all duration-700"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

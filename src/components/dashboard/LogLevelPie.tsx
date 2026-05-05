import type { Log } from "../../types";

interface LogLevelPieProps {
  logs: Log[];
}

export default function LogLevelPie({ logs }: LogLevelPieProps) {
  const total = logs.length || 1;
  const counts = {
    info: logs.filter((l) => l.level === "info").length,
    error: logs.filter((l) => l.level === "error").length,
    warning: logs.filter((l) => l.level === "warning").length,
    debug: logs.filter((l) => l.level === "debug").length,
  };

  const segments = [
    { level: "Info",    count: counts.info,    color: "#22d3ee", ring: "bg-cyan-400",  accent: "text-cyan-400" },
    { level: "Error",   count: counts.error,   color: "#f87171", ring: "bg-red-400",   accent: "text-red-400" },
    { level: "Warning", count: counts.warning, color: "#fbbf24", ring: "bg-amber-400", accent: "text-amber-400" },
    { level: "Debug",   count: counts.debug,   color: "#94a3b8", ring: "bg-slate-400", accent: "text-slate-400" },
  ];

  // Build conic gradient with gaps
  let cumulative = 0;
  const gradientParts: string[] = [];
  for (const seg of segments) {
    const pct = (seg.count / total) * 100;
    if (pct > 0) {
      // Add a tiny transparent gap between slices
      if (cumulative > 0) {
        gradientParts.push(`transparent ${cumulative}% ${cumulative + 0.5}%`);
        cumulative += 0.5;
      }
      gradientParts.push(`${seg.color} ${cumulative}% ${cumulative + pct}%`);
      cumulative += pct;
    }
  }
  const gradient = `conic-gradient(from 180deg, ${gradientParts.join(", ")})`;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-5 flex items-center gap-2">
        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        Log Distribution
      </h3>

      <div className="flex items-center gap-8">
        {/* Donut */}
        <div className="relative w-36 h-36 shrink-0">
          <div
            className="w-full h-full rounded-full shadow-[0_0_30px_rgba(34,211,238,0.08)]"
            style={{ background: gradient }}
          />
          <div className="absolute inset-4 rounded-full bg-slate-800/95 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <div className="text-center">
              <p className="text-2xl font-bold text-white leading-none">{total}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">total</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 flex-1">
          {segments.map((seg) => {
            const pct = Math.round((seg.count / total) * 100);
            return (
              <div key={seg.level}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${seg.ring}`} />
                    <span className="text-xs text-slate-300 font-medium">{seg.level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${seg.accent}`}>{seg.count}</span>
                    <span className="text-[10px] text-slate-500 w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="h-1 bg-slate-700/40 rounded-full overflow-hidden ml-[18px]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: seg.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import type { LogLevel, TimeFilter } from "../../types";

interface LogFiltersProps {
  level: LogLevel;
  time: TimeFilter;
  onLevelChange: (level: LogLevel) => void;
  onTimeChange: (time: TimeFilter) => void;
}

const levels: { value: LogLevel; label: string; color: string; activeBg: string }[] = [
  { value: "all",     label: "All",     color: "text-slate-300", activeBg: "bg-slate-600" },
  { value: "info",    label: "Info",    color: "text-cyan-400",  activeBg: "bg-cyan-500/20" },
  { value: "error",   label: "Error",   color: "text-red-400",   activeBg: "bg-red-500/20" },
  { value: "warning", label: "Warning", color: "text-amber-400", activeBg: "bg-amber-500/20" },
  { value: "debug",   label: "Debug",   color: "text-slate-400", activeBg: "bg-slate-500/20" },
];

const times: { value: TimeFilter; label: string }[] = [
  { value: "all",  label: "All Time" },
  { value: "1m",   label: "1 min" },
  { value: "5m",   label: "5 min" },
  { value: "15m",  label: "15 min" },
  { value: "30m",  label: "30 min" },
  { value: "1h",   label: "1 hour" },
];

export default function LogFilters({ level, time, onLevelChange, onTimeChange }: LogFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Level pills */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
        {levels.map((l) => (
          <button
            key={l.value}
            onClick={() => onLevelChange(l.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              level === l.value
                ? `${l.activeBg} ${l.color} shadow-sm`
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Time dropdown */}
      <select
        value={time}
        onChange={(e) => onTimeChange(e.target.value as TimeFilter)}
        className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all cursor-pointer"
      >
        {times.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}

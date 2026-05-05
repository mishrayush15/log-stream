import type { LogStats } from "../../types";

interface StatsCardsProps {
  stats: LogStats;
}

const cards = (s: LogStats) => [
  {
    label: "Total Logs",
    value: s.totalLogs,
    icon: ListIcon,
    color: "from-cyan-500 to-blue-500",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  {
    label: "Errors",
    value: s.errorCount,
    icon: ErrorIcon,
    color: "from-red-500 to-rose-500",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  {
    label: "Warnings",
    value: s.warningCount,
    icon: WarnIcon,
    color: "from-amber-500 to-yellow-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  {
    label: "Active Services",
    value: s.activeServices,
    icon: ServerIcon,
    color: "from-emerald-500 to-green-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    label: "Errors / min",
    value: s.errorsPerMinute,
    icon: SpeedIcon,
    color: "from-violet-500 to-purple-500",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
  },
  {
    label: "Last Activity",
    value: new Date(s.lastActivity).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    icon: ClockIcon,
    color: "from-pink-500 to-fuchsia-500",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/20",
  },
];

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards(stats).map((card, i) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-xl border ${card.border} ${card.bg} p-4 group hover:scale-[1.03] transition-transform duration-200 animate-slideUp`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* gradient glow */}
          <div className={`absolute -top-6 -right-6 w-20 h-20 bg-linear-to-br ${card.color} rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <card.icon className={`w-5 h-5 ${card.text}`} />
          </div>
          <p className={`text-2xl font-bold ${card.text} relative z-10`}>{card.value}</p>
          <p className="text-xs text-slate-400 mt-1 relative z-10">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Icons ── */
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

function SpeedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

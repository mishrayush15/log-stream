interface ServiceStatusProps {
  services: { name: string; status: "healthy" | "degraded" | "down"; logs: number }[];
}

const statusConfig = {
  healthy:  { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10", label: "Healthy" },
  degraded: { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-500/10",   label: "Degraded" },
  down:     { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10",     label: "Down" },
};

export default function ServiceStatus({ services }: ServiceStatusProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        Service Health
      </h3>

      <div className="space-y-3">
        {services.map((svc, i) => {
          const cfg = statusConfig[svc.status];
          return (
            <div
              key={svc.name}
              className={`flex items-center justify-between p-3 rounded-lg ${cfg.bg} border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 animate-slideUp`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  {svc.status === "healthy" && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{svc.name}</p>
                  <p className="text-[11px] text-slate-500">{svc.logs} logs</p>
                </div>
              </div>
              <span className={`text-[11px] font-semibold ${cfg.text} uppercase tracking-wider`}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

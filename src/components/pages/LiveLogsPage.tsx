import { useLogData } from "../../context/LogProvider";
import LogFilters from "../dashboard/LogFilters";
import SearchBar from "../dashboard/SearchBar";
import LogsTable from "../dashboard/LogsTable";

export default function LiveLogsPage() {
  const {
    filteredLogs,
    levelFilter, setLevelFilter,
    timeFilter, setTimeFilter,
    search, setSearch,
    isLive, setIsLive,
    clearLogs, exportLogs,
    stats,
  } = useLogData();

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            Live Logs
          </h2>
          <p className="text-sm text-slate-400 mt-1 ml-13">
            Real-time log stream from all tracked services.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">{stats.totalLogs} total</span>
          <span className="text-slate-700">|</span>
          <span className="text-red-400">{stats.errorCount} errors</span>
          <span className="text-slate-700">|</span>
          <span className="text-amber-400">{stats.warningCount} warnings</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <LogFilters
          level={levelFilter}
          time={timeFilter}
          onLevelChange={setLevelFilter}
          onTimeChange={setTimeFilter}
        />
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="flex-1 lg:w-72">
            <SearchBar value={search} onChange={setSearch} />
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
              isLive
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            {isLive ? "Live" : "Paused"}
          </button>

          {/* Export */}
          <button
            onClick={exportLogs}
            className="px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
            title="Export logs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* Clear */}
          <button
            onClick={clearLogs}
            className="px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-800/50 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
            title="Clear logs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Full log table */}
      <LogsTable logs={filteredLogs} isLive={isLive} />
    </div>
  );
}

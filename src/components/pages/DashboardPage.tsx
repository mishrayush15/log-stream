import { useLogData } from "../../context/LogProvider";
import StatsCards from "../dashboard/StatsCards";
import LogsTable from "../dashboard/LogsTable";
import LogChart from "../dashboard/LogChart";
import LogLevelPie from "../dashboard/LogLevelPie";
import ServiceStatus from "../dashboard/ServiceStatus";
import AlertsPanel from "../dashboard/AlertsPanel";

export default function DashboardPage() {
  const { stats, filteredLogs, isLive, timeline, errorLogs, serviceHealthList, logs } = useLogData();

  return (
    <>
      {/* Stats Row */}
      <section className="mb-6">
        <StatsCards stats={stats} />
      </section>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <LogsTable logs={filteredLogs.slice(0, 15)} isLive={isLive} />
          <div className="flex-1 min-h-0">
            <LogChart data={timeline} className="h-full" />
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-4 space-y-6">
          <AlertsPanel errors={errorLogs} />
          <ServiceStatus services={serviceHealthList} />
          <LogLevelPie logs={logs} />
        </div>
      </div>
    </>
  );
}

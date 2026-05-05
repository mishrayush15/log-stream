import { useState } from "react";
import LogProvider from "./context/LogProvider";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import DashboardPage from "./components/pages/DashboardPage";
import LiveLogsPage from "./components/pages/LiveLogsPage";
import AnalyticsPage from "./components/pages/AnalyticsPage";
import ServicesPage from "./components/pages/ServicesPage";
import AlertsPage from "./components/pages/AlertsPage";

const pages: Record<string, React.FC> = {
  dashboard: DashboardPage,
  logs: LiveLogsPage,
  analytics: AnalyticsPage,
  services: ServicesPage,
  alerts: AlertsPage,
};

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");

  const ActivePage = pages[activeNav] ?? DashboardPage;

  return (
    <LogProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Sidebar
          active={activeNav}
          onNavigate={setActiveNav}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <Header sidebarCollapsed={sidebarCollapsed} />

        <main
          className={`pt-20 pb-8 px-6 transition-all duration-300 ${
            sidebarCollapsed ? "ml-17" : "ml-60"
          }`}
        >
          <ActivePage />
        </main>
      </div>
    </LogProvider>
  );
}

export default App;

/**
 * LogProvider — single source of truth for all log / service / alert data.
 *
 * Connects to the LogStream backend server via WebSocket for real-time
 * log streaming and REST APIs for CRUD operations.
 * Falls back to local-only mode if the backend is unreachable.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  Log,
  LogStats,
  LogLevel,
  TimeFilter,
  TimelineBucket,
  TrackedService,
  AlertRule,
  Alert,
} from "../types";

const API_BASE = "/api";
const WS_URL =
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.host +
  "/ws";

/* ────────────────────── context shape ────────────────────── */

interface LogContextValue {
  /* connection */
  connected: boolean;

  /* logs */
  logs: Log[];
  filteredLogs: Log[];
  levelFilter: LogLevel;
  timeFilter: TimeFilter;
  search: string;
  isLive: boolean;
  setLevelFilter: (l: LogLevel) => void;
  setTimeFilter: (t: TimeFilter) => void;
  setSearch: (s: string) => void;
  setIsLive: (v: boolean) => void;
  clearLogs: () => void;
  exportLogs: () => void;

  /* derived */
  stats: LogStats;
  timeline: TimelineBucket[];
  errorLogs: Log[];
  serviceHealthList: { name: string; status: "healthy" | "degraded" | "down"; logs: number }[];

  /* tracked services */
  trackedServices: TrackedService[];
  addService: (name: string, port: number) => void;
  updateService: (id: string, name: string, port: number) => void;
  removeService: (id: string) => void;
  toggleServiceStatus: (id: string) => void;

  /* alert rules */
  alertRules: AlertRule[];
  addAlertRule: (rule: Omit<AlertRule, "id" | "createdAt">) => void;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  removeAlertRule: (id: string) => void;
  toggleAlertRule: (id: string) => void;

  /* alerts */
  alerts: Alert[];
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
}

const LogContext = createContext<LogContextValue | null>(null);

export function useLogData(): LogContextValue {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error("useLogData must be used inside <LogProvider>");
  return ctx;
}

/* ────────────────────── provider ────────────────────── */

export default function LogProvider({ children }: { children: ReactNode }) {
  /* — connection — */
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* — logs — */
  const [logs, setLogs] = useState<Log[]>([]);
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [search, setSearch] = useState("");
  const [isLive, setIsLive] = useState(true);

  /* — tracked services — */
  const [trackedServices, setTrackedServices] = useState<TrackedService[]>([]);

  /* — alert rules & alerts — */
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // ─── WebSocket connection ───────────────────────────────
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[ws] Connected to LogStream server");
        setConnected(true);
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current as unknown as number);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWsMessage(data);
        } catch (err) {
          console.error("[ws] Parse error:", err);
        }
      };

      ws.onclose = () => {
        console.log("[ws] Disconnected");
        setConnected(false);
        wsRef.current = null;
        // Auto-reconnect after 3 seconds
        reconnectTimer.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        // onclose will fire after this, which handles reconnect
        ws.close();
      };
    } catch {
      setConnected(false);
      reconnectTimer.current = setTimeout(connectWebSocket, 3000);
    }
  }, []);

  const handleWsMessage = useCallback((data: Record<string, unknown>) => {
    switch (data.type) {
      case "init":
        // Full state snapshot from server
        setLogs(data.logs as Log[]);
        setTrackedServices(data.services as TrackedService[]);
        setAlertRules(data.alertRules as AlertRule[]);
        setAlerts(data.alerts as Alert[]);
        break;

      case "log":
        // New log from a Docker container
        setLogs((prev) => [data.log as Log, ...prev].slice(0, 5000));
        break;

      case "service-add":
        setTrackedServices((prev) => [data.service as TrackedService, ...prev]);
        break;

      case "service-update":
        setTrackedServices((prev) =>
          prev.map((s) =>
            s.id === (data.service as TrackedService).id
              ? (data.service as TrackedService)
              : s
          )
        );
        break;

      case "service-remove":
        setTrackedServices((prev) => prev.filter((s) => s.id !== data.serviceId));
        break;

      case "alert":
        setAlerts((prev) => [data.alert as Alert, ...prev].slice(0, 500));
        break;

      case "alert-update":
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === (data.alert as Alert).id ? (data.alert as Alert) : a
          )
        );
        break;

      case "alerts-cleared":
        setAlerts([]);
        break;

      case "rule-add":
        setAlertRules((prev) => [data.rule as AlertRule, ...prev]);
        break;

      case "rule-update":
        setAlertRules((prev) =>
          prev.map((r) =>
            r.id === (data.rule as AlertRule).id ? (data.rule as AlertRule) : r
          )
        );
        break;

      case "rule-remove":
        setAlertRules((prev) => prev.filter((r) => r.id !== data.ruleId));
        break;

      case "logs-cleared":
        setLogs([]);
        break;
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current as unknown as number);
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  // ─── Filtered logs ─────────────────────────────────────
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const timeMs: Record<TimeFilter, number> = {
      all: Infinity,
      "1m": 60_000,
      "5m": 300_000,
      "15m": 900_000,
      "30m": 1_800_000,
      "1h": 3_600_000,
    };
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (timeFilter !== "all") {
        const logTime = new Date(log.timestamp).getTime();
        if (now - logTime > timeMs[timeFilter]) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !log.message.toLowerCase().includes(q) &&
          !log.service.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [logs, levelFilter, timeFilter, search]);

  // ─── Derived stats ─────────────────────────────────────
  const stats: LogStats = useMemo(() => {
    const errorCount = logs.filter((l) => l.level === "error").length;
    const warningCount = logs.filter((l) => l.level === "warning").length;
    const infoCount = logs.filter((l) => l.level === "info").length;
    const debugCount = logs.filter((l) => l.level === "debug").length;
    const serviceSet = new Set(logs.map((l) => l.service));
    const fiveMinAgo = Date.now() - 5 * 60_000;
    const recentErrors = logs.filter(
      (l) => l.level === "error" && new Date(l.timestamp).getTime() >= fiveMinAgo
    ).length;
    return {
      totalLogs: logs.length,
      errorCount,
      warningCount,
      infoCount,
      debugCount,
      activeServices: serviceSet.size,
      errorsPerMinute: Math.round((recentErrors / 5) * 10) / 10,
      lastActivity: logs.length ? logs[0].timestamp : new Date().toISOString(),
    };
  }, [logs]);

  const timeline: TimelineBucket[] = useMemo(() => {
    const now = Date.now();
    const buckets: TimelineBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = now - (i + 1) * 5 * 60_000;
      const end = now - i * 5 * 60_000;
      const label = new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const errors = logs.filter(
        (l) => l.level === "error" && new Date(l.timestamp).getTime() >= start && new Date(l.timestamp).getTime() < end
      ).length;
      const warnings = logs.filter(
        (l) => l.level === "warning" && new Date(l.timestamp).getTime() >= start && new Date(l.timestamp).getTime() < end
      ).length;
      buckets.push({ time: label, errors, warnings });
    }
    return buckets;
  }, [logs]);

  const errorLogs = useMemo(() => logs.filter((l) => l.level === "error"), [logs]);

  const serviceHealthList = useMemo(() => {
    return trackedServices.map((svc) => ({
      name: svc.name,
      status: (svc.status === "running" ? "healthy" : svc.status === "error" ? "down" : "degraded") as "healthy" | "degraded" | "down",
      logs: logs.filter((l) => l.service === svc.name).length,
    }));
  }, [logs, trackedServices]);

  // ─── Log actions ───────────────────────────────────────
  const clearLogs = useCallback(() => {
    fetch(`${API_BASE}/logs`, { method: "DELETE" }).catch(() => {
      // Fallback: clear locally
      setLogs([]);
    });
  }, []);

  const exportLogs = useCallback(() => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "logs-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  // ─── Service actions (call backend API) ────────────────
  const addService = useCallback((name: string, port: number) => {
    fetch(`${API_BASE}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, port }),
    }).catch(() => {
      // Fallback: add locally
      setTrackedServices((prev) => [
        { id: crypto.randomUUID(), name, port, status: "stopped" as const, addedAt: new Date().toISOString() },
        ...prev,
      ]);
    });
  }, []);

  const updateService = useCallback((id: string, name: string, port: number) => {
    fetch(`${API_BASE}/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, port }),
    }).catch(() => {
      setTrackedServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name, port } : s))
      );
    });
  }, []);

  const removeService = useCallback((id: string) => {
    fetch(`${API_BASE}/services/${id}`, { method: "DELETE" }).catch(() => {
      setTrackedServices((prev) => prev.filter((s) => s.id !== id));
    });
  }, []);

  const toggleServiceStatus = useCallback((id: string) => {
    fetch(`${API_BASE}/services/${id}/toggle`, { method: "POST" }).catch(() => {
      setTrackedServices((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: s.status === "running" ? "stopped" : "running" } : s
        )
      );
    });
  }, []);

  // ─── Alert rule actions ────────────────────────────────
  const addAlertRule = useCallback((rule: Omit<AlertRule, "id" | "createdAt">) => {
    fetch(`${API_BASE}/alert-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    }).catch(() => {
      setAlertRules((prev) => [
        { ...rule, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ...prev,
      ]);
    });
  }, []);

  const updateAlertRule = useCallback((id: string, updates: Partial<AlertRule>) => {
    fetch(`${API_BASE}/alert-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {
      setAlertRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    });
  }, []);

  const removeAlertRule = useCallback((id: string) => {
    fetch(`${API_BASE}/alert-rules/${id}`, { method: "DELETE" }).catch(() => {
      setAlertRules((prev) => prev.filter((r) => r.id !== id));
    });
  }, []);

  const toggleAlertRule = useCallback((id: string) => {
    fetch(`${API_BASE}/alert-rules/${id}/toggle`, { method: "POST" }).catch(() => {
      setAlertRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
      );
    });
  }, []);

  // ─── Alert actions ─────────────────────────────────────
  const acknowledgeAlert = useCallback((id: string) => {
    fetch(`${API_BASE}/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledged: true }),
    }).catch(() => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
    });
  }, []);

  const clearAlerts = useCallback(() => {
    fetch(`${API_BASE}/alerts`, { method: "DELETE" }).catch(() => {
      setAlerts([]);
    });
  }, []);

  const value: LogContextValue = {
    connected,
    logs, filteredLogs, levelFilter, timeFilter, search, isLive,
    setLevelFilter, setTimeFilter, setSearch, setIsLive,
    clearLogs, exportLogs,
    stats, timeline, errorLogs, serviceHealthList,
    trackedServices, addService, updateService, removeService, toggleServiceStatus,
    alertRules, addAlertRule, updateAlertRule, removeAlertRule, toggleAlertRule,
    alerts, acknowledgeAlert, clearAlerts,
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

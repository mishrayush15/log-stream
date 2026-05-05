export interface Log {
  id: string;
  service: string;
  level: "info" | "error" | "warning" | "debug";
  message: string;
  timestamp: string;
}

export interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  activeServices: number;
  errorsPerMinute: number;
  lastActivity: string;
}

export type LogLevel = "all" | "info" | "error" | "warning" | "debug";
export type TimeFilter = "all" | "1m" | "5m" | "15m" | "30m" | "1h";

export interface TrackedService {
  id: string;
  name: string;
  port: number;
  status: "running" | "stopped" | "error";
  addedAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: "error_rate" | "error_count" | "service_down" | "high_latency";
  threshold: number;
  service: string;       // "all" or a service name
  enabled: boolean;
  createdAt: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: "critical" | "warning" | "info";
  message: string;
  service: string;
  acknowledged: boolean;
  triggeredAt: string;
}

export interface TimelineBucket {
  time: string;
  errors: number;
  warnings: number;
}


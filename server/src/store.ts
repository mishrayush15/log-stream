/**
 * In-memory store for tracked services, alert rules, fired alerts, and log buffer.
 */

import { randomUUID } from "node:crypto";

/* ── Types (mirroring frontend) ── */

export interface Log {
  id: string;
  service: string;
  level: "info" | "error" | "warning" | "debug";
  message: string;
  timestamp: string;
}

export interface TrackedService {
  id: string;
  name: string;
  port: number;
  containerId?: string;
  status: "running" | "stopped" | "error";
  addedAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: "error_rate" | "error_count" | "service_down" | "high_latency";
  threshold: number;
  service: string;
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

/* ── Store ── */

const MAX_LOGS = 5000;

class Store {
  logs: Log[] = [];
  services: TrackedService[] = [];
  alertRules: AlertRule[] = [];
  alerts: Alert[] = [];

  /* ── Logs ── */

  addLog(log: Log) {
    this.logs.unshift(log);
    if (this.logs.length > MAX_LOGS) {
      this.logs.length = MAX_LOGS;
    }
  }

  clearLogs() {
    this.logs = [];
  }

  /* ── Tracked Services ── */

  addService(name: string, port: number): TrackedService {
    const svc: TrackedService = {
      id: randomUUID(),
      name,
      port,
      status: "stopped",
      addedAt: new Date().toISOString(),
    };
    this.services.push(svc);
    return svc;
  }

  updateService(id: string, updates: Partial<Pick<TrackedService, "name" | "port" | "status" | "containerId">>): TrackedService | null {
    const svc = this.services.find((s) => s.id === id);
    if (!svc) return null;
    Object.assign(svc, updates);
    return svc;
  }

  removeService(id: string): boolean {
    const idx = this.services.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.services.splice(idx, 1);
    return true;
  }

  getService(id: string): TrackedService | undefined {
    return this.services.find((s) => s.id === id);
  }

  /* ── Alert Rules ── */

  addAlertRule(rule: Omit<AlertRule, "id" | "createdAt">): AlertRule {
    const r: AlertRule = {
      ...rule,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.alertRules.push(r);
    return r;
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const r = this.alertRules.find((ar) => ar.id === id);
    if (!r) return null;
    Object.assign(r, updates);
    return r;
  }

  removeAlertRule(id: string): boolean {
    const idx = this.alertRules.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.alertRules.splice(idx, 1);
    return true;
  }

  /* ── Alerts ── */

  addAlert(alert: Omit<Alert, "id">): Alert {
    const a: Alert = { ...alert, id: randomUUID() };
    this.alerts.unshift(a);
    if (this.alerts.length > 500) this.alerts.length = 500;
    return a;
  }

  acknowledgeAlert(id: string): Alert | null {
    const a = this.alerts.find((al) => al.id === id);
    if (!a) return null;
    a.acknowledged = true;
    return a;
  }

  clearAlerts() {
    this.alerts = [];
  }
}

export const store = new Store();

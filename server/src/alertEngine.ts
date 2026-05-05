/**
 * Alert rule evaluation engine.
 * Called for every incoming log to check if any alert rules should fire.
 */

import { store, type Log, type Alert } from "./store.js";
import { broadcast } from "./ws.js";

/** Cooldown per rule to avoid alert spam (ms) */
const COOLDOWN_MS = 30_000;
const lastFired = new Map<string, number>();

/** Evaluate all enabled rules against a new log entry */
export function evaluate(log: Log) {
  for (const rule of store.alertRules) {
    if (!rule.enabled) continue;

    // Check service scope
    if (rule.service !== "all" && rule.service !== log.service) continue;

    // Cooldown check
    const last = lastFired.get(rule.id) ?? 0;
    if (Date.now() - last < COOLDOWN_MS) continue;

    let shouldFire = false;
    let message = "";

    switch (rule.condition) {
      case "error_rate": {
        // Errors per minute over the last 5 minutes
        const fiveMinAgo = Date.now() - 5 * 60_000;
        const recentErrors = store.logs.filter(
          (l) =>
            l.level === "error" &&
            (rule.service === "all" || l.service === rule.service) &&
            new Date(l.timestamp).getTime() >= fiveMinAgo
        ).length;
        const errorsPerMin = recentErrors / 5;
        if (errorsPerMin >= rule.threshold) {
          shouldFire = true;
          message = `Error rate ${errorsPerMin.toFixed(1)}/min exceeded threshold of ${rule.threshold}/min`;
        }
        break;
      }

      case "error_count": {
        // Total errors in the last 15 minutes
        const windowAgo = Date.now() - 15 * 60_000;
        const errorCount = store.logs.filter(
          (l) =>
            l.level === "error" &&
            (rule.service === "all" || l.service === rule.service) &&
            new Date(l.timestamp).getTime() >= windowAgo
        ).length;
        if (errorCount >= rule.threshold) {
          shouldFire = true;
          message = `Error count ${errorCount} exceeded threshold of ${rule.threshold} in 15min window`;
        }
        break;
      }

      case "service_down": {
        // Only fires if the log itself indicates the service is down
        if (log.level === "error") {
          const svc = store.services.find((s) => s.name === log.service);
          if (svc && svc.status === "error") {
            shouldFire = true;
            message = `Service "${log.service}" is in error state`;
          }
        }
        break;
      }

      case "high_latency": {
        // Check if the log message mentions latency above threshold
        const latencyMatch = log.message.match(/(\d+)\s*ms/i);
        if (latencyMatch) {
          const latency = parseInt(latencyMatch[1], 10);
          if (latency >= rule.threshold) {
            shouldFire = true;
            message = `Latency ${latency}ms exceeded threshold of ${rule.threshold}ms`;
          }
        }
        break;
      }
    }

    if (shouldFire) {
      lastFired.set(rule.id, Date.now());

      const severity = determineSeverity(rule.condition, rule.threshold);
      const alert = store.addAlert({
        ruleId: rule.id,
        ruleName: rule.name,
        severity,
        message,
        service: log.service,
        acknowledged: false,
        triggeredAt: new Date().toISOString(),
      });

      broadcast({ type: "alert", alert });
      console.log(`[alert] ${severity.toUpperCase()}: ${rule.name} — ${message}`);
    }
  }
}

function determineSeverity(
  condition: string,
  threshold: number
): Alert["severity"] {
  switch (condition) {
    case "error_rate":
      return threshold >= 10 ? "critical" : "warning";
    case "error_count":
      return threshold >= 20 ? "critical" : "warning";
    case "service_down":
      return "critical";
    case "high_latency":
      return threshold >= 5000 ? "critical" : "warning";
    default:
      return "info";
  }
}

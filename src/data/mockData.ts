import type { Log, TrackedService, AlertRule, Alert } from "../types";

const now = new Date();

function mins(m: number): string {
  return new Date(now.getTime() - m * 60000).toISOString();
}

/* ─── Mock logs ─────────────────────────────────────────── */

export const mockLogs: Log[] = [
  { id: "1",  service: "auth-service",     level: "info",    message: "User login success — user_id: 4821",          timestamp: mins(0.2) },
  { id: "2",  service: "payment-service",  level: "error",   message: "Payment gateway timeout — order #90812",      timestamp: mins(0.5) },
  { id: "3",  service: "app-service",      level: "info",    message: "Product viewed — product_id: 334",            timestamp: mins(1) },
  { id: "4",  service: "auth-service",     level: "warning", message: "Rate limit approaching for IP 192.168.1.42",  timestamp: mins(1.5) },
  { id: "5",  service: "payment-service",  level: "error",   message: "Insufficient funds — user_id: 1120",          timestamp: mins(2) },
  { id: "6",  service: "app-service",      level: "info",    message: "Homepage loaded — session abc-123",           timestamp: mins(2.5) },
  { id: "7",  service: "notification-svc", level: "info",    message: "Email sent to user_id: 4821",                 timestamp: mins(3) },
  { id: "8",  service: "auth-service",     level: "debug",   message: "Token refresh — token_exp in 300s",           timestamp: mins(3.2) },
  { id: "9",  service: "payment-service",  level: "info",    message: "Payment success — order #90810 ₹2,499",      timestamp: mins(4) },
  { id: "10", service: "app-service",      level: "warning", message: "Slow DB query — 1820ms on /api/products",     timestamp: mins(4.5) },
  { id: "11", service: "auth-service",     level: "error",   message: "Invalid credentials — 3 failed attempts",     timestamp: mins(5) },
  { id: "12", service: "notification-svc", level: "warning", message: "SMS gateway degraded — latency 4200ms",       timestamp: mins(6) },
  { id: "13", service: "app-service",      level: "info",    message: "Cart updated — user_id: 4821, items: 3",      timestamp: mins(7) },
  { id: "14", service: "payment-service",  level: "info",    message: "Refund processed — order #90805 ₹799",       timestamp: mins(8) },
  { id: "15", service: "auth-service",     level: "info",    message: "User registered — user_id: 4822",             timestamp: mins(9) },
  { id: "16", service: "app-service",      level: "debug",   message: "Cache hit ratio: 94.2% — redis cluster",      timestamp: mins(10) },
  { id: "17", service: "payment-service",  level: "error",   message: "Duplicate transaction detected — txn_8812",   timestamp: mins(11) },
  { id: "18", service: "notification-svc", level: "info",    message: "Push notification delivered — batch 44",       timestamp: mins(12) },
  { id: "19", service: "auth-service",     level: "warning", message: "Session expired — user_id: 3301",             timestamp: mins(14) },
  { id: "20", service: "app-service",      level: "info",    message: "Search query — q='wireless headphones'",      timestamp: mins(15) },
  { id: "21", service: "payment-service",  level: "info",    message: "Checkout started — user_id: 4821",            timestamp: mins(17) },
  { id: "22", service: "app-service",      level: "error",   message: "Image upload failed — file too large 12MB",   timestamp: mins(20) },
  { id: "23", service: "auth-service",     level: "info",    message: "Password changed — user_id: 2210",            timestamp: mins(22) },
  { id: "24", service: "notification-svc", level: "error",   message: "Webhook delivery failed — endpoint down",     timestamp: mins(25) },
  { id: "25", service: "app-service",      level: "info",    message: "Order placed — order #90813 by user_id: 4821", timestamp: mins(28) },
  { id: "26", service: "payment-service",  level: "warning", message: "High transaction volume — 342 txn/min",       timestamp: mins(30) },
  { id: "27", service: "auth-service",     level: "debug",   message: "OAuth callback received — provider: google",  timestamp: mins(35) },
  { id: "28", service: "app-service",      level: "info",    message: "Wishlist updated — user_id: 3301",            timestamp: mins(40) },
  { id: "29", service: "payment-service",  level: "info",    message: "Subscription renewed — plan: premium",        timestamp: mins(50) },
  { id: "30", service: "app-service",      level: "warning", message: "Memory usage 87% — container app-service",    timestamp: mins(55) },
];

/* ─── Mock tracked services ────────────────────────────── */

export const mockTrackedServices: TrackedService[] = [
  { id: "1", name: "auth-service",     port: 3001, status: "running", addedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "2", name: "payment-service",  port: 3002, status: "running", addedAt: new Date(Date.now() - 72000000).toISOString() },
  { id: "3", name: "app-service",      port: 3003, status: "running", addedAt: new Date(Date.now() - 50000000).toISOString() },
  { id: "4", name: "notification-svc", port: 3004, status: "stopped", addedAt: new Date(Date.now() - 36000000).toISOString() },
];

/* ─── Mock alert rules ─────────────────────────────────── */

export const mockAlertRules: AlertRule[] = [
  { id: "r1", name: "High Error Rate",      condition: "error_rate",  threshold: 5,    service: "all",            enabled: true,  createdAt: mins(1440) },
  { id: "r2", name: "Payment Failures",     condition: "error_count", threshold: 10,   service: "payment-service", enabled: true,  createdAt: mins(720) },
  { id: "r3", name: "Auth Service Down",    condition: "service_down", threshold: 30,  service: "auth-service",    enabled: true,  createdAt: mins(360) },
  { id: "r4", name: "Slow Responses",       condition: "high_latency", threshold: 2000, service: "app-service",   enabled: false, createdAt: mins(180) },
];

/* ─── Mock fired alerts ────────────────────────────────── */

export const mockAlerts: Alert[] = [
  { id: "a1", ruleId: "r1", ruleName: "High Error Rate",  severity: "critical", message: "Error rate exceeded 5/min",                    service: "payment-service", acknowledged: false, triggeredAt: mins(0.5) },
  { id: "a2", ruleId: "r2", ruleName: "Payment Failures", severity: "warning",  message: "10+ errors accumulated in window",             service: "payment-service", acknowledged: false, triggeredAt: mins(2) },
  { id: "a3", ruleId: "r3", ruleName: "Auth Service Down", severity: "critical", message: "Health check failed — no response in 30s",   service: "auth-service",    acknowledged: true,  triggeredAt: mins(8) },
  { id: "a4", ruleId: "r1", ruleName: "High Error Rate",  severity: "info",     message: "Error rate returned to normal",                service: "app-service",     acknowledged: true,  triggeredAt: mins(15) },
  { id: "a5", ruleId: "r2", ruleName: "Payment Failures", severity: "critical", message: "Error count crossed 10 threshold",             service: "payment-service", acknowledged: false, triggeredAt: mins(25) },
];

/* ─── Helpers ──────────────────────────────────────────── */

export function generateRandomLog(): Log {
  const services = ["auth-service", "payment-service", "app-service", "notification-svc"];
  const levels: Log["level"][] = ["info", "info", "info", "warning", "error", "debug"];
  const messages: Record<string, string[]> = {
    info: [
      "Request processed successfully",
      "User session started",
      "Cache refreshed",
      "Health check passed",
      "Background job completed",
    ],
    error: [
      "Connection refused — upstream timeout",
      "Null pointer exception in handler",
      "Disk write failed — permission denied",
      "API rate limit exceeded",
    ],
    warning: [
      "Response time above threshold (>2s)",
      "Deprecated API version called",
      "Memory usage above 80%",
      "Certificate expires in 7 days",
    ],
    debug: [
      "Query plan optimized — index scan",
      "GC pause 12ms",
      "Worker thread pool size: 8",
    ],
  };

  const level = levels[Math.floor(Math.random() * levels.length)];
  const service = services[Math.floor(Math.random() * services.length)];
  const pool = messages[level];
  const message = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: crypto.randomUUID(),
    service,
    level,
    message,
    timestamp: new Date().toISOString(),
  };
}

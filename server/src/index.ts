/**
 * LogStream Backend Server
 *
 * Express + WebSocket server that:
 * - Connects to the local Docker daemon
 * - Streams container logs in real-time via WebSocket
 * - Exposes REST APIs for service/rule/alert CRUD
 * - Evaluates alert rules against incoming logs
 */

import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { store } from "./store.js";
import { initWebSocket, broadcast } from "./ws.js";
import {
  listContainers,
  startLogStream,
  stopLogStream,
  refreshServiceStatuses,
  findContainerForService,
  getContainerStatus,
} from "./docker.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
initWebSocket(server);

/* ═══════════════════════════════════════════════════════════
   REST API Routes
   ═══════════════════════════════════════════════════════════ */

/* ── Health ── */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/* ── Docker Containers ── */
app.get("/api/containers", async (_req, res) => {
  const containers = await listContainers();
  res.json(containers);
});

/* ── Tracked Services ── */

app.get("/api/services", (_req, res) => {
  res.json(store.services);
});

app.post("/api/services", async (req, res) => {
  const { name, port } = req.body;
  if (!name || !port) {
    res.status(400).json({ error: "name and port are required" });
    return;
  }

  const svc = store.addService(name, Number(port));

  // Try to find and connect to the Docker container
  const containerId = await findContainerForService(svc);
  if (containerId) {
    const status = await getContainerStatus(containerId);
    store.updateService(svc.id, { containerId, status });
    // Start streaming logs
    startLogStream(svc.id);
  }

  broadcast({ type: "service-add", service: store.getService(svc.id) });
  res.status(201).json(store.getService(svc.id));
});

app.patch("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { name, port } = req.body;

  const updated = store.updateService(id, {
    ...(name !== undefined && { name }),
    ...(port !== undefined && { port: Number(port) }),
  });

  if (!updated) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  broadcast({ type: "service-update", service: updated });
  res.json(updated);
});

app.delete("/api/services/:id", (req, res) => {
  const { id } = req.params;
  stopLogStream(id);
  const removed = store.removeService(id);
  if (!removed) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  broadcast({ type: "service-remove", serviceId: id });
  res.json({ ok: true });
});

app.post("/api/services/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const svc = store.getService(id);
  if (!svc) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  if (svc.status === "running") {
    // Stop streaming
    stopLogStream(id);
    store.updateService(id, { status: "stopped" });
  } else {
    // Start streaming
    await startLogStream(id);
  }

  broadcast({ type: "service-update", service: store.getService(id) });
  res.json(store.getService(id));
});

/** Reconnect a service — re-discover container and restart log stream */
app.post("/api/services/:id/reconnect", async (req, res) => {
  const { id } = req.params;
  const svc = store.getService(id);
  if (!svc) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  stopLogStream(id);
  store.updateService(id, { containerId: undefined, status: "stopped" });

  const containerId = await findContainerForService(svc);
  if (containerId) {
    const status = await getContainerStatus(containerId);
    store.updateService(id, { containerId, status });
    if (status === "running") {
      await startLogStream(id);
    }
  } else {
    store.updateService(id, { status: "error" });
  }

  broadcast({ type: "service-update", service: store.getService(id) });
  res.json(store.getService(id));
});

/* ── Logs ── */

app.get("/api/logs", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 5000);
  res.json(store.logs.slice(0, limit));
});

app.delete("/api/logs", (_req, res) => {
  store.clearLogs();
  broadcast({ type: "logs-cleared" });
  res.json({ ok: true });
});

/* ── Alert Rules ── */

app.get("/api/alert-rules", (_req, res) => {
  res.json(store.alertRules);
});

app.post("/api/alert-rules", (req, res) => {
  const { name, condition, threshold, service, enabled } = req.body;
  if (!name || !condition || threshold === undefined || !service) {
    res.status(400).json({ error: "name, condition, threshold, and service are required" });
    return;
  }

  const rule = store.addAlertRule({
    name,
    condition,
    threshold: Number(threshold),
    service,
    enabled: enabled ?? true,
  });

  broadcast({ type: "rule-add", rule });
  res.status(201).json(rule);
});

app.patch("/api/alert-rules/:id", (req, res) => {
  const { id } = req.params;
  const updated = store.updateAlertRule(id, req.body);
  if (!updated) {
    res.status(404).json({ error: "Alert rule not found" });
    return;
  }

  broadcast({ type: "rule-update", rule: updated });
  res.json(updated);
});

app.delete("/api/alert-rules/:id", (req, res) => {
  const { id } = req.params;
  const removed = store.removeAlertRule(id);
  if (!removed) {
    res.status(404).json({ error: "Alert rule not found" });
    return;
  }

  broadcast({ type: "rule-remove", ruleId: id });
  res.json({ ok: true });
});

app.post("/api/alert-rules/:id/toggle", (req, res) => {
  const { id } = req.params;
  const rule = store.alertRules.find((r) => r.id === id);
  if (!rule) {
    res.status(404).json({ error: "Alert rule not found" });
    return;
  }

  const updated = store.updateAlertRule(id, { enabled: !rule.enabled });
  broadcast({ type: "rule-update", rule: updated });
  res.json(updated);
});

/* ── Alerts ── */

app.get("/api/alerts", (_req, res) => {
  res.json(store.alerts);
});

app.patch("/api/alerts/:id", (req, res) => {
  const { id } = req.params;
  const { acknowledged } = req.body;
  if (acknowledged) {
    const alert = store.acknowledgeAlert(id);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    broadcast({ type: "alert-update", alert });
    res.json(alert);
    return;
  }
  res.status(400).json({ error: "Only acknowledged update is supported" });
});

app.delete("/api/alerts", (_req, res) => {
  store.clearAlerts();
  broadcast({ type: "alerts-cleared" });
  res.json({ ok: true });
});

/* ═══════════════════════════════════════════════════════════
   Start Server
   ═══════════════════════════════════════════════════════════ */

const PORT = Number(process.env.PORT) || 4000;

server.listen(PORT, () => {
  console.log(`\n  LogStream Server running on http://localhost:${PORT}`);
  console.log(`  WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`  REST API: http://localhost:${PORT}/api\n`);

  // Periodically refresh service statuses from Docker
  setInterval(() => {
    refreshServiceStatuses().catch((err) =>
      console.error("[docker] Status refresh error:", err)
    );
  }, 15_000);
});

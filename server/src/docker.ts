/**
 * Docker Engine integration — container discovery, status checking, and log streaming.
 */

import Dockerode from "dockerode";
import { randomUUID } from "node:crypto";
import { store, type Log, type TrackedService } from "./store.js";
import { broadcast } from "./ws.js";
import { evaluate } from "./alertEngine.js";

/* ── Docker client ── */

let docker: Dockerode;

try {
  docker = new Dockerode();
} catch {
  console.error("[docker] Failed to connect to Docker daemon");
  docker = new Dockerode();
}

/** Active log-follow streams keyed by service id */
const activeStreams = new Map<string, { destroy: () => void }>();

/* ── Public API ── */

/** List all running containers visible to the Docker daemon */
export async function listContainers() {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.map((c) => ({
      id: c.Id.slice(0, 12),
      names: c.Names.map((n) => n.replace(/^\//, "")),
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports.map((p) => ({
        private: p.PrivatePort,
        public: p.PublicPort,
        type: p.Type,
      })),
    }));
  } catch (err) {
    console.error("[docker] listContainers error:", err);
    return [];
  }
}

/** Find a Docker container matching a tracked service (by name or port) */
export async function findContainerForService(
  svc: TrackedService
): Promise<string | null> {
  try {
    const containers = await docker.listContainers({ all: true });

    // Try matching by name first
    for (const c of containers) {
      const names = c.Names.map((n) => n.replace(/^\//, "").toLowerCase());
      if (names.some((n) => n === svc.name.toLowerCase() || n.includes(svc.name.toLowerCase()))) {
        return c.Id;
      }
    }

    // Then try matching by port
    for (const c of containers) {
      if (c.Ports.some((p) => p.PublicPort === svc.port || p.PrivatePort === svc.port)) {
        return c.Id;
      }
    }

    return null;
  } catch (err) {
    console.error("[docker] findContainer error:", err);
    return null;
  }
}

/** Check the actual Docker status of a container */
export async function getContainerStatus(
  containerId: string
): Promise<"running" | "stopped" | "error"> {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    if (info.State.Running) return "running";
    if (info.State.ExitCode !== 0) return "error";
    return "stopped";
  } catch {
    return "error";
  }
}

/** Start streaming logs from a container for a tracked service */
export async function startLogStream(serviceId: string) {
  const svc = store.getService(serviceId);
  if (!svc) return;

  // Stop existing stream if any
  stopLogStream(serviceId);

  const containerId = svc.containerId || (await findContainerForService(svc));
  if (!containerId) {
    console.warn(`[docker] No container found for service "${svc.name}" (port ${svc.port})`);
    store.updateService(serviceId, { status: "error" });
    broadcast({ type: "service-update", service: store.getService(serviceId) });
    return;
  }

  // Save the container ID for future reference
  store.updateService(serviceId, { containerId, status: "running" });

  try {
    const container = docker.getContainer(containerId);

    // First, grab existing/historical logs (last 1 hour, up to 200 lines)
    try {
      const historyStream = await container.logs({
        follow: false,
        stdout: true,
        stderr: true,
        since: Math.floor((Date.now() - 3600_000) / 1000),
        timestamps: true,
        tail: 200,
      }) as unknown as Buffer;

      // When follow=false, Docker returns the full buffer at once
      const histBuf = Buffer.isBuffer(historyStream) ? historyStream : Buffer.from(historyStream);
      if (histBuf.length > 0) {
        const lines = parseDockerLogChunk(histBuf);
        for (const { stream, text } of lines) {
          if (!text.trim()) continue;
          const level = detectLogLevel(text, stream);
          const { timestamp, message } = extractTimestamp(text);
          const log: Log = {
            id: randomUUID(),
            service: svc.name,
            level,
            message: message.trim(),
            timestamp,
          };
          store.addLog(log);
          broadcast({ type: "log", log });
        }
      }
    } catch (histErr) {
      console.warn(`[docker] Could not fetch history for "${svc.name}":`, histErr);
    }

    // Then start the live follow stream for new logs going forward
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      since: Math.floor(Date.now() / 1000),
      timestamps: true,
    }) as unknown as import("node:stream").Readable;

    logStream.on("data", (chunk: Buffer) => {
      // Docker log stream has 8-byte header per frame
      const lines = parseDockerLogChunk(chunk);
      for (const { stream, text } of lines) {
        if (!text.trim()) continue;

        const level = detectLogLevel(text, stream);
        const { timestamp, message } = extractTimestamp(text);

        const log: Log = {
          id: randomUUID(),
          service: svc.name,
          level,
          message: message.trim(),
          timestamp,
        };

        store.addLog(log);
        broadcast({ type: "log", log });
        evaluate(log);
      }
    });

    logStream.on("error", (err: Error) => {
      console.error(`[docker] Log stream error for ${svc.name}:`, err.message);
      store.updateService(serviceId, { status: "error" });
      broadcast({ type: "service-update", service: store.getService(serviceId) });
    });

    logStream.on("end", () => {
      console.log(`[docker] Log stream ended for ${svc.name}`);
      activeStreams.delete(serviceId);
      // Check if container is still running
      getContainerStatus(containerId).then((status) => {
        store.updateService(serviceId, { status });
        broadcast({ type: "service-update", service: store.getService(serviceId) });
      });
    });

    activeStreams.set(serviceId, {
      destroy: () => {
        try {
          logStream.destroy();
        } catch { /* already destroyed */ }
      },
    });

    broadcast({ type: "service-update", service: store.getService(serviceId) });
    console.log(`[docker] Streaming logs for "${svc.name}" (container ${containerId.slice(0, 12)})`);
  } catch (err) {
    console.error(`[docker] Failed to stream logs for "${svc.name}":`, err);
    store.updateService(serviceId, { status: "error" });
    broadcast({ type: "service-update", service: store.getService(serviceId) });
  }
}

/** Stop streaming logs for a service */
export function stopLogStream(serviceId: string) {
  const stream = activeStreams.get(serviceId);
  if (stream) {
    stream.destroy();
    activeStreams.delete(serviceId);
  }
}

/** Refresh status for all tracked services by checking Docker */
export async function refreshServiceStatuses() {
  for (const svc of store.services) {
    if (svc.containerId) {
      const status = await getContainerStatus(svc.containerId);
      if (status !== svc.status) {
        store.updateService(svc.id, { status });
        broadcast({ type: "service-update", service: store.getService(svc.id) });
      }
    } else {
      // Try to find the container
      const containerId = await findContainerForService(svc);
      if (containerId) {
        const status = await getContainerStatus(containerId);
        store.updateService(svc.id, { containerId, status });
        broadcast({ type: "service-update", service: store.getService(svc.id) });
      }
    }
  }
}

/* ── Helpers ── */

interface DockerLogLine {
  stream: "stdout" | "stderr";
  text: string;
}

/** Docker timestamp regex: 2026-04-08T18:22:02.967641469Z */
const DOCKER_TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+/;

/**
 * Parse a Docker multiplexed log chunk into individual lines.
 * Each frame: [streamType(1) pad(3) size(4)] payload(size)
 */
function parseDockerLogChunk(chunk: Buffer): DockerLogLine[] {
  const lines: DockerLogLine[] = [];
  let offset = 0;

  while (offset < chunk.length) {
    if (offset + 8 > chunk.length) {
      // Remaining bytes too small for a header — treat as raw
      splitIntoLines(chunk.subarray(offset).toString("utf-8"), "stdout", lines);
      break;
    }

    const streamType = chunk[offset];
    // Validate it looks like a real multiplexed header (type must be 0, 1, or 2)
    if (streamType > 2) {
      // Not multiplexed — treat entire remaining buffer as raw text
      splitIntoLines(chunk.subarray(offset).toString("utf-8"), "stdout", lines);
      break;
    }

    const frameSize = chunk.readUInt32BE(offset + 4);

    if (frameSize === 0) {
      offset += 8;
      continue;
    }

    if (offset + 8 + frameSize > chunk.length) {
      splitIntoLines(chunk.subarray(offset + 8).toString("utf-8"), streamType === 2 ? "stderr" : "stdout", lines);
      break;
    }

    const payload = chunk.subarray(offset + 8, offset + 8 + frameSize).toString("utf-8");
    splitIntoLines(payload, streamType === 2 ? "stderr" : "stdout", lines);

    offset += 8 + frameSize;
  }

  return lines;
}

/** Split a multi-line payload into individual log lines */
function splitIntoLines(payload: string, stream: "stdout" | "stderr", out: DockerLogLine[]) {
  for (const line of payload.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      out.push({ stream, text: trimmed });
    }
  }
}

function detectLogLevel(text: string, stream: "stdout" | "stderr"): Log["level"] {
  const lower = text.toLowerCase();

  // Check for explicit log level markers (e.g. Nginx: [error], [notice], app: ERROR, WARN)
  if (/\[(error|crit|alert|emerg)\]|\b(fatal|panic|exception)\b/i.test(lower)) return "error";
  if (/\[(warn|warning)\]|\bwarn(ing)?\b/i.test(lower)) return "warning";
  if (/\[debug\]|\b(debug|trace|verbose)\b/i.test(lower)) return "debug";
  if (/\[(notice|info)\]/i.test(lower)) return "info";

  // HTTP status code detection: 4xx/5xx → error/warning
  const statusMatch = text.match(/"\s(\d{3})\s/);
  if (statusMatch) {
    const code = parseInt(statusMatch[1], 10);
    if (code >= 500) return "error";
    if (code >= 400) return "warning";
  }

  // stderr defaults to error unless it looks informational
  if (stream === "stderr") {
    if (/\b(info|notice|started|listening|ready|connected|configuration complete)\b/i.test(lower))
      return "info";
    return "error";
  }

  return "info";
}

/** Strip [LEVEL] prefix from message since we detect level separately */
const LEVEL_TAG_RE = /^\[(INFO|ERROR|WARNING|WARN|DEBUG|CRITICAL|FATAL|NOTICE|TRACE)\]\s*/i;

function extractTimestamp(text: string): { timestamp: string; message: string } {
  let message = text;
  let timestamp: string;

  const tsMatch = text.match(DOCKER_TS_RE);
  if (tsMatch) {
    timestamp = new Date(tsMatch[1]).toISOString();
    message = text.slice(tsMatch[0].length);
  } else {
    timestamp = new Date().toISOString();
  }

  // Strip redundant level tag from message
  message = message.replace(LEVEL_TAG_RE, "");

  return { timestamp, message };
}

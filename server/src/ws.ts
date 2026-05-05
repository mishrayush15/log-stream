/**
 * WebSocket handler — broadcasts log events, alerts, and service updates
 * to all connected frontend clients.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { store } from "./store.js";

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`[ws] Client connected (${clients.size} total)`);

    // Send initial state snapshot
    ws.send(
      JSON.stringify({
        type: "init",
        logs: store.logs,
        services: store.services,
        alertRules: store.alertRules,
        alerts: store.alerts,
      })
    );

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[ws] Client disconnected (${clients.size} total)`);
    });

    ws.on("error", (err) => {
      console.error("[ws] Client error:", err.message);
      clients.delete(ws);
    });
  });

  console.log("[ws] WebSocket server ready on /ws");
}

/** Broadcast a message to all connected clients */
export function broadcast(data: Record<string, unknown>) {
  const payload = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function getClientCount(): number {
  return clients.size;
}

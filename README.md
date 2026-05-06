# LogStream — Centralized Real-time Logging Dashboard

LogStream is a development-focused monitoring dashboard that streams container logs from Docker, evaluates alert rules, and provides real-time views via WebSocket for a React frontend. It includes a small backend (Express + WebSocket) that integrates with the Docker daemon, an in-memory store, and an optional log generator for testing.

**Contents:** short overview, setup, development, how to use the application step-by-step, API & WebSocket reference, troubleshooting, and notes.

**Prerequisites:**
- Node.js 18+ and npm
- Docker (for running containers / generator) when using Docker integration
- Git (optional, for cloning)

**Repo layout (important files/folders):**
- `package.json` — frontend project scripts and deps
- `vite.config.ts` — Vite dev server + proxy to backend (`/api` and `/ws`)
- `src/` — React app (components, context, types, mock data)
- `server/` — Express backend (Docker integration, WebSocket server, in-memory store, alert engine)
- `log-generator/` — tiny script and Dockerfile to emit fake logs
- `README.md` — (this file)

**Goals of this README:** provide everything needed to run, develop, and operate the project.

## Quick Start — Run locally (development)

1) Install dependencies (root installs frontend deps):

```bash
npm install
```

2) Start the backend server (in a separate terminal):

```bash
cd server
npm install
npm run dev
```

3) Start the frontend dev server:

```bash
# from repo root
npm run dev
```

4) Open the app in your browser at `http://localhost:5173` (Vite default). The frontend proxies REST calls and WebSocket to `http://localhost:4000` / `ws://localhost:4000` per `vite.config.ts`.

If you want to run both servers together (frontend + backend):

```bash
npm run dev:all
```

Important: the backend defaults to port 4000. If you change that, update `vite.config.ts` proxy target.

## Running the log generator (optional)

The `log-generator` folder contains `generator.js` and a Dockerfile. Use it to stream fake logs into a container (stdout). The backend can be configured to follow logs from containers.

Run generator locally (node):

```bash
cd log-generator
node generator.js
```

Or run in Docker (recommended for testing Docker log streaming):

```bash
# build image
docker build -t log-generator -f log-generator/Dockerfile .

# run container
docker run --rm --name log-gen log-generator
```

## Development notes — frontend

- Entry: `src/main.tsx` → renders `src/App.tsx`.
- Central state: `src/context/LogProvider.tsx` exposes `useLogData()` hook used across components to access logs, services, alert rules, and alerts.
- Pages: `src/components/pages/*` (DashboardPage, LiveLogsPage, AnalyticsPage, ServicesPage, AlertsPage).
- Components live under `src/components/*` and small utilities / mock data under `src/data/mockData.ts`.

## Development notes — backend

- Entry: `server/src/index.ts`.
- WebSocket server: `server/src/ws.ts` (path `/ws`) — sends an initial snapshot and broadcasts updates.
- In-memory store: `server/src/store.ts` — keeps logs (capped), services, alert rules, and alerts.
- Docker integration: `server/src/docker.ts` uses `dockerode` to list containers and stream logs (via Docker API).
- Alert rules evaluation: `server/src/alertEngine.ts` — executed for each incoming log; it supports conditions: `error_rate`, `error_count`, `service_down`, and `high_latency`.

## How the system works (high level)

- Docker containers produce logs.
- Backend receives streamed logs (or the log generator emits logs), stores them in the in-memory store, evaluates alert rules, and broadcasts events to WebSocket clients.
- Frontend connects to `/ws`, receives an `init` snapshot, then incremental events (logs, service updates, alerts). The UI updates reactively via `LogProvider`.

## How to use the application — step-by-step (user-focused)

1. Open the app in the browser. Confirm the top-right connection indicator becomes **Connected**.

2. View the Dashboard:
   - **Stats**: quick totals including errors per minute and active services.
   - **Logs table**: recent logs (color-coded by level) and an errors timeline chart.
   - **Alerts panel**: shows recent error logs and active alerts.

3. Live Logs page:
   - Use **Level** pills to filter (All, Info, Error, Warning, Debug).
   - Use **Time** dropdown to restrict the window (1m, 5m, 15m, 30m, 1h).
   - Use the **Search** box to match message text or service names.
   - Toggle the **Live** switch to pause/resume the auto-scrolling live feed; when paused you can inspect history without auto-jump.
   - Export logs (if enabled in UI) to download current filtered logs (frontend export code exists in `LogProvider`).

4. Services page — add tracked services:
   - Click **Add Service** and provide a unique `name` and a `port`.
   - The backend will attempt to match a Docker container by name or port and start streaming logs for that service.
   - You can edit or remove services; duplicate port/name checks are enforced by the UI.

5. Alerts page — manage rules and alerts:
   - **Rules**: create alert rules by selecting a `condition`, `threshold`, and `service` scope (or `all`).
     - `error_rate`: errors per minute over the last 5 minutes (threshold = errors/min)
     - `error_count`: number of errors in a 15-minute window (threshold = total errors)
     - `service_down`: triggers when a log indicates the service is down and the tracked service status is `error`.
     - `high_latency`: parses `NNNms` in messages and triggers if >= threshold.
   - **Alerts**: view fired alerts, acknowledge them, or clear them.

6. Troubleshooting common issues:
   - If the UI shows **Reconnecting…**: ensure the backend (`server`) is running and reachable at port `4000`.
   - If no logs appear: verify either `log-generator` is running or containers exist and are being followed by the backend. Check backend logs in the terminal for `startLogStream` errors.
   - If Docker access fails: ensure your user has permission to access the Docker daemon. On Windows you may need Docker Desktop running.

## API Reference (concise)

- Base path: `/api` served by backend (default: `http://localhost:4000/api`).
- Key endpoints:
  - `GET /api/health` — returns `{ status: 'ok', uptime }`.
  - `GET /api/containers` — list containers known to Docker.
  - `GET /api/services` — list tracked services.
  - `POST /api/services` — add service `{ name, port }`.
  - `PATCH /api/services/:id` — update service fields.
  - `DELETE /api/services/:id` — remove service.
  - `GET /api/alert-rules`, `POST /api/alert-rules`, `PATCH /api/alert-rules/:id`, `DELETE /api/alert-rules/:id` — manage alert rules.
  - `GET /api/alerts`, `PATCH /api/alerts/:id/ack`, `DELETE /api/alerts` — list, acknowledge, clear alerts.

## WebSocket

- Path: `/ws` (connect to `ws://localhost:4000/ws`)
- On connect the server sends an `init` payload:

```json
{
  "type": "init",
  "logs": [...],
  "services": [...],
  "alertRules": [...],
  "alerts": [...]
}
```

- Subsequent messages are broadcast as JSON events like `{ type: 'log', log: {...} }`, `{ type: 'service-add', service: {...} }`, `{ type: 'alert-fired', alert: {...} }`.

## Configuration & environment

- Backend port: default `4000`. Change in `server/src/index.ts` if needed.
- Vite proxies to backend as configured in `vite.config.ts`. If backend port changes, update the proxy.

## Testing & build

- To produce a production build of the frontend:

```bash
npm run build
```

- To build backend: from `server/` run:

```bash
cd server
npm run build
```

## Docker notes

- Frontend `Dockerfile` builds a static bundle and serves it with nginx.
- `log-generator/Dockerfile` is a tiny Node image that emits logs to stdout; run it to simulate containers in environments where Docker is available.

## Security & limitations

- This project uses an in-memory store (`server/src/store.ts`). Data is volatile and resets on server restart.
- The alert engine uses a simple cooldown per rule to reduce noise. For production, integrate a persistent datastore and rate-limiting/alert routing.

## Troubleshooting tips (quick)

- Backend can't access Docker: ensure Docker Desktop / daemon is running and you have permissions.
- WebSocket connection failing: check CORS/proxy settings and backend port.
- Too few logs: run `log-generator` or ensure containers produce logs that the backend can follow.

## GitHub Actions — Docker Hub CI/CD

Automatic workflow that builds the main app `Dockerfile` and pushes the image to Docker Hub on every push to `main`.

- Workflow: `.github/workflows/dockerhub-publish.yml`
   - Triggers: push to `main`
   - Builds the image using the repo root `Dockerfile` and pushes two tags to Docker Hub:
      - `docker.io/<DOCKERHUB_USERNAME>/logstream:${{ github.sha }}`
      - `docker.io/<DOCKERHUB_USERNAME>/logstream:latest`

Required repository secrets (set these in GitHub → Settings → Secrets → Actions):

- `DOCKERHUB_USERNAME` — your Docker Hub username
- `DOCKERHUB_TOKEN` — a Docker Hub access token (recommended) or your password

How to create a Docker Hub token:

1. Sign in to Docker Hub and go to Account Settings → Security → New Access Token.
2. Create a token, copy it, and add it to the repo secrets as `DOCKERHUB_TOKEN`.

Local test (optional): build and push the same image locally to validate credentials:

```bash
docker build -t ${DOCKERHUB_USERNAME}/logstream:local -f Dockerfile .
docker login --username "$DOCKERHUB_USERNAME"
docker push ${DOCKERHUB_USERNAME}/logstream:local
```

If you prefer a different image name or repository, set `DOCKERHUB_USERNAME` accordingly and change the `logstream` repository name in the workflow (file: `.github/workflows/dockerhub-publish.yml`).


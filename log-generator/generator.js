/**
 * Simple log generator — outputs random logs to stdout at random intervals.
 * Designed to run inside a Docker container for testing LogStream.
 */

const infoMessages = [
  "User logged in successfully",
  "Request processed in 42ms",
  "Cache refreshed for session pool",
  "Health check passed",
  "Background job completed",
  "Database connection established",
  "File uploaded successfully",
  "Email sent to user",
  "Payment processed successfully",
  "Order created",
  "Session started for new user",
  "API key validated",
  "Webhook delivered successfully",
  "Data export completed",
  "Config reloaded",
];

const warningMessages = [
  "Response time above 2000ms threshold",
  "Memory usage at 85%",
  "Disk space running low — 12% remaining",
  "Rate limit approaching for API key abc123",
  "Deprecated endpoint called: /api/v1/users",
  "SSL certificate expires in 7 days",
  "Connection pool nearly exhausted — 48/50 used",
  "Slow database query detected — 1500ms",
  "Retry attempt 3 of 5 for external service",
  "High CPU usage detected — 92%",
];

const errorMessages = [
  "Connection refused — upstream timeout",
  "Database query failed — table not found",
  "Null pointer exception in request handler",
  "Disk write failed — permission denied",
  "API rate limit exceeded",
  "Authentication failed — invalid token",
  "Service unavailable — circuit breaker open",
  "Out of memory — heap allocation failed",
  "Network timeout after 30000ms",
  "Failed to parse JSON payload",
];

const debugMessages = [
  "Query plan optimized — using index scan",
  "GC pause 12ms — heap compaction",
  "Worker thread pool size adjusted to 8",
  "Cache hit ratio: 94.2%",
  "TCP keepalive sent to upstream",
  "Request headers validated",
  "Session token refreshed — expires in 300s",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLog() {
  // Weighted: info 50%, warning 20%, error 20%, debug 10%
  const rand = Math.random();
  let level, message;

  if (rand < 0.5) {
    level = "INFO";
    message = pick(infoMessages);
  } else if (rand < 0.7) {
    level = "WARNING";
    message = pick(warningMessages);
  } else if (rand < 0.9) {
    level = "ERROR";
    message = pick(errorMessages);
  } else {
    level = "DEBUG";
    message = pick(debugMessages);
  }

  console.log(`[${level}] ${message}`);
}

// Log at random intervals between 500ms and 3000ms
function scheduleNext() {
  const delay = 500 + Math.random() * 2500;
  setTimeout(() => {
    generateLog();
    scheduleNext();
  }, delay);
}

console.log("[INFO] Log generator started — producing random logs...");
scheduleNext();

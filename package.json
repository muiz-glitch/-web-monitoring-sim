const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ping = require("ping");
const devicesList = require("./simulator/devices");

const PORT = process.env.PORT || 3000;
const POLL_INTERVAL_MS = process.env.POLL_INTERVAL_MS ? Number(process.env.POLL_INTERVAL_MS) : 2000;
const HISTORY_MAX_SAMPLES = process.env.HISTORY_MAX_SAMPLES ? Number(process.env.HISTORY_MAX_SAMPLES) : 300;
const LOGS_MAX = 2000;
// If SIMULATE=true, we won't call ping and will simulate online/offline
const SIMULATE = process.env.SIMULATE === "true";

// Express setup
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// In-memory data stores for demo
const devices = devicesList.map(d => ({
  ...d,
  status: "unknown",
  bandwidthIn: 0,
  bandwidthOut: 0
}));
const histories = {}; // deviceId -> [{ts, in, out, status}]
const logs = []; // [{ts, level, deviceId, message}]

devices.forEach(d => { histories[d.id] = []; });

// Helper: push log (keeps bounded)
function pushLog(entry) {
  logs.push(entry);
  if (logs.length > LOGS_MAX) logs.shift();
}

// REST endpoints
app.get("/api/devices", (req, res) => {
  res.json(devices);
});

app.get("/api/devices/:id/history", (req, res) => {
  const id = req.params.id;
  if (!histories[id]) return res.status(404).json({ error: "device not found" });
  res.json(histories[id]);
});

app.get("/api/logs", (req, res) => {
  // last logs
  res.json(logs.slice(-500));
});

app.get("/health", (req, res) => res.json({ ok: true }));

// Socket.IO: send initial snapshot on connect
io.on("connection", socket => {
  console.log(`[socket] client connected: ${socket.id}`);
  socket.emit("snapshot", { devices, logs: logs.slice(-200) });
  socket.on("disconnect", reason => {
    console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
  });
});

// Monitoring loop
async function pollOnce() {
  const now = Date.now();
  for (const d of devices) {
    // simulate bandwidth as small random walk
    const inDelta = (Math.random() - 0.5) * 8; // Mbps change
    const outDelta = (Math.random() - 0.5) * 6;
    d.bandwidthIn = Math.max(0, Math.round((d.bandwidthIn + inDelta) * 100) / 100);
    d.bandwidthOut = Math.max(0, Math.round((d.bandwidthOut + outDelta) * 100) / 100);

    // Determine reachability: ping unless SIMULATE
    let alive = false;
    if (SIMULATE) {
      // simulate occasional flapping for demo
      const rnd = Math.random();
      if (rnd > 0.05) alive = true; // mostly up
      else alive = false;
    } else {
      try {
        // ping.promise.probe uses system ping binary; timeout in seconds
        const res = await ping.promise.probe(d.ip, { timeout: 1 });
        alive = !!res.alive;
      } catch (err) {
        alive = false;
      }
    }
    const prevStatus = d.status;
    d.status = alive ? "online" : "offline";

    // Create sample and append to history
    const sample = { ts: now, in: d.bandwidthIn, out: d.bandwidthOut, status: d.status };
    histories[d.id].push(sample);
    if (histories[d.id].length > HISTORY_MAX_SAMPLES) histories[d.id].shift();

    // Emit realtime device update
    io.emit("device:update", { id: d.id, sample, device: { id: d.id, name: d.name, ip: d.ip, status: d.status, bandwidthIn: d.bandwidthIn, bandwidthOut: d.bandwidthOut } });

    // Status change log
    if (prevStatus !== d.status) {
      const message = `Device ${d.name} (${d.ip}) changed status ${prevStatus} -> ${d.status}`;
      const entry = { ts: now, level: d.status === "online" ? "info" : "critical", deviceId: d.id, message };
      pushLog(entry);
      io.emit("log:new", entry);
      console.log("[alert]", message);
    }

    // Bandwidth threshold alert
    const highThreshold = 80; // Mbps
    if (d.bandwidthIn > highThreshold || d.bandwidthOut > highThreshold) {
      const message = `High bandwidth on ${d.name}: in=${d.bandwidthIn} Mbps out=${d.bandwidthOut} Mbps`;
      const entry = { ts: now, level: "warning", deviceId: d.id, message };
      pushLog(entry);
      io.emit("log:new", entry);
      console.log("[warning]", message);
    }
  }
}

// Start poll loop
setInterval(() => {
  pollOnce().catch(err => console.error("poll error:", err));
}, POLL_INTERVAL_MS);

// initial immediate poll
pollOnce().catch(err => console.error("initial poll error:", err));

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (SIMULATE=${SIMULATE})`);
});

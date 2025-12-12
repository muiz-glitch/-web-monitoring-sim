const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const simulator = require('./deviceSimulator');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// In-memory history and logs
const MAX_HISTORY = 200;
const history = {}; // deviceId -> [{ts, status, bandwidth}]
const logs = []; // {ts, level, message, deviceId?}

// initialize history containers
simulator.getDevices().forEach(d => { history[d.id] = []; });

// REST endpoints
app.get('/api/devices', (req, res) => {
  res.json({ devices: simulator.getDevices(), ts: Date.now() });
});

app.get('/api/history/:deviceId', (req, res) => {
  const id = req.params.deviceId;
  if (!history[id]) return res.status(404).json({ error: 'device not found' });
  res.json({ deviceId: id, history: history[id] });
});

app.get('/api/logs', (req, res) => {
  // return recent logs
  res.json({ logs: logs.slice(-200) });
});

// Demo control endpoints (not required, but handy)
app.post('/api/force/:deviceId/:status', (req, res) => {
  const { deviceId, status } = req.params;
  if (!['online', 'offline'].includes(status)) return res.status(400).json({ error: 'bad status' });
  const ok = simulator.forceStatus(deviceId, status);
  if (!ok) return res.status(404).json({ error: 'device not found' });
  res.json({ ok: true, deviceId, status });
});

// Socket.IO connections
io.on('connection', (socket) => {
  // send current snapshot and recent logs on connect
  socket.emit('snapshot', { devices: simulator.getDevices(), ts: Date.now() });
  socket.emit('logs', { logs: logs.slice(-200) });

  socket.on('getHistory', (deviceId) => {
    if (!history[deviceId]) {
      socket.emit('history', { deviceId, history: [] });
    } else {
      socket.emit('history', { deviceId, history: history[deviceId] });
    }
  });
});

// Wire simulator events to history/logs and emit to clients
simulator.on('snapshot', payload => {
  const ts = payload.timestamp || Date.now();
  // update history
  payload.devices.forEach(d => {
    if (!history[d.id]) history[d.id] = [];
    history[d.id].push({ ts, status: d.status, bandwidth: d.bandwidth });
    if (history[d.id].length > MAX_HISTORY) history[d.id].shift();
  });
  // broadcast to sockets
  io.emit('deviceSnapshot', payload);
});

simulator.on('statusChange', evt => {
  const entry = {
    ts: evt.timestamp || Date.now(),
    level: evt.newStatus === 'offline' ? 'alert' : 'info',
    message: `${evt.name} (${evt.ip}) changed: ${evt.oldStatus} → ${evt.newStatus}`,
    deviceId: evt.id
  };
  logs.push(entry);
  if (logs.length > 1000) logs.shift();
  io.emit('log', entry);
});

// start polling simulator
const POLL_INTERVAL_MS = 2000;
setInterval(() => simulator.tick(), POLL_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`Web Monitoring app listening on http://localhost:${PORT}`);
});
# Web Monitoring - Simulated Devices (Express + Socket.IO)

This repository is a minimal Web Monitoring demo that simulates 3 network devices and shows real-time updates via WebSocket (Socket.IO) plus REST endpoints for historical data.

Features
- Shows device status (online/offline)
- Simulated bandwidth usage per device (simple random walk)
- Basic logs/alerts (device down/up)
- Polling of 3 simulated devices
- REST endpoints for current data and history
- Web UI with table, real-time chart (Chart.js), and log area (Tailwind CSS)

Requirements
- Node.js 16+ (Node 18 recommended)
- npm

Install & run
1. Clone or unzip the project.
2. Install dependencies:
   npm install
3. Start:
   npm start
4. Open browser: http://localhost:3000

API
- GET /api/devices
  - returns current device snapshot
- GET /api/history/:deviceId
  - returns historical samples for device
- GET /api/logs
  - recent logs
- POST /api/force/:deviceId/:status
  - force device to `online` or `offline` (handy for demo)

WebSocket (Socket.IO)
- On connect, server emits:
  - snapshot: { devices, ts }
  - logs: { logs: [...] }
- Real-time:
  - deviceSnapshot: emitted every poll (devices array)
  - log: new log entry
- Client can request history via event `getHistory` and receives `history` event.

Demo screenshots / recording
- To capture a screenshot or screen recording: open http://localhost:3000 and interact (or use the force endpoints to trigger down/up events).
- Example to force a device offline:
  curl -X POST http://localhost:3000/api/force/dev-1/offline

Notes / Limitations
- All data is simulated and stored in memory (not persisted). It's intended as a teaching/demo sample.
- You can extend the simulator to use real SNMP/ping by replacing deviceSimulator.js with real polling code.

Files
- server.js — main server (Express + Socket.IO)
- deviceSimulator.js — simulation of devices and emitting events
- public/* — frontend (index.html, app.js)
- README.md — this file

If you want, I can:
- Convert simulation to real ICMP pings or SNMP polling,
- Add persistence (SQLite),
- Add authentication and pagination for logs,
- Or prepare a ZIP or a GitHub repo with this code.
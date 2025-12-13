# Web Monitoring — Realtime Demo (Express + Socket.IO)

A small demo Web Monitoring application that simulates or pings devices and provides:
- Real-time device status (online/offline) via WebSocket (Socket.IO)
- Simple bandwidth usage simulation per device (Mbps)
- Basic logs/alerts (device down, high bandwidth)
- REST endpoints for historical data
- Front-end (HTML + Tailwind + Chart.js) showing device table, realtime chart, and logs

Deliverables:
1. Source code — this repository.
2. README — setup & run instructions (this file).
3. Screenshot/recording — instructions below on how to capture.
4. Architecture explanation — below.

Tech stack:
- Node.js (Express)
- Socket.IO for realtime updates
- ping npm package (ICMP) — optionally disabled by SIMULATE mode
- Frontend: plain HTML, Tailwind CDN, Chart.js CDN

Requirements:
- Node.js 18+ recommended
- npm

Setup & Run:
1. Clone or extract code:
   - git clone <your-repo> or unzip folder
2. Install:
   - npm install
3. Run:
   - npm start
   - or for development: npm run dev (requires nodemon)

By default the app will try to ping devices. If you have permission issues or want to force simulation, run:
- SIMULATE=true npm start

Open: http://localhost:3000

API:
- GET /api/devices — current devices and status
- GET /api/devices/:id/history — historical samples for device
- GET /api/logs — recent logs
- GET /health — health check

WebSocket events:
- snapshot — initial state { devices, logs }
- device:update — { id, sample, device }
- log:new — { ts, level, deviceId, message }

Files of interest:
- server.js — main server + poller + socket.io
- simulator/devices.js — device list (3 devices by default)
- public/index.html — frontend UI
- public/app.js — frontend logic, connects to socket & REST

How it works (short architecture):
1. Poller in server.js runs every 2 seconds:
   - Pings device IP (ICMP) unless SIMULATE=true
   - Simulates bandwidth (random walk)
   - Stores samples in-memory histories
   - Emits realtime events via Socket.IO
   - Emits logs on status changes or bandwidth threshold breaches
2. Frontend subscribes to Socket.IO and updates:
   - Device table
   - Real-time Chart.js time-series
   - Logs view
3. REST endpoints expose history and logs for retrieval.

Notes & Troubleshooting:
- If front-end shows no devices:
  - Verify server started: terminal should show "Server listening on http://localhost:3000"
  - Test REST API: curl http://localhost:3000/api/devices
  - If ping fails due to platform restrictions, run with SIMULATE=true
- Data is in-memory and resets when server restarts. For production, add a DB (InfluxDB, Timescale, SQLite).

How to capture screenshot / short recording:
- macOS: Cmd+Shift+5 for screenshot/recording.
- Windows: Win+G (Xbox Game Bar) or ShareX.
- Linux: use `peek` (GIF) or `simplescreenrecorder`.
Record or screenshot the browser showing real-time updates (they update every ~2s).

Next steps / improvements:
- Persist history to DB (InfluxDB / Timescale / SQLite)
- Replace simulation with SNMP polling (node-net-snmp) or MQTT integration
- Add device management UI and authentication
- Containerize with Docker

If you want, I can:
- Add Dockerfile + docker-compose,
- Add SNMP polling example,
- Push this to a GitHub repo or create a zip file for download.

Enjoy!

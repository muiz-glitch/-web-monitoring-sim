Simple architecture description

Components:
- Simulator (deviceSimulator.js)
  - Keeps 3 device objects (id, name, ip, status, bandwidth).
  - tick() updates statuses and bandwidths periodically and emits 'snapshot' and 'statusChange' events.

- Server (server.js)
  - Express serves static UI and REST endpoints.
  - Socket.IO provides real-time push of device snapshots and logs.
  - On each simulator snapshot:
    - Append samples to in-memory history (per device).
    - Emit 'deviceSnapshot' event to connected clients.
  - On statusChange:
    - Create a log entry and emit 'log' to clients.

- Client (public/index.html + public/app.js)
  - Connects to Socket.IO.
  - Updates device table in real-time.
  - Displays a realtime line chart (Chart.js) for bandwidth (combined or per-device).
  - Shows log area and can request historical samples via REST or socket request.

Data flows:
Simulator -> Server (events) -> History & Logs -> Socket.IO -> Web UI
REST endpoints provide current snapshot, per-device history and logs for non-real-time retrieval.

This is an intentionally minimal architecture to keep the demo simple and portable.
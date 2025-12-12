const EventEmitter = require('events');

class DeviceSimulator extends EventEmitter {
  constructor() {
    super();
    this.devices = [
      { id: 'dev-1', name: 'Device A', ip: '10.0.0.1', status: 'online', bandwidth: 12 },
      { id: 'dev-2', name: 'Device B', ip: '10.0.0.2', status: 'online', bandwidth: 30 },
      { id: 'dev-3', name: 'Device C', ip: '10.0.0.3', status: 'online', bandwidth: 5 }
    ];
    // keep previous status for change detection
    this.prevStatuses = this.devices.map(d => d.status);
  }

  // tick advances the simulation; occasionally toggles device status, and changes bandwidth
  tick() {
    const now = Date.now();
    for (let i = 0; i < this.devices.length; i++) {
      const d = this.devices[i];
      // small chance to go offline or come back online
      if (Math.random() < 0.05) {
        d.status = d.status === 'online' ? 'offline' : 'online';
      }
      // if online, bandwidth fluctuates; if offline, bandwidth 0
      if (d.status === 'online') {
        // random walk
        const delta = (Math.random() - 0.5) * 10;
        d.bandwidth = Math.max(0, Math.round((d.bandwidth + delta) * 10) / 10);
        // ensure some min baseline
        if (d.bandwidth < 1) d.bandwidth = Math.round((Math.random() * 5 + 1) * 10) / 10;
      } else {
        d.bandwidth = 0;
      }

      // emit per-device change event if status changed
      if (d.status !== this.prevStatuses[i]) {
        this.emit('statusChange', {
          id: d.id,
          name: d.name,
          ip: d.ip,
          oldStatus: this.prevStatuses[i],
          newStatus: d.status,
          timestamp: now
        });
        this.prevStatuses[i] = d.status;
      }
    }
    // emit full snapshot
    this.emit('snapshot', { devices: this.getDevices(), timestamp: now });
  }

  getDevices() {
    // return shallow clones to prevent outside mutation
    return this.devices.map(d => ({ ...d }));
  }

  // helper to force a device to a certain status (for demo)
  forceStatus(id, status) {
    const d = this.devices.find(x => x.id === id);
    if (!d) return false;
    d.status = status;
    if (status === 'offline') d.bandwidth = 0;
    return true;
  }
}

module.exports = new DeviceSimulator();
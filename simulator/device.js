// List of devices to monitor. You can replace IPs with your real devices.
// Each device: { id, name, ip, meta }
module.exports = [
  { id: "dev-1", name: "Gateway-1", ip: "127.0.0.1", meta: { location: "Lab" } },
  { id: "dev-2", name: "Google-DNS", ip: "8.8.8.8", meta: { location: "Internet" } },
  { id: "dev-3", name: "Unreachable-Host", ip: "10.255.255.1", meta: { location: "Remote" } }
];

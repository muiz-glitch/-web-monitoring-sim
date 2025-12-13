(() => {
  const socket = io();
  let devices = [];
  const logsEl = document.getElementById("logs");
  const devicesBody = document.getElementById("devices-body");
  const refreshBtn = document.getElementById("refresh-history");
  const statusBanner = document.getElementById("status-banner");

  function setBanner(text, isError = false) {
    statusBanner.textContent = text;
    statusBanner.style.color = isError ? "#b91c1c" : "";
  }

  // Chart setup
  const ctx = document.getElementById("bandwidthChart").getContext("2d");
  const chartConfig = {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      animation: false,
      parsing: false,
      normalized: true,
      scales: {
        x: { type: "time", time: { unit: "second" }, ticks: { autoSkip: true, maxTicksLimit: 20 } },
        y: { beginAtZero: true, title: { display: true, text: "Mbps" } }
      },
      plugins: { legend: { display: true } }
    }
  };
  const bandwidthChart = new Chart(ctx, chartConfig);

  function addLog(entry) {
    const li = document.createElement("li");
    const date = new Date(entry.ts);
    li.className = "p-2 rounded " + (entry.level === "critical" ? "bg-red-100 text-red-700" : entry.level === "warning" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100");
    li.innerHTML = `<div class="text-xs text-slate-500">${date.toLocaleTimeString()}</div><div>${entry.message}</div>`;
    logsEl.prepend(li);
  }

  function renderDevices() {
    devicesBody.innerHTML = "";
    if (!devices || devices.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="p-2" colspan="5">No devices to display (check server /api/devices)</td>`;
      devicesBody.appendChild(tr);
      return;
    }
    devices.forEach(d => {
      const tr = document.createElement("tr");
      tr.className = "border-t";
      tr.innerHTML = `
        <td class="p-2 font-medium">${d.name}</td>
        <td class="p-2">${d.ip}</td>
        <td class="p-2"><span class="px-2 py-1 rounded text-xs ${d.status === "online" ? "bg-green-100 text-green-700" : d.status === "offline" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}">${d.status}</span></td>
        <td class="p-2">${d.bandwidthIn ?? 0}</td>
        <td class="p-2">${d.bandwidthOut ?? 0}</td>
      `;
      devicesBody.appendChild(tr);
    });
  }

  function ensureDatasets(devList) {
    const colors = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2"];
    chartConfig.data.datasets = [];
    devList.forEach((d, idx) => {
      chartConfig.data.datasets.push({
        label: `${d.name} (in)`,
        borderColor: colors[(idx*2)%colors.length],
        backgroundColor: "transparent",
        data: [],
        parsing: false,
        spanGaps: true
      });
      chartConfig.data.datasets.push({
        label: `${d.name} (out)`,
        borderColor: colors[(idx*2+1)%colors.length],
        backgroundColor: "transparent",
        borderDash: [4,2],
        data: [],
        parsing: false,
        spanGaps: true
      });
    });
    bandwidthChart.update();
  }

  async function loadInitialHistory() {
    setBanner("Loading devices...");
    try {
      const resp = await fetch("/api/devices");
      if (!resp.ok) throw new Error(`/api/devices returned ${resp.status}`);
      const devs = await resp.json();
      console.log("Fetched /api/devices:", devs);
      devices = devs;
      renderDevices();
      ensureDatasets(devices);

      // load histories
      for (let i = 0; i < devices.length; i++) {
        const d = devices[i];
        try {
          const r = await fetch(`/api/devices/${encodeURIComponent(d.id)}/history`);
          if (!r.ok) { console.warn("history fetch failed for", d.id, r.status); continue; }
          const hist = await r.json();
          hist.forEach(s => {
            const inDataset = chartConfig.data.datasets[i*2];
            const outDataset = chartConfig.data.datasets[i*2 + 1];
            inDataset.data.push({ x: s.ts, y: s.in });
            outDataset.data.push({ x: s.ts, y: s.out });
          });
        } catch (err) {
          console.warn("history load error for", d.id, err);
        }
      }
      bandwidthChart.update();
      setBanner("Connected — waiting realtime updates");
    } catch (err) {
      console.error("Failed to load /api/devices:", err);
      setBanner("Error loading devices: " + err.message, true);
      devices = [];
      renderDevices();
    }
  }

  // Socket handlers
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    setBanner("Realtime connected (socket id: " + socket.id + ")");
  });
  socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err);
    setBanner("Socket connect error: " + (err.message || err), true);
  });
  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    setBanner("Socket disconnected: " + reason, true);
  });

  socket.on("snapshot", payload => {
    console.log("snapshot:", payload);
    if (payload.devices) {
      devices = payload.devices;
      renderDevices();
      ensureDatasets(devices);
    }
    if (payload.logs) payload.logs.slice(-100).forEach(addLog);
    // load REST history as fallback
    loadInitialHistory();
  });

  socket.on("device:update", ({ id, sample, device }) => {
    //console.log("device:update", id, sample, device);
    const idx = devices.findIndex(x => x.id === id);
    if (idx >= 0) {
      devices[idx] = { ...devices[idx], ...device };
      renderDevices();
      const inDs = chartConfig.data.datasets[idx*2];
      const outDs = chartConfig.data.datasets[idx*2+1];
      const ts = sample.ts;
      inDs.data.push({ x: ts, y: sample.in });
      outDs.data.push({ x: ts, y: sample.out });
      const maxPoints = 300;
      inDs.data = inDs.data.slice(-maxPoints);
      outDs.data = outDs.data.slice(-maxPoints);
      bandwidthChart.update("none");
    } else {
      console.warn("Received update for unknown device:", id);
      // reload devices to recover
      loadInitialHistory();
    }
  });

  socket.on("log:new", entry => {
    console.log("log:new", entry);
    addLog(entry);
  });

  refreshBtn.addEventListener("click", () => {
    loadInitialHistory();
  });

  // initial load
  loadInitialHistory();
})();

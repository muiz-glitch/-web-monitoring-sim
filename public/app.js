(() => {
  const socket = io();
  let devices = [];
  const logsEl = document.getElementById("logs");
  const devicesBody = document.getElementById("devices-body");
  const refreshBtn = document.getElementById("refresh-history");

  // Chart setup
  const ctx = document.getElementById("bandwidthChart").getContext("2d");
  const chartConfig = {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      animation: false,
      parsing: false,
      normalized: true,
      scales: {
        x: { type: "time", time: { unit: "second" }, ticks: { autoSkip: true, maxTicksLimit: 20 } },
        y: { beginAtZero: true, title: { display: true, text: "Mbps" } }
      },
      plugins: {
        legend: { display: true }
      }
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

  // Manage chart datasets (one dataset per device 'in' and 'out' optionally)
  function ensureDatasets(devList) {
    const colors = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd"];
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
    // fetch devices and populate datasets
    const resp = await fetch("/api/devices");
    const devs = await resp.json();
    devices = devs;
    renderDevices();
    ensureDatasets(devices);

    // load per-device history and append to chart datasets
    for (let i = 0; i < devices.length; i++) {
      const d = devices[i];
      try {
        const r = await fetch(`/api/devices/${encodeURIComponent(d.id)}/history`);
        const hist = await r.json();
        hist.forEach(s => {
          // push in and out to dataset pairs
          const time = s.ts;
          const inDataset = chartConfig.data.datasets[i*2];
          const outDataset = chartConfig.data.datasets[i*2 + 1];
          inDataset.data.push({ x: time, y: s.in });
          outDataset.data.push({ x: time, y: s.out });
        });
      } catch (err) {
        console.warn("history load error", err);
      }
    }
    bandwidthChart.update();
  }

  // Socket handlers
  socket.on("snapshot", payload => {
    if (payload.devices) {
      devices = payload.devices;
      renderDevices();
      ensureDatasets(devices);
    }
    if (payload.logs) {
      payload.logs.slice(-100).forEach(addLog);
    }
    // load history for chart
    loadInitialHistory();
  });

  socket.on("device:update", ({ id, sample, device }) => {
    // update device in table
    const idx = devices.findIndex(x => x.id === id);
    if (idx >= 0) {
      devices[idx] = { ...devices[idx], ...device };
      renderDevices();

      // append to chart datasets
      const inDs = chartConfig.data.datasets[idx*2];
      const outDs = chartConfig.data.datasets[idx*2+1];
      const ts = sample.ts;
      inDs.data.push({ x: ts, y: sample.in });
      outDs.data.push({ x: ts, y: sample.out });

      // keep dataset size reasonable
      const maxPoints = 300;
      inDs.data = inDs.data.slice(-maxPoints);
      outDs.data = outDs.data.slice(-maxPoints);
      bandwidthChart.update("none");
    }
  });

  socket.on("log:new", entry => {
    addLog(entry);
  });

  refreshBtn.addEventListener("click", () => {
    loadInitialHistory();
  });

  // initial load
  loadInitialHistory();
})();
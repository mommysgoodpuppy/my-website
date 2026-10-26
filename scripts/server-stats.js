// Live stats for the homepage's server section, from /api/server (served by
// ldeploy, see github.com/mommysgoodpuppy/deno-ldeploy). The section stays
// hidden until the first successful fetch, so the page is unchanged anywhere
// that endpoint doesn't exist.

const ENDPOINT = "/api/server";
const POLL_MS = 5000;

const section = document.getElementById("server");
const intro = document.getElementById("server-intro");
const grid = document.getElementById("server-grid");

const GiB = 1024 ** 3;
const gib = (b) => (b / GiB).toFixed(1);
const pct = (n) => (n == null ? "–" : `${Math.round(n)}%`);

function rate(bytesPerSec) {
  if (bytesPerSec == null) return "–";
  if (bytesPerSec >= 1024 ** 2) return `${(bytesPerSec / 1024 ** 2).toFixed(1)} MB/s`;
  return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
}

function duration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d) return `${d} day${d === 1 ? "" : "s"}, ${h} h`;
  return `${h} h ${Math.floor((seconds % 3600) / 60)} min`;
}

// "Intel(R) Core(TM) i5-5200U CPU @ 2.20GHz" -> "Intel Core i5-5200U @ 2.20GHz"
const cleanCpu = (cpu) => cpu?.replace(/\((R|TM)\)/gi, "").replace(/\s+CPU\s+@/, " @").replace(/\s+/g, " ").trim();

function sparkline(values, max) {
  const points = values.filter((v) => v != null);
  if (points.length < 2) return null;
  const top = max ?? Math.max(...points, 1);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${points.length - 1} 100`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const line = document.createElementNS(ns, "polyline");
  line.setAttribute("points", points.map((v, i) => `${i},${100 - (Math.min(v, top) / top) * 96 - 2}`).join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#58a6ff");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(line);
  return svg;
}

function tile(label, value, sub, chart, wide) {
  const el = document.createElement("div");
  el.className = wide ? "tile wide" : "tile";
  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label;
  const v = document.createElement("div");
  v.className = "value";
  v.textContent = value;
  el.append(l, v);
  if (sub) {
    const s = document.createElement("div");
    s.className = "sub";
    s.textContent = sub;
    el.append(s);
  }
  if (chart) el.append(chart);
  return el;
}

function render(s) {
  const an = (word) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);
  const cpu = cleanCpu(s.cpu);
  intro.textContent = `This site is self-hosted on ${s.machine ? an(s.machine) : "a machine"}` +
    (cpu ? ` with ${an(cpu)} (${s.threads} threads)` : "") +
    `, running ${s.os ?? "Linux"}. Live, updated every ${s.sampleSeconds} seconds.`;

  const history = s.history ?? [];
  const tiles = [
    tile("CPU", pct(s.cpuPercent), `load ${s.load[0].toFixed(2)}`, sparkline(history.map((h) => h.cpu), 100)),
  ];
  if (s.tempC != null) {
    tiles.push(tile("Temperature", `${Math.round(s.tempC)} °C`, "CPU package", sparkline(history.map((h) => h.temp))));
  }
  tiles.push(tile(
    "Memory",
    `${gib(s.memory.used)} / ${gib(s.memory.total)} GiB`,
    s.memory.swapTotal ? `swap ${gib(s.memory.swapUsed)} GiB in use` : null,
  ));
  if (s.disk) {
    tiles.push(tile("Disk", `${gib(s.disk.used)} / ${gib(s.disk.total)} GiB`, `${pct((100 * s.disk.used) / s.disk.total)} full`));
  }
  if (s.power.battery) {
    const b = s.power.battery;
    const source = s.power.ac === false ? "running on battery!" : "on mains; the battery is its UPS";
    tiles.push(tile("Battery", pct(b.percent), source));
  }
  const net = s.network;
  if (net.kind) {
    const link = net.wifi ? `Wi-Fi, ${net.wifi.dbm} dBm` : net.kind === "wifi" ? "Wi-Fi" : "wired";
    tiles.push(tile(
      "Network",
      `↓ ${rate(net.rxBytesPerSec)} ↑ ${rate(net.txBytesPerSec)}`,
      link,
      sparkline(history.map((h) => (h.rx ?? 0) + (h.tx ?? 0))),
    ));
  }
  tiles.push(tile("Uptime", duration(s.uptimeSeconds), `kernel ${s.kernel}`));
  if (s.apps?.length) {
    const since = new Date(s.ldeploySince).toLocaleString();
    tiles.push(tile(
      "Hosting",
      s.apps.map((a) => a.name).join(" · "),
      `${s.apps.reduce((n, a) => n + a.requests, 0).toLocaleString()} requests served since ${since}`,
      null,
      true,
    ));
  }
  grid.replaceChildren(...tiles);
}

let timer = null;

async function poll() {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    render(await res.json());
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

function schedule() {
  clearInterval(timer);
  if (document.hidden) return;
  poll();
  timer = setInterval(poll, POLL_MS);
}

document.addEventListener("visibilitychange", schedule);
schedule();

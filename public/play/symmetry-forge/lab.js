const MAX_NODES = 14;
const TIME_LIMIT_MS = 6000;
const COLORS = ["#ff9b4a", "#5fd4e8", "#a78bfa", "#59d499", "#f2c46d", "#ff6b6b", "#7aa2ff", "#94a0b4"];
const NS = "http://www.w3.org/2000/svg";

const ring = (n, r = 1, turn = 0) =>
  Array.from({ length: n }, (_, i) => [r * Math.sin(turn + (2 * Math.PI * i) / n), -r * Math.cos(turn + (2 * Math.PI * i) / n)]);
const cycleEdges = (n, offset = 0) => Array.from({ length: n }, (_, i) => [offset + i, offset + ((i + 1) % n)]);

const PRESETS = {
  "Petersen": () => ({
    pos: [...ring(5), ...ring(5, 0.5)],
    edges: [...cycleEdges(5), ...Array.from({ length: 5 }, (_, i) => [5 + i, 5 + ((i + 2) % 5)]), ...Array.from({ length: 5 }, (_, i) => [i, i + 5])],
  }),
  "Cube": () => ({
    pos: [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8], [-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5], [4, 6], [5, 7], [6, 7], [0, 4], [1, 5], [2, 6], [3, 7]],
  }),
  "Heawood": () => ({
    pos: ring(14),
    edges: [...cycleEdges(14), ...Array.from({ length: 7 }, (_, k) => [2 * k, (2 * k + 5) % 14])],
  }),
  "Complete K5": () => ({ pos: ring(5), edges: ring(5).flatMap((_, a) => ring(5).map((_, b) => [a, b]).filter(([x, y]) => x < y)) }),
  "Cycle C8": () => ({ pos: ring(8), edges: cycleEdges(8) }),
  "Star": () => ({ pos: [[0, 0], ...ring(6)], edges: Array.from({ length: 6 }, (_, i) => [0, i + 1]) }),
  "Path P6": () => ({ pos: Array.from({ length: 6 }, (_, i) => [-1 + 0.4 * i, i % 2 ? 0.15 : -0.15]), edges: Array.from({ length: 5 }, (_, i) => [i, i + 1]) }),
  "Random 3-regular": () => {
    const n = 10;
    for (let attempt = 0; attempt < 200; attempt++) {
      const stubs = Array.from({ length: n * 3 }, (_, i) => Math.floor(i / 3)).sort(() => Math.random() - 0.5);
      const edges = [], seen = new Set();
      let ok = true;
      for (let i = 0; i < stubs.length; i += 2) {
        const [a, b] = [Math.min(stubs[i], stubs[i + 1]), Math.max(stubs[i], stubs[i + 1])];
        if (a === b || seen.has(`${a}-${b}`)) { ok = false; break; }
        seen.add(`${a}-${b}`); edges.push([a, b]);
      }
      if (ok) return { pos: ring(n), edges };
    }
    return PRESETS["Petersen"]();
  },
};

const state = { pos: [], edges: new Set(), selected: null, orbitOf: [] };
const $ = (id) => document.getElementById(id);
const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function load(name) {
  const preset = PRESETS[name]();
  state.pos = preset.pos;
  state.edges = new Set(preset.edges.map(([a, b]) => key(a, b)));
  state.selected = null;
  document.querySelectorAll(".presets button").forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === name)));
  changed();
}

function draw() {
  const svg = $("graph");
  svg.querySelectorAll("g").forEach((g) => g.remove());
  const lines = document.createElementNS(NS, "g"), nodes = document.createElementNS(NS, "g");
  for (const edge of state.edges) {
    const [a, b] = edge.split("-").map(Number);
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", state.pos[a][0]); line.setAttribute("y1", state.pos[a][1]);
    line.setAttribute("x2", state.pos[b][0]); line.setAttribute("y2", state.pos[b][1]);
    lines.append(line);
  }
  state.pos.forEach(([x, y], i) => {
    const node = document.createElementNS(NS, "g");
    node.setAttribute("class", "node" + (state.selected === i ? " selected" : ""));
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", `Node ${i}`);
    const circle = document.createElementNS(NS, "circle");
    circle.setAttribute("cx", x); circle.setAttribute("cy", y); circle.setAttribute("r", 0.09);
    circle.setAttribute("fill", state.orbitOf[i] === undefined ? "#94a0b4" : COLORS[state.orbitOf[i] % COLORS.length]);
    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", x); label.setAttribute("y", y); label.textContent = i;
    node.append(circle, label);
    node.addEventListener("click", () => pick(i));
    node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } });
    nodes.append(node);
  });
  svg.append(lines, nodes);
  $("size").textContent = `${state.pos.length} · ${state.edges.size}`;
}

function pick(i) {
  if (state.selected === null) state.selected = i;
  else {
    if (state.selected !== i) {
      const k = key(state.selected, i);
      state.edges.has(k) ? state.edges.delete(k) : state.edges.add(k);
    }
    state.selected = null;
    document.querySelectorAll(".presets button").forEach((b) => b.setAttribute("aria-pressed", "false"));
    changed();
    return;
  }
  draw();
}

// One worker at a time; a search past the time limit is stopped by replacing the worker.
let worker, request = 0, timer, isReady = false;
function startWorker() {
  worker = new Worker(new URL("worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.type === "ready") { isReady = true; analyze(); return; }
    if (data.id !== request) return;
    clearTimeout(timer);
    if (data.type === "error") { $("status").textContent = "Python reported an error: " + data.message; return; }
    show(data.result);
  };
}

function analyze() {
  state.orbitOf = [];
  if (!isReady) return draw();
  const id = ++request;
  $("status").textContent = "Searching…";
  clearTimeout(timer);
  timer = setTimeout(() => {
    worker.terminate(); isReady = false; startWorker();
    $("status").textContent = "Stopped after 6 seconds: this graph has too many symmetries for an exhaustive search in the browser. Try removing a node or an edge.";
  }, TIME_LIMIT_MS);
  const edges = [...state.edges].map((e) => e.split("-").map(Number));
  worker.postMessage({ id, graph: { n: state.pos.length, edges } });
  draw();
}

function show(r) {
  r.orbits.forEach((orbit, k) => orbit.forEach((v) => (state.orbitOf[v] = k)));
  $("order").textContent = r.order.toLocaleString();
  $("orbits").textContent = r.orbits.length;
  $("status").textContent = `Computed in ${r.ms} ms by Symmetry Forge in your browser.`;
  $("orbit-list").replaceChildren(...r.orbits.map((orbit, k) => {
    const li = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "swatch"; swatch.style.background = COLORS[k % COLORS.length];
    li.append(swatch, `{${orbit.join(", ")}}`);
    return li;
  }));
  $("examples").replaceChildren(...(r.examples.length ? r.examples : ["Only the identity: this graph has no symmetry."]).map((text) => {
    const li = document.createElement("li"); li.textContent = text; return li;
  }));
  draw();
}

let pending;
function changed() { clearTimeout(pending); pending = setTimeout(analyze, 120); draw(); }

const presets = document.querySelector(".presets");
for (const name of Object.keys(PRESETS)) {
  const button = document.createElement("button");
  button.type = "button"; button.textContent = name;
  button.addEventListener("click", () => load(name));
  presets.append(button);
}
$("add").addEventListener("click", () => {
  if (state.pos.length >= MAX_NODES) return;
  state.pos = ring(state.pos.length + 1);
  changed();
});
$("remove").addEventListener("click", () => {
  const last = state.pos.length - 1;
  if (last < 1) return;
  state.pos = ring(last);
  state.edges = new Set([...state.edges].filter((e) => !e.split("-").map(Number).includes(last)));
  changed();
});
$("clear").addEventListener("click", () => { state.edges.clear(); changed(); });

startWorker();
load("Petersen");

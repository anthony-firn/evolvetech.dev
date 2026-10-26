document.documentElement.classList.remove("no-js");
const motion = matchMedia("(prefers-reduced-motion: reduce)");

// Header turns solid once the page scrolls.
const header = document.querySelector(".site-header");
const onScroll = () => header?.classList.toggle("scrolled", scrollY > 24);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

// Fade sections in as they arrive.
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); revealer.unobserve(e.target); }
}, { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

// Demo videos play only while on screen; reduced-motion visitors get controls instead.
const videos = new Map();
function syncVideos() {
  for (const [video, visible] of videos) {
    if (!visible || document.hidden) video.pause();
    else if (!motion.matches) video.play().catch(() => {});
  }
}
const player = new IntersectionObserver((entries) => {
  for (const entry of entries) videos.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.35);
  syncVideos();
}, { threshold: [0, 0.35] });
document.querySelectorAll("video[data-autoplay]").forEach((video) => {
  video.controls = motion.matches; video.removeAttribute("autoplay");
  videos.set(video, false); player.observe(video);
});
motion.addEventListener("change", () => {
  for (const video of videos.keys()) { video.controls = motion.matches; if (motion.matches) video.pause(); }
  syncVideos();
});

// SVG dash animation repaints: run it only while its diagram is visible.
const animated = new IntersectionObserver((entries) => {
  for (const entry of entries) entry.target.classList.toggle("animation-visible", entry.isIntersecting);
});
document.querySelectorAll("#arch-svg").forEach((diagram) => animated.observe(diagram));
function onVisibility() {
  document.documentElement.classList.toggle("page-hidden", document.hidden);
  syncVideos();
}
document.addEventListener("visibilitychange", onVisibility); onVisibility();

// Which CDN served this page? Both copies are live; DNS picks one and fails over automatically.
const served = document.getElementById("served-by");
if (served) {
  fetch("/health.json", { cache: "no-store" }).then((r) => {
    const server = r.headers.get("server") || "";
    const name = /netlify/i.test(server) ? "Netlify (primary)" : /bunny/i.test(server) ? "Bunny CDN (standby)" : "an edge cache";
    const pop = (server.match(/BunnyCDN-([A-Z]+)/) || [])[1];
    served.textContent = name + (pop ? ` · edge ${pop}` : "");
    if (/netlify|bunny/i.test(server)) document.querySelector(/netlify/i.test(server) ? "#arch-netlify" : "#arch-bunny")?.classList.add("serving");
  }).catch(() => { served.textContent = "unknown (offline?)"; });
}

// Retirement Research: every tested strategy, income against the chance of ending below the start.
const chart = document.getElementById("income-chart");
if (chart) {
  const NS = "http://www.w3.org/2000/svg";
  const COLORS = { "Retiree-tuned": "var(--ember)", "Balanced": "var(--cyan)", "Most income": "var(--violet)", "Fortress": "var(--green)", "Reference": "var(--text)" };
  const W = 560, H = 340, M = { l: 52, r: 18, t: 34, b: 38 };
  const readout = document.getElementById("chart-readout");
  let data, scenario = "base";
  const el = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

  function render() {
    chart.replaceChildren();
    const rows = data.strategies.filter((s) => s.scenarios[scenario]);
    const xMax = Math.max(0.6, ...rows.map((s) => s.scenarios[scenario].lose_value)) * 1.05;
    const yMax = Math.ceil(Math.max(...rows.map((s) => s.scenarios[scenario].print_typical * 1e6 / 12)) / 1000) * 1000;
    const x = (v) => M.l + (v / xMax) * (W - M.l - M.r), y = (v) => H - M.b - (v / yMax) * (H - M.t - M.b);
    for (let i = 0; i <= 4; i++) {
      const gy = y((yMax * i) / 4);
      chart.append(el("line", { class: "grid", x1: M.l, x2: W - M.r, y1: gy, y2: gy }), el("text", { x: M.l - 8, y: gy + 3, "text-anchor": "end" }, "$" + ((yMax * i) / 4 / 1000).toFixed(1) + "k"));
    }
    for (let p = 0; p <= xMax; p += 0.1) chart.append(el("text", { x: x(p), y: H - M.b + 16, "text-anchor": "middle" }, Math.round(p * 100) + "%"));
    chart.append(el("line", { class: "axis", x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }));
    chart.append(el("text", { x: W - M.r, y: H - 4, "text-anchor": "end" }, "chance it ends below its starting value →"));
    chart.append(el("text", { x: M.l - 44, y: 12 }, "↑ typical monthly income on $1M"));
    for (const s of rows) {
      const m = s.scenarios[scenario], cx = x(m.lose_value), cy = y(m.print_typical * 1e6 / 12);
      const dot = el("circle", { class: "dot", cx, cy, r: s.reference ? 7 : 6, "fill-opacity": s.reference ? 0.95 : 0.85, tabindex: 0, role: "img",
        "aria-label": `${s.name}: ${money(m.print_typical * 1e6 / 12)} a month typical, ${Math.round(m.lose_value * 100)}% chance of ending below the start` });
      dot.style.fill = COLORS[s.group] || "var(--text)";   // CSS variables keep the points readable in both themes
      const show = () => {
        chart.querySelectorAll(".dot.active").forEach((d) => d.classList.remove("active")); dot.classList.add("active");
        readout.innerHTML = "";
        const b = document.createElement("b"); b.textContent = s.name;
        readout.append(b, ` — typical ${money(m.print_typical * 1e6 / 12)}/month on $1M, ${money(m.print_bad * 1e6 / 12)} in bad histories. Ends below start ${Math.round(m.lose_value * 100)}%, dips under 70% ${Math.round(m.deep_dip * 100)}%, runs dry ${(m.run_dry * 100).toFixed(1)}%.`);
      };
      dot.addEventListener("pointerenter", show); dot.addEventListener("focus", show); dot.addEventListener("click", show);
      chart.append(dot);
      if (s.reference) { const right = cx > W - 170; chart.append(el("text", { class: "ref-label", x: right ? cx - 11 : cx + 11, y: cy + 3.5, "text-anchor": right ? "end" : "start" }, s.name)); }
    }
  }

  fetch("/play/retirement/data.json").then((r) => r.json()).then((d) => {
    data = d; render();
    document.querySelectorAll("[data-scenario]").forEach((b) => b.addEventListener("click", () => {
      scenario = b.dataset.scenario;
      document.querySelectorAll("[data-scenario]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      render();
    }));
  }).catch(() => { readout.textContent = "The research data could not be loaded."; });
}

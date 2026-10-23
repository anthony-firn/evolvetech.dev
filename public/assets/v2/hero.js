// A tesseract (the 4D hypercube, 384 symmetries) rotating in four dimensions, projected to the screen.
const canvas = document.getElementById("tesseract");
const ctx = canvas?.getContext("2d");
const still = matchMedia("(prefers-reduced-motion: reduce)");

if (ctx) {
  const vertices = Array.from({ length: 16 }, (_, i) => [0, 1, 2, 3].map((bit) => ((i >> bit) & 1 ? 1 : -1)));
  const edges = [];
  for (let a = 0; a < 16; a++) for (let bit = 0; bit < 4; bit++) { const b = a ^ (1 << bit); if (a < b) edges.push([a, b]); }
  const dust = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), r: Math.random() * 1.2 + 0.3 }));

  let width = 0, height = 0, dpr = 1, running = false, visible = true, last = 0, time = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let dustColor = "200,215,240";
  const readTheme = () => { dustColor = getComputedStyle(document.documentElement).getPropertyValue("--dust").trim() || dustColor; if (!running) draw(time || 1.2); };
  document.addEventListener("themechange", readTheme);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw(0);
  }

  const rot = (p, i, j, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle), a = p[i], b = p[j];
    p[i] = a * c - b * s; p[j] = a * s + b * c;
  };

  function project(t) {
    const wide = width > 900;
    const cx = wide ? width * 0.72 : width * 0.5, cy = height * (wide ? 0.48 : 0.42);
    const scale = Math.min(width * (wide ? 0.2 : 0.34), height * 0.3);
    return vertices.map((v) => {
      const p = v.slice();
      rot(p, 0, 3, t * 0.31); rot(p, 1, 3, t * 0.23); rot(p, 2, 3, t * 0.17);
      rot(p, 0, 2, 0.5 + pointer.x * 0.6 + t * 0.05); rot(p, 1, 2, -0.35 + pointer.y * 0.5);
      const w = 1 / (2.6 - p[3]);                       // 4D -> 3D perspective
      const x = p[0] * w, y = p[1] * w, z = p[2] * w;
      const k = 3.2 / (3.2 - z);                         // 3D -> 2D perspective
      return { x: cx + x * k * scale * 1.25, y: cy + y * k * scale * 1.25, depth: z, w: p[3], k };
    });
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    for (const d of dust) {
      const x = ((d.x + t * 0.004 * d.z + pointer.x * 0.01 * d.z) % 1) * width, y = (d.y + pointer.y * 0.01 * d.z) * height;
      ctx.fillStyle = `rgba(${dustColor},${0.08 + d.z * 0.22})`;
      ctx.beginPath(); ctx.arc(x, y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    const pts = project(t);
    const order = edges.map((e) => [e, (pts[e[0]].depth + pts[e[1]].depth) / 2]).sort((a, b) => a[1] - b[1]);
    ctx.lineCap = "round";
    for (const [[a, b], depth] of order) {
      const p = pts[a], q = pts[b], near = Math.max(0, Math.min(1, (depth + 0.6) / 1.2));
      const grad = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
      grad.addColorStop(0, p.w > 0 ? "rgba(255,155,74,0.9)" : "rgba(95,212,232,0.85)");
      grad.addColorStop(1, q.w > 0 ? "rgba(255,155,74,0.9)" : "rgba(95,212,232,0.85)");
      ctx.globalAlpha = 0.25 + near * 0.65;
      ctx.strokeStyle = grad; ctx.lineWidth = 1 + near * 1.6;
      ctx.shadowColor = p.w > 0 ? "rgba(255,120,60,.8)" : "rgba(95,212,232,.7)"; ctx.shadowBlur = 8 + near * 10;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    for (const p of pts.slice().sort((a, b) => a.depth - b.depth)) {
      const r = 2.4 + p.k * 2.2, color = p.w > 0 ? "255,170,100" : "120,225,240";
      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
      halo.addColorStop(0, `rgba(${color},.55)`); halo.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgb(${color})`; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    time += dt;
    pointer.x += (pointer.tx - pointer.x) * 0.04; pointer.y += (pointer.ty - pointer.y) * 0.04;
    draw(time);
    requestAnimationFrame(frame);
  }
  function setRunning() {
    const go = visible && !document.hidden && !still.matches;
    if (go && !running) { running = true; last = 0; requestAnimationFrame(frame); }
    if (!go) { running = false; draw(time || 1.2); }
  }

  addEventListener("pointermove", (e) => { pointer.tx = e.clientX / innerWidth - 0.5; pointer.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; setRunning(); }).observe(canvas);
  document.addEventListener("visibilitychange", setRunning);
  still.addEventListener("change", setRunning);
  readTheme(); resize(); setRunning();
}

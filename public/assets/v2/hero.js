import { createGPU, createCPU } from "./hero-renderers.js";

// A tesseract (the 4D hypercube, 384 symmetries) rotating in four dimensions.
let canvas = document.getElementById("tesseract");
const still = matchMedia("(prefers-reduced-motion: reduce)");

if (canvas) {
  let renderer;
  try { renderer = createGPU(canvas); } catch { /* The browser may disable WebGL entirely. */ }
  function useCPU() {
    // A canvas cannot switch context types, including after a shader failure or GPU loss.
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement); canvas = replacement;
    renderer = createCPU(canvas);
  }
  if (!renderer) useCPU();
  if (renderer) start();

  function start() {
    const vertices = Array.from({ length: 16 }, (_, i) => [0, 1, 2, 3].map((bit) => ((i >> bit) & 1 ? 1 : -1)));
    const points = vertices.map(() => ({ x: 0, y: 0, depth: 0, w: 0, k: 0 }));
    const edges = [];
    for (let a = 0; a < 16; a++) for (let bit = 0; bit < 4; bit++) {
      const b = a ^ (1 << bit); if (a < b) edges.push({ a, b, depth: 0 });
    }
    const dust = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), r: Math.random() * 1.2 + 0.3, sx: 0, sy: 0 }));
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const p = new Float64Array(4);
    const cos = new Float64Array(5), sin = new Float64Array(5);
    const planes = [[0, 3], [1, 3], [2, 3], [0, 2], [1, 2]];
    let width = 0, height = 0, visible = false, raf = 0, last = 0, nextFrame = 0, time = 0;
    let quality = 1, slowFrames = 0, dustColor = [200, 215, 240];
    // A 60 Hz ceiling avoids doubling decorative animation work on 120/144/240 Hz screens.
    const interval = 1000 / 60;

    function resize() {
      if (!renderer) return;
      const nextWidth = canvas.clientWidth, nextHeight = canvas.clientHeight;
      // Bound pixel work as well as DPR, especially on 4K/retina displays and CPU-only browsers.
      const cap = renderer.type === "webgl" ? 2 : 1;
      const budget = renderer.type === "webgl" ? 3_000_000 : 1_000_000;
      const nextDpr = Math.min(devicePixelRatio || 1, cap, Math.sqrt(budget / Math.max(1, nextWidth * nextHeight))) * quality;
      const pixelWidth = Math.max(1, Math.round(nextWidth * nextDpr)), pixelHeight = Math.max(1, Math.round(nextHeight * nextDpr));
      if (width === nextWidth && height === nextHeight && canvas.width === pixelWidth && canvas.height === pixelHeight) return;
      width = nextWidth; height = nextHeight;
      canvas.width = pixelWidth; canvas.height = pixelHeight;
      renderer.resize(width, height, nextDpr);
      if (width && height && !document.hidden) draw(time || 1.2);
    }

    function project(t) {
      const wide = width > 900;
      const cx = width * (wide ? 0.72 : 0.5), cy = height * (wide ? 0.48 : 0.42);
      const scale = Math.min(width * (wide ? 0.2 : 0.34), height * 0.3) * 1.25;
      const angles = [t * 0.31, t * 0.23, t * 0.17, 0.5 + pointer.x * 0.6 + t * 0.05, -0.35 + pointer.y * 0.5];
      for (let j = 0; j < 5; j++) { cos[j] = Math.cos(angles[j]); sin[j] = Math.sin(angles[j]); }
      for (let i = 0; i < 16; i++) {
        p.set(vertices[i]);
        for (let j = 0; j < 5; j++) {
          const [a, b] = planes[j], x = p[a], y = p[b];
          p[a] = x * cos[j] - y * sin[j]; p[b] = x * sin[j] + y * cos[j];
        }
        const w = 1 / (2.6 - p[3]), z = p[2] * w, k = 3.2 / (3.2 - z), point = points[i];
        point.x = cx + p[0] * w * k * scale; point.y = cy + p[1] * w * k * scale;
        point.depth = z; point.w = p[3]; point.k = k;
      }
      for (const edge of edges) edge.depth = (points[edge.a].depth + points[edge.b].depth) / 2;
      edges.sort((a, b) => a.depth - b.depth);
      for (const d of dust) {
        d.sx = ((d.x + t * 0.004 * d.z + pointer.x * 0.01 * d.z + 1) % 1) * width;
        d.sy = (d.y + pointer.y * 0.01 * d.z) * height;
      }
    }

    function draw(t) {
      if (!width || !height || !renderer) return;
      project(t); renderer.draw(points, edges, dust, dustColor);
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden || still.matches || !renderer) return;
      const elapsed = last ? now - last : interval;
      if (now >= nextFrame - 0.5) {
        // Keep the fractional remainder so 90/144/165 Hz screens also average 60 draws/sec.
        if (!nextFrame) nextFrame = now;
        nextFrame += interval * Math.max(1, Math.floor((now - nextFrame) / interval) + 1);
        // Decrease resolution only after sustained missed frames; avoid oscillating quality.
        slowFrames = elapsed > 28 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames >= 45 && quality > 0.55) { quality = Math.max(0.55, quality * 0.8); slowFrames = 0; resize(); }
        const dt = Math.min(0.05, elapsed / 1000); last = now;
        time += dt;
        const ease = 1 - Math.exp(-2.45 * dt);
        pointer.x += (pointer.tx - pointer.x) * ease; pointer.y += (pointer.ty - pointer.y) * ease;
        draw(time);
      }
      raf = requestAnimationFrame(frame);
    }

    function setRunning() {
      const go = visible && !document.hidden && !still.matches && renderer;
      if (go && !raf) { last = nextFrame = 0; raf = requestAnimationFrame(frame); }
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
      // Offscreen and hidden canvases need no final redraw. Reduced motion gets one still frame.
      if (visible && !document.hidden && still.matches) draw(time || 1.2);
    }

    function readTheme() {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--dust").trim();
      if (value) dustColor = value.split(",").map(Number);
      if (visible && !document.hidden && still.matches) draw(time || 1.2);
    }
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      useCPU(); quality = 1; width = height = 0; resize(); setRunning();
    }, { once: true });
    const hero = canvas.parentElement;
    hero.addEventListener("pointermove", (event) => {
      if (!visible || still.matches) return;
      pointer.tx = event.clientX / innerWidth - 0.5; pointer.ty = event.clientY / innerHeight - 0.5;
    }, { passive: true });
    // Observe the section, which survives canvas replacement if the GPU is lost.
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting; hero.classList.toggle("hero-visible", visible); setRunning();
    }).observe(hero);
    document.addEventListener("visibilitychange", setRunning);
    still.addEventListener("change", setRunning);
    document.addEventListener("themechange", readTheme);
    readTheme(); resize();
  }
}

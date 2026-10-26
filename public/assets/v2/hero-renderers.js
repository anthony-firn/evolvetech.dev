// Both renderers consume the same 16 projected vertices and 32 depth-sorted edges.
const WARM = [255, 155, 74], COOL = [95, 212, 232];
const WARM_VERTEX = [255, 170, 100], COOL_VERTEX = [120, 225, 240];
const color = (p) => p.w > 0 ? WARM : COOL;
const near = (depth) => Math.max(0, Math.min(1, (depth + 0.6) / 1.2));

export function createGPU(canvas) {
  // Reject software WebGL: Canvas is cheaper than emulating a GPU for this small scene.
  const gl = canvas.getContext("webgl", {
    alpha: true, antialias: false, depth: false, stencil: false,
    powerPreference: "low-power", failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return null;
  const shaders = [];
  let program, buffer;
  try {
    const shader = (type, source) => {
      const result = gl.createShader(type);
      if (!result) throw new Error("Shader allocation failed");
      shaders.push(result);
      gl.shaderSource(result, source); gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");
      return result;
    };
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec2 a_local;
      attribute vec3 a_shape;
      attribute vec4 a_color;
      uniform vec2 u_size;
      varying vec2 v_local;
      varying vec3 v_shape;
      varying vec4 v_color;
      void main() {
        gl_Position = vec4(a_position / u_size * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
        v_local = a_local; v_shape = a_shape; v_color = a_color;
      }
    `));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 v_local;
      varying vec3 v_shape;
      varying vec4 v_color;
      void main() {
        float d = length(vec2(max(abs(v_local.x) - v_shape.x, 0.0), v_local.y));
        float core = 1.0 - smoothstep(max(0.0, v_shape.y - 0.65), v_shape.y + 0.65, d);
        float halo = max(0.0, 1.0 - d / max(v_shape.z, 0.001));
        float alpha = v_color.a * max(core, halo * halo * 0.55);
        gl_FragColor = vec4(v_color.rgb * alpha, alpha);
      }
    `));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Shader link failed");
    gl.useProgram(program);
    for (const item of shaders) gl.deleteShader(item);
    shaders.length = 0;
    buffer = gl.createBuffer();
    if (!buffer) throw new Error("Buffer allocation failed");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // A capsule per dust mote, edge and vertex, six vertices each. Reuse storage every frame.
    const data = new Float32Array((90 + 32 + 16) * 6 * 11);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    for (const [name, count, offset] of [["a_position", 2, 0], ["a_local", 2, 2], ["a_shape", 3, 4], ["a_color", 4, 7]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, count, gl.FLOAT, false, 44, offset * 4);
    }
    const size = gl.getUniformLocation(program, "u_size");
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    let offset = 0;
    const corners = [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]];
    function capsule(x, y, dx, dy, radius, glow, a, b, alpha) {
      const length = Math.hypot(dx, dy), half = length / 2;
      const ux = length ? dx / length : 1, uy = length ? dy / length : 0;
      const pad = Math.max(radius + 1, glow), cx = x + dx / 2, cy = y + dy / 2;
      for (const [sx, sy] of corners) {
        const lx = sx * (half + pad), ly = sy * pad, c = sx < 0 ? a : b;
        data[offset++] = cx + ux * lx - uy * ly; data[offset++] = cy + uy * lx + ux * ly;
        data[offset++] = lx; data[offset++] = ly;
        data[offset++] = half; data[offset++] = radius; data[offset++] = glow;
        data[offset++] = c[0] / 255; data[offset++] = c[1] / 255; data[offset++] = c[2] / 255; data[offset++] = alpha;
      }
    }
    return {
      type: "webgl",
      resize(width, height) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(size, width, height);
      },
      draw(points, edges, dust, dustColor) {
        offset = 0;
        for (const d of dust) capsule(d.sx, d.sy, 0, 0, d.r, 0, dustColor, dustColor, 0.08 + d.z * 0.22);
        for (const edge of edges) {
          const p = points[edge.a], q = points[edge.b], n = near(edge.depth);
          capsule(p.x, p.y, q.x - p.x, q.y - p.y, (1 + n * 1.6) / 2, 8 + n * 10, color(p), color(q), (0.25 + n * 0.65) * 0.9);
        }
        for (const p of points) {
          const r = 2.4 + p.k * 2.2, c = p.w > 0 ? WARM_VERTEX : COOL_VERTEX;
          capsule(p.x, p.y, 0, 0, r, r * 5, c, c, 1);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
        gl.drawArrays(gl.TRIANGLES, 0, offset / 11);
      },
    };
  } catch {
    for (const item of shaders) gl.deleteShader(item);
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    return null;
  }
}

export function createCPU(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Rasterize vertex halos once; no per-frame shadowBlur or radial-gradient construction.
  const sprites = ["255,170,100", "120,225,240"].map((rgb) => {
    const sprite = document.createElement("canvas"); sprite.width = sprite.height = 128;
    const c = sprite.getContext("2d"), halo = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    halo.addColorStop(0, `rgba(${rgb},.55)`); halo.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = halo; c.fillRect(0, 0, 128, 128);
    c.fillStyle = `rgb(${rgb})`; c.beginPath(); c.arc(64, 64, 12.8, 0, Math.PI * 2); c.fill();
    return sprite;
  });
  let width = 0, height = 0;
  return {
    type: "canvas",
    resize(w, h, dpr) {
      width = w; height = h; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = "round";
    },
    draw(points, edges, dust, dustColor) {
      ctx.clearRect(0, 0, width, height);
      // Group dust into six opacity bands, reducing 90 fills to six.
      for (let band = 0; band < 6; band++) {
        ctx.fillStyle = `rgba(${dustColor},${0.08 + (band + 0.5) / 6 * 0.22})`; ctx.beginPath();
        for (const d of dust) if (Math.min(5, Math.floor(d.z * 6)) === band) {
          ctx.moveTo(d.sx + d.r, d.sy); ctx.arc(d.sx, d.sy, d.r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      for (const edge of edges) {
        const p = points[edge.a], q = points[edge.b], n = near(edge.depth), alpha = 0.25 + n * 0.65;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgb(${color(p)})`;
        ctx.globalAlpha = alpha * 0.04; ctx.lineWidth = 13 + n * 5; ctx.stroke();
        ctx.globalAlpha = alpha * 0.09; ctx.lineWidth = 5 + n * 3; ctx.stroke();
        const gradient = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
        gradient.addColorStop(0, `rgb(${color(p)})`); gradient.addColorStop(1, `rgb(${color(q)})`);
        ctx.globalAlpha = alpha * 0.9; ctx.strokeStyle = gradient; ctx.lineWidth = 1 + n * 1.6; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const p of points) {
        const radius = (2.4 + p.k * 2.2) * 5;
        ctx.drawImage(sprites[p.w > 0 ? 0 : 1], p.x - radius, p.y - radius, radius * 2, radius * 2);
      }
    },
  };
}

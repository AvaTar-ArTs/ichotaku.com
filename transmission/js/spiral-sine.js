/* Spiral-Sine — a fluid-inspired interactive field on a torus.
 *
 * Honest description: this is a lightweight, periodic (toroidal) velocity
 * field advected with a semi-Lagrangian scheme, pushed by a spiral-sine
 * forcing function, projected towards incompressibility with a Jacobi
 * pressure solve, and rendered as a displaced torus. It is an interactive
 * field, NOT a research-grade fluid solver.
 *
 * The domain wraps in both axes, so the field has no edges — the torus is the
 * connected creative world. The sine is the broadcast. The vortices are the
 * worlds. Viscosity gives the TrashCat motion grammar: TUNE-IN -> DECAY -> CUT.
 */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class SpiralSine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.gridSize = options.gridSize ?? 64;
    this.amplitude = options.amplitude ?? 0.42;
    this.timeScale = REDUCED ? 0.18 : 1;
    this.pointer = { x: 0.5, y: 0.5, active: false, vx: 0, vy: 0 };
    this.audio = { level: 0, low: 0, mid: 0, high: 0 };
    this.running = false;
    this.time = 0;
    this.last = 0;

    this.field = new Field(this.gridSize);
    this.gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false });

    if (this.gl) {
      this.renderer = new TorusRenderer(this.gl, canvas, this.gridSize);
    } else {
      this.renderer = new Field2DRenderer(canvas, this.field);
    }

    this.bind();
    this.resize();
  }

  bind() {
    const c = this.canvas;
    const toField = (event) => {
      const rect = c.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      this.pointer.vx = (x - this.pointer.x) * 6;
      this.pointer.vy = (y - this.pointer.y) * 6;
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.active = true;
    };
    c.addEventListener("pointermove", toField);
    c.addEventListener("pointerdown", toField);
    c.addEventListener("pointerleave", () => { this.pointer.active = false; });

    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop();
      else if (this.wanted) this.start();
    });
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, REDUCED ? 1 : 1.75);
    const w = Math.max(320, Math.floor(this.canvas.clientWidth * ratio));
    const h = Math.max(320, Math.floor(this.canvas.clientHeight * ratio));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.renderer?.resize) this.renderer.resize(w, h);
  }

  setAudio(bands) {
    if (!bands) return;
    this.audio.level = bands.level ?? 0;
    this.audio.low = bands.low ?? 0;
    this.audio.mid = bands.mid ?? 0;
    this.audio.high = bands.high ?? 0;
  }

  start() {
    this.wanted = true;
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 1 / 20);
      this.last = now;
      this.time += dt * this.timeScale;
      this.step(dt);
      this.renderer.draw(this.field, this.time, this.amplitude, this.audio);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    this.wanted = false;
  }

  step(dt) {
    const drive = REDUCED ? 0.25 : 1;
    this.field.step({
      dt: dt * this.timeScale,
      time: this.time,
      // the sine: a repeating broadcast band, bent by whatever is playing
      k: 2.2 + this.audio.mid * 3.4,
      omega: 0.55 + this.audio.low * 1.6,
      amplitude: (0.55 + this.audio.level * 1.5) * drive,
      pointer: REDUCED ? null : this.pointer,
      energy: this.audio.level,
    });
  }
}

/* ------------------------------------------------------------------ field */

class Field {
  constructor(n) {
    this.n = n;
    const size = n * n;
    this.u = new Float32Array(size);
    this.v = new Float32Array(size);
    this.u0 = new Float32Array(size);
    this.v0 = new Float32Array(size);
    this.p = new Float32Array(size);
    this.div = new Float32Array(size);
    this.curl = new Float32Array(size);
    this.energy = new Float32Array(size);
    this.spiral = new Float32Array(size);
  }

  index(x, y) {
    const n = this.n;
    return ((y % n) + n) % n * n + (((x % n) + n) % n);
  }

  sample(field, x, y) {
    const n = this.n;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const a = field[this.index(x0, y0)];
    const b = field[this.index(x0 + 1, y0)];
    const c = field[this.index(x0, y0 + 1)];
    const d = field[this.index(x0 + 1, y0 + 1)];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }

  step({ dt, time, k, omega, amplitude, pointer, energy }) {
    const n = this.n;
    this.advect(dt);
    this.forces({ dt, time, k, omega, amplitude, pointer });
    this.diffuse(0.06);
    this.project();
    this.measure();
  }

  advect(dt) {
    const n = this.n, { u, v, u0, v0 } = this;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const px = x - u[i] * dt * n * 0.016;
        const py = y - v[i] * dt * n * 0.016;
        u0[i] = this.sample(u, px, py);
        v0[i] = this.sample(v, px, py);
      }
    }
    u.set(u0); v.set(v0);
  }

  forces({ dt, time, k, omega, amplitude, pointer }) {
    const n = this.n, { u, v, spiral } = this;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const nx = x / n, ny = y / n;
        // spiral-sine forcing: a repeating band that sweeps the domain
        const phase = k * (nx * Math.cos(time * 0.31) + ny * Math.sin(time * 0.27)) + omega * time;
        const s = Math.sin(phase * Math.PI * 2);
        const c = Math.cos(phase * Math.PI * 2);
        u[i] += s * amplitude * dt * 6;
        v[i] += c * amplitude * dt * 6;
        // gentle toroidal drift keeps the field alive when nothing is playing
        u[i] += (ny - 0.5) * 0.012;
        v[i] -= (nx - 0.5) * 0.012;
        spiral[i] = phase;
      }
    }
    if (pointer?.active) {
      const px = pointer.x * n, py = (1 - pointer.y) * n;
      const radius = n * 0.09;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const dx = x - px, dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 > radius * radius) continue;
          const fall = 1 - Math.sqrt(d2) / radius;
          const i = y * n + x;
          u[i] += -dy * fall * 0.55 + pointer.vx * fall * 0.12;
          v[i] += dx * fall * 0.55 + pointer.vy * fall * 0.12;
        }
      }
    }
  }

  diffuse(rate) {
    const n = this.n, { u, v } = this;
    const u0 = this.u0, v0 = this.v0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        u0[i] = (u[i] * 4
          + u[this.index(x + 1, y)] + u[this.index(x - 1, y)]
          + u[this.index(x, y + 1)] + u[this.index(x, y - 1)]) / 8;
        v0[i] = (v[i] * 4
          + v[this.index(x + 1, y)] + v[this.index(x - 1, y)]
          + v[this.index(x, y + 1)] + v[this.index(x, y - 1)]) / 8;
      }
    }
    for (let i = 0; i < u.length; i++) {
      u[i] += (u0[i] - u[i]) * rate;
      v[i] += (v0[i] - v[i]) * rate;
    }
  }

  project() {
    const n = this.n, { u, v, p, div } = this;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        div[i] = -0.5 * (u[this.index(x + 1, y)] - u[this.index(x - 1, y)]
          + v[this.index(x, y + 1)] - v[this.index(x, y - 1)]);
        p[i] = 0;
      }
    }
    for (let it = 0; it < 12; it++) {
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          p[i] = (div[i]
            + p[this.index(x + 1, y)] + p[this.index(x - 1, y)]
            + p[this.index(x, y + 1)] + p[this.index(x, y - 1)]) * 0.25;
        }
      }
    }
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        u[i] -= 0.5 * (p[this.index(x + 1, y)] - p[this.index(x - 1, y)]);
        v[i] -= 0.5 * (p[this.index(x, y + 1)] - p[this.index(x, y - 1)]);
        const speed = Math.hypot(u[i], v[i]);
        if (speed > 1.6) { const s = 1.6 / speed; u[i] *= s; v[i] *= s; }
      }
    }
  }

  measure() {
    const n = this.n, { u, v, curl, energy, spiral } = this;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        curl[i] = 0.5 * (v[this.index(x + 1, y)] - v[this.index(x - 1, y)]
          - u[this.index(x, y + 1)] + u[this.index(x, y - 1)]);
        energy[i] = Math.min(1, Math.hypot(u[i], v[i]) * 0.9);
      }
    }
  }
}

/* -------------------------------------------------------------- webgl torus */

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform sampler2D uField;
uniform float uTime;
uniform float uAmp;
out vec3 vPos;
out vec3 vNormal;
out vec2 vUV;
out float vEnergy;
void main() {
  vec4 f = texture(uField, aUV);
  vec2 vel = (f.rg - 0.5) * 2.0;
  float energy = f.b;
  float spiral = f.a;

  // spiral twist: the band rolls around the torus as the field turns
  float twist = aUV.x * 6.28318 + uTime * 0.35 + spiral * 0.6;
  float ct = cos(twist), st = sin(twist);
  vec3 pos = vec3(aPos.x * ct - aPos.z * st, aPos.y, aPos.x * st + aPos.z * ct);
  vec3 nrm = vec3(aNormal.x * ct - aNormal.z * st, aNormal.y, aNormal.x * st + aNormal.z * ct);

  // displacement along the surface normal, driven by the field
  float wave = sin(spiral * 6.28318 + uTime * 1.4) * 0.5 + 0.5;
  float h = uAmp * (energy * 1.1 + wave * 0.35 - 0.2);
  pos += nrm * h;
  pos *= 1.0 + energy * 0.06;

  vPos = pos;
  vNormal = nrm;
  vUV = aUV;
  vEnergy = energy;
  gl_Position = vec4(pos * 1.35, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNormal;
in vec2 vUV;
in float vEnergy;
uniform float uTime;
uniform vec3 uCobalt;
uniform vec3 uPink;
uniform vec3 uCyan;
uniform vec3 uBone;
out vec4 frag;

void main() {
  vec3 view = normalize(vec3(0.0, 0.0, 2.4) - vPos);
  float fres = pow(1.0 - clamp(dot(normalize(vNormal), view), 0.0, 1.0), 2.4);

  float bands = 0.5 + 0.5 * sin(vUV.x * 42.0 - uTime * 2.2 + vUV.y * 9.0);
  vec3 col = mix(uCobalt, uPink, clamp(vEnergy * 1.4, 0.0, 1.0));
  col = mix(col, uCyan, fres * 0.75);
  col += uBone * bands * (0.035 + vEnergy * 0.12);
  col += uPink * fres * 0.25;

  // broadcast grain
  float grain = fract(sin(dot(vUV * 512.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.035;

  float alpha = clamp(0.72 + fres * 0.5 + vEnergy * 0.25, 0.0, 1.0);
  frag = vec4(col, alpha);
}`;

class TorusRenderer {
  constructor(gl, canvas, gridSize) {
    this.gl = gl;
    this.canvas = canvas;
    this.gridSize = gridSize;
    this.program = this.link(VERT, FRAG);
    this.vao = gl.createVertexArray();
    this.buildTorus();
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    this.pixels = new Uint8Array(gridSize * gridSize * 4);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  link(vsSource, fsSource) {
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
      }
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "program link failed");
    }
    return program;
  }

  buildTorus() {
    const gl = this.gl;
    const U = 220, V = 96, R = 1.0, r = 0.4;
    const positions = [], normals = [], uvs = [], indices = [];
    for (let i = 0; i <= U; i++) {
      const u = i / U, phi = u * Math.PI * 2;
      for (let j = 0; j <= V; j++) {
        const v = j / V, theta = v * Math.PI * 2;
        const cx = R * Math.cos(phi), cz = R * Math.sin(phi);
        const nx = Math.cos(theta) * Math.cos(phi), ny = Math.sin(theta), nz = Math.cos(theta) * Math.sin(phi);
        positions.push(cx + r * nx, r * ny, cz + r * nz);
        normals.push(nx, ny, nz);
        uvs.push(u, v);
      }
    }
    for (let i = 0; i < U; i++) {
      for (let j = 0; j < V; j++) {
        const a = i * (V + 1) + j, b = a + V + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const store = (data, loc, size) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    gl.bindVertexArray(this.vao);
    store(positions, 0, 3);
    store(normals, 1, 3);
    store(uvs, 2, 2);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.indexCount = indices.length;
  }

  draw(field, time, amplitude, audio) {
    const gl = this.gl;
    const n = field.n;
    for (let i = 0; i < n * n; i++) {
      this.pixels[i * 4 + 0] = Math.max(0, Math.min(255, (field.u[i] * 0.5 + 0.5) * 255));
      this.pixels[i * 4 + 1] = Math.max(0, Math.min(255, (field.v[i] * 0.5 + 0.5) * 255));
      this.pixels[i * 4 + 2] = Math.max(0, Math.min(255, field.energy[i] * 255));
      this.pixels[i * 4 + 3] = Math.max(0, Math.min(255, ((field.spiral[i] % 1) + 1) % 1 * 255));
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(gl.getUniformLocation(this.program, "uField"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "uTime"), time);
    gl.uniform1f(gl.getUniformLocation(this.program, "uAmp"), amplitude * (1 + audio.level * 0.5));
    gl.uniform3f(gl.getUniformLocation(this.program, "uCobalt"), 0.10, 0.17, 0.47);
    gl.uniform3f(gl.getUniformLocation(this.program, "uPink"), 1.0, 0.18, 0.53);
    gl.uniform3f(gl.getUniformLocation(this.program, "uCyan"), 0.31, 0.85, 1.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "uBone"), 0.96, 0.93, 0.87);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
}

/* ------------------------------------------------------- 2d fallback field */

class Field2DRenderer {
  constructor(canvas, field) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.field = field;
    this.particles = [];
    for (let i = 0; i < 1100; i++) {
      this.particles.push({
        u: Math.random(), v: Math.random(),
        r: 0.55 + Math.random() * 0.45, e: 0,
      });
    }
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  draw(field, time, amplitude, audio) {
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.62, cy = h * 0.46, scale = Math.min(w, h) * 0.32;
    const spin = time * 0.22;
    for (const p of this.particles) {
      const du = field.sample(field.u, p.u * field.n, p.v * field.n) * 0.0022;
      const dv = field.sample(field.v, p.u * field.n, p.v * field.n) * 0.0022;
      p.u = (p.u + du + 1) % 1;
      p.v = (p.v + dv + 1) % 1;
      p.e = field.sample(field.energy, p.u * field.n, p.v * field.n);

      const phi = p.u * Math.PI * 2 + spin;
      const theta = p.v * Math.PI * 2;
      const R = 1.0, r = 0.4 * p.r;
      const x = (R + r * Math.cos(theta)) * Math.cos(phi);
      const y = r * Math.sin(theta);
      const z = (R + r * Math.cos(theta)) * Math.sin(phi);
      const px = cx + x * scale;
      const py = cy + y * scale * 0.9 - z * scale * 0.28;
      const glow = 0.25 + p.e * 0.75;
      ctx.fillStyle = `rgba(${255 * glow | 0}, ${46 * glow + 120 * (1 - p.e) | 0}, ${136 * (1 - p.e) + 255 * p.e * 0.6 | 0}, ${0.25 + p.e * 0.6})`;
      const size = 1 + p.e * 2.6;
      ctx.fillRect(px, py, size, size);
    }
  }
}

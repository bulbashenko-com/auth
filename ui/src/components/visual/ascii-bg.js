// <ascii-bg dim="0..1" speed="1"> — dim drifting ASCII field + sparse glyph rain, tinted to the phosphor palette.
// Drawn by one fragment shader in plain WebGL2 (no three.js, so pages without the eye stay light). The rain is a
// function of time, not per-column state. Dispatches "visual:fail" on window when WebGL2 is unavailable or lost.
(() => {
if (customElements.get('ascii-bg')) return;
const RAMP = ' .·:-=+*#%';
const RAIN = '01<>/\\|=+*:;$#ABCDEF';
const CW = 10, CH = 16;
// Atlas: one tile per distinct glyph; RAMP and RAIN index into it.
const GLYPHS = [...new Set([...RAMP, ...RAIN])];
const ids = (s) => [...s].map((c) => GLYPHS.indexOf(c));

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uAtlas;
uniform vec2 uTile;
uniform float uDpr;
uniform float uBufH;
uniform vec2 uGrid;
uniform float uT;
uniform float uK;
uniform int uRamp[${RAMP.length}];
uniform int uRain[${RAIN.length}];
out vec4 o;
float h(float a, float b) { return fract(sin(a * 127.1 + b * 311.7) * 43758.5453); }
float glyph(int g, vec2 local) { return texture(uAtlas, (vec2(float(g) * uTile.x, 0.0) + local * uDpr) / vec2(float(${GLYPHS.length}) * uTile.x, uTile.y)).a; }
void over(inout vec4 o, vec3 c, float a) { o = vec4(c * a, a) + o * (1.0 - a); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, uBufH - gl_FragCoord.y) / uDpr;
  vec2 cell = floor(p / vec2(${CW}.0, ${CH}.0)), local = p - cell * vec2(${CW}.0, ${CH}.0);
  float x = cell.x, y = cell.y, t = uT;
  o = vec4(0.0);
  float u = x * 0.11, v = y * 0.19;
  float n = sin(u + v * 0.8 - t * 0.55) * 0.5
          + sin(u * 0.53 - v * 1.3 + t * 0.31 + sin(t * 0.07) * 3.0) * 0.32
          + sin((u + v) * 0.27 + t * 0.9) * 0.18;
  n = (n + 1.0) / 2.0; n = n * n * n;
  if (n >= 0.18) {
    int rl = ${RAMP.length - 1};
    int ri = min(rl, int(floor(n * float(rl) + 0.5)));
    if (ri > 0) over(o, vec3(120.0, 184.0, 100.0) / 255.0, glyph(uRamp[ri], local) * (0.06 + n * 0.32) * uK);
  }
  // Rain: each column runs drops in slots of its own length; a slot holds at most one drop, and some slots none.
  float slot = 6.0 + 3.0 * h(x, 1.0), tt = t + h(x, 2.0) * slot, k = floor(tt / slot), lt = tt - k * slot;
  if (h(x + k * 0.37, 3.0) < 0.34) {
    float speed = (4.0 + 10.0 * h(x, k + 4.0)) * 4.2, len = 5.0 + floor(12.0 * h(x, k + 5.0));
    float head = floor(-h(x, k + 6.0) * uGrid.y * 0.5 + lt * speed);
    float j = head - y;
    if (j >= 0.0 && j < len) {
      uint hs = (uint(x) * 73856093u) ^ (uint(y) * 19349663u);
      int g = uRain[(hs + (j == 0.0 ? uint(t * 8.0) : 0u)) % ${RAIN.length}u];
      float f = 1.0 - j / len;
      if (j == 0.0) over(o, vec3(184.0, 240.0, 164.0) / 255.0, glyph(g, local) * 0.55 * uK);
      else over(o, vec3(163.0, 232.0, 137.0) / 255.0, glyph(g, local) * (0.05 + 0.2 * f * f) * uK);
    }
  }
}`;

class AsciiBg extends HTMLElement {
  connectedCallback() {
    Object.assign(this.style, { display: 'block', position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    if (!this._gl && !this._init()) { window.dispatchEvent(new Event('visual:fail')); return; }
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
    this._io = new IntersectionObserver((es) => { this._vis = es[es.length - 1].isIntersecting; }); this._io.observe(this);
    this._last = performance.now(); this._t = this._t || 0;
    const loop = (now) => { this._raf = requestAnimationFrame(loop); this._draw(now); };
    this._raf = requestAnimationFrame(loop);
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._ro && this._ro.disconnect(); this._io && this._io.disconnect();
    if (this._gl) {
      this._c.removeEventListener('webglcontextlost', this._onLost);
      const lose = this._gl.getExtension('WEBGL_lose_context');
      lose && lose.loseContext();
      this._c.remove(); this._c = this._gl = null;
    }
  }
  _init() {
    const c = document.createElement('canvas');
    Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
    const gl = c.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const U = {};
    for (const n of ['uAtlas', 'uTile', 'uDpr', 'uBufH', 'uGrid', 'uT', 'uK', 'uRamp', 'uRain']) U[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(U.uAtlas, 0);
    gl.uniform1iv(U.uRamp, ids(RAMP));
    gl.uniform1iv(U.uRain, ids(RAIN));
    this._onLost = (e) => { e.preventDefault(); cancelAnimationFrame(this._raf); window.dispatchEvent(new Event('visual:fail')); };
    c.addEventListener('webglcontextlost', this._onLost);
    this.appendChild(c);
    this._c = c; this._gl = gl; this._U = U; this._dpr = 0;
    document.fonts && document.fonts.load('12px "IBM Plex Mono"').then(() => { this._dpr = 0; this._resize(); });
    return true;
  }
  _atlas(dpr) {
    const tw = Math.ceil(CW * dpr), th = Math.ceil(CH * dpr);
    const a = document.createElement('canvas');
    a.width = GLYPHS.length * tw; a.height = th;
    const ctx = a.getContext('2d');
    ctx.font = `${12 * dpr}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    GLYPHS.forEach((ch, i) => ctx.fillText(ch, i * tw, 0));
    const gl = this._gl;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a);
    gl.uniform2f(this._U.uTile, tw, th);
    this._dpr = dpr;
  }
  _resize() {
    if (!this._gl) return;
    const W = this.clientWidth, H = this.clientHeight; if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), gl = this._gl;
    this._W = W; this._H = H;
    this._c.width = Math.round(W * dpr); this._c.height = Math.round(H * dpr);
    gl.viewport(0, 0, this._c.width, this._c.height);
    if (dpr !== this._dpr) this._atlas(dpr);
    gl.uniform1f(this._U.uDpr, this._c.height / H);
    gl.uniform1f(this._U.uBufH, this._c.height);
    gl.uniform2f(this._U.uGrid, Math.ceil(W / CW), Math.ceil(H / CH));
    this._lastPaint = 0;
  }
  _draw(now) {
    if (this._vis === false) { this._last = now; return; }
    if (!this._W) { this._resize(); if (!this._W) return; }
    const dt = Math.min(0.1, (now - this._last) / 1000); this._last = now;
    const sp = parseFloat(this.getAttribute('speed') || '1');
    this._t += dt * sp;
    if (now - (this._lastPaint || 0) < 66) return; // ~15fps: quiet, cheap
    this._lastPaint = now;
    const dim = Math.max(0, Math.min(1, parseFloat(this.getAttribute('dim') ?? '0.5')));
    const gl = this._gl;
    gl.uniform1f(this._U.uT, this._t);
    gl.uniform1f(this._U.uK, 1 - dim);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
customElements.define('ascii-bg', AsciiBg);
})();

// Side-effect module: registers the custom element.
export {}

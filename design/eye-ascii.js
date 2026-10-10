// <eye-ascii mode="idle|closed|scan|ok|error" readout="elementId" framing="eye|full" ramp="classic|punk|block">
// 3D eye drone (three.js) rendered offscreen and resampled into an ASCII glyph grid.
(() => {
if (customElements.get('eye-ascii')) return;
const THREE_URL = 'https://unpkg.com/three@0.184.0/build/three.module.js';
let threeP;
const loadThree = () => threeP || (threeP = import(THREE_URL));
const RAMPS = { classic: ' .:-=+*#%@', punk: " .'`,:;!i|/\\(){}[]xX%&#@", block: ' ░▒▓█' };
const mkPal = (stops) => Array.from({ length: 16 }, (_, k) => {
  const l = k / 15;
  let i = 0; while (i < stops.length - 2 && l > stops[i + 1][0]) i++;
  const [a, ca] = stops[i], [b, cb] = stops[i + 1], f = Math.min(1, Math.max(0, (l - a) / (b - a)));
  return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * f)).join(',')})`;
});
const PAL = mkPal([[0, [34, 58, 31]], [0.35, [91, 140, 76]], [0.7, [163, 232, 137]], [1, [214, 250, 196]]]);
const PAL_ERR = mkPal([[0, [64, 28, 24]], [0.35, [160, 78, 64]], [0.7, [238, 132, 112]], [1, [255, 204, 190]]]);
const CW = 8.4, CH = 10;
let SHARED = null;
function sharedRenderer(THREE) {
  if (SHARED && !SHARED.getContext().isContextLost()) return SHARED;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setClearColor(0x000000, 0); r.setSize(2, 2, false);
  r.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
  SHARED = r; return r;
}
const rnd = (n, s) => { const v = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

function buildEye(THREE) {
  const M = {
    bone:   new THREE.MeshStandardMaterial({ name: 'bone', color: 0xdcd6c2, roughness: 0.72, metalness: 0 }),
    void:   new THREE.MeshStandardMaterial({ name: 'void', color: 0x060606, roughness: 0.9, metalness: 0 }),
    neon:   new THREE.MeshStandardMaterial({ name: 'neon_magenta', color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 0.35, roughness: 0.4 }),
    acid:   new THREE.MeshStandardMaterial({ name: 'acid_green', color: 0x39ff6a, emissive: 0x39ff6a, emissiveIntensity: 0.25, roughness: 0.35 }),
    chrome: new THREE.MeshStandardMaterial({ name: 'chrome', color: 0xc4ced2, roughness: 0.28, metalness: 0.35 }),
    shell:  new THREE.MeshStandardMaterial({ name: 'shell_plastic', color: 0x4a4e54, roughness: 0.55, metalness: 0, side: THREE.DoubleSide }),
    glow:   new THREE.MeshStandardMaterial({ name: 'eye_glow', color: 0xff3355, emissive: 0xff2244, emissiveIntensity: 2.2 }),
  };
  const mesh = (name, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.name = name; return m; };
  const UP = new THREE.Vector3(0, 1, 0);
  const aim = (obj, dir) => obj.quaternion.setFromUnitVectors(UP, dir.clone().normalize());

  const root = new THREE.Group(); root.name = 'eye_drone';
  const hover = new THREE.Group(); root.add(hover);
  const eye = new THREE.Group(); eye.position.y = 0.25; hover.add(eye);
  const ball = new THREE.Group(); eye.add(ball);
  ball.add(mesh('sclera', new THREE.SphereGeometry(0.085, 48, 32), M.bone));
  const iris = mesh('iris', new THREE.SphereGeometry(0.0858, 48, 8, 0, Math.PI * 2, 0, 0.42), M.acid); iris.rotation.x = Math.PI / 2; ball.add(iris);
  const pupil = mesh('pupil', new THREE.SphereGeometry(0.0866, 32, 6, 0, Math.PI * 2, 0, 0.2), M.void); pupil.rotation.x = Math.PI / 2; ball.add(pupil);
  const glint = mesh('glint', new THREE.SphereGeometry(0.004, 12, 8), M.glow); glint.position.set(0.012, 0.012, 0.084); ball.add(glint);
  const mkLid = (name, th0) => {
    const lid = new THREE.Group(); lid.name = name; eye.add(lid);
    lid.add(mesh(name + '_shell', new THREE.SphereGeometry(0.093, 48, 16, 0, Math.PI * 2, th0, Math.PI / 2), M.shell));
    const rim = mesh(name + '_rim', new THREE.TorusGeometry(0.093, 0.004, 12, 64), M.chrome); rim.rotation.x = Math.PI / 2; lid.add(rim);
    return lid;
  };
  const top = mkLid('lid_top', 0), bot = mkLid('lid_bottom', Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = 0.55 - (1.5 * i) / 4;
    const n = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
    const h = 0.03 + 0.025 * Math.sin((i / 4) * Math.PI);
    const sp = mesh('lid_spike_' + i, new THREE.ConeGeometry(0.011, h, 20), M.neon);
    sp.scale.x = 0.5; aim(sp, n); sp.position.copy(n).multiplyScalar(0.093 + h / 2 - 0.004); top.add(sp);
  }
  for (const s of [-1, 1]) { const pin = mesh(s < 0 ? 'hinge_r' : 'hinge_l', new THREE.CylinderGeometry(0.011, 0.011, 0.018, 24), M.chrome); pin.rotation.z = Math.PI / 2; pin.position.x = 0.096 * s; eye.add(pin); }
  const mkRing = (name, r, rot, beadMat) => {
    const tilt = new THREE.Group(); tilt.rotation.set(...rot); eye.add(tilt);
    const spin = new THREE.Group(); spin.name = name; tilt.add(spin);
    spin.add(mesh(name + '_band', new THREE.TorusGeometry(r, 0.0028, 10, 96), M.chrome));
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; const b = mesh(name + '_bead_' + k, new THREE.SphereGeometry(0.0065, 16, 12), beadMat); b.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); spin.add(b); }
    return spin;
  };
  const ringA = mkRing('orbit_a', 0.14, [1.15, 0, 0.3], M.glow), ringB = mkRing('orbit_b', 0.158, [-0.5, 0.8, 0], M.acid);
  const segs = [], L = 0.028;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const base = new THREE.Group(); base.position.set(Math.cos(a) * 0.045, eye.position.y - 0.07, Math.sin(a) * 0.045); base.rotation.y = -a; hover.add(base);
    base.add(mesh('socket_' + i, new THREE.SphereGeometry(0.011, 16, 12), M.chrome));
    const tilt = new THREE.Group(); tilt.rotation.z = 0.35; base.add(tilt);
    let parent = tilt;
    for (let k = 0; k < 7; k++) {
      const seg = new THREE.Group(); seg.position.y = k === 0 ? 0 : -L; parent.add(seg);
      const r = 0.008 - k * 0.0007;
      const c = mesh(`tentacle_${i}_seg_${k}`, new THREE.CylinderGeometry(r, r - 0.0007, L * 0.9, 16), k % 2 ? M.shell : M.chrome); c.position.y = -L / 2; seg.add(c);
      segs.push({ seg, i, k }); parent = seg;
    }
    const tp = mesh('tentacle_tip_' + i, new THREE.SphereGeometry(0.0055, 12, 8), M.glow); tp.position.y = -L; parent.add(tp);
  }
  return { root, hover, eye, ball, top, bot, ringA, ringB, segs, M };
}

class EyeAscii extends HTMLElement {
  static get observedAttributes() { return ['mode', 'readout', 'framing', 'ramp', 'color', 'glitch']; }
  get _glitchOn() { const g = this.getAttribute('glitch'); return g === 'on' || g === 'true' || g === ''; }
  _burst(dur) {
    this._gUntil = this._t + dur;
    const rows = this._rows || 40, cols = this._cols || 80;
    this._bands = Array.from({ length: 2 + (Math.random() * 4 | 0) }, () => {
      const y0 = Math.random() * rows | 0;
      return { y0, y1: y0 + 1 + (Math.random() * 6 | 0), off: ((Math.random() - 0.5) * cols * 0.25) | 0 };
    });
  }
  constructor() {
    super();
    this._mode = 'idle'; this._yaw = 0; this._pitch = 0; this._lid = 0; this._t = 0; this._rotY = 0;
    this._errT = -10; this._frame = this._frame.bind(this);
  }
  set mode(v) { this.setAttribute('mode', v); } get mode() { return this._mode; }
  set readout(v) { this.setAttribute('readout', v); }
  set framing(v) { this.setAttribute('framing', v); }
  set ramp(v) { this.setAttribute('ramp', v); }
  attributeChangedCallback(name, _o, v) {
    if (name === 'mode') {
      const m = v || 'idle';
      if (m === 'error' && this._mode !== 'error') this._errT = this._t;
      if (m !== this._mode && this._glitchOn) this._burst(m === 'error' ? 0.45 : 0.2);
      this._mode = m;
    } else if (name === 'glitch') { if (this._glitchOn) this._burst(0.3); }
    else if (name === 'framing') { this._shiftY = 0; this._centerAt = this._t + 0.3; this._frameCam(); }
    else if (name === 'color') this._resize();
  }
  connectedCallback() {
    Object.assign(this.style, { display: 'block', position: 'relative', width: this.style.width || '100%', height: this.style.height || '100%', cursor: 'grab', touchAction: 'none' });
    if (!this._out) {
      this._out = document.createElement('canvas');
      Object.assign(this._out.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(this._out);
      this._ctx = this._out.getContext('2d');
      this._samp = document.createElement('canvas');
      this._sctx = this._samp.getContext('2d', { willReadFrequently: true });
    }
    this._onMove = (e) => {
      this._ptr = { x: e.clientX, y: e.clientY, time: performance.now() };
      if (this._drag) { this._rotY = this._drag.r + (e.clientX - this._drag.x) * 0.01; }
    };
    this._onDown = (e) => { this._drag = { x: e.clientX, r: this._rotY }; this.style.cursor = 'grabbing'; };
    this._onUp = () => { this._drag = null; this.style.cursor = 'grab'; };
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    this.addEventListener('pointerdown', this._onDown);
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
    this._io = new IntersectionObserver((es) => { this._vis = es[es.length - 1].isIntersecting; }); this._io.observe(this);
    this._start();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._raf); this._raf = 0;
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this.removeEventListener('pointerdown', this._onDown);
    this._ro && this._ro.disconnect(); this._io && this._io.disconnect();
  }
  async _start() {
    if (!this._r) {
      const THREE = await loadThree();
      if (!this.isConnected || this._r) return;
      this.THREE = THREE;
      this._r = sharedRenderer(THREE);
      this._mc = document.createElement('canvas');
      Object.assign(this._mc.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'none' });
      this.appendChild(this._mc);
      this._mctx = this._mc.getContext('2d');
      const scene = new THREE.Scene(); this._scene = scene;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.3));
      const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(2.5, 3, 4); scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(-3, 1, 2); scene.add(fill);
      const rimA = new THREE.DirectionalLight(0xff2bd6, 1.6); rimA.position.set(-4, 2, -3); scene.add(rimA);
      const rimB = new THREE.DirectionalLight(0x00e5ff, 1.1); rimB.position.set(5, 1, -2); scene.add(rimB);
      this._cam = new THREE.PerspectiveCamera(28, 1.5, 0.01, 50);
      this._E = buildEye(THREE); scene.add(this._E.root);
      this._frameCam();
      document.fonts && document.fonts.load('14px "IBM Plex Mono"').then(() => this._resize());
    }
    this._resize();
    this._last = performance.now();
    if (!this._raf) this._raf = requestAnimationFrame(this._frame);
  }
  _frameCam() {
    if (!this._cam || !this._E) return;
    const THREE = this.THREE, cam = this._cam, asp = cam.aspect, tan = Math.tan((cam.fov * Math.PI) / 360);
    let c, hh, hw;
    if (this.getAttribute('framing') === 'full') {
      const box = new THREE.Box3().setFromObject(this._E.root, true);
      c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3());
      hh = s.y * 0.54; hw = s.x * 0.54;
    } else { c = new THREE.Vector3(0, 0.245, 0); hh = 0.19; hw = 0.2; }
    const d = Math.max(hh / tan, hw / (tan * asp)) + 0.1;
    this._camD = d;
    const sy = this._shiftY || 0;
    cam.position.set(c.x, c.y + sy, c.z + d); cam.lookAt(c.x, c.y + sy, c.z); cam.updateProjectionMatrix();
  }
  _blit(ctx, w, h) { const [sx, sy, sw, sh] = this._src; ctx.drawImage(this._r.domElement, sx, sy, sw, sh, 0, 0, w, h); }
  _autoCenter() {
    this._centerAt = -1;
    if (this.getAttribute('framing') === 'eye') return;
    const cols = this._cols, rows = this._rows;
    this._sctx.clearRect(0, 0, cols, rows);
    this._blit(this._sctx, cols, rows);
    const d = this._sctx.getImageData(0, 0, cols, rows).data;
    let y0 = -1, y1 = -1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (d[(y * cols + x) * 4 + 3] > 20) { if (y0 < 0) y0 = y; y1 = y; break; }
    if (y0 < 0) return;
    const off = (y0 + y1) / 2 - (rows - 1) / 2;
    const perRow = (2 * this._camD * Math.tan((this._cam.fov * Math.PI) / 360)) / rows;
    this._shiftY = (this._shiftY || 0) - off * perRow;
    this._frameCam();
  }
  _resize() {
    const W = this.clientWidth, H = this.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._W = W; this._H = H;
    this._out.width = Math.round(W * dpr); this._out.height = Math.round(H * dpr);
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._cols = Math.max(1, Math.floor(W / CW)); this._rows = Math.max(1, Math.floor(H / CH));
    this._x0 = (W - this._cols * CW) / 2; this._y0 = (H - this._rows * CH) / 2;
    this._samp.width = this._cols; this._samp.height = this._rows;
    if (this._r) {
      const mesh = this.getAttribute('color') === 'mesh';
      this._mc.style.display = mesh ? 'block' : 'none';
      this._out.style.display = mesh ? 'none' : 'block';
      const pr = Math.min(dpr, 1.5);
      this._rw = mesh ? Math.round(W * pr) : Math.max(2, Math.round(W / 2.5));
      this._rh = mesh ? Math.round(H * pr) : Math.max(2, Math.round(H / 2.5));
      if (mesh) { this._mc.width = this._rw; this._mc.height = this._rh; }
      this._cam.aspect = W / H; this._frameCam();
    }
  }
  _frame(now) {
    this._raf = requestAnimationFrame(this._frame);
    if (this._vis === false) { this._last = now; return; }
    if (now - (this._last || 0) < 32) return;
    if (!this._W) { this._resize(); if (!this._W) return; }
    const dt = Math.min(0.1, (now - this._last) / 1000); this._last = now;
    const t = (this._t += dt), E = this._E, mode = this._mode;
    let ty, tp;
    const P = this._ptr, active = P && now - P.time < 2500;
    if (mode === 'ok') { ty = 0; tp = 0; }
    else if (mode === 'closed') { ty = this._yaw * 0.9; tp = 0.3; }
    else if (mode === 'scan') { const n = Math.floor(t / 0.22); ty = (rnd(n, 1) - 0.5) * 1.4; tp = (rnd(n, 2) - 0.5) * 0.8; }
    else if (active) {
      const rc = this.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height * 0.48;
      const nx = Math.max(-1, Math.min(1, (P.x - cx) / (innerWidth * 0.45)));
      const ny = Math.max(-1, Math.min(1, (P.y - cy) / (innerHeight * 0.45)));
      ty = nx * 0.75; tp = ny * 0.5;
    } else { const n = Math.floor(t / 1.25); ty = (rnd(n, 1) - 0.5) * 1.3; tp = (rnd(n, 2) - 0.5) * 0.7; }
    const k = Math.min(1, dt * (mode === 'scan' ? 22 : 14));
    this._yaw += (ty - this._yaw) * k; this._pitch += (tp - this._pitch) * k;
    E.ball.rotation.set(this._pitch, this._yaw, 0);
    let c;
    if (mode === 'closed') c = 1;
    else {
      const ph = t % 3.4, n = Math.floor(t / 1.25);
      c = ph < 0.2 ? Math.sin((ph / 0.2) * Math.PI) : (ph > 0.32 && ph < 0.46 && n % 3 === 0 ? Math.sin(((ph - 0.32) / 0.14) * Math.PI) : 0);
      const e = t - this._errT; if (mode === 'error' && e < 0.5) c = Math.max(c, Math.sin((e / 0.5) * Math.PI));
    }
    this._lid += (c - this._lid) * Math.min(1, dt * (mode === 'closed' ? 9 : 40));
    const open = mode === 'ok' ? 1.4 : 1.25;
    E.top.rotation.x = -open * (1 - this._lid) + this._pitch * 0.25;
    E.bot.rotation.x = open * (1 - this._lid) + this._pitch * 0.25;
    E.ringA.rotation.z += dt * (mode === 'scan' ? 4.5 : 1.3);
    E.ringB.rotation.z -= dt * (mode === 'scan' ? 3.4 : 0.9);
    E.segs.forEach(({ seg, i, k: j }) => { seg.rotation.z = Math.sin(t * 2.1 - j * 0.75 + i * 1.3) * 0.16; seg.rotation.x = Math.cos(t * 1.6 - j * 0.6 + i * 2.0) * 0.14; });
    E.hover.position.y = Math.sin(t * 1.6) * 0.012; E.hover.rotation.z = Math.sin(t * 0.7) * 0.05;
    const e = t - this._errT;
    E.hover.position.x = mode === 'error' && e < 0.6 ? Math.sin(t * 55) * 0.014 * (1 - e / 0.6) : 0;
    E.M.glow.emissiveIntensity = mode === 'scan' ? 2.4 + Math.sin(t * 12) * 0.8 : mode === 'ok' ? 2.8 : 1.4 + Math.sin(t * 4) * 0.6;
    if (!this._drag) this._rotY += (0 - this._rotY) * Math.min(1, dt * 2.5);
    E.root.rotation.y = this._rotY;
    if (this._glitchOn && t > (this._gUntil || 0) && Math.random() < dt / 2.8) this._burst(0.08 + Math.random() * 0.18);
    this._glitching = this._glitchOn && t < (this._gUntil || 0);
    const R = this._r, gl = R.domElement;
    if (gl.width < this._rw || gl.height < this._rh) R.setSize(Math.max(gl.width, this._rw), Math.max(gl.height, this._rh), false);
    R.setViewport(0, 0, this._rw, this._rh); R.setScissor(0, 0, this._rw, this._rh); R.setScissorTest(true);
    R.clear(); R.render(this._scene, this._cam);
    this._src = [0, gl.height - this._rh, this._rw, this._rh];
    if (this.getAttribute('color') === 'mesh') { this._mctx.clearRect(0, 0, this._rw, this._rh); this._blit(this._mctx, this._rw, this._rh); }
    if (this._centerAt == null) this._centerAt = t + 0.6;
    if (t > this._centerAt && this._centerAt > 0) this._autoCenter();
    if (this.getAttribute('color') !== 'mesh') this._ascii();
    else this._mc.style.transform = this._glitching ? `translate(${((Math.random() - 0.5) * 24) | 0}px, 0) skewX(${((Math.random() - 0.5) * 6).toFixed(1)}deg)` : '';
    if (now - (this._ro_t || 0) > 100) {
      this._ro_t = now;
      const id = this.getAttribute('readout'), el = id && document.getElementById(id);
      if (el) {
        const f = (v) => v.toFixed(3).replace(/^-0\.000$/, '0.000');
        const y = this._yaw + this._rotY, p = this._pitch;
        el.textContent = `X: ${f(Math.sin(y) * Math.cos(p))}   Y: ${f(-Math.sin(p))}   Z: ${f(Math.cos(y) * Math.cos(p))}`;
      }
    }
  }
  _ascii() {
    const cols = this._cols, rows = this._rows, sctx = this._sctx, ctx = this._ctx;
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    sctx.clearRect(0, 0, cols, rows);
    this._blit(sctx, cols, rows);
    const d = sctx.getImageData(0, 0, cols, rows).data;
    ctx.clearRect(0, 0, this._W, this._H);
    ctx.font = '14px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    const ramp = RAMPS[this.getAttribute('ramp')] || RAMPS.classic, rl = ramp.length - 1;
    const pal = this._mode === 'error' ? PAL_ERR : PAL;
    const chroma = this.getAttribute('color') === 'color';
    let last = '';
    const G = this._glitching, GL = '01<>/\\|=+*:;$#ABCDEF';
    for (let y = 0; y < rows; y++) {
      const py = this._y0 + y * CH + CH / 2;
      let off = 0;
      if (G) for (const b of this._bands) if (y >= b.y0 && y < b.y1) { off = b.off; break; }
      for (let x = 0; x < cols; x++) {
        const sx = ((x - off) % cols + cols) % cols;
        const j = (y * cols + sx) * 4, a = d[j + 3];
        if (!a) continue;
        let l = Math.min(1, Math.pow((0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) / 255, 1.35) * 1.05), ch;
        if (l < 0.035) { if (a > 30) { ch = '.'; l = 0.1; } else continue; }
        else ch = ramp[Math.min(rl, 1 + Math.round(l * (rl - 1)))];
        let st;
        if (chroma) {
          const m = Math.max(d[j], d[j + 1], d[j + 2], 1), q = (90 + 165 * l) / m;
          st = this._mode === 'error' ? `rgb(${(110 + 145 * l) | 0},${(d[j + 1] * q * 0.45) | 0},${(d[j + 2] * q * 0.4) | 0})` : `rgb(${(d[j] * q) | 0},${(d[j + 1] * q) | 0},${(d[j + 2] * q) | 0})`;
        } else st = pal[Math.min(15, (l * 16) | 0)];
        if (st !== last) { ctx.fillStyle = st; last = st; }
        if (G && Math.random() < 0.04) ch = GL[(Math.random() * GL.length) | 0];
        ctx.fillText(ch, this._x0 + x * CW, py);
      }
    }
  }
}
customElements.define('eye-ascii', EyeAscii);
})();

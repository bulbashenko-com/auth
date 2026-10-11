// Ported from design/eye-ascii.js (Claude Design "Bulbashenko SSO"). Changes: three.js is bundled from npm, and the ASCII
// pass runs in shaders on the GPU (the design read the frame back with getImageData and drew every cell with fillText).
// <eye-ascii mode="idle|closed|scan|ok|error" readout="elementId" framing="eye|full" ramp="classic|punk|block" color="mono|color|mesh" glitch="on">
// 3D eye drone (three.js) rendered into a render target, averaged per cell, and drawn as glyphs from an atlas texture.
// Dispatches "visual:fail" on window when WebGL2 is unavailable or the context is lost.
(() => {
if (customElements.get('eye-ascii')) return;
let threeP;
// three.js comes from npm and is bundled: no third-party script on the login page.
const loadThree = () => threeP || (threeP = import('three'));
const RAMPS = { classic: ' .:-=+*#%@', punk: " .'`,:;!i|/\\(){}[]xX%&#@", block: ' ░▒▓█' };
const GLITCH = '01<>/\\|=+*:;$#ABCDEF';
// Every glyph in the atlas; a cell's glyph id is its index here + 1, and 0 means an empty cell.
const GLYPHS = [...new Set(['.', ...Object.values(RAMPS).join(''), ...GLITCH])].filter((c) => c !== ' ');
const gid = (c) => GLYPHS.indexOf(c) + 1;
const mkPal = (stops) => new Float32Array(Array.from({ length: 16 }, (_, k) => {
  const l = k / 15;
  let i = 0; while (i < stops.length - 2 && l > stops[i + 1][0]) i++;
  const [a, ca] = stops[i], [b, cb] = stops[i + 1], f = Math.min(1, Math.max(0, (l - a) / (b - a)));
  return ca.map((v, j) => Math.round(v + (cb[j] - v) * f) / 255);
}).flat());
const PAL = mkPal([[0, [34, 58, 31]], [0.35, [91, 140, 76]], [0.7, [163, 232, 137]], [1, [214, 250, 196]]]);
const PAL_ERR = mkPal([[0, [64, 28, 24]], [0.35, [160, 78, 64]], [0.7, [238, 132, 112]], [1, [255, 204, 190]]]);
const CW = 8.4, CH = 10;
// Glyphs are 14px tall in 10px rows, so each one spills into the rows above and below: atlas tiles are three rows high.
const TILE_ROWS = 3;
// Atlas tiles also carry this many device pixels on each side for the anti-aliased glyph edges.
const PAD = 2;
const rnd = (n, s) => { const v = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

const VERT = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }';
const SRGB = 'vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }';

// Pass 1, one fragment per cell: average the scene under the cell, pick its glyph and colour.
// Output: rgb = glyph colour (sRGB), a = glyph id / 255.
const CELL_FRAG = `
uniform sampler2D uScene;
uniform vec2 uGrid;
uniform int uRamp[32];
uniform int uRampLen;
uniform int uGlitchGlyphs[32];
uniform int uGlitchLen;
uniform int uDot;
uniform vec3 uPal[16];
uniform bool uChroma;
uniform bool uErr;
uniform bool uGlitch;
uniform vec3 uBands[6];
uniform int uBandCount;
uniform float uSeed;
${SRGB}
float hash(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  return float(v.x) / 4294967295.0;
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  int cols = int(uGrid.x), rows = int(uGrid.y);
  int y = rows - 1 - cell.y;
  int off = 0;
  if (uGlitch) for (int i = 0; i < 6; i++) {
    if (i >= uBandCount) break;
    if (y >= int(uBands[i].x) && y < int(uBands[i].y)) { off = int(uBands[i].z); break; }
  }
  int sx = cell.x - off;
  sx -= cols * int(floor(float(sx) / float(cols)));
  vec2 base = vec2(float(sx), float(cell.y)) / uGrid;
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) sum += texture2D(uScene, base + (vec2(i, j) + 0.5) / (4.0 * uGrid));
  sum /= 16.0;
  float a = sum.a * 255.0;
  if (a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = toSrgb(sum.rgb / sum.a);
  float l = min(1.0, pow(dot(c, vec3(0.299, 0.587, 0.114)), 1.35) * 1.05);
  int g;
  if (l < 0.035) {
    if (a <= 30.0) { gl_FragColor = vec4(0.0); return; }
    g = uDot; l = 0.1;
  } else g = uRamp[min(uRampLen - 1, 1 + int(floor(l * float(uRampLen - 2) + 0.5)))];
  vec3 col;
  if (uChroma) {
    float q = (90.0 + 165.0 * l) / 255.0 / max(max(c.r, c.g), max(c.b, 1.0 / 255.0));
    col = uErr ? vec3((110.0 + 145.0 * l) / 255.0, c.g * q * 0.45, c.b * q * 0.4) : min(c * q, 1.0);
  } else col = uPal[min(15, int(l * 16.0))];
  uint s = uint(uSeed);
  if (uGlitch && hash(uvec3(cell, s)) < 0.04) g = uGlitchGlyphs[min(uGlitchLen - 1, int(hash(uvec3(cell, s + 7919u)) * float(uGlitchLen)))];
  gl_FragColor = vec4(col, float(g) / 255.0);
}`;

// Pass 2, per screen pixel: composite the glyphs of the own row and the rows above and below, top row first, in the
// order fillText drew them. Neighbour columns count within the atlas padding, so anti-aliased edges meet without seams.
const OUT_FRAG = `
uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform vec2 uOrigin;
uniform vec2 uCell;
uniform float uDpr;
uniform float uBufH;
uniform vec2 uTile;
uniform vec2 uAtlasSize;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uBufH - gl_FragCoord.y) / uDpr - uOrigin;
  int col = int(floor(p.x / uCell.x)), rc = int(floor(p.y / uCell.y)), cols = int(uGrid.x), rows = int(uGrid.y);
  vec4 o = vec4(0.0);
  for (int k = -1; k <= 1; k++) {
    int r = rc + k;
    if (r < 0 || r >= rows) continue;
    float ly = (p.y - (float(r) + 0.5) * uCell.y) * uDpr + uTile.y * 0.5;
    for (int m = -1; m <= 1; m++) {
      int c = col + m;
      float lx = (p.x - float(c) * uCell.x) * uDpr + ${PAD}.0;
      if (c < 0 || c >= cols || lx < 0.0 || lx >= uTile.x) continue;
      vec4 cell = texelFetch(uCells, ivec2(c, rows - 1 - r), 0);
      int g = int(cell.a * 255.0 + 0.5);
      if (g == 0) continue;
      float a = texture2D(uAtlas, vec2(float(g - 1) * uTile.x + lx, ly) / uAtlasSize).a;
      o = vec4(cell.rgb * a, a) + o * (1.0 - a);
    }
  }
  gl_FragColor = o;
}`;

// color="mesh": the plain 3D render, no ASCII.
const MESH_FRAG = `
uniform sampler2D uScene;
uniform vec2 uBuf;
${SRGB}
void main() {
  vec4 s = texture2D(uScene, gl_FragCoord.xy / uBuf);
  gl_FragColor = s.a > 0.0 ? vec4(toSrgb(s.rgb / s.a) * s.a, s.a) : vec4(0.0);
}`;

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
    this._errT = -10; this._seed = 0; this._frame = this._frame.bind(this);
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
    this._teardown();
  }
  _fail() {
    cancelAnimationFrame(this._raf); this._raf = 0;
    window.dispatchEvent(new Event('visual:fail'));
  }
  _teardown() {
    if (!this._r) return;
    const R = this._r; this._r = null;
    this._gpu.forEach((o) => o.dispose());
    R.domElement.removeEventListener('webglcontextlost', this._onLost);
    R.dispose(); R.forceContextLoss(); R.domElement.remove();
  }
  async _start() {
    if (!this._r) {
      const THREE = await loadThree();
      if (!this.isConnected || this._r) return;
      this.THREE = THREE;
      let R;
      try { R = new THREE.WebGLRenderer({ alpha: true, powerPreference: 'low-power' }); } catch { this._fail(); return; }
      this._r = R;
      R.setClearColor(0x000000, 0);
      R.autoClear = false;
      Object.assign(R.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this._onLost = (e) => { e.preventDefault(); this._fail(); };
      R.domElement.addEventListener('webglcontextlost', this._onLost);
      this.appendChild(R.domElement);
      if (!this._scene) {
        const scene = new THREE.Scene(); this._scene = scene;
        scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.3));
        const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(2.5, 3, 4); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(-3, 1, 2); scene.add(fill);
        const rimA = new THREE.DirectionalLight(0xff2bd6, 1.6); rimA.position.set(-4, 2, -3); scene.add(rimA);
        const rimB = new THREE.DirectionalLight(0x00e5ff, 1.1); rimB.position.set(5, 1, -2); scene.add(rimB);
        this._cam = new THREE.PerspectiveCamera(28, 1.5, 0.01, 50);
        this._E = buildEye(THREE); scene.add(this._E.root);
        this._frameCam();
      }
      // Scene in sRGB storage: linear blending and MSAA, no banding in the darks the ramp cares about.
      this._rt = new THREE.WebGLRenderTarget(2, 2, { samples: 4, colorSpace: THREE.SRGBColorSpace });
      this._cells = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false });
      this._atlasCanvas = document.createElement('canvas');
      this._atlas = new THREE.CanvasTexture(this._atlasCanvas);
      Object.assign(this._atlas, { flipY: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      const ints = (a) => { const out = new Int32Array(32); out.set(a); return out; };
      this._cellMat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: CELL_FRAG, blending: THREE.NoBlending, depthTest: false, depthWrite: false,
        uniforms: {
          uScene: { value: this._rt.texture }, uGrid: { value: new THREE.Vector2(1, 1) },
          uRamp: { value: new Int32Array(32) }, uRampLen: { value: 2 },
          uGlitchGlyphs: { value: ints([...GLITCH].map(gid)) }, uGlitchLen: { value: GLITCH.length }, uDot: { value: gid('.') },
          uPal: { value: PAL }, uChroma: { value: false }, uErr: { value: false },
          uGlitch: { value: false }, uBands: { value: new Float32Array(18) }, uBandCount: { value: 0 }, uSeed: { value: 0 },
        },
      });
      this._outMat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: OUT_FRAG, blending: THREE.NoBlending, depthTest: false, depthWrite: false,
        uniforms: {
          uCells: { value: this._cells.texture }, uAtlas: { value: this._atlas }, uGrid: { value: new THREE.Vector2(1, 1) },
          uOrigin: { value: new THREE.Vector2() }, uCell: { value: new THREE.Vector2(CW, CH) }, uDpr: { value: 1 }, uBufH: { value: 1 },
          uTile: { value: new THREE.Vector2(1, 1) }, uAtlasSize: { value: new THREE.Vector2(1, 1) },
        },
      });
      this._meshMat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: MESH_FRAG, blending: THREE.NoBlending, depthTest: false, depthWrite: false,
        uniforms: { uScene: { value: this._rt.texture }, uBuf: { value: new THREE.Vector2(1, 1) } },
      });
      const geo = new THREE.PlaneGeometry(2, 2);
      this._quad = new THREE.Mesh(geo, this._cellMat); this._quad.frustumCulled = false;
      this._quadScene = new THREE.Scene(); this._quadScene.add(this._quad);
      this._quadCam = new THREE.Camera();
      this._gpu = [this._rt, this._cells, this._atlas, this._cellMat, this._outMat, this._meshMat, geo];
      this._atlasDpr = 0;
      document.fonts && document.fonts.load('14px "IBM Plex Mono"').then(() => { this._atlasDpr = 0; this._resize(); });
    }
    this._resize();
    this._last = performance.now();
    if (!this._raf) this._raf = requestAnimationFrame(this._frame);
  }
  _buildAtlas(dpr) {
    const tw = Math.ceil(CW * dpr) + 2 * PAD, th = Math.ceil(TILE_ROWS * CH * dpr);
    const c = this._atlasCanvas;
    c.width = GLYPHS.length * tw; c.height = th;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = `${14 * dpr}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    GLYPHS.forEach((ch, i) => ctx.fillText(ch, i * tw + PAD, th / 2));
    // A resized canvas needs a fresh GPU texture.
    this._atlas.dispose(); this._atlas.needsUpdate = true;
    const u = this._outMat.uniforms;
    u.uTile.value.set(tw, th); u.uAtlasSize.value.set(c.width, c.height);
    this._atlasDpr = dpr;
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
  // Re-centres the drone vertically from the rows that hold glyphs (one small readback, not per frame).
  _autoCenter() {
    this._centerAt = -1;
    if (this.getAttribute('framing') === 'eye') return;
    const cols = this._cols, rows = this._rows, d = new Uint8Array(cols * rows * 4);
    this._r.readRenderTargetPixels(this._cells, 0, 0, cols, rows, d);
    let y0 = -1, y1 = -1;
    for (let y = 0; y < rows; y++) {
      const j = (rows - 1 - y) * cols * 4;
      for (let x = 0; x < cols; x++) if (d[j + x * 4 + 3]) { if (y0 < 0) y0 = y; y1 = y; break; }
    }
    if (y0 < 0) return;
    const off = (y0 + y1) / 2 - (rows - 1) / 2;
    const perRow = (2 * this._camD * Math.tan((this._cam.fov * Math.PI) / 360)) / rows;
    this._shiftY = (this._shiftY || 0) - off * perRow;
    this._frameCam();
  }
  _resize() {
    if (!this._r) return;
    const W = this.clientWidth, H = this.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), R = this._r;
    this._W = W; this._H = H;
    this._cols = Math.max(1, Math.floor(W / CW)); this._rows = Math.max(1, Math.floor(H / CH));
    const mesh = this.getAttribute('color') === 'mesh', pr = Math.min(dpr, 1.5);
    this._rw = mesh ? Math.round(W * pr) : Math.max(2, Math.round(W / 2.5));
    this._rh = mesh ? Math.round(H * pr) : Math.max(2, Math.round(H / 2.5));
    R.setPixelRatio(dpr); R.setSize(W, H, false);
    this._rt.setSize(this._rw, this._rh);
    this._cells.setSize(this._cols, this._rows);
    if (dpr !== this._atlasDpr) this._buildAtlas(dpr);
    const buf = R.getDrawingBufferSize(new this.THREE.Vector2());
    this._cellMat.uniforms.uGrid.value.set(this._cols, this._rows);
    const u = this._outMat.uniforms;
    u.uGrid.value.set(this._cols, this._rows);
    u.uOrigin.value.set((W - this._cols * CW) / 2, (H - this._rows * CH) / 2);
    u.uDpr.value = buf.y / H; u.uBufH.value = buf.y;
    this._meshMat.uniforms.uBuf.value.copy(buf);
    this._cam.aspect = W / H; this._frameCam();
  }
  _pass(mat, target) {
    this._quad.material = mat;
    this._r.setRenderTarget(target);
    this._r.render(this._quadScene, this._quadCam);
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
    const R = this._r, mesh = this.getAttribute('color') === 'mesh';
    R.setRenderTarget(this._rt); R.clear(); R.render(this._scene, this._cam);
    if (this._centerAt == null) this._centerAt = t + 0.6;
    const center = t > this._centerAt && this._centerAt > 0;
    if (!mesh || center) {
      const u = this._cellMat.uniforms, color = this.getAttribute('color');
      const ramp = RAMPS[this.getAttribute('ramp')] || RAMPS.classic;
      u.uRamp.value.fill(0); u.uRamp.value.set([...ramp].map((ch) => (ch === ' ' ? 0 : gid(ch))));
      u.uRampLen.value = ramp.length;
      u.uErr.value = mode === 'error';
      u.uPal.value = mode === 'error' ? PAL_ERR : PAL;
      u.uChroma.value = color === 'color';
      u.uGlitch.value = !!this._glitching;
      const bands = this._glitching ? this._bands.slice(0, 6) : [];
      bands.forEach((b, i) => u.uBands.value.set([b.y0, b.y1, b.off], i * 3));
      u.uBandCount.value = bands.length;
      u.uSeed.value = this._seed = (this._seed + 1) % 16777216;
      this._pass(this._cellMat, this._cells);
    }
    R.setRenderTarget(null); R.clear();
    if (mesh) {
      this._pass(this._meshMat, null);
      R.domElement.style.transform = this._glitching ? `translate(${((Math.random() - 0.5) * 24) | 0}px, 0) skewX(${((Math.random() - 0.5) * 6).toFixed(1)}deg)` : '';
    } else {
      R.domElement.style.transform = '';
      this._pass(this._outMat, null);
    }
    if (center) this._autoCenter();
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
}
customElements.define('eye-ascii', EyeAscii);
})();

// Side-effect module: registers the custom element.
export {}

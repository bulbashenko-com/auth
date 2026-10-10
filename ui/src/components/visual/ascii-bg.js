// Ported from design/ascii-bg.js (Claude Design "Bulbashenko SSO") unchanged.
// <ascii-bg dim="0..1" speed="1"> — dim drifting ASCII field + sparse glyph rain, tinted to the phosphor palette.
(() => {
if (customElements.get('ascii-bg')) return;
const RAMP = ' .\u00b7:-=+*#%';
const RAIN = '01<>/\\|=+*:;$#ABCDEF';
const CW = 10, CH = 16;
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
class AsciiBg extends HTMLElement {
  connectedCallback() {
    Object.assign(this.style, { display: 'block', position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    if (!this._c) {
      this._c = document.createElement('canvas');
      Object.assign(this._c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(this._c);
      this._ctx = this._c.getContext('2d');
    }
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
    this._io = new IntersectionObserver((es) => { this._vis = es[es.length - 1].isIntersecting; }); this._io.observe(this);
    this._last = performance.now(); this._t = 0;
    const loop = (now) => { this._raf = requestAnimationFrame(loop); this._draw(now); };
    this._raf = requestAnimationFrame(loop);
  }
  disconnectedCallback() { cancelAnimationFrame(this._raf); this._ro && this._ro.disconnect(); this._io && this._io.disconnect(); }
  _resize() {
    const W = this.clientWidth, H = this.clientHeight; if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._W = W; this._H = H;
    this._c.width = Math.round(W * dpr); this._c.height = Math.round(H * dpr);
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._cols = Math.ceil(W / CW); this._rows = Math.ceil(H / CH);
    this._drops = Array.from({ length: this._cols }, () => ({ on: Math.random() < 0.18, y: -Math.random() * this._rows, v: 4 + Math.random() * 10, len: 5 + (Math.random() * 12 | 0) }));
  }
  _draw(now) {
    if (this._vis === false) { this._last = now; return; }
    if (!this._W) { this._resize(); if (!this._W) return; }
    const dt = Math.min(0.1, (now - this._last) / 1000); this._last = now;
    const sp = parseFloat(this.getAttribute('speed') || '1');
    const t = (this._t += dt * sp);
    if (now - (this._lastPaint || 0) < 66) return; // ~15fps: quiet, cheap
    this._lastPaint = now;
    const dim = Math.max(0, Math.min(1, parseFloat(this.getAttribute('dim') ?? '0.5')));
    const k = 1 - dim;
    const ctx = this._ctx, cols = this._cols, rows = this._rows;
    ctx.clearRect(0, 0, this._W, this._H);
    ctx.font = '12px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    const rl = RAMP.length - 1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = x * 0.11, v = y * 0.19;
        let n = Math.sin(u + v * 0.8 - t * 0.55) * 0.5
              + Math.sin(u * 0.53 - v * 1.3 + t * 0.31 + Math.sin(t * 0.07) * 3) * 0.32
              + Math.sin((u + v) * 0.27 + t * 0.9) * 0.18;
        n = (n + 1) / 2; n = n * n * n;
        if (n < 0.18) continue;
        const ch = RAMP[Math.min(rl, Math.round(n * rl))];
        if (ch === ' ') continue;
        ctx.fillStyle = `rgba(120,184,100,${(0.06 + n * 0.32) * k})`;
        ctx.fillText(ch, x * CW, y * CH);
      }
    }
    for (let x = 0; x < cols; x++) {
      const d = this._drops[x];
      d.y += d.v * dt * sp * 4.2;
      if (d.y - d.len > rows) { d.y = -Math.random() * rows * 0.5; d.on = Math.random() < 0.18; d.v = 4 + Math.random() * 10; }
      if (!d.on) continue;
      const head = d.y | 0;
      for (let j = 0; j < d.len; j++) {
        const y = head - j; if (y < 0 || y >= rows) continue;
        const f = 1 - j / d.len;
        ctx.fillStyle = j === 0 ? `rgba(184,240,164,${0.55 * k})` : `rgba(163,232,137,${(0.05 + 0.2 * f * f) * k})`;
        ctx.fillText(RAIN[(hash(x, y) + (j === 0 ? (t * 8 | 0) : 0)) % RAIN.length], x * CW, y * CH);
      }
    }
  }
}
customElements.define('ascii-bg', AsciiBg);
})();

// Side-effect module: registers the custom element.
export {}

// TEXTURES — every block, item icon and player skin is painted here in code (16 px blocks, 32 px icons).
// Seeded random only, so all render workers paint identical pixels.
import * as THREE from 'three';
import { measure, drawText } from './pixelfont.js';

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mul = (c, k) => c.map((v) => Math.max(0, Math.min(255, v * k)));
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function paint(w, h, fn, seed = 1) {
  const c = cv(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), R = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = fn(x, y, R), i = (y * w + x) * 4;
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = col[3] === undefined ? 255 : col[3];
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function tex(c, { smooth = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------- blocks (16x16)
const noise = (base, amt, seed) => paint(16, 16, (x, y, R) => mul(base, 1 + (R() - 0.5) * amt), seed);

export const B = {
  planks: (base = '#a2804c', seed = 3) => paint(16, 16, (x, y, R) => {
    const p = y >> 2, off = (p * 7 + 3) % 16;
    let k = 1 + (R() - 0.5) * 0.1 + Math.sin((x + p * 5) * 1.7) * 0.035;
    if (y % 4 === 3) k *= 0.66;
    else if ((x + off) % 16 === 0) k *= 0.72;
    return mul(hex(base), k);
  }, seed),
  stone: (seed = 5) => paint(16, 16, (x, y, R) => mul([125, 125, 128], 1 + (R() - 0.5) * 0.2 - (R() < 0.08 ? 0.18 : 0)), seed),
  stoneBricks: (base = '#7a7a7e', seed = 7) => paint(16, 16, (x, y, R) => {
    const row = y >> 2, off = row % 2 ? 4 : 0;
    let k = 1 + (R() - 0.5) * 0.14;
    if (y % 4 === 3 || (x + off) % 8 === 7) k *= 0.6;
    else if (y % 4 === 0 || (x + off) % 8 === 0) k *= 1.12;
    return mul(hex(base), k);
  }, seed),
  deepslate: (seed = 9) => paint(16, 16, (x, y, R) => {
    let k = 1 + (R() - 0.5) * 0.22;
    if (x % 8 === 7 || y % 8 === 7) k *= 0.55;
    else if (x % 8 === 0 || y % 8 === 0) k *= 1.18;
    return mul([58, 58, 66], k);
  }, seed),
  grassTop: (base = '#5f9f35', seed = 11) => paint(16, 16, (x, y, R) => mul(hex(base), 1 + (R() - 0.5) * 0.28), seed),
  grassSide: (seed = 13) => {
    const R0 = rng(seed + 1), drip = Array.from({ length: 16 }, () => 2 + Math.floor(R0() * 3));
    return paint(16, 16, (x, y, R) => (y < drip[x] ? mul([95, 159, 53], 1 + (R() - 0.5) * 0.25) : mul([134, 96, 67], 1 + (R() - 0.5) * 0.25)), seed);
  },
  dirt: (seed = 15) => noise([134, 96, 67], 0.3, seed),
  pitch: (base, seed) => paint(16, 16, (x, y, R) => mul(hex(base), 1 + (R() - 0.5) * 0.16 + ((x * 7 + y * 3) % 5 === 0 ? 0.05 : 0)), seed),
  line: (seed = 17) => noise([196, 202, 196], 0.05, seed),
  concrete: (base, seed = 19) => noise(hex(base), 0.06, seed),
  wool: (base, seed = 21) => paint(16, 16, (x, y, R) => mul(hex(base), 1 + (R() - 0.5) * 0.12 + (((x + y) % 4 === 0) ? -0.05 : 0)), seed),
  lamp: (seed = 23) => paint(16, 16, (x, y, R) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15, cross = x % 5 === 0 || y % 5 === 0;
    return mul([235, 240, 225], edge ? 0.72 : cross ? 0.9 : 1 + (R() - 0.5) * 0.06);
  }, seed),
  iron: (seed = 25) => paint(16, 16, (x, y, R) => {
    let k = 1 + (R() - 0.5) * 0.06;
    if (x === 0 || y === 0) k = 1.1; if (x === 15 || y === 15) k = 0.72;
    if ((x === 3 || x === 12) && (y === 3 || y === 12)) k = 0.6;
    return mul([196, 198, 204], k);
  }, seed),
  gold: (seed = 27) => paint(16, 16, (x, y, R) => {
    let k = 1 + (R() - 0.5) * 0.1;
    if (x === 0 || y === 0) k = 1.15; if (x === 15 || y === 15) k = 0.7;
    if ((x + y) % 7 === 0) k *= 1.08;
    return mul([236, 196, 70], k);
  }, seed),
  black: (seed = 29) => noise([20, 20, 24], 0.3, seed),
  locker: (body, seed = 31) => paint(16, 32, (x, y, R) => {
    const c = hex(body);
    let k = 1 + (R() - 0.5) * 0.05;
    if (x === 0 || y === 0) k = 1.15; if (x === 15 || y === 31) k = 0.6;
    if (x === 1 || x === 14 || y === 1 || y === 30) k *= 0.85;
    if (y >= 4 && y <= 9 && y % 2 === 0 && x >= 4 && x <= 11) k *= 0.45; // vents
    if (x >= 12 && x <= 13 && y >= 14 && y <= 18) return [80, 84, 92];      // handle
    if (y >= 21 && y <= 23 && x >= 5 && x <= 10) k *= 0.5;                   // lower vent
    return mul(c, k);
  }, seed),
};

// ---------------------------------------------------------------- item icons (32x32)
function finishIcon(c, { outline = 0.42 } = {}) {
  const g = c.getContext('2d'), img = g.getImageData(0, 0, 32, 32), d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32 && d[(y * 32 + x) * 4 + 3] >= 128;
  const keep = new Uint8Array(32 * 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) keep[y * 32 + x] = solid(x, y) ? 1 : 0;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4;
    if (!keep[y * 32 + x]) { d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= 32 || yy >= 32 || !keep[yy * 32 + xx]; });
    if (edge) { d[i] *= outline; d[i + 1] *= outline; d[i + 2] *= outline; }
  }
  g.putImageData(img, 0, 0);
  return c;
}
const poly = (g, pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };

export function iconBall() {
  const c = cv(32, 32), g = c.getContext('2d');
  g.save(); g.beginPath(); g.arc(16, 16, 13.6, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 32, 32);
  const pent = (cx, cy, r, rot) => poly(g, Array.from({ length: 5 }, (_, k) => [cx + r * Math.cos(rot + k * Math.PI * 2 / 5), cy + r * Math.sin(rot + k * Math.PI * 2 / 5)]), '#17204a');
  pent(16, 16.5, 4.6, -Math.PI / 2);
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + Math.PI / 5 + k * Math.PI * 2 / 5; pent(16 + Math.cos(a) * 12.5, 16.5 + Math.sin(a) * 12.5, 4.4, a); }
  const sh = g.createRadialGradient(10, 9, 2, 16, 16, 18);
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.7, 'rgba(0,0,30,0.08)'); sh.addColorStop(1, 'rgba(0,0,40,0.38)');
  g.fillStyle = sh; g.fillRect(0, 0, 32, 32);
  g.restore();
  finishIcon(c);
  g.fillStyle = '#ffffff'; g.fillRect(9, 8, 2, 2); g.fillRect(8, 10, 1, 1);
  return c;
}

export function iconBoots() {
  const c = cv(32, 32), g = c.getContext('2d');
  poly(g, [[5, 25], [5, 9], [12, 9], [13, 15], [22, 16], [28, 19], [30, 23], [30, 25]], '#1b1d24');
  g.fillStyle = '#2a2d38'; g.fillRect(6, 10, 5, 4);
  g.fillStyle = '#ffffff';
  for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) g.fillRect(14 + k * 3 + Math.floor(i * 0.6), 17 + i, 1, 1);
  g.fillStyle = '#e9e9e9'; g.fillRect(5, 25, 26, 3);
  g.fillStyle = '#2c55c8'; g.fillRect(5, 24, 25, 1);
  g.fillStyle = '#9a9aa4'; for (const x of [7, 12, 21, 27]) g.fillRect(x, 28, 2, 2);
  g.fillStyle = '#d8d8d8'; for (let i = 0; i < 3; i++) g.fillRect(15 + i * 2, 15 - (i === 1 ? 0 : 0), 1, 1);
  finishIcon(c);
  return c;
}

export function iconBottle() {
  const c = cv(32, 32), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(12, 2, 8, 5);
  g.fillStyle = '#d9d9e0'; g.fillRect(12, 6, 8, 1);
  g.fillStyle = '#9fd0ff'; g.fillRect(13, 7, 6, 3);
  poly(g, [[10, 10], [22, 10], [23, 12], [23, 29], [21, 30], [11, 30], [9, 29], [9, 12]], '#7cc0ff');
  g.fillStyle = '#2f7fe6'; g.fillRect(9, 19, 15, 11);
  g.fillStyle = '#ffffff'; g.fillRect(9, 14, 15, 5);
  g.fillStyle = '#2c55c8'; for (let x = 9; x < 24; x++) g.fillRect(x, 16 + (x % 4 < 2 ? 0 : 1), 1, 1);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(11, 11, 1, 3); g.fillRect(11, 20, 1, 8);
  finishIcon(c);
  return c;
}

export function iconJersey(crest) {
  const c = cv(32, 32), g = c.getContext('2d');
  poly(g, [[11, 3], [14, 5], [18, 5], [21, 3], [28, 6], [31, 12], [26, 15], [24, 13], [24, 29], [8, 29], [8, 13], [6, 15], [1, 12], [4, 6]], '#1550b8');
  // dark raglan sleeves, white cuffs, white round collar
  poly(g, [[4, 6], [11, 3], [12, 5], [8, 13], [6, 15], [1, 12]], '#18264a');
  poly(g, [[28, 6], [21, 3], [20, 5], [24, 13], [26, 15], [31, 12]], '#18264a');
  poly(g, [[1, 12], [2, 10], [7, 13.5], [6, 15]], '#ffffff');
  poly(g, [[31, 12], [30, 10], [25, 13.5], [26, 15]], '#ffffff');
  g.fillStyle = '#ffffff'; g.fillRect(12, 3, 8, 1); g.fillRect(11, 3, 1, 2); g.fillRect(20, 3, 1, 2); g.fillRect(13, 4, 6, 1);
  finishIcon(c, { outline: 0.5 });
  if (crest) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(crest, 0, 0, crest.width, crest.height, 17, 8, 6.2, 9); }
  g.fillStyle = '#ffffff'; g.fillRect(11, 19, 10, 1); g.fillRect(12, 21, 8, 1); // sponsor hint
  // re-quantise the crest pixels so the icon stays crisp pixel art
  const img = g.getImageData(0, 0, 32, 32);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= 128 ? 255 : 0;
  g.putImageData(img, 0, 0);
  return c;
}

// upscale a 32 px icon with hard pixels, for crisp drawing at any GUI scale
export function upscale(c, k = 5) {
  const o = cv(c.width * k, c.height * k), g = o.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height);
  return o;
}

// ---------------------------------------------------------------- player skins
// faces are painted per block-pixel (R texels each) so a crest or number can sit at finer resolution
const RS = 8;
function face(wPx, hPx, fn) {
  const c = cv(wPx * RS, hPx * RS), g = c.getContext('2d');
  for (let y = 0; y < hPx; y++) for (let x = 0; x < wPx; x++) {
    const col = fn(x, y);
    if (col) { g.fillStyle = Array.isArray(col) ? css(col) : col; g.fillRect(x * RS, y * RS, RS, RS); }
  }
  return c;
}
// slight per-pixel shading so flat colours still read as cloth/skin
const jitter = (h, x, y, amt = 0.07) => mul(hex(h), 1 + ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 100 / 100 - 0.5) * amt);

export function makeSkin(sp) {
  const skin = (x, y) => jitter(sp.skin, x, y, 0.05);
  const hair = (x, y) => jitter(sp.hair, x, y, 0.18);
  // HEAD 8x8
  const headFront = face(8, 8, (x, y) => {
    if (y <= 1) return hair(x, y);
    if (y === 2 && (x === 0 || x === 7)) return hair(x, y);
    if (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) return mul(hex(sp.hair), 0.85);
    if (y === 4) { if (x === 1 || x === 6) return [245, 245, 245]; if (x === 2 || x === 5) return hex(sp.eyes); }
    if (sp.beard) {
      if (y === 5 && (x === 0 || x === 7)) return jitter(sp.beard, x, y, 0.2);
      if (y === 6 && (x <= 1 || x >= 6)) return jitter(sp.beard, x, y, 0.2);
      if (y === 7) return (x === 3 || x === 4) ? mul(hex(sp.beard), 0.8) : jitter(sp.beard, x, y, 0.2);
    }
    if (y === 5 && (x === 3 || x === 4)) return hex(sp.skinShade);
    if (y === 6 && (x === 3 || x === 4)) return hex(sp.mouth || '#8a4f3a');
    return skin(x, y);
  });
  const side = (frontLeft) => face(8, 8, (x, y) => {
    const fx = frontLeft ? x : 7 - x; // 0 = front edge
    if (y <= 2 || fx >= 5) return hair(x, y);
    if (sp.beard && y >= 5 && fx <= 3) return jitter(sp.beard, x, y, 0.2);
    if ((y === 4 || y === 5) && fx === 4) return hex(sp.skinShade);
    return skin(x, y);
  });
  const headBack = face(8, 8, (x, y) => (y <= 6 ? hair(x, y) : skin(x, y)));
  const head = { px: side(true), nx: side(false), py: face(8, 8, hair), ny: face(8, 8, skin), pz: headFront, nz: headBack };

  // BODY 8x12x4: base colour, raglan shoulders, optional side panels
  const shirt = (x, y) => jitter(sp.shirt, x, y, 0.06);
  const raglan = (x, y) => jitter(sp.sleeve, x, y, sp.sleevePattern ? 0.35 : 0.06);
  const bodyFront = face(8, 12, (x, y) => {
    if (y === 0 && x >= 2 && x <= 5) return hex(sp.collar);
    if ((y === 0 && (x <= 1 || x >= 6)) || (y === 1 && (x === 0 || x === 7))) return raglan(x, y);
    if (sp.sidePanel && y >= 2 && (x === 0 || x === 7)) return jitter(sp.sidePanel, x, y, 0.05);
    if (y === 11) return mul(hex(sp.shirt), 0.82);
    return shirt(x, y);
  });
  const fg = bodyFront.getContext('2d');
  if (sp.crest) { // on the left chest (viewer's right)
    fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = 'high';
    const h = 2.6 * RS, w = h * sp.crest.width / sp.crest.height;
    fg.drawImage(sp.crest, 5.6 * RS - w / 2, 1.3 * RS, w, h);
  }
  // sponsor as pixel lettering (not the sponsor's logo artwork)
  for (const ln of sp.sponsor || []) {
    const cube = ln.cube ? 14 : 0, tw = measure(ln.text) * ln.s, total = tw + (cube ? cube + 4 : 0);
    const x0 = Math.round((8 * RS - total) / 2), y0 = Math.round(ln.y * RS);
    if (cube) {
      fg.fillStyle = '#c9ced8'; fg.fillRect(x0, y0, 9, 9);
      fg.fillStyle = '#8b919c'; fg.fillRect(x0 + 5, y0 + 5, 9, 9);
      fg.fillStyle = '#aab0bb'; fg.fillRect(x0 + 5, y0 + 5, 4, 4);
    }
    drawGlyphs(fg, ln.text, x0 + (cube ? cube + 4 : 0), y0, ln.s, ln.color || '#ffffff');
  }
  const bodyBack = face(8, 12, (x, y) => {
    if (y === 0 && x >= 2 && x <= 5) return hex(sp.collar);
    if ((y === 0 && (x <= 1 || x >= 6)) || (y === 1 && (x === 0 || x === 7))) return raglan(x, y);
    if (sp.sidePanel && y >= 2 && (x === 0 || x === 7)) return jitter(sp.sidePanel, x, y, 0.05);
    return shirt(x, y);
  });
  const bg = bodyBack.getContext('2d');
  if (sp.backText) { const tw = measure(sp.backText); drawGlyphs(bg, sp.backText, Math.round((8 * RS - tw) / 2), Math.round(1.1 * RS), 1, sp.numberColor); }
  if (sp.number) {
    const s = 4, wTxt = measure(sp.number) * s;
    const ox = (8 * RS - wTxt) / 2, oy = 2.6 * RS;
    drawGlyphs(bg, sp.number, ox + s * 0.6, oy + s * 0.6, s, sp.numberShadow || 'rgba(0,0,0,0.35)');
    drawGlyphs(bg, sp.number, ox, oy, s, sp.numberColor);
  }
  const bodySide = face(4, 12, (x, y) => (sp.sidePanel && (x === 1 || x === 2) ? jitter(sp.sidePanel, x, y, 0.05) : shirt(x, y)));
  const bodyTop = face(8, 4, (x, y) => (x <= 1 || x >= 6 ? raglan(x, y) : hex(sp.collar)));
  const body = { px: bodySide, nx: bodySide, py: bodyTop, ny: face(8, 4, shirt), pz: bodyFront, nz: bodyBack };

  // ARMS 4x12x4: sleeve (raglan colour), cuff, skin; optional white shoulder dots
  const armFace = face(4, 12, (x, y) => {
    if (sp.shoulderDots && ((y === 0 && x === 2) || (y === 2 && x === 1))) return [235, 238, 245];
    if (y <= 2) return raglan(x, y);
    if (y === 3) return hex(sp.cuff);
    if (y >= 10) return mul(hex(sp.skin), 0.93);
    return skin(x, y);
  });
  const arm = { px: armFace, nx: armFace, pz: armFace, nz: armFace, py: face(4, 4, (x, y) => (sp.shoulderDots && x === 1 && y === 2 ? [235, 238, 245] : raglan(x, y))), ny: face(4, 4, skin) };

  // LEGS 4x12x4
  const legFace = (outer) => face(4, 12, (x, y) => {
    if (y <= 4) return outer && x === 1 ? hex(sp.shortsStripe) : jitter(sp.shorts, x, y, 0.06);
    if (y <= 6) return skin(x, y);
    if (y === 7) return hex(sp.sockBand);
    if (y <= 10) return jitter(sp.socks, x, y, 0.05);
    return x === 0 ? hex(sp.bootAccent) : hex(sp.boots);
  });
  const lf = legFace(false), lo = legFace(true);
  const legR = { px: lf, nx: lo, pz: lf, nz: lf, py: face(4, 4, () => hex(sp.shorts)), ny: face(4, 4, () => hex(sp.boots)) };
  const legL = { px: lo, nx: lf, pz: lf, nz: lf, py: face(4, 4, () => hex(sp.shorts)), ny: face(4, 4, () => hex(sp.boots)) };
  return { head, body, arm, legL, legR };
}

// tiny glyph blitter for jersey numbers (shares the UI font)
function drawGlyphs(g, str, x, y, s, color) { drawText(g, str, x, y, s, color, { shadow: false }); }

// ---------------------------------------------------------------- crests
export function loadImage(src) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
}
export function crop(im, x, y, w, h) {
  const c = cv(w, h); c.getContext('2d').drawImage(im, x, y, w, h, 0, 0, w, h); return c;
}
export { css, mul, mixc };

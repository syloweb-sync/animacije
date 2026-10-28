// WORLD (game style) — a low-poly street at golden hour in front of a stadium, painted in code:
// smooth 128-256 px textures, Lambert lighting, warm fog. Plus the lowrider and the player rig.
import * as THREE from 'three';
import { paint, cv, tex, rng, hex, mul } from './textures.js';

const T = (c, o = {}) => { const t = tex(c, { smooth: true }); if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); } return t; };
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ map: T(c, o), ...(o.mat || {}) });
const col = (hexc, o = {}) => new THREE.MeshLambertMaterial({ color: hexc, ...o });

// -------------------------------------------------------------------------- painted textures
const grain = (w, h, base, amt, seed, extra) => paint(w, h, (x, y, R) => {
  const c = mul(hex(base), 1 + (R() - 0.5) * amt);
  return extra ? extra(x, y, R, c) : c;
}, seed);

function asphalt() { // 256 px = 8 m: worn asphalt, kerb gutters, double yellow centre, white edge lines
  const c = grain(256, 256, '#4a4744', 0.22, 301, (x, y, R, c) => (R() < 0.004 ? mul(c, 0.55) : c));
  const g = c.getContext('2d');
  g.globalAlpha = 0.18; g.fillStyle = '#1c1a18';
  const r = rng(302);
  for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 3 + r() * 8, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 0.5; g.strokeStyle = '#2a2826'; g.lineWidth = 1;
  for (let i = 0; i < 10; i++) { g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = 0.85;
  g.fillStyle = '#d9b23a'; g.fillRect(0, 124, 256, 3); g.fillRect(0, 130, 256, 3);   // double yellow (centre of the road)
  g.fillStyle = '#dcd8cc'; g.fillRect(0, 10, 256, 3); g.fillRect(0, 243, 256, 3);   // edge lines
  g.globalAlpha = 1;
  return c;
}
const concrete = (base = '#b8ad9c', seed = 311, slab = 64) => grain(256, 256, base, 0.14, seed, (x, y, R, c) =>
  (x % slab === 0 || y % slab === 0 ? mul(c, 0.72) : (R() < 0.01 ? mul(c, 0.8) : c)));

function stucco(base, seed) { return grain(128, 128, base, 0.12, seed, (x, y, R, c) => (R() < 0.02 ? mul(c, 0.9) : c)); }

function wallTex() { // stadium boundary wall: concrete panels, grime, tags, a club band
  const c = grain(512, 128, '#c2b49c', 0.12, 321, (x, y, R, cc) => (x % 128 < 2 ? mul(cc, 0.7) : y > 110 ? mul(cc, 0.8 - (y - 110) * 0.01) : cc));
  const g = c.getContext('2d'), r = rng(322);
  g.fillStyle = '#1d4fb0'; g.fillRect(0, 18, 512, 9); g.fillStyle = '#f2f2f2'; g.fillRect(0, 27, 512, 4);
  const tagCols = ['#1b1b1b', '#3a62c9', '#a02626', '#e6e6e6', '#2f7a3a'];
  for (let i = 0; i < 9; i++) { // squiggly tags
    g.strokeStyle = tagCols[i % tagCols.length]; g.lineWidth = 2 + r() * 2; g.globalAlpha = 0.75;
    let x = 30 + r() * 450, y = 60 + r() * 40; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 7; k++) { x += 6 + r() * 10; y += (r() - 0.5) * 22; g.quadraticCurveTo(x - 4, y - 14 * r(), x, y); }
    g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

function muralTex() { // big graffiti piece on the wall: KSV in club colours
  const c = cv(512, 192), g = c.getContext('2d');
  g.clearRect(0, 0, 512, 192);
  g.save(); g.translate(256, 112); g.rotate(-0.06); g.scale(1.25, 1);
  g.font = '900 150px "Liberation Sans"'; g.textAlign = 'center'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#101010'; g.strokeText('KSV', 0, 50);
  g.lineWidth = 14; g.strokeStyle = '#f4f4f4'; g.strokeText('KSV', 0, 50);
  const gr = g.createLinearGradient(0, -60, 0, 60); gr.addColorStop(0, '#5b8cff'); gr.addColorStop(1, '#123a9a');
  g.fillStyle = gr; g.fillText('KSV', 0, 50);
  g.restore();
  g.fillStyle = '#d0162a'; g.font = 'italic 700 34px "Liberation Sans"'; g.textAlign = 'right'; g.fillText('TRENK 4 LIFE', 470, 182);
  return c;
}

function facade(base, seed, { floors = 2, sign = null, signCol = '#c23b22' } = {}) { // low-rise shop / apartment
  const c = stucco(base, seed), g = c.getContext('2d'), r = rng(seed + 1);
  const W = 128, H = 128, fh = H / floors;
  for (let f = 0; f < floors; f++) {
    const y0 = f * fh;
    if (f === floors - 1) { // shop floor
      g.fillStyle = '#1f2a33'; g.fillRect(10, y0 + fh * 0.35, W - 20, fh * 0.6);
      g.fillStyle = 'rgba(200,170,120,0.35)'; g.fillRect(14, y0 + fh * 0.4, W - 28, fh * 0.12);
      if (sign) { g.fillStyle = signCol; g.fillRect(8, y0 + fh * 0.08, W - 16, fh * 0.22); g.fillStyle = '#fff2c8'; g.font = `700 ${Math.round(fh * 0.17)}px "Liberation Sans"`; g.textAlign = 'center'; g.fillText(sign, W / 2, y0 + fh * 0.25); }
    } else {
      for (let i = 0; i < 3; i++) {
        const x = 12 + i * 40; g.fillStyle = '#2b3640'; g.fillRect(x, y0 + fh * 0.25, 26, fh * 0.5);
        g.fillStyle = 'rgba(255,220,160,0.25)'; g.fillRect(x + 2, y0 + fh * 0.27, 10, fh * 0.2);
        if (r() < 0.5) { g.fillStyle = '#8c8c86'; g.fillRect(x + 4, y0 + fh * 0.62, 18, 8); } // AC unit
      }
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, 0, W, 4);
  return c;
}

function frondTex() { // palm frond with alpha
  const c = cv(256, 64), g = c.getContext('2d'), r = rng(331);
  g.clearRect(0, 0, 256, 64);
  for (let i = 0; i < 60; i++) {
    const x = 10 + i * 4, len = 26 * Math.sin(Math.PI * Math.min(1, (x / 256) * 1.15)) + 4;
    g.strokeStyle = `rgb(${50 + r() * 30},${92 + r() * 40},${32 + r() * 20})`; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 10, 32 - len); g.stroke();
    g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 10, 32 + len); g.stroke();
  }
  g.strokeStyle = '#6a5a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 32); g.lineTo(256, 32); g.stroke();
  return c;
}
const trunkTex = () => grain(64, 128, '#7a6248', 0.18, 341, (x, y, R, c) => (y % 10 < 2 ? mul(c, 0.68) : c));

function skyTex() {
  const c = cv(4, 512), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0.0, '#2d4560'); gr.addColorStop(0.32, '#5f7a8e'); gr.addColorStop(0.44, '#c99a6a');
  gr.addColorStop(0.5, '#f0bc7a'); gr.addColorStop(0.53, '#e8b07a'); gr.addColorStop(1, '#8a6a4a');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  return c;
}
function glowTex(inner = 'rgba(255,240,200,1)', mid = 'rgba(255,170,80,0.45)') {
  const c = cv(256, 256), g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(0.12, inner); gr.addColorStop(0.3, mid); gr.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return c;
}
function cloudTex(seed) {
  const c = cv(256, 64), g = c.getContext('2d'), r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = 20 + r() * 216, y = 28 + (r() - 0.5) * 18, rr = 10 + r() * 22;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,214,170,0.55)'); gr.addColorStop(1, 'rgba(255,190,140,0)');
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  return c;
}
function letterTex(ch) {
  const c = cv(128, 160), g = c.getContext('2d');
  g.clearRect(0, 0, 128, 160);
  g.fillStyle = '#ffffff'; g.font = '700 168px "Liberation Sans"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.save(); g.translate(64, 150); g.scale(0.78, 1); g.fillText(ch, 0, 0); g.restore();
  return c;
}

// -------------------------------------------------------------------------- props
function palm(seed, h = 10) {
  const g = new THREE.Group(), R = rng(seed);
  const trunkM = lam(trunkTex(), { repeat: [1, 3] });
  let x = 0, z = 0; const segs = 6, lean = (R() - 0.5) * 0.5, leanZ = (R() - 0.5) * 0.4;
  for (let i = 0; i < segs; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - i * 0.012, 0.24 - i * 0.012, h / segs + 0.05, 7), trunkM);
    const y = (i + 0.5) * h / segs; const k = (i / segs) ** 2;
    seg.position.set(x + lean * k * 2, y, z + leanZ * k * 2); seg.castShadow = true; g.add(seg);
  }
  const top = new THREE.Vector3(lean * 2, h, leanZ * 2);
  const frondM = new THREE.MeshLambertMaterial({ map: T(frondTex()), alphaTest: 0.45, side: THREE.DoubleSide });
  const deadM = new THREE.MeshLambertMaterial({ map: T(frondTex()), alphaTest: 0.45, side: THREE.DoubleSide, color: 0x9a7a40 });
  for (let i = 0; i < 11; i++) {
    const geo = new THREE.PlaneGeometry(4.2, 1.1, 8, 1); geo.translate(2.1, 0, 0);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) { const xx = p.getX(v); p.setZ(v, p.getY(v) * 0.3); p.setY(v, p.getY(v) * 0.6 - 0.09 * xx * xx); }
    geo.computeVertexNormals();
    const dead = i >= 9;
    const f = new THREE.Mesh(geo, dead ? deadM : frondM);
    f.position.copy(top); f.rotation.set(0, i * 2.4 + R(), dead ? -0.9 : 0.25 - R() * 0.25);
    f.castShadow = true; g.add(f);
  }
  return g;
}

function streetLamp() {
  const g = new THREE.Group(), m = col(0x6e6a64);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 7, 6), m); pole.position.y = 3.5; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.8), m); arm.position.set(0, 6.9, 0.85); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.7), m); head.position.set(0, 6.85, 1.7); g.add(head);
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); lens.position.set(0, 6.77, 1.7); g.add(lens);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

function telegraphPole() {
  const g = new THREE.Group(), m = col(0x5a4632);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 10, 6), m); pole.position.y = 5; g.add(pole);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), m); bar.position.y = 9.2; g.add(bar);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

// -------------------------------------------------------------------------- the lowrider
// local frame: +x forward, +y up, -z = driver (left) side. Returns the group, the body (pitches on its
// springs), the four wheels (spin) and the driver door pivot (rotation.y < 0 opens it outwards).
export function makeCar({ paint: base = '#1f6b3c', seed = 401 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paintC = grain(128, 128, base, 0.06, seed, (x, y, R, c) => mul(c, 1.25 - y / 128 * 0.5)); // lighter on top
  const paintM = new THREE.MeshLambertMaterial({ map: T(paintC) });
  const chrome = col(0x8c8b88, { emissive: 0x080706 });
  const glass = col(0x121a20, { emissive: 0x0a0d10 });
  const dark = col(0x141414);
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; body.add(o); return o; };
  // lower body with tapered nose/tail
  const lower = new THREE.BoxGeometry(5.1, 0.52, 1.96, 6, 1, 1), lp = lower.attributes.position;
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i); if (Math.abs(x) > 2.3 && y > 0) lp.setY(i, y - 0.08); }
  lower.computeVertexNormals();
  const lo = new THREE.Mesh(lower, paintM); lo.position.y = 0.6; lo.castShadow = lo.receiveShadow = true; body.add(lo);
  // cabin: glass sides, painted roof
  const cab = new THREE.BoxGeometry(2.3, 0.5, 1.72), cp = cab.attributes.position;
  for (let i = 0; i < cp.count; i++) if (cp.getY(i) > 0) { cp.setX(i, cp.getX(i) * 0.86); cp.setZ(i, cp.getZ(i) * 0.9); }
  cab.computeVertexNormals();
  const cabin = new THREE.Mesh(cab, [glass, glass, paintM, paintM, glass, glass]); cabin.position.set(-0.35, 1.11, 0); cabin.castShadow = true; body.add(cabin);
  box(5.24, 0.12, 2.0, chrome, 0, 0.42, 0);                        // chrome rocker / bumper line
  box(0.14, 0.2, 1.9, chrome, 2.6, 0.5, 0); box(0.14, 0.2, 1.9, chrome, -2.6, 0.5, 0);
  box(5.0, 0.03, 0.02, chrome, 0, 0.78, -0.99); box(5.0, 0.03, 0.02, chrome, 0, 0.78, 0.99); // side trim
  const lightM = new THREE.MeshBasicMaterial({ color: 0xfff1cc }), tailM = new THREE.MeshBasicMaterial({ color: 0xc81e1e });
  for (const z of [-0.7, 0.7]) { box(0.05, 0.14, 0.32, lightM, 2.56, 0.66, z); box(0.05, 0.12, 0.3, tailM, -2.56, 0.66, z); }
  box(0.05, 0.22, 0.9, chrome, 2.58, 0.62, 0);                       // grille
  // wheels: whitewall tyres with wire-spoke chrome hubs
  const capC = cv(128, 128), cg = capC.getContext('2d');
  cg.fillStyle = '#151515'; cg.beginPath(); cg.arc(64, 64, 64, 0, 7); cg.fill();
  cg.fillStyle = '#ecebe6'; cg.beginPath(); cg.arc(64, 64, 52, 0, 7); cg.fill();
  cg.fillStyle = '#9a9890'; cg.beginPath(); cg.arc(64, 64, 42, 0, 7); cg.fill();
  cg.strokeStyle = '#e8e6df'; cg.lineWidth = 1.5;
  for (let i = 0; i < 36; i++) { const a = i * Math.PI * 2 / 36; cg.beginPath(); cg.moveTo(64 + Math.cos(a) * 8, 64 + Math.sin(a) * 8); cg.lineTo(64 + Math.cos(a + 0.5) * 42, 64 + Math.sin(a + 0.5) * 42); cg.stroke(); }
  cg.fillStyle = '#f2f0e8'; cg.beginPath(); cg.arc(64, 64, 9, 0, 7); cg.fill();
  const capM = new THREE.MeshLambertMaterial({ map: T(capC), emissive: 0x1a1612 });
  const wheels = [];
  for (const [x, z] of [[1.6, -0.92], [1.6, 0.92], [-1.62, -0.92], [-1.62, 0.92]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16), [dark, capM, capM]);
    w.rotation.x = Math.PI / 2; const holder = new THREE.Group(); holder.position.set(x, 0.36, z); holder.add(w); w.castShadow = true;
    g.add(holder); wheels.push(w);
  }
  // driver door (front left): hinge at its front edge
  const door = new THREE.Group(); door.position.set(1.02, 0.6, -0.985); body.add(door);
  const dPanel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.06), paintM); dPanel.position.set(-0.6, 0, -0.01); dPanel.castShadow = true; door.add(dPanel);
  const dTrim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.02), chrome); dTrim.position.set(-0.6, 0.18, -0.045); door.add(dTrim);
  const dWin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.44, 0.03), glass); dWin.position.set(-0.62, 0.48, 0.03); door.add(dWin);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.03), chrome); handle.position.set(-1.0, 0.12, -0.05); door.add(handle);
  const interior = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.05), col(0xd8cfc0)); interior.position.set(-0.6, 0.0, 0.03); door.add(interior);
  return { group: g, body, wheels, door };
}

// -------------------------------------------------------------------------- the player
// a low-poly man (~1.85 m): faceted limbs, painted face, KSV shirt with crest, sponsor and number.
function shirtWrap(crest) { // 512 x 256 around the barrel: back at u = 0 / 1, left side 0.25, front 0.5
  const c = cv(512, 256), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2c66d2'); gr.addColorStop(1, '#123e96');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#16264a';                                                         // raglan panels over the shoulders
  for (const u of [128, 384]) { g.beginPath(); g.moveTo(u - 70, 0); g.lineTo(u + 70, 0); g.lineTo(u + 22, 70); g.lineTo(u - 22, 70); g.fill(); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 9;                                      // crew collar, front and back
  g.beginPath(); g.arc(256, -10, 40, 0.2, Math.PI - 0.2); g.stroke();
  for (const x of [0, 512]) { g.beginPath(); g.arc(x, -22, 40, 0.2, Math.PI - 0.2); g.stroke(); }
  if (crest) { const h = 58, w = h * crest.width / crest.height; g.drawImage(crest, 300 - w / 2, 46, w, h); }
  g.fillStyle = '#d6dbe6'; g.fillRect(212, 118, 13, 13); g.fillStyle = '#9aa2b2'; g.fillRect(219, 125, 13, 13); // sponsor
  g.fillStyle = '#ffffff'; g.font = '700 36px "Liberation Sans"'; g.fillText('SF', 238, 142);
  g.font = '700 16px "Liberation Sans"'; g.textAlign = 'center'; g.fillText('INNENAUSBAU', 256, 166);
  for (const x of [0, 512]) {                                                      // back: name + number across the seam
    g.font = '700 22px "Liberation Sans"'; g.fillText('KSV TRENK', x, 58);
    g.font = '700 110px "Liberation Sans"'; g.fillText('10', x, 180);
  }
  g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, 232, 512, 24);
  return c;
}
function faceTex(skin) { // sphere UV: u = 0.25 faces +z (front)
  const c = cv(256, 128), g = c.getContext('2d');
  g.fillStyle = skin; g.fillRect(0, 0, 256, 128);
  const r = rng(451); g.fillStyle = 'rgba(20,12,8,0.18)';
  for (let i = 0; i < 900; i++) { const y = r() * 52; g.fillRect(r() * 256, y, 1, 1); } // shaved scalp stubble
  const fx = 64; // front centre
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(fx - 26, 60, 52, 3);                    // brow shadow
  g.fillStyle = '#1a0f0a'; g.fillRect(fx - 22, 56, 16, 4); g.fillRect(fx + 6, 56, 16, 4); // brows
  g.fillStyle = '#efe6dc'; g.fillRect(fx - 20, 64, 12, 6); g.fillRect(fx + 8, 64, 12, 6); // eyes
  g.fillStyle = '#20140e'; g.fillRect(fx - 16, 64, 6, 6); g.fillRect(fx + 10, 64, 6, 6);
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(fx - 4, 72, 8, 12);                     // nose
  g.fillStyle = '#140b07'; g.fillRect(fx - 14, 88, 28, 4);                              // moustache
  g.fillRect(fx - 14, 92, 3, 8); g.fillRect(fx + 11, 92, 3, 8);
  g.fillStyle = '#4a2a1e'; g.fillRect(fx - 10, 94, 20, 4);                              // mouth
  g.fillStyle = '#140b07'; g.fillRect(fx - 4, 102, 8, 8);                               // chin tuft
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(fx + 40, 66, 8, 18); g.fillRect(fx - 48, 66, 8, 18); // ears' shade
  return c;
}

export function makeDude({ crest } = {}) {
  const skin = '#5b3a29', skinM = col(0x5b3a29), shortsM = col(0x18181a), shoeM = col(0xefefea), sockM = col(0xf4f4f4);
  const sleeveM = col(0x16264a), cuffM = col(0xf2f2f2), gold = col(0xd8b04a, { emissive: 0x3a2a08 });
  const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const mesh = (geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; return o; };
  const limb = (r0, r1, len, m) => { const geo = new THREE.CylinderGeometry(r0, r1, len, 7); geo.translate(0, -len / 2, 0); return mesh(geo, m); };
  // torso: an eight-sided tapered barrel, broad chest; one wrap-around shirt texture (front at u = 0.5)
  const tg = new THREE.CylinderGeometry(0.235, 0.185, 0.56, 8, 2, false, Math.PI);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const y = tp.getY(i), k = (y + 0.28) / 0.56; tp.setZ(i, tp.getZ(i) * (0.56 + 0.12 * Math.sin(k * Math.PI))); }
  tg.translate(0, 0.28, 0); tg.computeVertexNormals();
  const torso = new THREE.Group(); hips.add(torso);
  torso.add(mesh(tg, [new THREE.MeshLambertMaterial({ map: T(shirtWrap(crest)) }), sleeveM, sleeveM]));
  const pelvis = mesh(new THREE.BoxGeometry(0.38, 0.22, 0.25), shortsM); pelvis.position.y = -0.04; hips.add(pelvis);
  // neck, head, chain
  const neck = new THREE.Group(); neck.position.y = 0.56; torso.add(neck);
  const neckM = mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 8), skinM); neckM.position.y = 0.05; neck.add(neckM);
  const chain = mesh(new THREE.TorusGeometry(0.1, 0.012, 4, 14), gold); chain.rotation.x = Math.PI / 2 + 0.35; chain.position.set(0, -0.01, 0.02); neck.add(chain);
  const head = new THREE.Group(); head.position.y = 0.11; neck.add(head);
  const hg = new THREE.SphereGeometry(0.125, 12, 10); hg.scale(0.9, 1.12, 1.0);
  const headM = mesh(hg, new THREE.MeshLambertMaterial({ map: T(faceTex(skin)) })); headM.position.y = 0.12; head.add(headM);
  const jaw = mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), skinM); jaw.position.set(0, 0.04, 0.02); head.add(jaw);
  // arms: shoulder -> upper arm (short sleeve over skin) -> elbow -> forearm -> hand
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.25, 0.48, 0); torso.add(sh);
    const cap = mesh(new THREE.SphereGeometry(0.09, 8, 6), sleeveM); cap.scale.set(1, 0.9, 0.95); sh.add(cap); // deltoid under the sleeve
    sh.add(limb(0.085, 0.075, 0.16, sleeveM));
    const cuff = limb(0.077, 0.077, 0.025, cuffM); cuff.position.y = -0.15; sh.add(cuff);
    const up = limb(0.068, 0.056, 0.3, skinM); sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    el.add(limb(0.056, 0.044, 0.26, skinM));
    const hand = mesh(new THREE.BoxGeometry(0.08, 0.11, 0.1), skinM); hand.position.y = -0.31; el.add(hand);
    return { sh, el };
  };
  const L = arm(1), Rr = arm(-1);
  // legs: hip -> thigh (baggy shorts to the knee) -> knee -> shin -> ankle -> shoe
  const leg = (side) => {
    const hp = new THREE.Group(); hp.position.set(side * 0.1, -0.06, 0); hips.add(hp);
    hp.add(limb(0.11, 0.098, 0.47, shortsM));
    const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
    kn.add(limb(0.062, 0.048, 0.4, skinM));
    const sock = limb(0.05, 0.05, 0.1, sockM); sock.position.y = -0.3; kn.add(sock);
    const an = new THREE.Group(); an.position.y = -0.42; kn.add(an);
    const shoe = mesh(new THREE.BoxGeometry(0.12, 0.09, 0.28), shoeM); shoe.position.set(0, -0.0, 0.06); an.add(shoe);
    return { hp, kn, an };
  };
  const LL = leg(1), RL = leg(-1);
  const rig = { root, hips, torso, neck, head, armL: L, armR: Rr, legL: LL, legR: RL };
  // pose: angles in radians; x = pitch (forward is negative for arms/thighs), knee/elbow bend positive
  rig.pose = (p = {}) => {
    hips.position.y = 0.95 + (p.bob || 0) - (p.drop || 0);
    hips.rotation.set(p.hipPitch || 0, p.hipYaw || 0, p.hipRoll || 0);
    torso.rotation.set(p.lean || 0, p.twist || 0, p.sway || 0);
    head.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
    for (const [s, a] of [['L', L], ['R', Rr]]) { a.sh.rotation.set(p['sh' + s] || 0, 0, (s === 'L' ? 1 : -1) * (p['shOut' + s] ?? 0.12)); a.el.rotation.set(-(p['el' + s] || 0.15), 0, 0); }
    for (const [s, l] of [['L', LL], ['R', RL]]) { l.hp.rotation.set(p['th' + s] || 0, 0, (s === 'L' ? 1 : -1) * (p['thOut' + s] || 0.03)); l.kn.rotation.set(p['kn' + s] || 0, 0, 0); l.an.rotation.set(p['an' + s] || 0, 0, 0); }
  };
  rig.pose();
  return rig;
}

// relaxed walk with some swagger. phase in radians (one step = PI). Returns pose fields.
export function walkPose(ph, amt = 1) {
  const s = Math.sin(ph), c = Math.cos(ph), lift = (x) => Math.max(0, x);
  return {
    thL: -0.42 * s * amt, thR: 0.42 * s * amt,
    knL: (0.15 + 0.75 * lift(Math.sin(ph + 1.2))) * amt, knR: (0.15 + 0.75 * lift(Math.sin(ph + 1.2 + Math.PI))) * amt,
    anL: 0.2 * lift(-s) * amt, anR: 0.2 * lift(s) * amt,
    shL: 0.38 * s * amt, shR: -0.38 * s * amt, elL: 0.35, elR: 0.35, shOutL: 0.18, shOutR: 0.18,
    bob: 0.035 * Math.abs(c) * amt - 0.02 * amt, twist: 0.12 * s * amt, hipYaw: -0.1 * s * amt,
    sway: 0.05 * s * amt, hipRoll: -0.04 * s * amt, lean: 0.05 * amt, headPitch: -0.04, headRoll: -0.04 * s * amt,
  };
}

// -------------------------------------------------------------------------- the street set
export function buildStreet({ crestKsv } = {}) {
  const scene = new THREE.Scene();
  const HORIZON = 0xe8b07a;
  scene.fog = new THREE.Fog(HORIZON, 30, 260);
  scene.background = new THREE.Color(HORIZON);
  const add = (o) => { scene.add(o); return o; };

  // sky dome, sun glow, clouds
  const sky = add(new THREE.Mesh(new THREE.SphereGeometry(480, 32, 16), new THREE.MeshBasicMaterial({ map: T(skyTex()), side: THREE.BackSide, fog: false, depthWrite: false })));
  sky.renderOrder = -10;
  const sunDir = new THREE.Vector3(-1, 0.13, 0.32).normalize();
  const sun = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: T(glowTex()), fog: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  sun.position.copy(sunDir).multiplyScalar(420); sun.scale.setScalar(150);
  const halo = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: T(glowTex('rgba(255,200,140,0.5)', 'rgba(255,150,70,0.15)')), fog: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  halo.position.copy(sun.position); halo.scale.setScalar(520);
  for (let i = 0; i < 6; i++) {
    const R = rng(500 + i), cl = add(new THREE.Mesh(new THREE.PlaneGeometry(160, 26), new THREE.MeshBasicMaterial({ map: T(cloudTex(600 + i)), transparent: true, fog: false, depthWrite: false })));
    const a = Math.PI + (R() - 0.5) * 1.6; cl.position.set(Math.cos(a) * 400, 60 + R() * 70, Math.sin(a) * 400); cl.lookAt(0, 30, 0);
  }

  // lights: low orange sun with long shadows, cool sky fill, warm bounce from camera side
  scene.add(new THREE.HemisphereLight(0xa9bdd2, 0x7a5638, 1.7));
  const sunL = new THREE.DirectionalLight(0xffb36b, 3.0); sunL.position.copy(sunDir).multiplyScalar(60); sunL.target.position.set(2, 0, -3);
  sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0005; sunL.shadow.normalBias = 0.02;
  Object.assign(sunL.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 140 });
  scene.add(sunL, sunL.target);
  const fill = new THREE.DirectionalLight(0xffd8bc, 1.6); fill.position.set(30, 10, -14); scene.add(fill);

  // ground: road (z -4..4), kerbs, sidewalks, verge
  const road = add(new THREE.Mesh(new THREE.PlaneGeometry(240, 8), lam(asphalt(), { repeat: [30, 1] })));
  road.rotation.x = -Math.PI / 2; road.receiveShadow = true;
  const walkM = lam(concrete(), { repeat: [60, 1.3] }), kerbM = lam(concrete('#a59a88', 312, 256), { repeat: [60, 1] });
  for (const [z0, z1] of [[-9.4, -4], [4, 9.4]]) {
    const w = add(new THREE.Mesh(new THREE.BoxGeometry(240, 0.15, z1 - z0), walkM)); w.position.set(0, 0.075, (z0 + z1) / 2); w.receiveShadow = true;
    const k = add(new THREE.Mesh(new THREE.BoxGeometry(240, 0.16, 0.22), kerbM)); k.position.set(0, 0.08, z0 < 0 ? -4.08 : 4.08); k.receiveShadow = true;
  }
  const verge = add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), col(0x8a7a5a))); verge.rotation.x = -Math.PI / 2; verge.position.y = -0.02; verge.receiveShadow = true;

  // north: stadium boundary wall with a KSV mural, stands and floodlights behind it
  const wall = add(new THREE.Mesh(new THREE.BoxGeometry(240, 4.2, 0.4), lam(wallTex(), { repeat: [30, 1] })));
  wall.position.set(0, 2.1, -9.6); wall.castShadow = wall.receiveShadow = true;
  const mural = add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), new THREE.MeshLambertMaterial({ map: T(muralTex()), transparent: true })));
  mural.position.set(-6.5, 2.2, -9.38);
  const standM = lam(concrete('#9d9384', 361, 32), { repeat: [12, 3] });
  const stand = add(new THREE.Mesh(new THREE.BoxGeometry(120, 12, 26), standM)); stand.position.set(-10, 6, -26); stand.rotation.x = 0.18; stand.castShadow = true;
  const roof = add(new THREE.Mesh(new THREE.BoxGeometry(120, 0.6, 14), col(0x5a5650))); roof.position.set(-10, 13.4, -22); roof.rotation.x = -0.12;
  const flood = new THREE.MeshBasicMaterial({ color: 0xfff4da });
  for (const x of [-38, -14, 10]) {
    const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 26, 6), col(0x6a6660))); pole.position.set(x, 13, -16); pole.castShadow = true;
    const head = add(new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 0.5), col(0x55524c))); head.position.set(x, 27, -15.6); head.rotation.x = 0.25;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const l = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.8), flood)); l.position.set(x - 1.8 + i * 1.2, 26 + j * 0.95, -15.3); l.rotation.x = 0.25; }
  }
  // gate further down the wall, with the club crest over it
  const gateM = col(0x3a3a3c);
  const gate = add(new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 0.3), gateM)); gate.position.set(14, 1.7, -9.35);
  const arch = add(new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 0.6), col(0x1d4fb0))); arch.position.set(14, 4.5, -9.5);
  if (crestKsv) {
    const h = 2.2, w = h * crestKsv.width / crestKsv.height;
    const cm = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: T(crestKsv), transparent: true }))); cm.position.set(14, 6.6, -9.3);
  }

  // south: low shops / apartments, telegraph poles and wires
  const facades = [['#d9a07a', 'LIQUOR'], ['#c9c0a2', null], ['#8fb1a6', 'TACOS', '#2a7a3a'], ['#e0c08a', null], ['#b98a7a', 'AUTO PARTS', '#1f4fa0'], ['#cfb79a', 'PIZZA'], ['#a9b6c2', null]];
  let bx = -70;
  for (let i = 0; bx < 60; i++) {
    const [base, sign, signCol] = facades[i % facades.length], w = 9 + (i * 37 % 5), h = 5 + (i * 13 % 4);
    const bm = lam(facade(base, 700 + i, { floors: h > 6.5 ? 3 : 2, sign, signCol }), { repeat: [Math.round(w / 6), 1] });
    const side = col(new THREE.Color(base).multiplyScalar(0.8));
    const b2 = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), [side, side, col(0x6a645c), side, side, bm]));
    b2.position.set(bx + w / 2, h / 2, 13.4); b2.castShadow = b2.receiveShadow = true;
    bx += w + 0.4;
  }
  for (let x = -60; x <= 60; x += 18) { const tp = telegraphPole(); tp.position.set(x, 0, 8.6); add(tp); }
  const wireM = col(0x222222);
  for (const dz of [-0.9, 0, 0.9]) { const w = add(new THREE.Mesh(new THREE.BoxGeometry(130, 0.025, 0.025), wireM)); w.position.set(0, 9.0, 8.6 + dz); }

  // sidewalk dressing: palms and lamps on the north side, a hydrant, a bin
  const palms = [];
  for (const [x, z, s] of [[-26, -6.6, 1], [-14, -7.4, 2], [-3, -7.0, 3], [17, -7.2, 4], [21, -6.8, 5], [-40, -7, 6], [-55, 6.8, 7], [-20, 6.9, 8], [30, 6.6, 9]]) {
    const p = palm(800 + s, 9 + (s % 3) * 1.5); p.position.set(x, 0.15, z); add(p); palms.push(p);
  }
  for (const x of [-20, -8, 26]) { const l = streetLamp(); l.position.set(x, 0.15, -4.6); add(l); }
  const hyd = add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.6, 8), col(0xb8a83a))); hyd.position.set(-9.5, 0.45, -4.6); hyd.castShadow = true;
  const bin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.9, 8), col(0x3a4a3a))); bin.position.set(-1.8, 0.6, -8.8); bin.castShadow = true;

  // a parked car across the street
  const parked = makeCar({ paint: '#7a2626', seed: 411 }); parked.group.position.set(-9, 0, 2.4); parked.group.rotation.y = Math.PI; add(parked.group);

  // far west: hazy hills with a big white TRENK sign (seen behind the street and in the menu art)
  const hillM = col(0x7a6a4a);
  for (const [x, z, r, h] of [[-250, -40, 70, 45], [-235, 30, 80, 46], [-265, 95, 90, 52], [-215, -100, 60, 30]]) {
    const hill = add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 9, 1), hillM)); hill.position.set(x, h / 2 - 4, z);
  }
  const sign = new THREE.Group(); add(sign);
  const letterM = (ch) => new THREE.MeshLambertMaterial({ map: T(letterTex(ch)), alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x9a7448 });
  [...'TRENK'].forEach((ch, i) => {
    const L = new THREE.Mesh(new THREE.PlaneGeometry(6, 7.5), letterM(ch));
    const z = 14.4 - i * 7.6; // seen from the street (looking -x) +z is on the left, so the word runs towards -z
    L.position.set(0, 0, z); L.rotation.y = Math.PI / 2; L.rotation.z = (rng(900 + i)() - 0.5) * 0.08;
    sign.add(L);
    for (const dz of [-1.6, 1.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 0.15), col(0x2a2a2a)); leg.position.set(-0.4, -3.2, z + dz); sign.add(leg); }
  });
  sign.position.set(-180, 16, 29); sign.rotation.z = -0.22; // on the front slope, facing the street (+x)

  return { scene, sun: sunL, sunDir, palms, sign, parked };
}

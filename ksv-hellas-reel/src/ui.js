// UI — everything drawn flat on top of the 3D frame: the inventory, the mission window,
// the final match card, transitions and the vignette. Pure functions of time.
import { drawText, drawBlockText, measure } from './pixelfont.js';

const SC = globalThis.SCORE;
const { W, H, ev, TEXT } = SC;

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
export const prog = (t, t0, dur) => clamp((t - t0) / dur);

// ------------------------------------------------------------------ GUI primitives (in GUI pixels)
export const GS = 5;                       // screen pixels per GUI pixel
export const PANEL = { w: 176, h: 166 };
export const X0 = (W - PANEL.w * GS) / 2;  // 100
export const Y0 = 560;
export const SLOTS = {
  head: [7, 7], chest: [7, 25], legs: [7, 43], feet: [7, 61], off: [76, 61],
  c0: [97, 17], c1: [115, 17], c2: [97, 35], c3: [115, 35], out: [153, 26],
};
for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) SLOTS['inv' + (r * 9 + c + 9 - 9)] = [7 + c * 18, 83 + r * 18];
for (let c = 0; c < 9; c++) SLOTS['hot' + c] = [7 + c * 18, 141];
export const PREVIEW = { x: 25, y: 7, w: 50, h: 72 };

function rectG(ctx, ox, oy, s, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(ox + x * s, oy + y * s, w * s, h * s); }

export function guiPanel(ctx, ox, oy, w, h, s, { fill = '#c6c6c6', light = '#ffffff', dark = '#555555', line = '#000000' } = {}) {
  const R = (x, y, ww, hh, c) => rectG(ctx, ox, oy, s, x, y, ww, hh, c);
  R(2, 0, w - 4, 1, line); R(2, h - 1, w - 4, 1, line); R(0, 2, 1, h - 4, line); R(w - 1, 2, 1, h - 4, line);
  R(1, 1, 1, 1, line); R(w - 2, 1, 1, 1, line); R(1, h - 2, 1, 1, line); R(w - 2, h - 2, 1, 1, line);
  R(2, 1, w - 4, h - 2, fill); R(1, 2, w - 2, h - 4, fill);
  R(2, 1, w - 5, 2, light); R(1, 2, 2, h - 5, light); R(3, 3, 1, 1, light);
  R(3, h - 3, w - 5, 2, dark); R(w - 3, 3, 2, h - 5, dark); R(w - 4, h - 4, 1, 1, dark);
}

export function slot(ctx, ox, oy, s, x, y, w = 18, h = 18, fill = '#8b8b8b') {
  rectG(ctx, ox, oy, s, x, y, w - 1, 1, '#373737');
  rectG(ctx, ox, oy, s, x, y, 1, h - 1, '#373737');
  rectG(ctx, ox, oy, s, x + 1, y + h - 1, w - 1, 1, '#ffffff');
  rectG(ctx, ox, oy, s, x + w - 1, y + 1, 1, h - 1, '#ffffff');
  rectG(ctx, ox, oy, s, x + 1, y + 1, w - 2, h - 2, fill);
}

function drawIcon(ctx, icon, cx, cy, size) {
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(icon, cx - size / 2, cy - size / 2, size, size);
}

const CURSOR = [
  '#..........', '##.........', '#w#........', '#ww#.......', '#www#......', '#wwww#.....', '#wwwww#....', '#wwwwww#...',
  '#wwwwwww#..', '#wwwwwwww#.', '#wwwww#####', '#ww#ww#....', '#w#.#ww#...', '##..#ww#...', '#....#ww#..', '.....#ww#..', '......##...',
];
function cursor(ctx, x, y, s = 4) {
  for (let r = 0; r < CURSOR.length; r++) for (let c = 0; c < CURSOR[r].length; c++) {
    const ch = CURSOR[r][c]; if (ch === '.') continue;
    ctx.fillStyle = ch === '#' ? '#111111' : '#ffffff'; ctx.fillRect(x + c * s, y + r * s, s, s);
  }
}

function tooltip(ctx, text, x, y, s) {
  const tw = measure(text) * s, pad = 4 * s, h = 7 * s + pad * 2, w = tw + pad * 2;
  ctx.fillStyle = 'rgba(16,0,16,0.94)';
  ctx.fillRect(x + s, y, w - 2 * s, h); ctx.fillRect(x, y + s, w, h - 2 * s);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#5000ff'); g.addColorStop(1, '#28007f');
  ctx.fillStyle = g;
  ctx.fillRect(x + s, y + s, w - 2 * s, s); ctx.fillRect(x + s, y + h - 2 * s, w - 2 * s, s);
  ctx.fillRect(x + s, y + s, s, h - 2 * s); ctx.fillRect(x + w - 2 * s, y + s, s, h - 2 * s);
  drawText(ctx, text, x + pad, y + pad, s, '#ffffff');
}

// ------------------------------------------------------------------ SCENE 1: inventory
const slotCenter = (name) => { const [x, y] = SLOTS[name]; return [X0 + (x + 9) * GS, Y0 + (y + 9) * GS]; };
const CUR_PATH = () => {
  const ball = slotCenter('inv13'), hot = slotCenter('hot0');
  return [
    [ev.cursorIn, [W * 0.86, Y0 + 70 * GS]],
    [ev.hover, [ball[0] + 6, ball[1] + 4]],
    [ev.pick, [ball[0] + 6, ball[1] + 4]],
    [ev.place - 0.12, [hot[0] + 6, hot[1] + 4]],
    [ev.invClose, [hot[0] + 6, hot[1] + 4]],
  ];
};
export function cursorAt(t) {
  const P = CUR_PATH();
  if (t <= P[0][0]) return P[0][1];
  for (let i = 0; i < P.length - 1; i++) {
    const [t0, a] = P[i], [t1, b] = P[i + 1];
    if (t <= t1) { const k = ease.inOut(clamp((t - t0) / (t1 - t0))); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
  }
  return P[P.length - 1][1];
}

// returns the screen rect of the player preview (filled with 3D by film.js) or null when closed
export function inventoryOpenAmount(t) {
  if (t < ev.invOpen) return 0;
  if (t < ev.invOpen + 0.18) return ease.back(prog(t, ev.invOpen, 0.18));
  if (t < ev.invClose) return 1;
  return 1 - ease.in(prog(t, ev.invClose, 0.12));
}

export function drawInventory(ctx, t, icons, drawPreview) {
  const a = inventoryOpenAmount(t);
  if (a <= 0.001) return;
  ctx.save();
  // dim + slight scale pop around the panel centre, plus a gentle push-in
  const push = 1 + 0.025 * prog(t, ev.invOpen, SC.S.inv[1] - ev.invOpen);
  const sc = (0.88 + 0.12 * a) * push;
  const cx = W / 2, cy = Y0 + PANEL.h * GS / 2;
  ctx.globalAlpha = clamp(a * 1.4);
  ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);

  guiPanel(ctx, X0, Y0, PANEL.w, PANEL.h, GS);
  for (const k of Object.keys(SLOTS)) { const [x, y] = SLOTS[k]; slot(ctx, X0, Y0, GS, x, y); }
  // preview box and crafting arrow
  slot(ctx, X0, Y0, GS, PREVIEW.x, PREVIEW.y, PREVIEW.w, PREVIEW.h, '#000000');
  const ar = (x, y, w, h) => rectG(ctx, X0, Y0, GS, x, y, w, h, '#8b8b8b');
  ar(136, 32, 10, 3); for (let i = 0; i < 4; i++) ar(146 + i, 29 + i, 1, 9 - i * 2);

  // the 3D player preview is composited by film.js into this rect
  const pr = { x: X0 + (PREVIEW.x + 1) * GS, y: Y0 + (PREVIEW.y + 1) * GS, w: (PREVIEW.w - 2) * GS, h: (PREVIEW.h - 2) * GS };
  if (drawPreview && a > 0.98) drawPreview(pr, ctx.getTransform());

  // items
  const [mx, my] = cursorAt(t);
  const held = t >= ev.pick && t < ev.place;
  const hovering = t >= ev.hover - 0.05 && t < ev.pick;
  for (const it of ev.items) {
    if (t < it.t) continue;
    let where = it.slot;
    if (it.item === 'lopta') { if (held) continue; if (t >= ev.place) where = 'hot0'; }
    const [x, y] = slotCenter(where);
    const k = prog(t, it.item === 'lopta' && t >= ev.place ? ev.place : it.t, 0.16);
    const size = 16 * GS * (1 + 0.5 * (1 - ease.out(k)));
    if (hovering && where === 'inv13') { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 8 * GS, y - 8 * GS, 16 * GS, 16 * GS); }
    drawIcon(ctx, icons[it.item], x, y, size);
    const fl = 1 - prog(t, it.t, 0.22);
    if (fl > 0 && fl < 1) { ctx.fillStyle = `rgba(255,255,255,${0.55 * fl})`; ctx.fillRect(x - 8 * GS, y - 8 * GS, 16 * GS, 16 * GS); }
  }
  // selected hotbar slot after placing
  if (t >= ev.place) {
    const [x, y] = slotCenter('hot0'), f = 1 - prog(t, ev.place, 0.3);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.4 * f})`; ctx.fillRect(x - 8 * GS, y - 8 * GS, 16 * GS, 16 * GS);
    drawIcon(ctx, icons.lopta, x, y, 16 * GS);
  }
  // cursor, held item, tooltip
  if (t >= ev.cursorIn) {
    if (held) drawIcon(ctx, icons.lopta, mx, my, 16 * GS * 1.05);
    if (hovering && t >= ev.hover) tooltip(ctx, TEXT.tooltip, mx + 14 * 4, my - 22 * 4, 4);
    cursor(ctx, mx - 2, my - 2, 4);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ SCENE 2: mission window
function darkPanel(ctx, x, y, w, h, s = 5) {
  guiPanel(ctx, x, y, Math.round(w / s), Math.round(h / s), s, { fill: 'rgba(12,14,24,0.9)', light: '#4d5268', dark: '#151722', line: '#000000' });
}

export function drawMission(ctx, t, icons, crests) {
  if (t < ev.missionOpen || t >= ev.wipe2) return;
  const a = ease.back(prog(t, ev.missionOpen, 0.22));
  const pw = 880, ph = 590, px = (W - pw) / 2, py = 290;
  const typed = (str, t0) => str.slice(0, Math.min(str.length, Math.floor((t - t0) / 0.03) + 1));
  ctx.save();
  ctx.globalAlpha = clamp(prog(t, ev.missionOpen, 0.12));
  ctx.translate(W / 2, py + ph / 2); ctx.scale(0.85 + 0.15 * a, 0.85 + 0.15 * a); ctx.translate(-W / 2, -(py + ph / 2));
  darkPanel(ctx, px, py, pw, ph);

  // title: ball icon + NOVA MISIJA (typed in)
  const title = TEXT.mission[0];
  const ts = 9, tw = measure(title) * ts, iconS = 84, gap = 26;
  const tx = W / 2 - (tw + iconS + gap) / 2;
  if (t >= ev.missionTitle) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(icons.lopta, tx, py + 52, iconS, iconS);
    drawText(ctx, typed(title, ev.missionTitle), tx + iconS + gap, py + 62, ts, '#ffc531');
  }
  // divider
  ctx.fillStyle = '#2c3043';
  for (let x = px + 40; x < px + pw - 40; x += 20) ctx.fillRect(x, py + 165, 10, 5);

  // opponent: crest + PROTIVNIK: FC HELLAS
  if (t >= ev.missionOpp) {
    const k = ease.out(prog(t, ev.missionOpp, 0.2));
    const opp = TEXT.mission[1], cut = opp.indexOf(':') + 1, s = 6;
    const ch = 92, cw = ch * crests.hellas.width / crests.hellas.height;
    const total = cw + 24 + measure(opp) * s, x0 = W / 2 - total / 2, y0 = py + 200;
    ctx.save(); ctx.globalAlpha *= k;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(crests.hellas, x0, y0, cw, ch);
    const str = typed(opp, ev.missionOpp), lx = x0 + cw + 24, ly = y0 + (ch - 7 * s) / 2;
    const w1 = drawText(ctx, str.slice(0, cut), lx, ly, s, '#ffffff');
    if (str.length > cut) drawText(ctx, str.slice(cut), lx + w1 + s, ly, s, '#8fb6ff');
    ctx.restore();
  }

  // objective with a subtle green highlight bar
  if (t >= ev.missionGoal) {
    const k = ease.out(prog(t, ev.missionGoal, 0.2));
    const bx = px + 50, by = py + 320, bw = (pw - 100) * k, bh = 110;
    ctx.fillStyle = 'rgba(70,210,90,0.16)'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(110,255,120,0.55)'; ctx.fillRect(bx, by, bw, 5); ctx.fillRect(bx, by + bh - 5, bw, 5);
    ctx.fillRect(bx, by, 5, bh);
    drawText(ctx, typed(TEXT.mission[2], ev.missionGoal), px + 90, by + 27, 8, '#ffffff');
  }
  // accepted (stamp + flash)
  if (t >= ev.missionAccept) {
    const k = prog(t, ev.missionAccept, 0.18), s = 7 * (1 + 0.35 * (1 - ease.out(k)));
    ctx.save();
    ctx.globalAlpha = clamp(k * 3);
    drawText(ctx, TEXT.mission[3], W / 2, py + 485 - (s - 7) * 3.5, s, '#55ff55', { align: 'center' });
    ctx.restore();
    const f = 1 - prog(t, ev.missionAccept, 0.35);
    if (f > 0) { ctx.fillStyle = `rgba(120,255,120,${0.25 * f})`; ctx.fillRect(px + 10, py + 10, pw - 20, ph - 20); }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ SCENE 0: KSV Trenk title under the crest
export function drawTitle(ctx, t) {
  if (t < ev.title) return;
  const out = SC.S.intro[1] - SC.BEAT * 1.25;
  const fade = 1 - clamp((t - out) / (SC.BEAT * 0.75));
  if (fade <= 0) return;
  const k = prog(t, ev.title, 0.22), s = Math.round(13 * (1 + 0.5 * (1 - ease.back(k))));
  ctx.save();
  ctx.globalAlpha = clamp(k * 4) * fade;
  const y = 1500;
  const g = ctx.createLinearGradient(0, y - 60, 0, y + 260);
  g.addColorStop(0, 'rgba(4,8,24,0)'); g.addColorStop(0.2, 'rgba(4,8,24,0.9)'); g.addColorStop(0.85, 'rgba(4,8,24,0.9)'); g.addColorStop(1, 'rgba(4,8,24,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y - 60, W, 320);
  drawText(ctx, TEXT.title[0], W / 2, y + 7 * (13 - s) / 2, s, '#ffffff', { align: 'center', shadowColor: '#1d5ad0' });
  if (t >= ev.title + SC.BEAT / 2) {
    const k2 = ease.out(prog(t, ev.title + SC.BEAT / 2, 0.25));
    ctx.globalAlpha = k2 * fade;
    ctx.fillStyle = '#d0162a'; ctx.fillRect(W / 2 - 230 * k2, y + 118, 460 * k2, 6);
    drawText(ctx, TEXT.title[1], W / 2, y + 150, 7, '#a9c8ff', { align: 'center' });
  }
  ctx.restore();
}

// ------------------------------------------------------------------ FINAL: match announcement card
export function drawFinal(ctx, t, crests) {
  if (t < ev.fin.ksv) return;
  const F = ev.fin;
  const frame = (img, cx, cy, t0, nearest) => {
    if (t < t0) return;
    const k = prog(t, t0, 0.22), s = 1 + 0.4 * (1 - ease.back(k));
    const fw = 320, fh = 430;
    ctx.save();
    ctx.globalAlpha = clamp(k * 4);
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    darkPanel(ctx, cx - fw / 2, cy - fh / 2, fw, fh);
    const ch = 342, cw = ch * img.width / img.height;
    ctx.imageSmoothingEnabled = !nearest; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, Math.round(cx - cw / 2), Math.round(cy - ch / 2), Math.round(cw), ch);
    const f = 1 - prog(t, t0, 0.25);
    if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.7 * f})`; ctx.fillRect(cx - fw / 2 + 10, cy - fh / 2 + 10, fw - 20, fh - 20); }
    ctx.restore();
  };
  const cy = 790;
  frame(crests.ksv, 265, cy, F.ksv, false);
  frame(crests.hellas, W - 265, cy, F.hellas, false);

  if (t >= F.vs) {
    const k = prog(t, F.vs, 0.2), s = Math.round(12 * (1 + 1.2 * (1 - ease.out(k))));
    ctx.save(); ctx.globalAlpha = clamp(k * 4);
    drawBlockText(ctx, 'VS', W / 2, cy - (9 * s) / 2, s, '#ffc928', '#a35f0c', 1, { light: '#ffe68a' });
    ctx.restore();
  }

  // info panel
  if (t >= F.line1) {
    const k = ease.out(prog(t, F.line1, 0.25));
    const px = 70, pw = W - 140, py = 1090 + 40 * (1 - k), ph = 370;
    ctx.save(); ctx.globalAlpha = k;
    darkPanel(ctx, px, py, pw, ph);
    const fit = (str, s0, maxW) => { let s = s0; while (measure(str) * s > maxW && s > 2) s -= 0.5; return s; };
    const line = (str, t0, y, s0, color) => {
      if (t < t0) return;
      const kk = ease.out(prog(t, t0, 0.2));
      ctx.save(); ctx.globalAlpha = k * kk;
      const s = fit(str, s0, pw - 90);
      drawText(ctx, str, W / 2, y + 16 * (1 - kk), s, color, { align: 'center' });
      ctx.restore();
    };
    line(TEXT.match, F.line1, py + 58, 7, '#ffffff');
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(px + 60, py + 145, pw - 120, 5);
    line(TEXT.date, F.line2, py + 185, 6, '#ffd447');
    line(TEXT.place, F.line3, py + 275, 6, '#bcd3ff');
    ctx.restore();
  }
}

// ------------------------------------------------------------------ transitions & finish
let wipeTile = null;
export function setWipeTile(c) { wipeTile = c; }
// blocks cover the screen in a diagonal sweep until tc, then uncover in the same order
export function blockWipe(ctx, t, tc, half = 0.22) {
  if (t < tc - half || t > tc + half) return;
  const cell = 90, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const h = ((c * 92821 + r * 68917) % 997) / 997;
    const order = (c / cols + r / rows) / 2 * 0.7 + h * 0.3; // 0..1
    const tin = tc - half + order * half * 0.75, tout = tc + order * half * 0.75;
    let k;
    if (t < tc) k = clamp((t - tin) / (half * 0.25));
    else k = 1 - clamp((t - tout) / (half * 0.25));
    if (k <= 0) continue;
    const sz = cell * k, x = c * cell + (cell - sz) / 2, y = r * cell + (cell - sz) / 2;
    if (wipeTile) ctx.drawImage(wipeTile, x, y, sz + 0.5, sz + 0.5); else { ctx.fillStyle = '#111'; ctx.fillRect(x, y, sz, sz); }
  }
}

export function vignette(ctx, strength = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export function fill(ctx, color, a) { if (a <= 0) return; ctx.fillStyle = color; ctx.globalAlpha = clamp(a); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

// HUD & MENUS (game style) — pause menu after the reference screenshot, loading bar, in-game HUD
// (radar, clock, weapon, health, money), zone title, letterbox and the match card. Pure functions of t.
import { F, text, fit } from './font-gta.js';

const SC = globalThis.SCORE;
const { W, H, ev, S, TEXT, MATCH, BEAT } = SC;

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, t0, dur) => clamp((t - t0) / dur);
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
export function fill(ctx, color, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }

const GOLD = '#c79b3c', GOLD_DIM = '#5e4c22', GOLD_HI = '#e2b552';

// ------------------------------------------------------------------ pause menu (reference: SA pause screen)
// art: the 3D render of the hillside sign, cut by a diagonal and fading into black
const ART = { x0: 380, x1: 1080, y0: 0, y1: 560, cutTop: 380, cutBottom: 760 };

function goldTitle(ctx, str, x, y, size) {
  const g = ctx.createLinearGradient(0, y - size * 0.8, 0, y + size * 0.15);
  g.addColorStop(0, '#f2cc6a'); g.addColorStop(0.55, '#c4952e'); g.addColorStop(1, '#8a621a');
  return text(ctx, str, x, y, { font: F.gothic, size, color: g, outline: '#2a1a05', outlineW: 5, shadow: 'rgba(0,0,0,0.85)', shadowOff: [5, 6] });
}

function crossCursor(ctx, x, y, s) { // pale blue four-point star with a long lower spike
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -40, 0, 70); g.addColorStop(0, '#e6eeff'); g.addColorStop(1, '#7f93c6');
  ctx.fillStyle = g; ctx.strokeStyle = '#2c3552'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -38); ctx.lineTo(7, -9); ctx.lineTo(34, 0); ctx.lineTo(7, 9); ctx.lineTo(0, 70); ctx.lineTo(-7, 9); ctx.lineTo(-34, 0); ctx.lineTo(-7, -9);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
  ctx.restore();
}

function mouseArrow(ctx, x, y, s = 1.6) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 24); ctx.lineTo(6, 18); ctx.lineTo(10, 27); ctx.lineTo(14, 25); ctx.lineTo(10, 16.5); ctx.lineTo(18, 16.5); ctx.closePath();
  ctx.fill(); ctx.stroke(); ctx.restore();
}

// art: canvas with the 3D frame; region: [sx, sy, sw, sh] of it to show
export function drawMenu(ctx, t, art, region) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // corner art with the diagonal cut and a soft fade to black
  ctx.save();
  ctx.beginPath(); ctx.moveTo(ART.cutTop, ART.y0); ctx.lineTo(ART.x1, ART.y0); ctx.lineTo(ART.x1, ART.y1); ctx.lineTo(ART.cutBottom, ART.y1); ctx.closePath(); ctx.clip();
  const drift = prog(t, 0, S.menu[1]) * 30; // the art slowly pans
  ctx.drawImage(art, region[0] + drift, region[1], region[2], region[3], ART.cutTop - 40, ART.y0, ART.x1 - ART.cutTop + 40, ART.y1 - ART.y0);
  ctx.fillStyle = 'rgba(30,70,60,0.22)'; ctx.fillRect(0, 0, W, ART.y1);            // the screenshot's green-teal cast
  const fb = ctx.createLinearGradient(0, ART.y1 * 0.45, 0, ART.y1); fb.addColorStop(0, 'rgba(0,0,0,0)'); fb.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fb; ctx.fillRect(0, 0, W, ART.y1);
  const fl = ctx.createLinearGradient(ART.cutTop, 0, ART.cutTop + 220, 0); fl.addColorStop(0, 'rgba(0,0,0,0.9)'); fl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fl; ctx.fillRect(ART.cutTop, 0, 220, ART.y1);
  ctx.restore();

  goldTitle(ctx, TEXT.menuTitle, 70, 250, 128);

  // items: wide caps, dim gold; the highlight jumps MAP -> START NEW GAME, then blinks on select
  const sel = t < ev.menuMove ? 2 : 1;
  const y0 = 820, gap = 128;
  const blink = t >= ev.menuSelect && Math.floor((t - ev.menuSelect) / 0.09) % 2 === 1 && t < ev.menuSelect + 0.6;
  TEXT.menu.forEach((item, i) => {
    const on = i === sel;
    const y = y0 + i * gap;
    const c = on ? (blink ? '#fff0c0' : GOLD_HI) : GOLD_DIM;
    text(ctx, item, W / 2, y, { font: F.wide, size: 50, spacing: 13, color: c, align: 'center', shadow: on ? 'rgba(0,0,0,0.9)' : null, shadowOff: [3, 3] });
    if (on) {
      ctx.save(); ctx.font = `400 50px "${F.wide}"`; ctx.letterSpacing = '13px';
      const half = (ctx.measureText(item).width - 13) / 2; ctx.restore();
      const jump = t >= ev.menuMove ? 1 - ease.out(prog(t, ev.menuMove, 0.15)) : 0;
      crossCursor(ctx, W / 2 - half - 60, y - 18 + jump * gap, 1.25);
    }
  });
  // the mouse arrow drifts from MAP up to START NEW GAME
  const ma = ease.inOut(prog(t, ev.menuMove - 0.35, 0.5));
  mouseArrow(ctx, W / 2 + 60 + 10 * Math.sin(t * 0.9), lerp(y0 + 2 * gap + 30, y0 + gap + 30, ma));
}

export function drawLoading(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const k = ease.inOut(prog(t, ev.loadBar[0], ev.loadBar[1] - ev.loadBar[0]));
  const x = 120, y = 1660, w = W - 240, h = 14;
  ctx.fillStyle = '#2a1e10'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#a3381e'; ctx.fillRect(x, y, w * k, h);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
}

// ------------------------------------------------------------------ in-game HUD
let radarMap = null;
function buildRadarMap() { // top-down street plan (1 px = 0.25 m), centred on the car stop
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#56603e'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#7a6a50'; g.fillRect(0, 256 - 38, 512, 76);                 // sidewalks band
  g.fillStyle = '#3a3a3a'; g.fillRect(0, 256 - 16, 512, 32);                 // the main road
  for (const x of [96, 400]) g.fillRect(x - 14, 0, 28, 512);                 // cross streets
  g.fillStyle = '#6d8054'; g.fillRect(140, 30, 240, 180);                     // stadium block
  g.fillStyle = '#4f7a3e'; g.beginPath(); g.ellipse(260, 120, 80, 52, 0, 0, 7); g.fill(); // pitch
  g.strokeStyle = '#d8d8d8'; g.lineWidth = 2; g.strokeRect(220, 96, 80, 48);
  g.fillStyle = '#8a7360'; for (let x = 10; x < 512; x += 60) g.fillRect(x, 300, 46, 70); // houses south
  return c;
}

const PX_PER_M = 4 * 1.15; // map: 4 px per metre, drawn at 1.15x
function radar(ctx, cx, cy, r, heading, player, target) {
  radarMap ||= buildRadarMap();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  ctx.fillStyle = '#56603e'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.translate(cx, cy); ctx.rotate(-heading);                  // map turns so "up" is where the camera looks
  ctx.translate(-player[0] * PX_PER_M, -player[1] * PX_PER_M);  // ... and follows the player
  ctx.globalAlpha = 0.92; ctx.drawImage(radarMap, -256 * 1.15, -256 * 1.15, 512 * 1.15, 512 * 1.15);
  ctx.restore();
  ctx.save(); ctx.lineWidth = 12; ctx.strokeStyle = '#0c0c0c'; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 7); ctx.stroke(); ctx.restore();
  // north marker riding the ring
  const na = -heading - Math.PI / 2;
  const nx = cx + Math.cos(na) * (r + 4), ny = cy + Math.sin(na) * (r + 4);
  ctx.fillStyle = '#0c0c0c'; ctx.beginPath(); ctx.arc(nx, ny, 22, 0, 7); ctx.fill();
  text(ctx, 'N', nx, ny + 12, { font: F.hud, weight: 700, size: 32, color: '#ffffff', align: 'center' });
  // destination blip (the stadium gate), clamped to the rim
  if (target) {
    const dx = (target[0] - player[0]) * PX_PER_M, dz = (target[1] - player[1]) * PX_PER_M;
    const c = Math.cos(-heading), s = Math.sin(-heading), bx = dx * c - dz * s, by = dx * s + dz * c;
    const d = Math.hypot(bx, by), k = Math.min(1, (r - 18) / Math.max(d, 1));
    ctx.fillStyle = '#e05aa8'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.fillRect(cx + bx * k - 11, cy + by * k - 11, 22, 22); ctx.strokeRect(cx + bx * k - 11, cy + by * k - 11, 22, 22);
  }
  // player arrow
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(14, 16); ctx.lineTo(0, 8); ctx.lineTo(-14, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function fist(ctx, cx, cy, r) { // weapon slot: unarmed
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.stroke();
  ctx.translate(cx, cy); ctx.fillStyle = '#d9b28a'; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 3;
  const rr = (x, y, w, h, q) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, q); ctx.fill(); ctx.stroke(); };
  rr(-30, -10, 54, 40, 10);                                      // back of the hand
  for (let i = 0; i < 4; i++) rr(-30 + i * 13.5, -30, 14, 26, 6); // knuckles
  rr(-40, -4, 18, 30, 8);                                         // thumb
  ctx.restore();
}

export function drawHUD(ctx, t, { heading = 0, player = [0, 0], target = null } = {}) {
  const a = clamp(prog(t, ev.hud[0], 0.4) * (1 - prog(t, ev.hud[1] - 0.3, 0.3)));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  // top right cluster: clock, health, money; weapon to its left
  const rx = W - 70;
  text(ctx, TEXT.clock, rx, 300, { font: F.hud, weight: 700, size: 64, stretch: 0.9, color: '#e8e8e8', align: 'right', outline: '#000', outlineW: 8 });
  const bw = 300, bx = rx - bw, by = 330;
  ctx.fillStyle = '#000'; ctx.fillRect(bx - 5, by - 5, bw + 10, 36);
  ctx.fillStyle = '#4a0c0c'; ctx.fillRect(bx, by, bw, 26);
  ctx.fillStyle = '#b4191c'; ctx.fillRect(bx, by, bw * 0.92, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx, by, bw * 0.92, 7);
  const money = '$' + String(TEXT.money).padStart(8, '0');
  text(ctx, money, rx, 430, { font: F.hud, weight: 700, size: 68, stretch: 0.86, color: '#2f7d32', align: 'right', outline: '#000', outlineW: 9 });
  fist(ctx, bx - 120, 360, 82);
  // radar
  radar(ctx, 200, 1430, 145, heading, player, target);
  ctx.restore();
}

export function drawZone(ctx, t) {
  const [z0, z1] = ev.zone;
  if (t < z0 || t > z1) return;
  const a = clamp(prog(t, z0, 0.4) * (1 - prog(t, z1 - 0.6, 0.6)));
  ctx.save(); ctx.globalAlpha = a;
  text(ctx, TEXT.zone, W - 70, 1600, { font: F.gothic, size: 118, color: '#a9c3ee', align: 'right', outline: '#0b0f1a', outlineW: 10, shadow: 'rgba(0,0,0,0.6)', shadowOff: [4, 5] });
  ctx.restore();
}

// ------------------------------------------------------------------ cutscene bars + match card
export function letterbox(ctx, k, h = 230) {
  if (k <= 0) return;
  const hh = h * ease.out(clamp(k));
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, hh); ctx.fillRect(0, H - hh, W, hh);
}

export function drawCard(ctx, t, crests) {
  const Fn = ev.fin;
  if (t < ev.card) return;
  // darken towards top and bottom so the text reads, keep the player visible in the middle
  const dk = ease.out(prog(t, ev.card, 0.6));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(0,0,0,${0.82 * dk})`); g.addColorStop(0.42, `rgba(0,0,0,${0.35 * dk})`);
  g.addColorStop(0.62, `rgba(0,0,0,${0.35 * dk})`); g.addColorStop(1, `rgba(0,0,0,${0.88 * dk})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  letterbox(ctx, prog(t, ev.bars[0], ev.bars[1] - ev.bars[0]));

  const appear = (t0, dur = 0.35) => ease.out(prog(t, t0, dur));
  // blackletter title, like the menu
  if (t >= Fn.title) {
    const k = appear(Fn.title);
    ctx.save(); ctx.globalAlpha = k;
    goldTitle(ctx, TEXT.cardTitle, W / 2 - fitTitle(ctx) / 2, 395 + 20 * (1 - k), 116);
    ctx.restore();
  }
  // crests with names, VS between
  const crest = (img, name, cx, t0) => {
    if (t < t0) return;
    const k = appear(t0, 0.3), s = 1 + 0.25 * (1 - ease.back(prog(t, t0, 0.3)));
    const ch = 270, cw = ch * img.width / img.height;
    ctx.save(); ctx.globalAlpha = k; ctx.translate(cx, 640); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(255,200,120,0.55)'; ctx.shadowBlur = 30;
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = k;
    const size = fit(ctx, name.toUpperCase(), 400, { font: F.wide, size: 30, spacing: 4 });
    text(ctx, name.toUpperCase(), cx, 830, { font: F.wide, size, spacing: 4, color: '#e9e2cf', align: 'center', shadow: 'rgba(0,0,0,0.9)', shadowOff: [3, 3] });
    ctx.restore();
  };
  crest(crests.home, MATCH.home, 280, Fn.home);
  crest(crests.away, MATCH.away, W - 280, Fn.away);
  if (t >= Fn.vs) {
    const k = appear(Fn.vs, 0.25), s = 1 + 0.6 * (1 - ease.out(prog(t, Fn.vs, 0.25)));
    ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2, 660); ctx.scale(s, s);
    text(ctx, 'VS', 0, 0, { font: F.wide, size: 76, spacing: 6, color: GOLD_HI, align: 'center', outline: '#2a1a05', outlineW: 6, shadow: 'rgba(0,0,0,0.9)', shadowOff: [4, 5] });
    ctx.restore();
  }
  // info lines: wide caps in gold, like menu items
  const line = (str, t0, y, size, color) => {
    if (t < t0) return;
    const k = appear(t0);
    ctx.save(); ctx.globalAlpha = k;
    const s = fit(ctx, str, W - 140, { font: F.wide, size, spacing: 8 });
    text(ctx, str, W / 2, y + 16 * (1 - k), { font: F.wide, size: s, spacing: 8, color, align: 'center', shadow: 'rgba(0,0,0,0.95)', shadowOff: [3, 4] });
    ctx.restore();
  };
  line(`${MATCH.date} · ${MATCH.time}`.toUpperCase(), Fn.line1, 1420, 44, GOLD_HI);
  line(MATCH.place[0].toUpperCase(), Fn.line2, 1510, 36, '#e9e2cf');
  line(MATCH.place[1].toUpperCase(), Fn.line3, 1572, 36, '#e9e2cf');
}

function fitTitle(ctx) {
  ctx.save(); ctx.font = `400 116px "${F.gothic}"`; ctx.letterSpacing = '0px';
  const w = ctx.measureText(TEXT.cardTitle).width; ctx.restore();
  return w;
}

export function vignette(ctx, strength = 0.5) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

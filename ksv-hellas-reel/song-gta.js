// THE SONG — third film: an original west-coast G-funk instrumental (90 BPM, G minor) plus the sound design,
// all synthesised from score-gta.js -> out/music-gta.wav (-14 LUFS).
// The beat plays "from the car radio": muffled while the doors are shut, open while the door is open,
// muffled again after the slam, then full on the match card.
const path = require('path');
const fs = require('fs');
const { SR, Bus, Pink, SVF, rng, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const { m, mtof } = require('./engine/music');
const SC = require('./score-gta');
const { ev, S, BEAT, DURATION, b, carX, carSpeed, CAR } = SC;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), keys = bus(), pad = bus(), lead = bus(), verb = bus(), dly = bus();
const fx = bus(), amb = bus();
const notes = (s) => s.split(' ').map(m);
const stereo = (bs, x, t, g) => bs.addStereo(x.L, x.R, t, g);
const beats = (b0, b1, step, fn) => { for (let k = b0; k < b1 - 1e-6; k += step) fn(b(k), k); };
const buf = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));
const SW = 0.035; // 16th-note swing

// ---------------------------------------------------------------- harmony (beats)
const CH = [
  [0, 4, 'G3 Bb3 D4 F4 A4', 'G1'], [4, 8, 'Bb3 D4 E4 G4', 'C2'], [8, 12, 'G3 Bb3 D4 F4 A4', 'G1'], [12, 16, 'Bb3 D4 E4 G4', 'C2'],
  [16, 18, 'Eb3 G3 Bb3 D4', 'Eb2'], [18, 20, 'F#3 C4 F4 A4', 'D2'],
  [20, 24, 'G3 Bb3 D4 F4 A4', 'G1'], [24, 28, 'Bb3 D4 E4 G4', 'C2'], [28, 30, 'G3 Bb3 D4 F4 A4', 'G1'],
].map(([b0, b1, ns, r]) => [b(b0), b(b1), ns, r]);
const chordAt = (t) => CH.find((c) => t >= c[0] && t < c[1]) || CH[CH.length - 1];

// electric piano comp: on 1 and the "and" of 2, a ghost on 4
for (const [t0, t1, ns] of CH) {
  for (let t = t0; t < t1 - 1e-6; t += b(4)) {
    for (const [off, dur, g] of [[0, 1.2, 0.16], [1.5, 0.6, 0.11], [3.25, 0.4, 0.07]]) {
      const tt = t + b(off); if (tt >= t1) continue;
      notes(ns).forEach((n, i) => { const x = I.epiano(n, b(dur), { index: 1.3, decay: 1.4 }); keys.addMono(x, tt + i * 0.006, g, (i - 2) * 0.15); verb.addMono(x, tt, g * 0.4); });
    }
  }
  for (const n of notes(ns).slice(0, 3)) stereo(pad, I.padNote(n + 12, t1 - t0 + 0.1, { cutoff: 1400, attack: 0.4, release: 0.8 }), t0, 0.035);
}

// ---------------------------------------------------------------- drums + bass (from the street on)
const kicks = [];
const GROOVE_FROM = 9;
beats(GROOVE_FROM, 30, 4, (t, k) => {
  if (k >= 28) { drums.addMono(I.kick({ punch: 1.1 }), t, 0.9); kicks.push(t); return; }
  for (const off of [0, 2.5]) { drums.addMono(I.kick({ punch: 1.1, tail: 0.4 }), t + b(off), 0.9); kicks.push(t + b(off)); }
  if (k % 8 === 4) { drums.addMono(I.kick({ punch: 0.7 }), t + b(3.75), 0.45); }
  for (const off of [1, 3]) { const s = I.snare({ tone: 0.8, snap: 1.1, decay: 0.16 }); drums.addMono(s, t + b(off), 0.55); drums.addMono(I.clap(), t + b(off), 0.3); verb.addMono(s, t + b(off), 0.35); }
  for (let i = 0; i < 16; i++) drums.addMono(I.hat(i === 14, 30 + (i % 3)), t + b(i / 4) + (i % 2 ? SW : 0), i % 4 === 0 ? 0.13 : i % 2 ? 0.07 : 0.1, 0.3);
});
// deep sliding bass: root on 1, a pickup on the "and" of 2, a slide up into the next bar
for (const [t0, t1, , r] of CH) {
  if (t0 < b(GROOVE_FROM) - 1e-6) continue;
  const R = m(r) + 12;
  bass.addMono(I.bass808(R, b(1.4), { drive: 1.4, glide: 3, decay: 0.8 }), t0, 0.55);
  if (t1 - t0 > b(2.6)) bass.addMono(I.bass808(R + 12, b(0.4), { drive: 1.4, glide: 0, decay: 0.3 }), t0 + b(1.5), 0.35);
  if (t1 - t0 > b(3.2)) bass.addMono(I.bass808(R + 7, b(0.7), { drive: 1.4, glide: 2, decay: 0.4 }), t0 + b(2.5), 0.45);
}

// ---------------------------------------------------------------- the whiny portamento lead (own synth)
function whine(line, { glide = 0.07, vib = 0.22, vibRate = 5.3, bright = 0.3 } = {}) {
  const t0 = line[0].t, t1 = line[line.length - 1].t + line[line.length - 1].dur;
  const x = buf(t1 - t0 + 0.3), lp = new SVF();
  let ph = 0, f = mtof(line[0].midi);
  for (let i = 0; i < x.length; i++) {
    const t = t0 + i / SR;
    const n = line.find((q) => t >= q.t && t < q.t + q.dur);
    const target = n ? mtof(n.midi) : f;
    f += (target - f) * (1 - Math.exp(-1 / (glide * SR)));
    const since = n ? t - n.t : 1;
    const v = since > 0.12 ? vib * Math.sin(2 * Math.PI * vibRate * t) : 0;
    ph += f * Math.pow(2, v / 12) / SR;
    const w = Math.sin(2 * Math.PI * ph) + bright * Math.sin(4 * Math.PI * ph) + 0.12 * Math.sin(6 * Math.PI * ph);
    const env = n ? Math.min(1, since / 0.02) * Math.min(1, (n.t + n.dur - t) / 0.06 + 0.3) : Math.max(0, 1 - (t - t1) / 0.15);
    x[i] = lp.lp(w, 4500, 0.7) * 0.32 * Math.max(0, Math.min(1, env));
  }
  return { x, t0 };
}
const mel = (arr) => arr.map(([bt, n, d]) => ({ t: b(bt), midi: m(n), dur: b(d) }));
for (const L of [
  mel([[12, 'D5', 1], [13, 'F5', 0.75], [13.75, 'G5', 1.25], [15, 'F5', 0.5], [15.5, 'D5', 0.5]]),               // on the radio
  mel([[20, 'D6', 1.5], [21.5, 'C6', 0.5], [22, 'Bb5', 1], [23, 'A5', 0.5], [23.5, 'G5', 0.5],                   // the card
    [24, 'E5', 1], [25, 'G5', 1], [26, 'Bb5', 0.75], [26.75, 'A5', 0.25], [27, 'G5', 1], [28, 'D6', 2]]),
]) { const { x, t0 } = whine(L); lead.addMono(x, t0, 0.5, 0.1); dly.addMono(x, t0, 0.15); verb.addMono(x, t0, 0.15); }

// vinyl crackle under everything
lead.addMono(I.vinyl(DURATION, { crackle: 1, hiss: 0.6, seed: 5 }), 0, 0.12);

// ---------------------------------------------------------------- sound design (dry, never radio-filtered)
// menu: move tick, confirm
fx.addMono(I.woodTick(2.2), ev.menuMove, 0.4); fx.addMono(I.pulse(m('E6'), 0.04, { duty: 0.5, decay: 0.03 }), ev.menuMove, 0.15);
{ const x = I.bell(1318.5, 0.6); fx.addMono(x, ev.menuSelect, 0.35); fx.addMono(I.bell(1760, 0.5), ev.menuSelect + 0.07, 0.25); fx.addMono(I.pop(1800, 9), ev.menuSelect, 0.2); }
// engine: rumble that follows the car's speed, louder as it comes at the camera; idles after the stop
const CAM = [11.5, -5.7];
const engineGain = (t) => { const d = Math.hypot(carX(t) - CAM[0], CAR.lane - CAM[1]); return Math.min(1, 7 / d); };
{
  const t0 = S.street[0] - 0.2, t1 = ev.card, x = buf(t1 - t0), pk = new Pink(3), lp = new SVF(), lp2 = new SVF();
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = t0 + i / SR, v = Math.max(0, carSpeed(t));
    const f = 26 + v * 2.2, idle = t >= ev.carStop ? 1 : 0;
    ph += f / SR;
    const tone = Math.sin(2 * Math.PI * ph) + 0.6 * Math.sin(4 * Math.PI * ph) + 0.4 * Math.sin(6 * Math.PI * ph) + 0.25 * Math.sign(Math.sin(2 * Math.PI * ph * 0.5));
    const g = engineGain(t) * (idle ? 0.35 : 0.9) * Math.min(1, (t - t0) / 0.4) * (t > t1 - 0.3 ? (t1 - t) / 0.3 : 1);
    x[i] = (lp.lp(tone, 260 + v * 18, 1.1) * 0.5 + lp2.lp(pk.next(), 500, 0.7) * 0.4) * g;
  }
  fx.addMono(x, t0, 0.55);
}
{ // brake squeal + tyre scrub over the last stretch
  const len = 0.95, t0 = ev.carStop - len, x = buf(len), pk = new Pink(4), bp = new SVF();
  for (let i = 0; i < x.length; i++) {
    const u = i / x.length, t = i / SR, f = 2550 + 140 * Math.sin(t * 31) + 90 * Math.sin(t * 7);
    x[i] = (Math.sin(2 * Math.PI * f * t) * 0.18 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + bp.bp(pk.next(), 1200, 1.4) * 0.5 * u) * Math.min(1, (1 - u) * 12);
  }
  fx.addMono(x, t0, 0.45, 0.1);
}
fx.addMono(I.thud(60, 0.2), ev.carStop, 0.35);
// doors: latch + creak on open, a heavy slam with a rattle on close
fx.addMono(I.woodTick(1.1), ev.doorOpen, 0.45); fx.addMono(I.thud(180, 0.05, 41), ev.doorOpen + 0.02, 0.3);
fx.addMono(I.noiseSweep(0.35, 700, 1100, { q: 4, pink: true }), ev.doorOpen + 0.05, 0.1);
fx.addMono(I.noiseSweep(0.4, 400, 900, { q: 2, pink: true }), ev.exit[0] + 0.1, 0.12);                 // cloth / seat
const slam = ev.doorClose[1];
fx.addMono(I.thud(68, 0.22, 42), slam, 0.9); fx.addMono(I.thwack(), slam, 0.45); verb.addMono(I.thud(68, 0.22, 42), slam, 0.4);
fx.addMono(I.woodTick(1.6), slam + 0.04, 0.25); fx.addMono(I.woodTick(1.9), slam + 0.09, 0.15);
// sneakers on concrete, one per step
for (let t = ev.walk[0] + ev.stepPeriod / 2, i = 0; t < ev.walk[1]; t += ev.stepPeriod, i++) {
  fx.addMono(I.thud(150 + (i % 2) * 20, 0.04, 50 + i), t, 0.35, i % 2 ? 0.15 : -0.15);
  fx.addMono(I.noiseSweep(0.07, 2500, 1200, { q: 1, pink: true }), t, 0.06);
}
// match card: the hit, a whoosh for the title, a knock per crest
fx.addMono(I.subBoom(2.4), ev.card, 0.8); drums.addMono(I.crash(9), ev.card, 0.4);
for (const n of notes('G3 D4 G4 Bb4 D5')) { const x = I.brassNote(n, 0.6, { stab: true }); stereo(lead, x, ev.card, 0.12); stereo(verb, x, ev.card, 0.06); }
fx.addMono(I.noiseSweep(0.5, 300, 6000, { q: 0.9, pink: true, shape: (x) => x * x }), ev.fin.title - 0.45, 0.22);
for (const t of [ev.fin.home, ev.fin.away]) fx.addMono(I.thud(80, 0.12, 60), t, 0.5);
fx.addMono(I.thwack(), ev.fin.vs, 0.3);

// ---------------------------------------------------------------- ambience: warm evening air, distant traffic and stadium
{
  const pk = new Pink(7), pk2 = new Pink(8), lo = new SVF(), lo2 = new SVF(), bp = new SVF();
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const street = t >= S.street[0] ? Math.min(1, (t - S.street[0]) / 0.6) : 0;
    const g = street * (t < ev.card ? 1 : 0.6) * Math.min(1, (DURATION - t) / 0.6);
    const wind = lo.lp(pk.next(), 500, 0.6) * 0.05 * (1 + 0.4 * Math.sin(t * 0.7));
    const crowd = bp.bp(pk2.next(), 900, 0.8) * 0.025 * (1 + 0.3 * Math.sin(t * 1.9));
    amb.L[i] += (wind + crowd) * g; amb.R[i] += (wind * 0.8 + crowd) * g;
  }
}

// ---------------------------------------------------------------- the radio: one time-varying filter over the music
MIX.sidechain([pad, bass], kicks, { depth: 0.3 }); // the classic pump under the kick 
const music = bus();
for (const [x, g] of [[drums, 0.6], [bass, 0.7], [keys, 1.0], [pad, 1.6], [lead, 0.85], [reverb(verb, { room: 0.82, damp: 0.35 }), 1], [pingpong(dly, BEAT * 0.75, 0.3, 3500), 1]]) x.mixInto(music, g);
const radio = (t) => { // [cutoff Hz, gain]
  if (t < S.menu[1] - 0.6) return [16000, 1.0];
  if (t < S.street[0]) { const u = Math.min(1, (t - (S.menu[1] - 0.6)) / 1.6); return [16000 * Math.pow(600 / 16000, u), 1.0 - 0.65 * u]; }
  if (t < ev.doorOpen) return [650 + 900 * engineGain(t), 0.25 + 0.45 * engineGain(t)];   // inside the closed car
  if (t < ev.doorClose[1]) { const u = Math.min(1, (t - ev.doorOpen) / 0.25); return [1550 + 12000 * u, 0.7 + 0.15 * u]; } // door open
  if (t < ev.card) return [850, 0.42];                                                      // shut again
  return [17000, 1.0];                                                                      // full on the card
};
{
  const fl = new SVF(), fr = new SVF();
  let c = 16000, g = 0.7;
  for (let i = 0; i < N; i++) {
    const [tc, tg] = radio(i / SR);
    c += (tc - c) * 0.004; g += (tg - g) * 0.004; // smooth so the slam still sounds abrupt but click-free
    music.L[i] = fl.lp(music.L[i], c, 0.8) * g; music.R[i] = fr.lp(music.R[i], c, 0.8) * g;
  }
}

// ---------------------------------------------------------------- mix + master
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const mix = MIX.mixdown({ music, fx, amb }, { music: 1, fx: 1, amb: 1 }, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 25);
MIX.fadeOut(mix, DURATION - 0.6, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(out, SC.MUSIC), mix);
console.log(`wrote out/${SC.MUSIC} (${DURATION.toFixed(1)}s, ${M.lufs.toFixed(1)} LUFS)`);
